/**
 * Phase 6 against the embedded newpoint-phi database: edge/twilio-inbound and edge/intake
 * as phi_edge, messaging.inbound-sms and referrals.lead-follow-up as phi_tasks. Twilio,
 * Turnstile, the classifier, Trigger.dev and n8n are fakes. All data is synthetic.
 */
import { createHmac } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createIntake, LIMITS, toE164 } from "../../edge/intake/handler.js";
import type { Enqueue } from "../../edge/shared/deps.js";
import { createTwilioInbound } from "../../edge/twilio-inbound/handler.js";
import type { PhiClaude } from "../../src/adapters/llm/anthropic-phi.js";
import type { PhiNotifier } from "../../src/adapters/n8n/phi-notify.js";
import { CONSENT_WORDING } from "../../src/domain/consent/wording.js";
import { clientDb } from "../../src/lib/db-phi.js";
import { createLogger } from "../../src/lib/logger.js";
import { runInboundSms, type InboundDeps } from "../../src/trigger/phi/messaging/inbound-sms.js";
import { runSendSms } from "../../src/trigger/phi/messaging/send-sms.js";
import { decideStep, markStepSent, startLead, type LeadDeps } from "../../src/trigger/phi/referrals/lead-follow-up.js";
import { runRetentionSweep } from "../../src/trigger/phi/ops/retention-sweep.js";
import { findStranded } from "../../src/trigger/phi/ops/reconcile.js";
import { startProjectDb, type MarketingDb } from "../db/marketing-db.js";
import { ENV, fakeTwilio, seedContact } from "./fixtures.js";

const NOW = new Date("2026-10-20T15:00:00Z");
const SITE = "https://newpointnp.example";
const AUTH = "a".repeat(32);
const INBOUND_URL = "https://edge.example.test/twilio-inbound";
const SID = (n: number) => `SM${n.toString(16).padStart(32, "0")}`;

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
  await client().query(
    `truncate phi.audit_log, phi.phone_verifications, phi.messages, phi.conversations, phi.crisis_events, phi.consents, phi.tickets,
              phi.follow_ups, phi.inquiries, ops.intake_rate, ops.page_log cascade;
     truncate phi.contacts cascade`,
  );
});
const as = (role: "phi_edge" | "phi_tasks") => client().query(`set role ${role}`);

function recorder() {
  const calls: { taskId: string; payload: Record<string, unknown>; key: string }[] = [];
  const enqueue: Enqueue = (taskId, payload, key) => {
    calls.push({ taskId, payload, key });
    return Promise.resolve();
  };
  return { calls, enqueue };
}

function sign(params: Record<string, string>): string {
  const data = INBOUND_URL + Object.keys(params).sort().map((k) => k + (params[k] ?? "")).join("");
  return createHmac("sha1", AUTH).update(data).digest("base64");
}

function twilioRequest(params: Record<string, string>, signature = sign(params)): Request {
  return new Request(INBOUND_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "x-twilio-signature": signature },
    body: new URLSearchParams(params),
  });
}

describe("edge/twilio-inbound", () => {
  it("refuses an unsigned or mis-signed request before reading it", async () => {
    const { calls, enqueue } = recorder();
    const handler = createTwilioInbound({ authToken: AUTH, publicUrl: INBOUND_URL }, { db: clientDb(client()), enqueue, now: () => NOW });
    const params = { MessageSid: SID(1), From: "+16095550142", Body: "hi" };
    expect((await handler(twilioRequest(params, "bad"))).status).toBe(403);
    expect((await handler(twilioRequest({ ...params, Body: "changed" }, sign(params)))).status).toBe(403);
    expect(calls).toEqual([]);
  });

  it("records a new number as an unknown-age contact and enqueues once per MessageSid", async () => {
    const { calls, enqueue } = recorder();
    await as("phi_edge");
    const handler = createTwilioInbound({ authToken: AUTH, publicUrl: INBOUND_URL }, { db: clientDb(client()), enqueue, now: () => NOW });
    const params = { MessageSid: SID(2), From: "+16095550142", Body: "Can I book for Friday?" };
    const first = await handler(twilioRequest(params));
    expect(first.status).toBe(200);
    expect(await first.text()).toContain("<Response></Response>");
    expect((await handler(twilioRequest(params))).status).toBe(200);
    await client().query("reset role");
    const rows = await client().query<{ id: string; minor_status: string }>(`select m.id, c.minor_status::text from phi.messages m join phi.conversations v on v.id = m.conversation_id join phi.contacts c on c.id = v.contact_id`);
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]).toMatchObject({ minor_status: "unknown" });
    expect(calls.map((c) => c.key)).toEqual([`inbound-sms:${rows.rows[0]?.id ?? ""}`, `inbound-sms:${rows.rows[0]?.id ?? ""}`]);
  });

  it("accepts and drops a signed message from a non-US number", async () => {
    const { calls, enqueue } = recorder();
    await as("phi_edge");
    const handler = createTwilioInbound({ authToken: AUTH, publicUrl: INBOUND_URL }, { db: clientDb(client()), enqueue, now: () => NOW });
    expect((await handler(twilioRequest({ MessageSid: SID(3), From: "+442079460000", Body: "hi" }))).status).toBe(200);
    expect(calls).toEqual([]);
  });
});

