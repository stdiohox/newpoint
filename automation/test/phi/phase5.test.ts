/**
 * Phase 5 against the embedded Postgres shaped like newpoint-phi, AS phi_tasks
 * (the runtime role, RLS on): messaging.send-sms (§5.0), ops.crisis-page and the
 * dead-man check (§5.8), ops.retention-sweep. Twilio is a fake; all data is synthetic.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clientDb, revokeConsent } from "../../src/lib/db-phi.js";
import { createLogger } from "../../src/lib/logger.js";
import { runSendSms, type SendSmsDeps, type SendSmsPayload } from "../../src/trigger/phi/messaging/send-sms.js";
import { pageRound, runCrisisDeadMan, type CrisisPageDeps } from "../../src/trigger/phi/ops/crisis-page.js";
import { runRetentionSweep } from "../../src/trigger/phi/ops/retention-sweep.js";
import { startProjectDb, type MarketingDb } from "../db/marketing-db.js";
import { ENTITY, ENV, fakeTwilio, seedContact, type FakeTwilio } from "./fixtures.js";

/** 11:00 in New Jersey: inside 08:00–21:00. */
const DAY = new Date("2026-10-20T15:00:00Z");
/** 22:30 in New Jersey. */
const NIGHT = new Date("2026-10-21T02:30:00Z");

let db: MarketingDb | undefined;
const client = () => {
  if (!db) throw new Error("phi database did not start");
  return db.client;
};
let twilio: FakeTwilio;

beforeAll(async () => {
  db = await startProjectDb("phi");
});
afterAll(async () => {
  await db?.stop();
});
beforeEach(async () => {
  await client().query("reset role");
  await client().query(
    `truncate phi.audit_log, phi.messages, phi.conversations, phi.crisis_events, phi.consents, phi.tickets, ops.page_log, ops.agent_health cascade;
     truncate phi.contacts cascade`,
  );
  twilio = fakeTwilio();
});

/** Seeding runs as the superuser; the code under test runs as phi_tasks. */
const asTasks = () => client().query("set role phi_tasks");

function smsDeps(now = DAY, env: Partial<typeof ENV> = {}): SendSmsDeps {
  return { db: clientDb(client()), twilio, env: { ...ENV, ...env }, now: () => now, actor: "messaging.send-sms" };
}
const payload = (contactId: string, template: SendSmsPayload["template"] = "team_will_call", entityId = ENTITY(), step = 0): SendSmsPayload => ({
  template,
  contactId,
  entityId,
  step,
});

