/**
 * Phase 6 against the embedded newpoint-phi database: edge/twilio-inbound and edge/intake
 * as phi_edge, messaging.inbound-sms and referrals.lead-follow-up as phi_tasks. Twilio,
 * Turnstile, the classifier, Trigger.dev and n8n are fakes. All data is synthetic.
 */
import { createHmac } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Enqueue } from "../../edge/shared/deps.js";
import { createTwilioInbound } from "../../edge/twilio-inbound/handler.js";
import type { PhiClaude } from "../../src/adapters/llm/anthropic-phi.js";
import type { PhiNotifier } from "../../src/adapters/n8n/phi-notify.js";
import { clientDb } from "../../src/lib/db-phi.js";
import { createLogger } from "../../src/lib/logger.js";
import { runInboundSms, type InboundDeps } from "../../src/trigger/phi/messaging/inbound-sms.js";
import { startProjectDb, type MarketingDb } from "../db/marketing-db.js";
import { seedContact } from "./fixtures.js";

const NOW = new Date("2026-10-20T15:00:00Z");
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
    startBooking: () => {
      log.push("startBooking");
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
        revokedBefore.push(((await client().query(`select count(*)::int as n from phi.consents where revoked_at is not null and kind = 'sms_transactional'`)).rows[0] as { n: number }).n > 0);
        return sendNow(p);
      },
    };
    await runInboundSms(tracked, messageId);
    expect(revokedBefore).toEqual([false]);
    expect(log).toContain("sendNow:crisis_response");
    await client().query("reset role");
    expect((await client().query(`select source from phi.consents where revoked_at is not null and kind = 'sms_transactional'`)).rows).toEqual([{ source: "sms_free_text" }]);
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
    const sources = await client().query(`select contact_id = $1 as a, source from phi.consents where revoked_at is not null and kind = 'sms_transactional' order by a desc`, [a.contactId]);
    expect(sources.rows).toEqual([{ a: true, source: "sms_keyword" }, { a: false, source: "sms_free_text" }]);
  });

  it("a free-text opt-out the model reads as crisis gets the crisis path first, then the opt-out", async () => {
    const { messageId } = await inbound("No more texts. I won't be around after tonight.");
    await as("phi_tasks");
    const { deps, log } = inboundDeps("crisis");
    expect(await runInboundSms(deps, messageId)).toEqual({ handled: "crisis" });
    expect(log).toEqual(["classify", "page", "sendNow:crisis_response"]);
    await client().query("reset role");
    expect((await client().query(`select source from phi.consents where revoked_at is not null and kind = 'sms_transactional'`)).rows).toEqual([{ source: "sms_free_text" }]);
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

  it("turns a booking request into one booking_requests row for booking.request (Phase 7)", async () => {
    const { messageId } = await inbound("Can I get an appointment next week?");
    await as("phi_tasks");
    const { deps, log } = inboundDeps("book");
    expect(await runInboundSms(deps, messageId)).toEqual({ handled: "routed" });
    expect(log).toEqual(["classify", "startBooking"]);
    await client().query("reset role");
    await client().query(`update phi.messages set intent = null`);
    await as("phi_tasks");
    await runInboundSms(deps, messageId);
    await client().query("reset role");
    expect((await client().query(`select count(*)::int as n from phi.booking_requests where source_message_id = $1`, [messageId])).rows).toEqual([{ n: 1 }]);
    expect((await client().query(`select intent from phi.messages`)).rows).toEqual([{ intent: "book" }]);
  });

  it("routes a logistics question to a staff ticket with a neutral reply and an action-required notice", async () => {
    const { messageId } = await inbound("where do I park?");
    await as("phi_tasks");
    const { deps, log, notes } = inboundDeps("logistics_question");
    expect(await runInboundSms(deps, messageId)).toEqual({ handled: "routed" });
    expect(log).toEqual(["classify", "send:logistics_reply"]);
    expect(notes).toHaveLength(1);
    await client().query("reset role");
    expect((await client().query(`select kind::text from phi.tickets`)).rows).toEqual([{ kind: "message" }]);
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