function intake(turnstileOk = true) {
  const { calls, enqueue } = recorder();
  const handler = createIntake(
    { siteOrigin: SITE, turnstile: () => Promise.resolve(turnstileOk), hmacSecret: "h".repeat(40), ipHeader: "cf-connecting-ip" },
    { db: clientDb(client()), enqueue, now: () => NOW },
  );
  return { calls, handler };
}

const form = (extra: Record<string, unknown> = {}) => ({
  name: "Test Person",
  email: "test@example.test",
  phone: "(609) 555-0150",
  reason: "New patient inquiry",
  smsConsent: true,
  consentVersion: CONSENT_WORDING.version,
  turnstileToken: "tok",
  ...extra,
});

const post = (handler: (r: Request) => Promise<Response>, path: string, body: unknown, headers: Record<string, string> = {}) =>
  handler(
    new Request(`https://edge.example.test${path}`, {
      method: "POST",
      headers: { origin: SITE, "content-type": "application/json", "cf-connecting-ip": "198.51.100.7", ...headers },
      body: JSON.stringify(body),
    }),
  );

describe("edge/intake", () => {
  it("toE164 takes US numbers as people type them", () => {
    expect(toE164("(609) 555-0150")).toBe("+16095550150");
    expect(toE164("+1 609 555 0150")).toBe("+16095550150");
    expect(toE164("555-0150")).toBeNull();
    expect(toE164("+44 20 7946 0000")).toBeNull();
  });

  it("refuses another origin, a failed Turnstile and anything outside the schema", async () => {
    await as("phi_edge");
    const ok = intake();
    expect((await post(ok.handler, "/intake", form(), { origin: "https://evil.example" })).status).toBe(403);
    expect((await post(intake(false).handler, "/intake", form())).status).toBe(403);
    expect((await post(ok.handler, "/intake", form({ reason: "I have been feeling depressed" }))).status).toBe(400);
    expect((await post(ok.handler, "/intake", form({ symptoms: "x" }))).status).toBe(400);
    expect((await post(ok.handler, "/intake", form({ dob: "1990-01-01" }))).status).toBe(400);
    expect(ok.calls).toEqual([]);
  });

  it("answers the CORS preflight for the site origin only", async () => {
    await as("phi_edge");
    const { handler } = intake();
    const pre = (origin: string) => handler(new Request("https://edge.example.test/intake", { method: "OPTIONS", headers: { origin } }));
    expect((await pre(SITE)).headers.get("access-control-allow-origin")).toBe(SITE);
    expect((await pre("https://evil.example")).status).toBe(403);
  });

  it("with consent: records the wording verbatim, creates a code and enqueues it and the follow-up", async () => {
    await as("phi_edge");
    const { calls, handler } = intake();
    const response = await post(handler, "/intake", form());
    expect(response.status).toBe(200);
    const body = (await response.json()) as { verificationId: string };
    expect(body.verificationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(calls.map((c) => c.taskId)).toEqual(["referrals.lead-follow-up", "messaging.send-sms"]);
    expect(calls[1]?.payload).toMatchObject({ template: "verification_code", entityId: body.verificationId, step: 0 });
    await client().query("reset role");
    // Pending until the code is confirmed: no consent row yet.
    expect((await client().query(`select count(*)::int as n from phi.consents`)).rows).toEqual([{ n: 0 }]);
    const code = (await client().query<{ code: string }>(`select code from phi.phone_verifications`)).rows[0]?.code ?? "";
    await as("phi_edge");
    expect((await post(handler, "/intake/verify", { verificationId: body.verificationId, code })).status).toBe(200);
    await client().query("reset role");
    const consent = await client().query<{ source: string; evidence: { wording: string; wording_version: number; ip_hmac: string; verification_id: string } }>(
      `select source, evidence from phi.consents`,
    );
    expect(consent.rows[0]?.source).toBe("web_form");
    expect(consent.rows[0]?.evidence.wording).toBe(CONSENT_WORDING.smsTransactional);
    expect(consent.rows[0]?.evidence.verification_id).toBe(body.verificationId);
    expect(JSON.stringify(consent.rows[0]?.evidence)).not.toContain("198.51.100.7");
    const inquiry = await client().query(`select source::text, reason::text from phi.inquiries`);
    expect(inquiry.rows).toEqual([{ source: "web", reason: "new_patient" }]);
    // The response carries an opaque id only: nothing the visitor sent is echoed.
    expect(Object.keys(body).sort()).toEqual(["ok", "verificationId"]);
  });

  it("without consent: no consent row, no code, the inquiry still reaches staff", async () => {
    await as("phi_edge");
    const { calls, handler } = intake();
    const response = await post(handler, "/intake", form({ smsConsent: false }));
    expect(await response.json()).toEqual({ ok: true, verificationId: null });
    expect(calls.map((c) => c.taskId)).toEqual(["referrals.lead-follow-up"]);
    await client().query("reset role");
    expect((await client().query(`select count(*)::int as n from phi.consents`)).rows).toEqual([{ n: 0 }]);
  });

  it("typing someone else's number can neither grant consent nor undo their STOP", async () => {
    const victim = await seedContact(client(), { phone: "+16095550177", consent: "revoked" });
    await as("phi_edge");
    const { calls, handler } = intake();
    const { verificationId } = (await (await post(handler, "/intake", form({ phone: "(609) 555-0177" }))).json()) as { verificationId: string };
    await client().query("reset role");
    expect((await client().query(`select active from phi.consent_state where contact_id = $1`, [victim])).rows).toEqual([{ active: false }]);
    await client().query(`update phi.contacts set minor_status = 'adult' where id = $1`, [victim]);
    await as("phi_tasks");
    const twilio = fakeTwilio();
    const send = calls.find((c) => c.taskId === "messaging.send-sms")?.payload as { contactId: string };
    expect(send.contactId).toBe(victim);
    expect(
      await runSendSms({ db: clientDb(client()), twilio, env: ENV, now: () => NOW, actor: "messaging.send-sms" }, { template: "verification_code", contactId: victim, entityId: verificationId, step: 0 }),
    ).toEqual({ status: "refused", reason: "no_consent" });
    expect(twilio.sms).toEqual([]);
  });

  it("the edge role reads back ids only, never names, bodies, consents or codes", async () => {
    await seedContact(client());
    await as("phi_edge");
    await expect(client().query(`select first_name from phi.contacts`)).rejects.toThrow(/permission denied/);
    await expect(client().query(`select body from phi.messages`)).rejects.toThrow(/permission denied/);
    await expect(client().query(`select evidence from phi.consents`)).rejects.toThrow(/permission denied/);
    await expect(client().query(`select code from phi.phone_verifications`)).rejects.toThrow(/permission denied/);
    await client().query("reset role");
    await as("phi_edge");
    expect((await client().query(`select id, phone_e164 from phi.contacts`)).rows).toHaveLength(1);
  });

  it("refuses non-US NANP numbers, a missing client IP, and stops at the global code cap", async () => {
    expect(toE164("(876) 555-0150")).toBeNull();
    expect(toE164("(416) 555-0150")).toBeNull();
    expect(toE164("(900) 555-0150")).toBeNull();
    await as("phi_edge");
    const { handler } = intake();
    expect((await post(handler, "/intake", form({ phone: "876 555 0150" }))).status).toBe(400);
    const noIp = await handler(
      new Request("https://edge.example.test/intake", { method: "POST", headers: { origin: SITE, "content-type": "application/json" }, body: JSON.stringify(form()) }),
    );
    expect(noIp.status).toBe(400);
    await client().query("reset role");
    await client().query(`insert into ops.intake_rate (key, window_start, hits) values ('global:verification_codes', date_trunc('hour', $1::timestamptz), $2)`, [
      NOW,
      LIMITS.codesPerHour,
    ]);
    await as("phi_edge");
    expect((await post(handler, "/intake", form({ phone: "6095550199" }))).status).toBe(429);
  });

  it("a chunked body with no content-length is still capped", async () => {
    await as("phi_edge");
    const { handler } = intake();
    const big = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < 10; i += 1) controller.enqueue(new TextEncoder().encode("x".repeat(1_000)));
        controller.close();
      },
    });
    const response = await handler(
      new Request("https://edge.example.test/intake", { method: "POST", headers: { origin: SITE, "cf-connecting-ip": "198.51.100.7" }, body: big, duplex: "half" }),
    );
    expect(response.status).toBe(413);
  });

  it("queueing failures do not fail the visitor: the rows wait for ops.reconcile", async () => {
    await as("phi_edge");
    const handler = createIntake(
      { siteOrigin: SITE, turnstile: () => Promise.resolve(true), hmacSecret: "h".repeat(40), ipHeader: "cf-connecting-ip" },
      { db: clientDb(client()), enqueue: () => Promise.reject(new Error("trigger down")), now: () => NOW },
    );
    expect((await post(handler, "/intake", form())).status).toBe(200);
  });

  it("refuses consent given against a different wording version", async () => {
    await as("phi_edge");
    expect((await post(intake().handler, "/intake", form({ consentVersion: CONSENT_WORDING.version + 1 }))).status).toBe(409);
  });

  it("rate-limits per IP and per phone", async () => {
    await as("phi_edge");
    const { handler } = intake();
    for (let i = 0; i < LIMITS.phonePerDay; i += 1) expect((await post(handler, "/intake", form())).status).toBe(200);
    expect((await post(handler, "/intake", form())).status).toBe(429);
    for (let i = LIMITS.phonePerDay + 1; i < LIMITS.ipPerHour; i += 1) {
      expect((await post(handler, "/intake", form({ phone: `609555${String(1000 + i)}` }))).status).toBe(200);
    }
    expect((await post(handler, "/intake", form({ phone: "6095552222" }))).status).toBe(429);
  });

  it("verifies the code once, counts wrong tries, and locks after five", async () => {
    await as("phi_edge");
    const { handler } = intake();
    const { verificationId } = (await (await post(handler, "/intake", form())).json()) as { verificationId: string };
    await client().query("reset role");
    const code = (await client().query<{ code: string }>(`select code from phi.phone_verifications`)).rows[0]?.code ?? "";
    await as("phi_edge");
    const wrong = code === "000000" ? "111111" : "000000";
    expect((await post(handler, "/intake/verify", { verificationId, code: wrong })).status).toBe(400);
    expect((await post(handler, "/intake/verify", { verificationId, code })).status).toBe(200);
    expect((await post(handler, "/intake/verify", { verificationId, code })).status).toBe(400);
    await client().query("reset role");
    const state = await client().query(`select v.code, v.attempts, c.phone_verified_at is not null as verified from phi.phone_verifications v join phi.contacts c on c.id = v.contact_id`);
    expect(state.rows).toEqual([{ code: null, attempts: 1, verified: true }]);

    await as("phi_edge");
    const second = (await (await post(handler, "/intake", form({ phone: "6095550151" }))).json()) as { verificationId: string };
    for (let i = 0; i < LIMITS.maxAttempts; i += 1) await post(handler, "/intake/verify", { verificationId: second.verificationId, code: "999999" });
    await client().query("reset role");
    const real = (await client().query<{ code: string }>(`select code from phi.phone_verifications where id = $1`, [second.verificationId])).rows[0]?.code ?? "";
    await as("phi_edge");
    expect((await post(handler, "/intake/verify", { verificationId: second.verificationId, code: real })).status).toBe(400);
  });

  it("the verification code reaches the SMS only through its row, and only while live", async () => {
    await as("phi_edge");
    const { calls, handler } = intake();
    await post(handler, "/intake", form());
    await client().query("reset role");
    const send = calls.find((c) => c.taskId === "messaging.send-sms")?.payload as { contactId: string; entityId: string };
    // D18: an intake contact is unknown age, so no automated text, the code included.
    // (Its consent is pending on the code's row, which is what lets the code itself go.)
    await as("phi_tasks");
    const twilio = fakeTwilio();
    const deps = { db: clientDb(client()), twilio, env: ENV, now: () => NOW, actor: "messaging.send-sms" };
    expect(await runSendSms(deps, { template: "verification_code", contactId: send.contactId, entityId: send.entityId, step: 0 })).toEqual({
      status: "refused",
      reason: "not_adult",
    });
    await client().query("reset role");
    await client().query(`update phi.contacts set minor_status = 'adult'`);
    await as("phi_tasks");
    expect((await runSendSms(deps, { template: "verification_code", contactId: send.contactId, entityId: send.entityId, step: 0 })).status).toBe("sent");
    expect(twilio.sms[0]?.body).toMatch(/your verification code is \d{6}\./);
    await client().query("reset role");
    expect((await client().query(`select count(*)::int as n from phi.phone_verifications where code is null`)).rows).toEqual([{ n: 0 }]);
  });
});