describe("messaging.send-sms (§5.0)", () => {
  it("sends to a consenting, verified adult and records the send", async () => {
    const contact = await seedContact(client());
    await asTasks();
    const outcome = await runSendSms(smsDeps(), payload(contact));
    expect(outcome.status).toBe("sent");
    expect(twilio.sms).toHaveLength(1);
    expect(twilio.sms[0]?.body).toMatch(/^Newpoint: /);
    await client().query("reset role");
    const { rows } = await client().query<{ external_ref: string; template: string; failed_at: Date | null }>(
      `select external_ref, template, failed_at from phi.messages`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.external_ref).toMatch(/^SM/);
    expect(rows[0]).toMatchObject({ template: "team_will_call", failed_at: null });
    const audit = await client().query(`select action::text, entity from phi.audit_log where action in ('send', 'read') order by id`);
    expect(audit.rows).toEqual([
      { action: "read", entity: "contacts" },
      { action: "send", entity: "messages" },
    ]);
  });

  it("never sends the same (template, entity, step) twice", async () => {
    const contact = await seedContact(client());
    await asTasks();
    const p = payload(contact);
    expect((await runSendSms(smsDeps(), p)).status).toBe("sent");
    expect(await runSendSms(smsDeps(), p)).toEqual({ status: "duplicate" });
    expect((await runSendSms(smsDeps(), { ...p, step: 1 })).status).toBe("sent");
    expect(twilio.sms).toHaveLength(2);
  });

  it.each([
    ["minor", { minor: "minor" as const }, "not_adult"],
    ["unknown age (D18)", { minor: "unknown" as const }, "not_adult"],
    ["no consent", { consent: "none" as const }, "no_consent"],
    ["revoked consent", { consent: "revoked" as const }, "no_consent"],
    ["unverified phone", { verified: false }, "phone_unverified"],
    ["no phone", { phone: null }, "no_phone"],
  ])("refuses: %s", async (_label, spec, reason) => {
    const contact = await seedContact(client(), spec);
    await asTasks();
    expect(await runSendSms(smsDeps(), payload(contact))).toEqual({ status: "refused", reason });
    expect(twilio.sms).toEqual([]);
  });

  it("a STOP recorded as phi_tasks in the same transaction as the send check wins", async () => {
    const contact = await seedContact(client());
    await asTasks();
    await clientDb(client()).tx("messaging.inbound-sms", (q) => revokeConsent(q, contact, "sms_transactional", "sms_keyword", { keyword: "STOP" }));
    expect(await runSendSms(smsDeps(), payload(contact))).toEqual({ status: "refused", reason: "no_consent" });
  });

  it("refuses an unknown contact", async () => {
    await asTasks();
    expect(await runSendSms(smsDeps(), payload(ENTITY()))).toEqual({ status: "refused", reason: "no_contact" });
  });

  it("D18 holds even for the crisis auto-response: no automated text to a minor or unknown age", async () => {
    const contact = await seedContact(client(), { minor: "unknown" });
    await asTasks();
    expect(await runSendSms(smsDeps(NIGHT), payload(contact, "crisis_response"))).toEqual({ status: "refused", reason: "not_adult" });
  });

  it("a verification code needs its own pending-consent row, not just any consent", async () => {
    const consented = await seedContact(client(), { verified: false });
    const noConsent = await seedContact(client(), { verified: false, consent: "none" });
    await asTasks();
    // Phase 6: the code's consent rides on its phone_verifications row (sent: test/phi/phase6.test.ts).
    expect(await runSendSms(smsDeps(), payload(consented, "verification_code"))).toEqual({ status: "refused", reason: "no_consent" });
    expect(await runSendSms(smsDeps(), payload(noConsent, "verification_code"))).toEqual({ status: "refused", reason: "no_consent" });
  });

  it("pauses sequence templates during an open crisis, but not other templates", async () => {
    const contact = await seedContact(client());
    await client().query(`insert into phi.crisis_events (contact_id, channel, detected_by) values ($1, 'sms', 'keyword')`, [contact]);
    await asTasks();
    expect(await runSendSms(smsDeps(), payload(contact, "lead_follow_up_1"))).toEqual({ status: "refused", reason: "sequences_paused" });
    expect((await runSendSms(smsDeps(), payload(contact, "team_will_call"))).status).toBe("sent");
    await client().query("reset role");
    await client().query(`update phi.crisis_events set staff_ack_at = now(), sequences_resumed_at = now()`);
    await asTasks();
    expect((await runSendSms(smsDeps(), payload(contact, "lead_follow_up_1"))).status).toBe("sent");
  });

  it("defers outside 08:00–21:00 New York time to the next 08:00", async () => {
    const contact = await seedContact(client());
    await asTasks();
    expect(await runSendSms(smsDeps(NIGHT), payload(contact))).toEqual({ status: "deferred", until: new Date("2026-10-21T12:00:00Z") });
    expect(twilio.sms).toEqual([]);
  });

  it("sends the crisis auto-response at any hour", async () => {
    const contact = await seedContact(client());
    await asTasks();
    expect((await runSendSms(smsDeps(NIGHT), payload(contact, "crisis_response"))).status).toBe("sent");
    expect(twilio.sms[0]?.body).toContain("988");
  });

  it("trips the global budget, pages Koret ops once a day, and sends nothing", async () => {
    const a = await seedContact(client());
    const b = await seedContact(client());
    await asTasks();
    const deps = smsDeps(DAY, { SMS_DAILY_BUDGET: 1 });
    expect((await runSendSms(deps, payload(a))).status).toBe("sent");
    expect(await runSendSms(deps, payload(b))).toEqual({ status: "refused", reason: "global_budget" });
    expect(await runSendSms(deps, payload(b))).toEqual({ status: "refused", reason: "global_budget" });
    expect(twilio.sms).toHaveLength(1);
    expect(twilio.pages.map((p) => p.to)).toEqual([ENV.PHI_OPS_PAGE_PHONE]);
    expect(twilio.pages[0]?.text).toMatch(/^Newpoint ops: the daily SMS budget/);
  });

  it("the crisis auto-response is never held back by the budget", async () => {
    const a = await seedContact(client());
    const b = await seedContact(client());
    await asTasks();
    const deps = smsDeps(DAY, { SMS_DAILY_BUDGET: 1 });
    await runSendSms(deps, payload(a));
    expect((await runSendSms(deps, payload(b, "crisis_response"))).status).toBe("sent");
  });

  it("applies the per-number daily limit", async () => {
    const contact = await seedContact(client());
    await asTasks();
    const deps = smsDeps(DAY, { SMS_PER_NUMBER_DAILY: 2 });
    for (let i = 0; i < 2; i += 1) expect((await runSendSms(deps, payload(contact))).status).toBe("sent");
    expect(await runSendSms(deps, payload(contact))).toEqual({ status: "refused", reason: "number_limit" });
  });

  it("releases the claim when Twilio rejects (4xx), so the retry sends exactly once", async () => {
    const contact = await seedContact(client());
    await asTasks();
    const p = payload(contact);
    twilio.fail.sms = "rejected";
    await expect(runSendSms(smsDeps(), p)).rejects.toThrow();
    twilio.fail.sms = undefined;
    expect((await runSendSms(smsDeps(), p)).status).toBe("sent");
    expect(await runSendSms(smsDeps(), p)).toEqual({ status: "duplicate" });
    expect(twilio.sms).toHaveLength(1);
    await client().query("reset role");
    const { rows } = await client().query<{ n: number }>(`select count(*)::int as n from phi.messages where failed_at is not null and idempotency_key is null`);
    expect(rows[0]?.n).toBe(1);
  });

  it("keeps the claim when the outcome is ambiguous (5xx, timeout): the retry never sends a second text", async () => {
    const contact = await seedContact(client());
    await asTasks();
    const p = payload(contact);
    twilio.fail.sms = "ambiguous";
    await expect(runSendSms(smsDeps(), p)).rejects.toThrow();
    twilio.fail.sms = undefined;
    expect(await runSendSms(smsDeps(), p)).toEqual({ status: "duplicate" });
    expect(twilio.sms).toEqual([]);
  });

  it("a failed send does not count against the budget", async () => {
    const a = await seedContact(client());
    const b = await seedContact(client());
    await asTasks();
    const deps = smsDeps(DAY, { SMS_DAILY_BUDGET: 1 });
    twilio.fail.sms = "rejected";
    await expect(runSendSms(deps, payload(a))).rejects.toThrow();
    twilio.fail.sms = undefined;
    expect((await runSendSms(deps, payload(b))).status).toBe("sent");
  });

  it("refuses sequence templates whose slots arrive in later phases, without sending", async () => {
    const contact = await seedContact(client());
    await asTasks();
    await expect(runSendSms(smsDeps(), payload(contact, "appointment_reminder_48h"))).rejects.toThrow("slots_unavailable");
    expect(twilio.sms).toEqual([]);
  });
});

