/**
 * Phase 10 against the embedded newpoint-phi database: the referral form (edge, phi_edge),
 * referrals.intake and referrals.referrer-update (phi_tasks), the console's referral queue
 * (staff_console), and the retention sweep for documents. Storage, the model and Turnstile
 * are fakes; every document and value is synthetic.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createReferralIntake, REFERRAL_LIMITS } from "../../edge/intake/referral.js";
import type { Enqueue } from "../../edge/shared/deps.js";
import { parseMultipart } from "../../edge/shared/multipart.js";
import type { PhiClaude } from "../../src/adapters/llm/anthropic-phi.js";
import { memoryReferralStore } from "../../src/adapters/storage/referral-store.js";
import type { Extraction } from "../../src/domain/referrals/extraction.js";
import { clientDb } from "../../src/lib/db-phi.js";
import { escalateStuckReferrals } from "../../src/trigger/phi/ops/reconcile.js";
import { purgeReferralDocuments } from "../../src/trigger/phi/ops/retention-sweep.js";
import { runReferralIntake } from "../../src/trigger/phi/referrals/intake.js";
import { REFERRER_NOTICE, runReferrerUpdate } from "../../src/trigger/phi/referrals/referrer-update.js";
import { startProjectDb, type MarketingDb } from "../db/marketing-db.js";

const FORM_ORIGIN = "https://refer.example.test";
const PDF = new TextEncoder().encode("%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\ntrailer\n%%EOF");

let db: MarketingDb | undefined;
const client = () => {
  if (!db) throw new Error("phi database did not start");
  return db.client;
};
beforeAll(async () => {
  db = await startProjectDb("phi");
});
afterAll(async () => {
  await db?.stop();
});
beforeEach(async () => {
  await client().query("reset role");
  await client().query(`truncate phi.audit_log, phi.referrals, phi.tickets, phi.follow_ups, phi.appointments, ops.intake_rate cascade; truncate phi.contacts cascade`);
});

function recorder() {
  const calls: { taskId: string; payload: Record<string, unknown> }[] = [];
  const enqueue: Enqueue = (taskId, payload) => {
    calls.push({ taskId, payload });
    return Promise.resolve();
  };
  return { calls, enqueue };
}

function referralForm(over: Record<string, string> = {}, document: Uint8Array | null = PDF): FormData {
  const form = new FormData();
  const fields = { referrer_organization: "Example Family Practice", referrer_name: "A. Referrer", referrer_phone: "(609) 555-0170", turnstileToken: "tok", ...over };
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  if (document !== null) form.append("document", new Blob([Buffer.from(document)], { type: "application/pdf" }), "referral.pdf");
  return form;
}

function intake(turnstileOk = true) {
  const store = memoryReferralStore();
  const { calls, enqueue } = recorder();
  const handler = createReferralIntake(
    { formOrigin: FORM_ORIGIN, turnstile: () => Promise.resolve(turnstileOk), hmacSecret: "h".repeat(40), ipHeader: "cf-connecting-ip", store },
    { db: clientDb(client()), enqueue, now: () => new Date() },
  );
  // As a browser sends it: a serialised multipart body with its size declared.
  const post = async (form: FormData, headers: Record<string, string> = {}) => {
    const encoded = new Response(form);
    const bytes = new Uint8Array(await encoded.arrayBuffer());
    return handler(
      new Request("https://edge.example.test/intake/referral", {
        method: "POST",
        headers: {
          origin: FORM_ORIGIN,
          "cf-connecting-ip": "198.51.100.9",
          "content-type": encoded.headers.get("content-type") ?? "",
          "content-length": String(bytes.byteLength),
          ...headers,
        },
        body: bytes,
      }),
    );
  };
  return { store, calls, post };
}

const asEdge = () => client().query("set role phi_edge");
const asTasks = () => client().query("set role phi_tasks");

describe("edge/intake referral route (D17: web form only)", () => {
  it("stores a PDF under a server-chosen path, writes the referral and queues the intake", async () => {
    await asEdge();
    const { store, calls, post } = intake();
    expect((await post(referralForm())).status).toBe(200);
    await client().query("reset role");
    const rows = await client().query<{ id: string; document_path: string; status: string; referrer_contact: string }>(
      `select id, document_path, status::text, referrer_contact from phi.referrals`,
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]?.document_path).toBe(`referrals/${rows.rows[0]?.id ?? ""}.pdf`);
    expect(rows.rows[0]).toMatchObject({ status: "received", referrer_contact: "+16095550170" });
    expect([...store.files.keys()]).toEqual([rows.rows[0]?.document_path]);
    expect(calls).toEqual([{ taskId: "referrals.intake", payload: { referralId: rows.rows[0]?.id } }]);
  });

  it.each([
    ["another origin", () => [referralForm(), { origin: "https://evil.example" }] as const, 403],
    ["a non-PDF", () => [referralForm({}, new TextEncoder().encode("MZ\x90\x00 not a pdf")), {}] as const, 415],
    ["no document", () => [referralForm({}, null), {}] as const, 400],
    ["an extra field", () => [(() => { const f = referralForm(); f.append("patient_dob", "1990-01-01"); return f; })(), {}] as const, 400],
    ["a bad phone", () => [referralForm({ referrer_phone: "555" }), {}] as const, 400],
  ])("refuses %s, storing nothing", async (_label, make, status) => {
    await asEdge();
    const { store, post } = intake();
    const [form, headers] = make();
    expect((await post(form, headers)).status).toBe(status);
    expect(store.files.size).toBe(0);
  });

  it("refuses an undeclared body size and a PDF with something in front of it", async () => {
    await asEdge();
    const { handler, store } = (() => {
      const st = memoryReferralStore();
      const h = createReferralIntake(
        { formOrigin: FORM_ORIGIN, turnstile: () => Promise.resolve(true), hmacSecret: "h".repeat(40), ipHeader: "cf-connecting-ip", store: st },
        { db: clientDb(client()), enqueue: recorder().enqueue, now: () => new Date() },
      );
      return { handler: h, store: st };
    })();
    const undeclared = await handler(
      new Request("https://edge.example.test/intake/referral", {
        method: "POST",
        headers: { origin: FORM_ORIGIN, "cf-connecting-ip": "198.51.100.9", "content-type": "multipart/form-data; boundary=x" },
        body: new ReadableStream({ start: (c) => { c.enqueue(new Uint8Array(10)); c.close(); } }),
        duplex: "half",
      }),
    );
    expect(undeclared.status).toBe(411);
    const polyglot = new Uint8Array([...new TextEncoder().encode("GIF89a"), ...PDF]);
    expect((await intake().post(referralForm({}, polyglot))).status).toBe(415);
    expect(store.files.size).toBe(0);
  });

  it("refuses a document over 10 MB and a failed Turnstile", async () => {
    await asEdge();
    const big = new Uint8Array(REFERRAL_LIMITS.maxBytes + 1);
    big.set(PDF);
    expect((await intake().post(referralForm({}, big))).status).toBe(413);
    expect((await intake(false).post(referralForm())).status).toBe(403);
  });

  it("the multipart parser refuses what it does not understand", () => {
    const ct = "multipart/form-data; boundary=x";
    expect(parseMultipart(new TextEncoder().encode("garbage"), ct)).toBeNull();
    expect(parseMultipart(new TextEncoder().encode("--x\r\nContent-Disposition: form-data; name=\"a\"\r\n\r\n1\r\n--x--"), "text/plain")).toBeNull();
    expect(parseMultipart(new TextEncoder().encode("--x\r\nContent-Disposition: form-data; name=\"a\"\r\n\r\n1\r\n--x--"), ct)).toEqual({ fields: { a: "1" }, files: {} });
  });
});

const extraction = (over: Partial<Extraction> = {}): Extraction => ({
  patient: { first_name: "Testpatient", last_name: "Example", phone: "(609) 555-0180", email: null, state: "NJ" },
  referrer: { organization: "Example Family Practice", name: "A. Referrer", phone: null },
  requested_service: "assessment",
  urgency: "routine",
  confidence: 0.9,
  ...over,
});

function fakeClaude(result: Extraction | null) {
  const seen: { route: string; hasDocument: boolean }[] = [];
  const claude: Pick<PhiClaude, "parse"> = {
    parse: (req) => {
      seen.push({ route: req.route, hasDocument: req.document !== undefined });
      return Promise.resolve(result === null ? { ok: false as const, reason: "invalid_output" as const } : { ok: true as const, value: result as never });
    },
  };
  return { claude, seen };
}

async function referral(withDocument = true): Promise<{ id: string; store: ReturnType<typeof memoryReferralStore> }> {
  const store = memoryReferralStore();
  const { rows } = await client().query<{ id: string }>(`insert into phi.referrals (referrer_org, referrer_name, status) values ('Org', 'Ref', 'received') returning id`);
  const id = rows[0]?.id ?? "";
  if (withDocument) {
    await client().query(`update phi.referrals set document_path = $2 where id = $1`, [id, `referrals/${id}.pdf`]);
    await store.put(`referrals/${id}.pdf`, PDF, "application/pdf");
  }
  return { id, store };
}

describe("referrals.intake (§5.5): every referral goes to a person", () => {
  it("routine: values extracted from the PDF; still a clinician sees it (model urgency is unverified); no contact", async () => {
    const { id, store } = await referral();
    await asTasks();
    const { claude, seen } = fakeClaude(extraction());
    const deps = { db: clientDb(client()), store, claude, notifier: { actionRequired: () => Promise.resolve() }, actor: "referrals.intake" };
    expect(await runReferralIntake(deps, id)).toEqual({ result: "referral_review" });
    // The result reports the model's view; the ticket below goes to a clinician regardless.
    expect(seen).toEqual([{ route: "extraction", hasDocument: true }]);
    expect(await runReferralIntake(deps, id)).toEqual({ result: "already_handled" });
    await client().query("reset role");
    expect((await client().query(`select status::text, urgency, contact_id from phi.referrals`)).rows).toEqual([{ status: "needs_review", urgency: "routine", contact_id: null }]);
    expect((await client().query(`select kind::text, source_kind from phi.tickets`)).rows).toEqual([{ kind: "clinician_review", source_kind: "referral" }]);
    expect((await client().query(`select count(*)::int as n from phi.contacts`)).rows).toEqual([{ n: 0 }]);
  });

  it.each([
    ["urgent", extraction({ urgency: "urgent" })],
    ["high risk", extraction({ urgency: "high_risk" })],
    ["unreadable (no values: treated as possibly urgent)", null],
  ])("%s goes straight to a clinician", async (_label, result) => {
    const { id, store } = await referral();
    await asTasks();
    const deps = { db: clientDb(client()), store, claude: fakeClaude(result).claude, notifier: { actionRequired: () => Promise.resolve() }, actor: "referrals.intake" };
    expect(await runReferralIntake(deps, id)).toEqual({ result: "clinician_review" });
    await client().query("reset role");
    expect((await client().query(`select kind::text from phi.tickets`)).rows).toEqual([{ kind: "clinician_review" }]);
  });

  it("a missing document is a review, recorded, never a guess", async () => {
    const { id, store } = await referral(false);
    await asTasks();
    const deps = { db: clientDb(client()), store, claude: fakeClaude(extraction()).claude, notifier: { actionRequired: () => Promise.resolve() }, actor: "referrals.intake" };
    expect(await runReferralIntake(deps, id)).toEqual({ result: "clinician_review" });
    await client().query("reset role");
    expect((await client().query(`select extraction_error from phi.referrals`)).rows).toEqual([{ extraction_error: "no_document" }]);
  });
});

describe("a referral is never left unseen", () => {
  it("one whose intake keeps failing opens a clinician review after 30 minutes, once", async () => {
    const { id } = await referral();
    await client().query(`update phi.referrals set received_at = now() - interval '31 minutes' where id = $1`, [id]);
    await asTasks();
    expect(await escalateStuckReferrals(clientDb(client()), "ops.reconcile")).toBe(1);
    expect(await escalateStuckReferrals(clientDb(client()), "ops.reconcile")).toBe(0);
    await client().query("reset role");
    expect((await client().query(`select kind::text, source_id from phi.tickets`)).rows).toEqual([{ kind: "clinician_review", source_id: id }]);
  });
});

describe("referrals.referrer-update (D12: built, disabled)", () => {
  async function scheduledReferral(): Promise<string> {
    const c = await client().query<{ id: string }>(`insert into phi.contacts (first_name) values ('Testpatient') returning id`);
    await client().query(`insert into phi.referrals (contact_id, status, reviewed_at) values ($1, 'confirmed', now() - interval '1 day')`, [c.rows[0]?.id]);
    const a = await client().query<{ id: string }>(
      `insert into phi.appointments (contact_id, provider_id, external_ref, adapter, starts_at) values ($1, 'funmilayo-whitaker', 'r1', 'manual-queue', now() + interval '3 days') returning id`,
      [c.rows[0]?.id],
    );
    return a.rows[0]?.id ?? "";
  }

  it("does nothing while disabled, or with no channel", async () => {
    const appt = await scheduledReferral();
    await asTasks();
    expect(await runReferrerUpdate({ db: clientDb(client()), enabled: false, channel: null, actor: "x" }, appt)).toEqual({ result: "disabled" });
    expect(await runReferrerUpdate({ db: clientDb(client()), enabled: true, channel: null, actor: "x" }, appt)).toEqual({ result: "no_channel" });
  });

  it("when enabled with a channel: one minimal notice per referral, nothing about the visit", async () => {
    const appt = await scheduledReferral();
    await asTasks();
    const sent: string[] = [];
    const deps = { db: clientDb(client()), enabled: true, channel: { send: (_id: string, text: string) => { sent.push(text); return Promise.resolve(); } }, actor: "x" };
    expect(await runReferrerUpdate(deps, appt)).toEqual({ result: "sent" });
    expect(await runReferrerUpdate(deps, appt)).toEqual({ result: "already_sent" });
    expect(sent).toEqual([REFERRER_NOTICE]);
    expect(REFERRER_NOTICE).not.toMatch(/\d|Dr|DNP|diagnos|medicat/i);
  });
});

describe("retention: referral documents", () => {
  it("removes documents past purge_after and clears the path; others stay", async () => {
    const old = await referral();
    const kept = await referral();
    await client().query(`update phi.referrals set status = 'confirmed'`);
    await client().query(`update phi.referrals set purge_after = now() - interval '1 day', extracted = '{"patient":{}}' where id = $1`, [old.id]);
    const store = memoryReferralStore();
    for (const r of [old, kept]) await store.put(`referrals/${r.id}.pdf`, PDF, "application/pdf");
    await asTasks();
    expect(await purgeReferralDocuments(clientDb(client()), store, "ops.retention-sweep")).toBe(1);
    expect([...store.files.keys()]).toEqual([`referrals/${kept.id}.pdf`]);
    await client().query("reset role");
    expect((await client().query(`select document_path is null and extracted is null as purged from phi.referrals where id = $1`, [old.id])).rows).toEqual([{ purged: true }]);
  });

  it("never removes the document of a referral nobody has decided on", async () => {
    const pending = await referral();
    await client().query(`update phi.referrals set purge_after = now() - interval '1 day' where id = $1`, [pending.id]);
    const store = memoryReferralStore();
    await store.put(`referrals/${pending.id}.pdf`, PDF, "application/pdf");
    await asTasks();
    expect(await purgeReferralDocuments(clientDb(client()), store, "ops.retention-sweep")).toBe(0);
    expect(store.files.size).toBe(1);
  });
});