type Reply = Awaited<ReturnType<InboundDeps["sendNow"]>>;

function inboundDeps(intent: string | null, reply: Reply = "sent") {
  const log: string[] = [];
  const notes: Date[] = [];
  const notifier: PhiNotifier = { actionRequired: (at) => { notes.push(at); return Promise.resolve(); } };
  const classifier: Pick<PhiClaude, "parse"> = {
    parse: () => {
      log.push("classify");
      if (intent === "unavailable") return Promise.resolve({ ok: false as const, reason: "unavailable" as const });
      return Promise.resolve(intent === null ? { ok: false as const, reason: "invalid_output" as const } : { ok: true as const, value: { intent } as never });
    },
  };
  const deps: InboundDeps = {
    db: clientDb(client()),
    classifier,
    sendNow: (p) => {
      log.push(`sendNow:${p.template}`);
      return Promise.resolve(reply);
    },
    send: (p) => {
      log.push(`send:${p.template}`);
      return Promise.resolve();
    },
    pageCrisis: () => {
      log.push("page");
      return Promise.resolve();
    },
    notifier,
    logger: createLogger(() => undefined),
    now: () => NOW,
    actor: "messaging.inbound-sms",
  };
  return { deps, log, notes };
}

async function inbound(body: string, sid = SID(Math.floor(Math.random() * 1e9))): Promise<{ messageId: string; contactId: string }> {
  const contactId = await seedContact(client());
  const conv = await client().query<{ id: string }>(`insert into phi.conversations (contact_id, channel) values ($1, 'sms') returning id`, [contactId]);
  const msg = await client().query<{ id: string }>(
    `insert into phi.messages (conversation_id, direction, body, external_ref) values ($1, 'inbound', $2, $3) returning id`,
    [conv.rows[0]?.id, body, sid],
  );
  return { messageId: msg.rows[0]?.id ?? "", contactId };
}