function pageDeps(): CrisisPageDeps {
  return { db: clientDb(client()), twilio, env: ENV, logger: createLogger(() => undefined), actor: "ops.crisis-page" };
}

async function crisis(detectedMinutesAgo = 0): Promise<string> {
  const contact = await seedContact(client());
  const { rows } = await client().query<{ id: string }>(
    `insert into phi.crisis_events (contact_id, channel, detected_by, detected_at) values ($1, 'sms', 'keyword', now() - make_interval(mins => $2)) returning id`,
    [contact, detectedMinutesAgo],
  );
  const id = rows[0]?.id;
  if (id === undefined) throw new Error("crisis");
  return id;
}

describe("ops.crisis-page (§5.8)", () => {
  it("pages the on-call clinician by SMS and call, with no patient detail", async () => {
    const id = await crisis();
    await asTasks();
    expect(await pageRound(pageDeps(), id)).toBe("paged");
    expect(twilio.pages).toEqual([{ to: ENV.PHI_ON_CALL_PRIMARY_PHONE, text: `Newpoint URGENT: a patient may be in crisis. Acknowledge in the staff console now: ${ENV.PHI_STAFF_CONSOLE_URL}` }]);
    expect(twilio.calls.map((c) => c.to)).toEqual([ENV.PHI_ON_CALL_PRIMARY_PHONE]);
    expect([...twilio.pages, ...twilio.calls].every((p) => !p.text.includes("Testperson") && !/\+1\d{10}/.test(p.text))).toBe(true);
  });

  it("does not repeat a round within 10 minutes, then repeats", async () => {
    const id = await crisis();
    await asTasks();
    await pageRound(pageDeps(), id);
    expect(await pageRound(pageDeps(), id)).toBe("not_due");
    await client().query("reset role");
    await client().query(`update phi.crisis_events set paged_at = now() - interval '10 minutes'`);
    await asTasks();
    expect(await pageRound(pageDeps(), id)).toBe("paged");
    await client().query("reset role");
    expect((await client().query(`select page_count from phi.crisis_events`)).rows).toEqual([{ page_count: 2 }]);
  });

  it("escalates to the second provider after 30 minutes", async () => {
    const id = await crisis(31);
    await asTasks();
    await pageRound(pageDeps(), id);
    expect(twilio.pages.map((p) => p.to)).toEqual([ENV.PHI_ON_CALL_PRIMARY_PHONE, ENV.PHI_ON_CALL_SECONDARY_PHONE]);
    expect(twilio.calls.map((p) => p.to)).toEqual([ENV.PHI_ON_CALL_PRIMARY_PHONE, ENV.PHI_ON_CALL_SECONDARY_PHONE]);
  });

  it("stops once a clinician acknowledges", async () => {
    const id = await crisis();
    await client().query(`update phi.crisis_events set staff_ack_at = now(), staff_ack_by = 'clinician-1'`);
    await asTasks();
    expect(await pageRound(pageDeps(), id)).toBe("acknowledged");
    expect(twilio.pages).toEqual([]);
  });

  it("counts a round as paged if the call got through when the SMS failed", async () => {
    const id = await crisis();
    await asTasks();
    twilio.fail.page = true;
    expect(await pageRound(pageDeps(), id)).toBe("paged");
    expect(twilio.calls).toHaveLength(1);
  });

  it("pages the secondary in the same round when the primary cannot be reached", async () => {
    const id = await crisis();
    await asTasks();
    const page = twilio.page.bind(twilio);
    const call = twilio.call.bind(twilio);
    twilio.page = (to, text) => (to === ENV.PHI_ON_CALL_PRIMARY_PHONE ? Promise.reject(new Error("21610")) : page(to, text));
    twilio.call = (to, text) => (to === ENV.PHI_ON_CALL_PRIMARY_PHONE ? Promise.reject(new Error("21610")) : call(to, text));
    expect(await pageRound(pageDeps(), id)).toBe("paged");
    expect(twilio.pages.map((p) => p.to)).toEqual([ENV.PHI_ON_CALL_SECONDARY_PHONE]);
    expect(twilio.calls.map((p) => p.to)).toEqual([ENV.PHI_ON_CALL_SECONDARY_PHONE]);
  });

  it("rolls the round back when nothing was delivered, so a retry pages at once", async () => {
    const id = await crisis();
    await asTasks();
    twilio.fail = { page: true, call: true };
    await expect(pageRound(pageDeps(), id)).rejects.toThrow("no page was delivered");
    twilio.fail = {};
    expect(await pageRound(pageDeps(), id)).toBe("paged");
    await client().query("reset role");
    expect((await client().query(`select page_count from phi.crisis_events`)).rows).toEqual([{ page_count: 1 }]);
  });
});

