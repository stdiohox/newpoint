/**
 * D18 follow-up: "Are you 18 or older?" at first contact, on the web form (edge/intake),
 * in the first SMS exchange (messaging.inbound-sms + send-sms) and at the start of a call
 * (edge/vapi-tools). yes → adult, no → minor, no answer → unknown; an automated answer only
 * ever fills an UNKNOWN age. Against the embedded newpoint-phi database; synthetic data only.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createIntake } from "../../edge/intake/handler.js";
import type { Enqueue } from "../../edge/shared/deps.js";
import { createVapiTools, REPLIES } from "../../edge/vapi-tools/handler.js";
import { buildAssistant, FIRST_MESSAGE, SYSTEM_PROMPT, type VapiClient } from "../../src/adapters/voice/vapi.js";
import { CONSENT_WORDING } from "../../src/domain/consent/wording.js";
import { parseAgeAnswer } from "../../src/domain/messaging/age.js";
import { TEMPLATES } from "../../src/domain/messaging/templates.js";
import { clientDb } from "../../src/lib/db-phi.js";
import { createLogger } from "../../src/lib/logger.js";
import { phi } from "../../src/lib/phi.js";
import { runInboundSms, type InboundDeps } from "../../src/trigger/phi/messaging/inbound-sms.js";
import { AGE_CHECK_PER_HOUR, runSendSms, type SendSmsPayload } from "../../src/trigger/phi/messaging/send-sms.js";
import { startProjectDb, type MarketingDb } from "../db/marketing-db.js";
import { ENV, fakeTwilio, seedContact } from "./fixtures.js";

const SITE = "https://newpointnp.example";
const DAY = new Date("2026-10-20T15:00:00Z");

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
              phi.follow_ups, phi.inquiries, phi.booking_requests, ops.intake_rate cascade; truncate phi.contacts cascade`,
  );
});
const as = (role: "phi_edge" | "phi_tasks") => client().query(`set role ${role}`);
const ageOf = async (phone: string) =>
  (await client().query<{ minor_status: string; minor_status_source: string | null }>(
    `select minor_status::text, minor_status_source from phi.contacts where phone_e164 = $1`,
    [phone],
  )).rows[0];

describe("reading an age answer", () => {
  it.each(["YES", "yes!", "Y", "yeah", "Yes I am", "I'm 18", "yes, i am"])("%s → yes", (t) => {
    expect(parseAgeAnswer(t)).toBe("yes");
  });
  it.each(["No", "NO.", "n", "nope", "not yet", "No, I'm not"])("%s → no", (t) => {
    expect(parseAgeAnswer(t)).toBe("no");
  });
  it.each(["maybe", "what?", "can I book Friday", "yes please book me", "17", ""])("%s → no answer", (t) => {
    expect(parseAgeAnswer(t)).toBeNull();
  });
  it("the question is neutral: Newpoint, the question, how to answer, how to stop", () => {
    expect(TEMPLATES.age_check.text).toBe("Newpoint: before we continue, are you 18 or older? Reply YES or NO. Reply STOP to opt out.");
  });
});

// --- Web intake --------------------------------------------------------------------------

function intake() {
  const calls: { taskId: string; payload: Record<string, unknown> }[] = [];
  const enqueue: Enqueue = (taskId, payload) => {
    calls.push({ taskId, payload });
    return Promise.resolve();
  };
  const handler = createIntake(
    { siteOrigin: SITE, turnstile: () => Promise.resolve(true), hmacSecret: "h".repeat(40), ipHeader: "cf-connecting-ip" },
    { db: clientDb(client()), enqueue, now: () => DAY },
  );
  return { calls, handler };
}
const form = (extra: Record<string, unknown> = {}) => ({
  name: "Test Person",
  email: "test@example.test",
  phone: "(609) 555-0190",
  reason: "New patient inquiry",
  smsConsent: true,
  consentVersion: CONSENT_WORDING.version,
  turnstileToken: "tok",
  ...extra,
});
const post = (handler: (r: Request) => Promise<Response>, path: string, body: unknown, ip = "198.51.100.7") =>
  handler(
    new Request(`https://edge.example.test${path}`, {
      method: "POST",
      headers: { origin: SITE, "content-type": "application/json", "cf-connecting-ip": ip },
      body: JSON.stringify(body),
    }),
  );

describe("web form: Are you 18 or older?", () => {
  it.each([
    // A typed-in number is not proof: "yes" waits for the code even for a new contact.
    ["yes", "unknown", null],
    ["no", "minor", "web_form"],
    [undefined, "unknown", null],
  ])("a new phone contact answering %s is %s until proven", async (answer, status, source) => {
    await as("phi_edge");
    const { handler } = intake();
    expect((await post(handler, "/intake", form(answer === undefined ? {} : { adult: answer }))).status).toBe(200);
    await client().query("reset role");
    expect(await ageOf("+16095550190")).toEqual({ minor_status: status, minor_status_source: source });
  });

  it("no means no code and no texts, even with the consent box ticked (a minor gets a staff callback)", async () => {
    await as("phi_edge");
    const { handler, calls } = intake();
    const response = await post(handler, "/intake", form({ adult: "no" }));
    expect(await response.json()).toEqual({ ok: true, verificationId: null });
    expect(calls.map((c) => c.taskId)).toEqual(["referrals.lead-follow-up"]);
  });

  it("an existing unknown contact's yes waits for the code; once confirmed they are an adult", async () => {
    await seedContact(client(), { phone: "+16095550190", minor: "unknown", consent: "none" });
    await as("phi_edge");
    const { handler, calls } = intake();
    const { verificationId } = (await (await post(handler, "/intake", form({ adult: "yes" }))).json()) as { verificationId: string };
    await client().query("reset role");
    expect((await ageOf("+16095550190"))?.minor_status).toBe("unknown");
    // The code may go to them on the strength of the pending yes (D18 exception for the code only).
    const send = calls.find((c) => c.taskId === "messaging.send-sms")?.payload as SendSmsPayload;
    await as("phi_tasks");
    const twilio = fakeTwilio();
    expect((await runSendSms({ db: clientDb(client()), twilio, env: ENV, now: () => DAY, actor: "messaging.send-sms" }, send)).status).toBe("sent");
    await client().query("reset role");
    const code = (await client().query<{ code: string }>(`select code from phi.phone_verifications`)).rows[0]?.code ?? "";
    await as("phi_edge");
    expect((await post(handler, "/intake/verify", { verificationId, code })).status).toBe(200);
    await client().query("reset role");
    expect(await ageOf("+16095550190")).toEqual({ minor_status: "adult", minor_status_source: "web_form" });
  });

  it("a typed-in number never overrides an age staff already set", async () => {
    await seedContact(client(), { phone: "+16095550190", minor: "adult" });
    await client().query(`update phi.contacts set minor_status_source = 'staff'`);
    await as("phi_edge");
    expect((await post(intake().handler, "/intake", form({ adult: "no" }))).status).toBe(200);
    await client().query("reset role");
    expect(await ageOf("+16095550190")).toEqual({ minor_status: "adult", minor_status_source: "staff" });
  });

  it("an existing contact is never flipped by the form: a no is kept on the inquiry for staff", async () => {
    await seedContact(client(), { phone: "+16095550190", minor: "unknown" });
    await as("phi_edge");
    expect((await post(intake().handler, "/intake", form({ adult: "no" }))).status).toBe(200);
    await client().query("reset role");
    expect(await ageOf("+16095550190")).toEqual({ minor_status: "unknown", minor_status_source: null });
    expect((await client().query(`select age_answer from phi.inquiries`)).rows).toEqual([{ age_answer: "no" }]);
  });

  it("a new contact's yes becomes adult once the code is confirmed; an email-only contact takes it at once", async () => {
    await as("phi_edge");
    const { handler } = intake();
    const { verificationId } = (await (await post(handler, "/intake", form({ adult: "yes" }))).json()) as { verificationId: string };
    await client().query("reset role");
    const code = (await client().query<{ code: string }>(`select code from phi.phone_verifications`)).rows[0]?.code ?? "";
    await as("phi_edge");
    expect((await post(handler, "/intake/verify", { verificationId, code })).status).toBe(200);
    expect((await post(handler, "/intake", form({ adult: "yes", phone: undefined, smsConsent: false, email: "e@example.test" }), "198.51.100.8")).status).toBe(200);
    await client().query("reset role");
    expect(await ageOf("+16095550190")).toEqual({ minor_status: "adult", minor_status_source: "web_form" });
    expect((await client().query(`select minor_status::text from phi.contacts where email = 'e@example.test'`)).rows).toEqual([{ minor_status: "adult" }]);
  });

  it("refuses anything but yes or no", async () => {
    await as("phi_edge");
    expect((await post(intake().handler, "/intake", form({ adult: "maybe" }))).status).toBe(400);
  });
});

// --- First SMS exchange ------------------------------------------------------------------

function inboundDeps(intent: string | null = "logistics_question") {
  const log: string[] = [];
  const deps: InboundDeps = {
    db: clientDb(client()),
    classifier: { parse: () => Promise.resolve(intent === null ? { ok: false as const, reason: "invalid_output" as const } : { ok: true as const, value: { intent } as never }) },
    sendNow: (p) => {
      log.push(`sendNow:${p.template}`);
      return Promise.resolve("sent");
    },
    send: (p) => {
      log.push(`send:${p.template}`);
      return Promise.resolve();
    },
    pageCrisis: () => Promise.resolve(),
    startBooking: () => Promise.resolve(),
    notifier: { actionRequired: () => Promise.resolve() },
    logger: createLogger(() => undefined),
    now: () => DAY,
    actor: "messaging.inbound-sms",
  };
  return { deps, log };
}

let sid = 1;
async function inboundFrom(contactId: string, body: string, conversationId?: string): Promise<{ messageId: string; conversationId: string }> {
  const conv =
    conversationId ??
    (await client().query<{ id: string }>(`insert into phi.conversations (contact_id, channel) values ($1, 'sms') returning id`, [contactId])).rows[0]?.id ??
    "";
  const m = await client().query<{ id: string }>(
    `insert into phi.messages (conversation_id, direction, body, external_ref) values ($1, 'inbound', $2, $3) returning id`,
    [conv, body, `SM${(sid++).toString(16).padStart(32, "0")}`],
  );
  return { messageId: m.rows[0]?.id ?? "", conversationId: conv };
}
const askedAge = (conversationId: string) =>
  client().query(
    `insert into phi.messages (conversation_id, direction, body, template, idempotency_key, external_ref)
     values ($1, 'outbound', 'q', 'age_check', gen_random_uuid()::text, $2)`,
    [conversationId, `SM${(sid++).toString(16).padStart(32, "0")}`],
  );

describe("first SMS exchange: Are you 18 or older?", () => {
  it("an unknown-age texter's first message is handled as usual, and they are asked once", async () => {
    const contactId = await seedContact(client(), { minor: "unknown", consent: "none" });
    const first = await inboundFrom(contactId, "where do I park?");
    await as("phi_tasks");
    const { deps, log } = inboundDeps();
    expect(await runInboundSms(deps, first.messageId)).toEqual({ handled: "routed" });
    expect(log).toEqual(["send:logistics_reply", "send:age_check"]);
  });

  it("a no by text opens a staff callback (no automated texts to someone under 18)", async () => {
    const contactId = await seedContact(client(), { minor: "unknown", consent: "none" });
    const first = await inboundFrom(contactId, "hello");
    await askedAge(first.conversationId);
    const answer = await inboundFrom(contactId, "no", first.conversationId);
    await as("phi_tasks");
    await runInboundSms(inboundDeps().deps, answer.messageId);
    await client().query("reset role");
    expect((await client().query(`select kind::text, source_id from phi.tickets`)).rows).toEqual([{ kind: "callback", source_id: answer.messageId }]);
  });

  it.each([
    ["YES", "adult"],
    ["no", "minor"],
  ])("a clear %s to the question sets the age (source sms)", async (reply, status) => {
    const contactId = await seedContact(client(), { minor: "unknown", consent: "none" });
    const first = await inboundFrom(contactId, "hello");
    await askedAge(first.conversationId);
    const answer = await inboundFrom(contactId, reply, first.conversationId);
    await as("phi_tasks");
    expect(await runInboundSms(inboundDeps().deps, answer.messageId)).toEqual({ handled: "age_answer" });
    await client().query("reset role");
    expect((await client().query(`select minor_status::text, minor_status_source from phi.contacts`)).rows).toEqual([
      { minor_status: status, minor_status_source: "sms" },
    ]);
  });

  it("a yes that is not a direct reply to the question does not count", async () => {
    const contactId = await seedContact(client(), { minor: "unknown", consent: "none" });
    const first = await inboundFrom(contactId, "hello");
    await askedAge(first.conversationId);
    await client().query(
      `insert into phi.messages (conversation_id, direction, body, template, idempotency_key, external_ref, created_at)
       values ($1, 'outbound', 'b', 'booking_callback', gen_random_uuid()::text, $2, now() + interval '1 second')`,
      [first.conversationId, `SM${(sid++).toString(16).padStart(32, "0")}`],
    );
    const later = await inboundFrom(contactId, "yes", first.conversationId);
    await client().query(`update phi.messages set created_at = now() + interval '2 seconds' where id = $1`, [later.messageId]);
    await as("phi_tasks");
    expect((await runInboundSms(inboundDeps().deps, later.messageId)).handled).not.toBe("age_answer");
    await client().query("reset role");
    expect((await client().query(`select minor_status::text from phi.contacts`)).rows).toEqual([{ minor_status: "unknown" }]);
  });

  it("the age question has its own hourly ceiling", async () => {
    const unknown = await seedContact(client(), { minor: "unknown", consent: "none" });
    const u = await inboundFrom(unknown, "hi");
    for (let i = 0; i < AGE_CHECK_PER_HOUR; i += 1) await askedAge(u.conversationId);
    await as("phi_tasks");
    const deps = { db: clientDb(client()), twilio: fakeTwilio(), env: { ...ENV, SMS_PER_NUMBER_DAILY: 100, SMS_DAILY_BUDGET: 1000 }, now: () => DAY, actor: "messaging.send-sms" };
    expect(await runSendSms(deps, { template: "age_check", contactId: unknown, entityId: u.messageId, step: 0 })).toEqual({ status: "refused", reason: "age_check_limit" });
  });

  it("an unclear reply leaves the age unknown and is not asked again", async () => {
    const contactId = await seedContact(client(), { minor: "unknown", consent: "none" });
    const first = await inboundFrom(contactId, "hello");
    await askedAge(first.conversationId);
    const next = await inboundFrom(contactId, "can I come Friday?", first.conversationId);
    await as("phi_tasks");
    const { deps, log } = inboundDeps();
    expect(await runInboundSms(deps, next.messageId)).toEqual({ handled: "routed" });
    expect(log).not.toContain("send:age_check");
    await client().query("reset role");
    expect((await client().query(`select minor_status::text from phi.contacts`)).rows).toEqual([{ minor_status: "unknown" }]);
  });

  it("crisis still comes first, and a known age is never asked", async () => {
    const unknown = await seedContact(client(), { minor: "unknown" });
    const adult = await seedContact(client(), { minor: "adult" });
    const crisis = await inboundFrom(unknown, "I want to end my life");
    const normal = await inboundFrom(adult, "where do I park?");
    await as("phi_tasks");
    const a = inboundDeps();
    expect(await runInboundSms(a.deps, crisis.messageId)).toEqual({ handled: "crisis" });
    expect(a.log).not.toContain("send:age_check");
    const b = inboundDeps();
    await runInboundSms(b.deps, normal.messageId);
    expect(b.log).not.toContain("send:age_check");
  });

  it("send-sms sends the question only as a recent reply, to an unknown age, never after STOP or to a minor", async () => {
    const unknown = await seedContact(client(), { minor: "unknown", consent: "none", verified: false });
    const minor = await seedContact(client(), { minor: "minor", consent: "none" });
    const stopped = await seedContact(client(), { minor: "unknown", consent: "revoked" });
    const u = await inboundFrom(unknown, "hi");
    const m = await inboundFrom(minor, "hi");
    const s = await inboundFrom(stopped, "hi");
    const old = await inboundFrom(unknown, "earlier", u.conversationId);
    await client().query(`update phi.messages set created_at = now() - interval '2 hours' where id = $1`, [old.messageId]);
    await as("phi_tasks");
    const twilio = fakeTwilio();
    const deps = { db: clientDb(client()), twilio, env: ENV, now: () => DAY, actor: "messaging.send-sms" };
    const ask = (contactId: string, entityId: string) => runSendSms(deps, { template: "age_check", contactId, entityId, step: 0 });
    expect((await ask(unknown, u.messageId)).status).toBe("sent");
    expect(await ask(minor, m.messageId)).toEqual({ status: "refused", reason: "not_adult" });
    expect(await ask(stopped, s.messageId)).toEqual({ status: "refused", reason: "no_consent" });
    expect(await ask(unknown, old.messageId)).toEqual({ status: "refused", reason: "no_consent" });
    expect(await ask(unknown, m.messageId)).toEqual({ status: "refused", reason: "no_consent" });
    expect(twilio.sms).toHaveLength(1);
    // Nothing else goes to an unknown age: D18 still holds for every other template.
    expect(await runSendSms(deps, { template: "team_will_call", contactId: unknown, entityId: u.messageId, step: 0 })).toEqual({ status: "refused", reason: "not_adult" });
  });
});

// --- Voice ---------------------------------------------------------------------------------

const SECRET = "v".repeat(40);
const CALLER = "+16095550195";
function tools(callerNumber: string | null = CALLER) {
  const vapi: VapiClient = { getCall: (id) => Promise.resolve({ id, assistantId: "asst", status: "in-progress", callerNumber: callerNumber === null ? null : phi(callerNumber) }) };
  return createVapiTools({ secret: SECRET, assistantId: "asst", vapi }, { db: clientDb(client()), enqueue: () => Promise.resolve(), now: () => DAY });
}
const confirmAge = (handler: (r: Request) => Promise<Response>, answer: string, call = "call_age1") =>
  handler(
    new Request("https://edge.example.test/vapi-tools", {
      method: "POST",
      headers: { "content-type": "application/json", "x-vapi-secret": SECRET },
      body: JSON.stringify({ message: { type: "tool-calls", call: { id: call }, toolCallList: [{ id: "tc1", function: { name: "confirm_age", arguments: { answer } } }] } }),
    }),
  ).then(async (r) => ((await r.json()) as { results: { result: string }[] }).results[0]?.result);

describe("start of a call: Are you 18 or older?", () => {
  it("the greeting asks, after saying it is automated; the prompt records it once and keeps crisis first", () => {
    expect(FIRST_MESSAGE).toMatch(/automated assistant.*not recorded.*Before we go on, are you 18 or older\?$/);
    expect(SYSTEM_PROMPT).toMatch(/confirm_age/);
    expect(SYSTEM_PROMPT).toMatch(/Do not ask again, do not explain why you ask/);
    expect(SYSTEM_PROMPT.indexOf("confirm_age")).toBeGreaterThan(-1);
    const names = ((buildAssistant({
      model: { provider: "p", model: "m" },
      transcriber: { provider: "p" },
      voice: { provider: "p", voiceId: "v" },
      toolsUrl: "https://e.test/t",
      eventsUrl: "https://e.test/e",
      crisisTransferNumber: "+16095550199",
    })["model"] as { tools: { function?: { name: string } }[] }).tools).flatMap((t) => (t.function === undefined ? [] : [t.function.name]));
    expect(names).toContain("confirm_age");
    expect(FIRST_MESSAGE).not.toMatch(/psychiatr|mental|medic/i);
  });

  it.each([
    ["yes", "adult"],
    ["no", "minor"],
  ])("answer %s → %s", async (answer, status) => {
    await as("phi_edge");
    expect(await confirmAge(tools(), answer)).toBe(REPLIES.ageNoted);
    await client().query("reset role");
    expect(await ageOf(CALLER)).toEqual({ minor_status: status, minor_status_source: "voice" });
  });

  it("no answer records nothing: an existing caller stays unknown", async () => {
    await seedContact(client(), { phone: CALLER, minor: "unknown" });
    await as("phi_edge");
    expect(await confirmAge(tools(), "no_answer")).toBe(REPLIES.ageNoted);
    await client().query("reset role");
    expect(await ageOf(CALLER)).toEqual({ minor_status: "unknown", minor_status_source: null });
  });

  it("a later no on a call replaces an earlier self-reported yes", async () => {
    await seedContact(client(), { phone: CALLER, minor: "unknown" });
    await client().query(`update phi.contacts set minor_status = 'adult', minor_status_source = 'web_form'`);
    await as("phi_edge");
    expect(await confirmAge(tools(), "no")).toBe(REPLIES.ageNoted);
    await client().query("reset role");
    expect(await ageOf(CALLER)).toEqual({ minor_status: "minor", minor_status_source: "voice" });
  });

  it("never overrides an age already set, and a withheld number records nothing", async () => {
    await seedContact(client(), { phone: CALLER, minor: "adult" });
    await client().query(`update phi.contacts set minor_status_source = 'staff'`);
    await as("phi_edge");
    expect(await confirmAge(tools(), "no")).toBe(REPLIES.ageNoted);
    expect(await confirmAge(tools(null), "yes", "call_age2")).toBe(REPLIES.ageNoted);
    await client().query("reset role");
    expect(await ageOf(CALLER)).toEqual({ minor_status: "adult", minor_status_source: "staff" });
    expect((await client().query(`select count(*)::int as n from phi.contacts`)).rows).toEqual([{ n: 1 }]);
  });
});

describe("the database guard", () => {
  it("an automated path: yes only fills unknown, no may replace a self-report, never staff; must say how", async () => {
    const staffAdult = await seedContact(client(), { minor: "adult" });
    await client().query(`update phi.contacts set minor_status_source = 'staff' where id = $1`, [staffAdult]);
    const selfMinor = await seedContact(client(), { minor: "unknown" });
    await client().query(`update phi.contacts set minor_status = 'minor', minor_status_source = 'sms' where id = $1`, [selfMinor]);
    const unknown = await seedContact(client(), { minor: "unknown" });
    await as("phi_tasks");
    await expect(client().query(`update phi.contacts set minor_status = 'minor', minor_status_source = 'sms' where id = $1`, [staffAdult])).rejects.toThrow(/staff decision/);
    await client().query("reset role");
    await as("phi_tasks");
    await expect(client().query(`update phi.contacts set minor_status = 'adult', minor_status_source = 'sms' where id = $1`, [selfMinor])).rejects.toThrow(/unknown age/);
    await client().query("reset role");
    await as("phi_tasks");
    await expect(client().query(`update phi.contacts set minor_status = 'adult' where id = $1`, [unknown])).rejects.toThrow(/say where it came from/);
  });

  it("the guards hold for a LOGIN role that is a member of phi_tasks / phi_edge (how runtimes connect)", async () => {
    await client().query(`do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'tasks_rt') then create role tasks_rt login inherit; end if;
      if not exists (select 1 from pg_roles where rolname = 'edge_rt') then create role edge_rt login inherit; end if;
    end $$`);
    await client().query(`grant phi_tasks to tasks_rt; grant phi_edge to edge_rt`);
    const staffAdult = await seedContact(client(), { minor: "adult" });
    await client().query(`update phi.contacts set minor_status_source = 'staff' where id = $1`, [staffAdult]);
    await client().query("set role tasks_rt");
    await expect(client().query(`update phi.contacts set minor_status = 'minor', minor_status_source = 'sms' where id = $1`, [staffAdult])).rejects.toThrow(/staff decision/);
    await client().query("reset role");
    const v = await client().query<{ id: string }>(
      `insert into phi.phone_verifications (contact_id, code, code_hmac, expires_at, attempts) values ($1, '123456', repeat('x', 43), now() + interval '5 minutes', 3) returning id`,
      [staffAdult],
    );
    await client().query("set role edge_rt");
    await expect(client().query(`update phi.phone_verifications set attempts = 0 where id = $1`, [v.rows[0]?.id])).rejects.toThrow(/go up by one/);
    await client().query("reset role");
  });

  it("the source of an age cannot be rewritten without the age", async () => {
    const id = await seedContact(client(), { minor: "adult" });
    await as("phi_edge");
    await expect(client().query(`update phi.contacts set minor_status_source = 'staff' where id = $1`, [id])).rejects.toThrow(/changes only with the age/);
  });

  it("staff can change any age; the source becomes staff", async () => {
    const id = await seedContact(client(), { minor: "unknown" });
    await client().query("begin");
    await client().query("set local role staff_console");
    await client().query(`select set_config('request.jwt.claims', '{"sub":"admin-1","staff_role":"staff_admin"}', true)`);
    await client().query(`update phi.contacts set minor_status = 'adult' where id = $1`, [id]);
    await client().query("commit");
    expect((await client().query(`select minor_status::text, minor_status_source, minor_status_at is not null as stamped from phi.contacts`)).rows).toEqual([
      { minor_status: "adult", minor_status_source: "staff", stamped: true },
    ]);
  });
});