describe("messaging.inbound-sms (§5.1, §5.8)", () => {
  it("crisis first: event, page, then the fixed reply, without asking the model", async () => {
    const { messageId } = await inbound("I want to end my life");
    await as("phi_tasks");
    const { deps, log } = inboundDeps("book");
    expect(await runInboundSms(deps, messageId)).toEqual({ handled: "crisis" });
    expect(log).toEqual(["page", "sendNow:crisis_response"]);
    await client().query("reset role");
    const event = await client().query(`select detected_by::text, auto_response_sent_at is not null as replied from phi.crisis_events`);
    expect(event.rows).toEqual([{ detected_by: "keyword", replied: true }]);
  });

  it("a crisis message that also opts out gets the crisis reply BEFORE the opt-out is recorded", async () => {
    const { messageId } = await inbound("stop texting me, I want to kill myself");
    await as("phi_tasks");
    const { deps, log } = inboundDeps(null);
    const revokedBefore: boolean[] = [];
    const sendNow = deps.sendNow;
    const tracked: InboundDeps = {
      ...deps,
      sendNow: async (p) => {
        revokedBefore.push(((await client().query(`select count(*)::int as n from phi.consents where revoked_at is not null`)).rows[0] as { n: number }).n > 0);
        return sendNow(p);
      },
    };
    await runInboundSms(tracked, messageId);
    expect(revokedBefore).toEqual([false]);
    expect(log).toContain("sendNow:crisis_response");
    await client().query("reset role");
    expect((await client().query(`select source from phi.consents where revoked_at is not null`)).rows).toEqual([{ source: "sms_free_text" }]);
  });

  it("is idempotent: a retry neither pages nor opens anything twice", async () => {
    const { messageId } = await inbound("I want to die");
    await as("phi_tasks");
    const { deps, log } = inboundDeps(null);
    await runInboundSms(deps, messageId);
    expect(await runInboundSms(deps, messageId)).toEqual({ handled: "already_handled" });
    expect(log.filter((l) => l === "page")).toHaveLength(1);
    await client().query("reset role");
    expect((await client().query(`select count(*)::int as n from phi.crisis_events`)).rows).toEqual([{ n: 1 }]);
  });

  it("a bare STOP revokes at once; a free-text opt-out passes the model first, then revokes", async () => {
    const a = await inbound("STOP");
    const b = await inbound("please don't text me anymore");
    await as("phi_tasks");
    const { deps, log } = inboundDeps("book");
    expect(await runInboundSms(deps, a.messageId)).toEqual({ handled: "stop" });
    expect(log).toEqual([]);
    expect(await runInboundSms(deps, b.messageId)).toEqual({ handled: "stop" });
    expect(log).toEqual(["classify"]);
    await client().query("reset role");
    const sources = await client().query(`select contact_id = $1 as a, source from phi.consents where revoked_at is not null order by a desc`, [a.contactId]);
    expect(sources.rows).toEqual([{ a: true, source: "sms_keyword" }, { a: false, source: "sms_free_text" }]);
  });

  it("a free-text opt-out the model reads as crisis gets the crisis path first, then the opt-out", async () => {
    const { messageId } = await inbound("No more texts. I won't be around after tonight.");
    await as("phi_tasks");
    const { deps, log } = inboundDeps("crisis");
    expect(await runInboundSms(deps, messageId)).toEqual({ handled: "crisis" });
    expect(log).toEqual(["classify", "page", "sendNow:crisis_response"]);
    await client().query("reset role");
    expect((await client().query(`select source from phi.consents where revoked_at is not null`)).rows).toEqual([{ source: "sms_free_text" }]);
  });

  it("a classifier outage still reaches a person: a ticket, no reply", async () => {
    const { messageId } = await inbound("what time do you open on saturday");
    await as("phi_tasks");
    const { deps, log } = inboundDeps("unavailable");
    expect(await runInboundSms(deps, messageId)).toEqual({ handled: "unclassified" });
    expect(log).toEqual(["classify"]);
    await client().query("reset role");
    expect((await client().query(`select kind::text from phi.tickets`)).rows).toEqual([{ kind: "message" }]);
  });

  it("a refused crisis reply is recorded for the clinician; a failed one retries", async () => {
    const refused = await inbound("I want to die");
    const failed = await inbound("I want to kill myself");
    await as("phi_tasks");
    await runInboundSms(inboundDeps(null, { reason: "not_adult" }).deps, refused.messageId);
    await expect(runInboundSms(inboundDeps(null, "failed").deps, failed.messageId)).rejects.toThrow("crisis reply failed");
    await client().query("reset role");
    const events = await client().query(`select message_id = $1 as refused, auto_response_status from phi.crisis_events order by refused desc`, [refused.messageId]);
    expect(events.rows).toEqual([{ refused: true, auto_response_status: "refused_not_adult" }, { refused: false, auto_response_status: "failed" }]);
    expect((await client().query(`select intent from phi.messages where id = $1`, [failed.messageId])).rows).toEqual([{ intent: null }]);
    await as("phi_tasks");
    const retry = inboundDeps(null);
    expect(await runInboundSms(retry.deps, failed.messageId)).toEqual({ handled: "crisis" });
    expect(retry.log.filter((l) => l === "sendNow:crisis_response")).toHaveLength(1);
  });

  it("HELP sends the help template", async () => {
    const { messageId } = await inbound("help");
    await as("phi_tasks");
    const { deps, log } = inboundDeps(null);
    expect(await runInboundSms(deps, messageId)).toEqual({ handled: "help" });
    expect(log).toEqual(["send:help"]);
  });

  it("routes a booking request to a staff ticket with a neutral reply and an action-required notice", async () => {
    const { messageId } = await inbound("Can I get an appointment next week?");
    await as("phi_tasks");
    const { deps, log, notes } = inboundDeps("book");
    expect(await runInboundSms(deps, messageId)).toEqual({ handled: "routed" });
    expect(log).toEqual(["classify", "send:booking_callback"]);
    expect(notes).toHaveLength(1);
    await client().query("reset role");
    expect((await client().query(`select kind::text from phi.tickets`)).rows).toEqual([{ kind: "booking" }]);
    expect((await client().query(`select intent from phi.messages`)).rows).toEqual([{ intent: "book" }]);
  });

  it("the model is a second crisis detector", async () => {
    const { messageId } = await inbound("I just can't anymore, everything is dark");
    await as("phi_tasks");
    const { deps, log } = inboundDeps("crisis");
    expect(await runInboundSms(deps, messageId)).toEqual({ handled: "crisis" });
    expect(log).toEqual(["classify", "page", "sendNow:crisis_response"]);
    await client().query("reset role");
    expect((await client().query(`select detected_by::text from phi.crisis_events`)).rows).toEqual([{ detected_by: "llm" }]);
  });

  it("a classifier failure goes to a person: a ticket, no automated reply, no default category", async () => {
    const { messageId } = await inbound("asdf qwer");
    await as("phi_tasks");
    const { deps, log } = inboundDeps(null);
    expect(await runInboundSms(deps, messageId)).toEqual({ handled: "unclassified" });
    expect(log).toEqual(["classify"]);
    await client().query("reset role");
    expect((await client().query(`select kind::text from phi.tickets`)).rows).toEqual([{ kind: "message" }]);
  });

  it("a symptom or medication question is never answered by text", async () => {
    const { messageId } = await inbound("should I double my dose tonight?");
    await as("phi_tasks");
    const { deps, log } = inboundDeps("other");
    await runInboundSms(deps, messageId);
    expect(log).toEqual(["classify", "send:team_will_call"]);
  });
});