describe("crisis_events: only a clinician ends paging", () => {
  it("a task credential cannot acknowledge or resume", async () => {
    const id = await crisis();
    await asTasks();
    await expect(client().query(`update phi.crisis_events set staff_ack_at = now() where id = $1`, [id])).rejects.toThrow(/permission denied/);
    await client().query("reset role");
    await asTasks();
    await expect(client().query(`update phi.crisis_events set sequences_resumed_at = now() where id = $1`, [id])).rejects.toThrow(/permission denied/);
  });

  it("the schema refuses a resume before an acknowledgment, whoever writes it", async () => {
    const id = await crisis();
    await expect(client().query(`update phi.crisis_events set sequences_resumed_at = now() where id = $1`, [id])).rejects.toThrow(/check constraint/);
  });

  it("no role can write an audit row in someone else's name", async () => {
    await asTasks();
    await expect(
      client().query(`insert into phi.audit_log (actor, action, entity) values ('clinician-9', 'read', 'contacts')`),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("crisis dead-man check (§5.8)", () => {
  it("pages an event not paged within 2 minutes, and alerts Koret ops once", async () => {
    await crisis(3);
    await crisis(1); // still inside the 2-minute window
    await asTasks();
    expect(await runCrisisDeadMan(pageDeps())).toEqual({ repaged: 1 });
    expect(twilio.pages.filter((p) => p.to === ENV.PHI_OPS_PAGE_PHONE)).toHaveLength(1);
    expect(twilio.pages.filter((p) => p.to === ENV.PHI_ON_CALL_PRIMARY_PHONE)).toHaveLength(1);
    expect(await runCrisisDeadMan(pageDeps())).toEqual({ repaged: 0 });
    expect(twilio.pages.filter((p) => p.to === ENV.PHI_OPS_PAGE_PHONE)).toHaveLength(1);
  });

  it("re-pages when the repeating task stopped (last page over 12 minutes old)", async () => {
    const id = await crisis(20);
    await client().query(`update phi.crisis_events set paged_at = now() - interval '13 minutes', page_count = 1 where id = $1`, [id]);
    await asTasks();
    expect(await runCrisisDeadMan(pageDeps())).toEqual({ repaged: 1 });
  });

  it("does not page Koret ops when the repeating task already paged the round", async () => {
    const id = await crisis(3);
    await asTasks();
    await pageRound(pageDeps(), id);
    await client().query("reset role");
    // The cron's select saw it as late, but the task claimed the round first.
    await client().query(`update phi.crisis_events set paged_at = now() where id = $1`, [id]);
    await asTasks();
    expect(await runCrisisDeadMan(pageDeps())).toEqual({ repaged: 0 });
    expect(twilio.pages.filter((p) => p.to === ENV.PHI_OPS_PAGE_PHONE)).toEqual([]);
  });

  it("leaves acknowledged events alone", async () => {
    await crisis(10);
    await client().query(`update phi.crisis_events set staff_ack_at = now(), staff_ack_by = 'clinician-1'`);
    await asTasks();
    expect(await runCrisisDeadMan(pageDeps())).toEqual({ repaged: 0 });
    expect(twilio.pages).toEqual([]);
  });
});

describe("ops.retention-sweep", () => {
  it("clears bodies past purge_after and keeps the rows", async () => {
    const contact = await seedContact(client());
    const { rows } = await client().query<{ id: string }>(`insert into phi.conversations (contact_id, channel) values ($1, 'sms') returning id`, [contact]);
    const conv = rows[0]?.id;
    await client().query(
      `insert into phi.messages (conversation_id, direction, body, purge_after) values
         ($1, 'inbound', 'old', now() - interval '1 day'), ($1, 'inbound', 'kept', now() + interval '1 day'), ($1, 'inbound', 'no period', null)`,
      [conv],
    );
    await asTasks();
    expect(await runRetentionSweep(clientDb(client()), "ops.retention-sweep")).toEqual({ messageBodies: 1, codes: 0 });
    const left = await client().query(`select body from phi.messages order by body nulls first`);
    expect(left.rows.map((r: { body: string | null }) => r.body)).toEqual([null, "kept", "no period"]);
  });
});