function leadDeps(): LeadDeps & { notes: Date[] } {
  const notes: Date[] = [];
  return { db: clientDb(client()), notifier: { actionRequired: (at) => { notes.push(at); return Promise.resolve(); } }, now: () => new Date(), actor: "referrals.lead-follow-up", notes };
}

async function inquiry(
  reason = "new_patient",
  source = "web",
  contact: Parameters<typeof seedContact>[1] = {},
  code: "verified" | "pending" | "none" = "verified",
): Promise<{ id: string; contactId: string }> {
  const contactId = await seedContact(client(), contact);
  const { rows } = await client().query<{ id: string }>(`insert into phi.inquiries (contact_id, source, reason) values ($1, $2, $3) returning id`, [contactId, source, reason]);
  const id = rows[0]?.id ?? "";
  if (code !== "none") {
    await client().query(
      `insert into phi.phone_verifications (contact_id, inquiry_id, code, code_hmac, expires_at, verified_at)
       values ($1, $2, $3, $4, now() + interval '8 minutes', $5)`,
      [contactId, id, code === "pending" ? "123456" : null, "x".repeat(43), code === "verified" ? new Date() : null],
    );
  }
  return { id, contactId };
}

describe("referrals.lead-follow-up (§5.5)", () => {
  it("opens one callback ticket per inquiry and enrols a web new-patient inquiry in three steps", async () => {
    const { id } = await inquiry();
    await as("phi_tasks");
    const deps = leadDeps();
    const started = await startLead(deps, id);
    expect(started.enrolment).toBe("enrol");
    expect(started.steps.map((s) => s.step)).toEqual([1, 2, 3]);
    await startLead(deps, id);
    expect(deps.notes).toHaveLength(1);
    await client().query("reset role");
    expect((await client().query(`select kind::text from phi.tickets`)).rows).toEqual([{ kind: "callback" }]);
    expect((await client().query(`select count(*)::int as n from phi.follow_ups`)).rows).toEqual([{ n: 3 }]);
  });

  it.each([
    ["existing_patient", "web", "not_new_patient"],
    ["new_patient", "referral", "not_self_submitted"],
  ])("does not enrol %s via %s", async (reason, source, expected) => {
    const { id } = await inquiry(reason, source);
    await as("phi_tasks");
    expect((await startLead(leadDeps(), id)).enrolment).toBe(expected);
  });

  it("each step re-checks everything; D18 skips an unknown-age contact", async () => {
    const unknown = await inquiry("new_patient", "web", { minor: "unknown" });
    const adult = await inquiry();
    await as("phi_tasks");
    const deps = leadDeps();
    await startLead(deps, unknown.id);
    await startLead(deps, adult.id);
    expect(await decideStep(deps, unknown.id, 1)).toBe("skip_not_adult");
    expect(await decideStep(deps, adult.id, 1)).toBe("send");
    await markStepSent(deps, adult.id, 1, "sent");
    expect(await decideStep(deps, adult.id, 1)).toBe("already_done");
    await client().query("reset role");
    await client().query(`update phi.inquiries set status = 'booked' where id = $1`, [adult.id]);
    await as("phi_tasks");
    expect(await decideStep(deps, adult.id, 2)).toBe("skip_not_open");
  });

  it("skips while a crisis is open and when consent is gone", async () => {
    const a = await inquiry();
    const b = await inquiry("new_patient", "web", { consent: "revoked" });
    await client().query(`insert into phi.crisis_events (contact_id, channel, detected_by) values ($1, 'sms', 'keyword')`, [a.contactId]);
    await as("phi_tasks");
    const deps = leadDeps();
    await startLead(deps, a.id);
    await startLead(deps, b.id);
    expect(await decideStep(deps, a.id, 1)).toBe("skip_crisis");
    expect(await decideStep(deps, b.id, 1)).toBe("skip_no_consent");
  });
});

describe("lead follow-up: verification and timing", () => {
  it("only THIS inquiry's confirmed code counts; a live code means wait, not skip", async () => {
    const none = await inquiry("new_patient", "web", {}, "none");
    const pending = await inquiry("new_patient", "web", {}, "pending");
    await as("phi_tasks");
    const deps = leadDeps();
    await startLead(deps, none.id);
    await startLead(deps, pending.id);
    expect(await decideStep(deps, none.id, 1)).toBe("skip_unverified");
    const waiting = await decideStep(deps, pending.id, 1);
    expect(typeof waiting === "object" && waiting.waitUntil.getTime() > Date.now()).toBe(true);
  });

  it("a step long past due is skipped, never sent late", async () => {
    const lead = await inquiry();
    await as("phi_tasks");
    const deps = { ...leadDeps(), now: () => new Date(Date.now() + 3 * 3_600_000) };
    await startLead(deps, lead.id);
    expect(await decideStep(deps, lead.id, 1)).toBe("skip_stale");
  });
});

describe("ops.reconcile", () => {
  it("finds unhandled inbound messages, ticketless web inquiries and unsent live codes", async () => {
    const { messageId } = await inbound("hello");
    await client().query(`update phi.messages set created_at = now() - interval '3 minutes' where id = $1`, [messageId]);
    const lead = await inquiry("new_patient", "web", {}, "none");
    await client().query(`update phi.inquiries set created_at = now() - interval '6 minutes' where id = $1`, [lead.id]);
    const coded = await inquiry("new_patient", "web", {}, "pending");
    await client().query(`update phi.phone_verifications set created_at = now() - interval '2 minutes' where inquiry_id = $1`, [coded.id]);
    await as("phi_tasks");
    const stranded = await findStranded(clientDb(client()), "ops.reconcile");
    expect(stranded.inbound).toEqual([messageId]);
    expect(stranded.inquiries).toEqual([lead.id]);
    expect(stranded.codes.map((c) => c.contactId)).toEqual([coded.contactId]);
  });
});

describe("retention: phone codes", () => {
  it("clears used and expired codes", async () => {
    const contact = await seedContact(client());
    await client().query(
      `insert into phi.phone_verifications (contact_id, code, code_hmac, expires_at, verified_at) values
         ($1, '111111', repeat('x', 43), now() - interval '1 minute', null), ($1, '222222', repeat('x', 43), now() + interval '5 minutes', now()),
         ($1, '333333', repeat('x', 43), now() + interval '5 minutes', null)`,
      [contact],
    );
    await as("phi_tasks");
    expect(await runRetentionSweep(clientDb(client()), "ops.retention-sweep")).toEqual({ messageBodies: 0, codes: 2 });
    await client().query("reset role");
    expect((await client().query(`select code from phi.phone_verifications where code is not null`)).rows).toEqual([{ code: "333333" }]);
  });
});
