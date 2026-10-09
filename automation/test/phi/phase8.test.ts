/**
 * Phase 8 against the embedded newpoint-phi database: edge/vapi-tools and edge/vapi-events
 * as phi_edge, booking.process-call-report as phi_tasks, and the assistant config. Vapi is
 * a fake; all data is synthetic.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createVapiEvents } from "../../edge/vapi-events/handler.js";
import { createVapiTools, REPLIES } from "../../edge/vapi-tools/handler.js";
import type { Enqueue } from "../../edge/shared/deps.js";
import { buildAssistant, FIRST_MESSAGE, SYSTEM_PROMPT, type VapiClient, type VerifiedCall } from "../../src/adapters/voice/vapi.js";
import { clientDb } from "../../src/lib/db-phi.js";
import { phi } from "../../src/lib/phi.js";
import { runProcessCallReport, type CallReportDeps } from "../../src/trigger/phi/booking/process-call-report.js";
import { findStranded } from "../../src/trigger/phi/ops/reconcile.js";
import { startProjectDb, type MarketingDb } from "../db/marketing-db.js";

const SECRET = "v".repeat(40);
const ASSISTANT = "asst_newpoint";
const CALL = "call_abc123";
const CALLER = "+16095550160";

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
    `truncate phi.audit_log, phi.crisis_events, phi.tickets, phi.booking_requests, phi.inquiries, phi.messages, phi.conversations cascade;
     truncate phi.contacts cascade`,
  );
});

function fakeVapi(calls: Record<string, Partial<VerifiedCall>>): VapiClient {
  return {
    getCall: (id) => {
      const c = calls[id];
      return Promise.resolve(
        c === undefined ? null : { id, assistantId: ASSISTANT, status: "in-progress", callerNumber: phi(CALLER), ...c },
      );
    },
  };
}

function recorder() {
  const calls: { taskId: string; payload: Record<string, unknown>; key: string }[] = [];
  const enqueue: Enqueue = (taskId, payload, key) => {
    calls.push({ taskId, payload, key });
    return Promise.resolve();
  };
  return { calls, enqueue };
}

function tools(vapiCalls: Record<string, Partial<VerifiedCall>> = { [CALL]: {} }) {
  const { calls, enqueue } = recorder();
  const handler = createVapiTools({ secret: SECRET, assistantId: ASSISTANT, vapi: fakeVapi(vapiCalls) }, { db: clientDb(client()), enqueue, now: () => new Date() });
  return { calls, handler };
}

const toolCall = (name: string, args: Record<string, unknown> = {}, callId = CALL, secret = SECRET) =>
  new Request("https://edge.example.test/vapi-tools", {
    method: "POST",
    headers: { "content-type": "application/json", "x-vapi-secret": secret },
    body: JSON.stringify({ message: { type: "tool-calls", call: { id: callId }, toolCallList: [{ id: "tc1", function: { name, arguments: args } }] } }),
  });

const result = async (response: Response) => ((await response.json()) as { results: { result: string }[] }).results[0]?.result;
const asEdge = () => client().query("set role phi_edge");

describe("edge/vapi-tools (§5.1)", () => {
  it("refuses a wrong secret, an unknown call, another assistant's call and an ended call, writing nothing", async () => {
    await asEdge();
    const { handler, calls } = tools({ [CALL]: {}, other: { assistantId: "asst_someone_else" }, done: { status: "ended" } });
    expect((await handler(toolCall("take_message", { reason: "billing" }, CALL, "wrong"))).status).toBe(401);
    expect((await handler(toolCall("take_message", { reason: "billing" }, "call_unknown"))).status).toBe(403);
    // An unverified call that asks for crisis_transfer still hears 988 / 911, and nothing is written.
    const unverifiedCrisis = await handler(toolCall("crisis_transfer", {}, "call_unknown"));
    expect(await result(unverifiedCrisis)).toBe(REPLIES.crisis);
    expect((await handler(toolCall("take_message", { reason: "billing" }, "other"))).status).toBe(403);
    expect((await handler(toolCall("take_message", { reason: "billing" }, "done"))).status).toBe(403);
    await client().query("reset role");
    expect((await client().query(`select count(*)::int as n from phi.inquiries`)).rows).toEqual([{ n: 0 }]);
    expect(calls).toEqual([]);
  });

  it("request_booking writes one request per call from enums only, with the caller from Vapi, and queues booking.request", async () => {
    await asEdge();
    const { handler, calls } = tools();
    const args = { state: "NJ", modality: "telehealth", seen_before: "yes", preferred_windows: ["weekday_morning"] };
    expect(await result(await handler(toolCall("request_booking", args)))).toBe(REPLIES.booked);
    expect(await result(await handler(toolCall("request_booking", args)))).toBe(REPLIES.booked);
    expect((await handler(toolCall("request_booking", { ...args, notes: "I have been feeling low" }))).status).toBe(200);
    await client().query("reset role");
    const rows = await client().query(
      `select r.requested_state, r.requested_modality::text, r.new_patient, r.preferred_windows, c.phone_e164, c.minor_status::text
         from phi.booking_requests r join phi.contacts c on c.id = r.contact_id`,
    );
    expect(rows.rows).toEqual([
      { requested_state: "NJ", requested_modality: "telehealth", new_patient: false, preferred_windows: ["weekday_morning"], phone_e164: CALLER, minor_status: "unknown" },
    ]);
    // Same tool call id twice ("tc1") → one row.
    expect(new Set(calls.map((c) => c.key)).size).toBe(1);
    expect(calls[0]?.taskId).toBe("booking.request");
  });

  it("an extra free-text argument is refused, not stored", async () => {
    await asEdge();
    const { handler } = tools();
    expect(await result(await handler(toolCall("take_message", { reason: "other", details: "my medication" })))).toBe(REPLIES.invalid);
    await client().query("reset role");
    expect((await client().query(`select count(*)::int as n from phi.inquiries`)).rows).toEqual([{ n: 0 }]);
  });

  it("take_message records a category only", async () => {
    await asEdge();
    const { handler } = tools();
    expect(await result(await handler(toolCall("take_message", { reason: "language_help" })))).toBe(REPLIES.message);
    await client().query("reset role");
    expect((await client().query(`select source::text, reason::text, source_ref from phi.inquiries`)).rows).toEqual([
      { source: "voice", reason: "other", source_ref: `${CALL}:tc1` },
    ]);
  });

  it("crisis_transfer records one voice crisis event per call and queues the clinician page", async () => {
    await asEdge();
    const { handler, calls } = tools();
    expect(await result(await handler(toolCall("crisis_transfer")))).toBe(REPLIES.crisis);
    expect(await result(await handler(toolCall("crisis_transfer")))).toBe(REPLIES.crisis);
    await client().query("reset role");
    const events = await client().query<{ id: string; channel: string; detected_by: string }>(`select id, channel::text, detected_by::text from phi.crisis_events`);
    expect(events.rows).toHaveLength(1);
    expect(events.rows[0]).toMatchObject({ channel: "voice", detected_by: "voice" });
    // The page is queued again on the repeat, under the same key: a lost first enqueue is not final.
    const key = `crisis-page:${events.rows[0]?.id ?? ""}`;
    expect(calls.map((c) => c.key)).toEqual([key, key]);
  });

  it("crisis_transfer answers with 988/911 and the transfer even if the database is down", async () => {
    const { enqueue } = recorder();
    const broken = createVapiTools(
      { secret: SECRET, assistantId: ASSISTANT, vapi: fakeVapi({ [CALL]: {} }) },
      { db: { tx: () => Promise.reject(new Error("db down")) }, enqueue, now: () => new Date() },
    );
    expect(await result(await broken(toolCall("crisis_transfer")))).toBe(REPLIES.crisis);
    expect(await result(await broken(toolCall("take_message", { reason: "billing" })))).toBe(REPLIES.unavailable);
  });

  it("a withheld number still raises the crisis event and the page; a booking asks them to call back", async () => {
    await asEdge();
    const { handler, calls } = tools({ [CALL]: { callerNumber: null } });
    expect(await result(await handler(toolCall("crisis_transfer")))).toBe(REPLIES.crisis);
    expect(calls.map((c) => c.taskId)).toEqual(["ops.crisis-page"]);
    await client().query("reset role");
    expect((await client().query(`select contact_id, call_ref from phi.crisis_events`)).rows).toEqual([{ contact_id: null, call_ref: CALL }]);
    await asEdge();
    expect(await result(await handler(toolCall("request_booking", { state: "NJ", modality: "telehealth", seen_before: "no" })))).toBe(REPLIES.noCaller);
  });
});

function events(vapiCalls: Record<string, Partial<VerifiedCall>> = { [CALL]: { status: "ended" } }) {
  const { calls, enqueue } = recorder();
  const handler = createVapiEvents({ secret: SECRET, assistantId: ASSISTANT, vapi: fakeVapi(vapiCalls) }, { db: clientDb(client()), enqueue, now: () => new Date() });
  return { calls, handler };
}

const report = (structuredData: unknown, transcript = "Caller: I want to hurt myself") =>
  new Request("https://edge.example.test/vapi-events", {
    method: "POST",
    headers: { "content-type": "application/json", "x-vapi-secret": SECRET },
    body: JSON.stringify({ message: { type: "end-of-call-report", call: { id: CALL }, analysis: { structuredData }, artifact: { transcript } } }),
  });

describe("edge/vapi-events", () => {
  it("keeps the structured outcome only (no transcript) and queues the call report", async () => {
    await asEdge();
    const { handler, calls } = events();
    expect((await handler(report({ outcome: "message_taken", callback_requested: true }))).status).toBe(204);
    await client().query("reset role");
    expect((await client().query(`select channel::text, outcome, callback_requested from phi.conversations`)).rows).toEqual([
      { channel: "voice", outcome: "message_taken", callback_requested: true },
    ]);
    const all = JSON.stringify((await client().query(`select * from phi.conversations`)).rows);
    expect(all).not.toContain("hurt");
    expect(calls.map((c) => c.taskId)).toEqual(["booking.process-call-report"]);
  });

  it("an unreadable outcome becomes 'call them back'", async () => {
    await asEdge();
    const { handler } = events();
    await handler(report({ outcome: "made_up" }));
    await client().query("reset role");
    expect((await client().query(`select outcome, callback_requested from phi.conversations`)).rows).toEqual([{ outcome: "other", callback_requested: true }]);
  });
});

function reportDeps(): CallReportDeps & { log: string[] } {
  const log: string[] = [];
  return {
    db: clientDb(client()),
    notifier: { actionRequired: () => Promise.resolve() },
    actor: "booking.process-call-report",
    startBooking: (id) => {
      log.push(`booking:${id}`);
      return Promise.resolve();
    },
    pageCrisis: (id) => {
      log.push(`page:${id}`);
      return Promise.resolve();
    },
    log,
  };
}

async function voiceCall(outcome: string | null, callback: boolean | null): Promise<{ conversationId: string; contactId: string }> {
  const c = await client().query<{ id: string }>(`insert into phi.contacts (phone_e164) values ($1) returning id`, [CALLER]);
  const contactId = c.rows[0]?.id ?? "";
  const v = await client().query<{ id: string }>(
    `insert into phi.conversations (contact_id, channel, external_ref, outcome, callback_requested) values ($1, 'voice', $2, $3, $4) returning id`,
    [contactId, CALL, outcome, callback],
  );
  return { conversationId: v.rows[0]?.id ?? "", contactId };
}

describe("booking.process-call-report (§5.1)", () => {
  it("queues the call's booking request and opens a callback for its message", async () => {
    const { conversationId, contactId } = await voiceCall("booking_requested", false);
    const r = await client().query<{ id: string }>(`insert into phi.booking_requests (contact_id, source_ref) values ($1, $2) returning id`, [contactId, `${CALL}:tc1`]);
    await client().query(`insert into phi.inquiries (contact_id, source, reason, source_ref) values ($1, 'voice', 'other', 'call_other')`, [contactId]);
    await client().query("set role phi_tasks");
    const deps = reportDeps();
    expect(await runProcessCallReport(deps, conversationId)).toEqual({ bookingRequests: 1, tickets: 0, crisis: false });
    expect(deps.log).toEqual([`booking:${r.rows[0]?.id ?? ""}`]);
    await client().query("reset role");
    expect((await client().query(`select closed_at is not null as closed from phi.conversations`)).rows).toEqual([{ closed: true }]);
  });

  it("a call with nothing actionable, or no report at all, still reaches a person", async () => {
    const { conversationId } = await voiceCall(null, null);
    await client().query("set role phi_tasks");
    expect(await runProcessCallReport(reportDeps(), conversationId)).toEqual({ bookingRequests: 0, tickets: 1, crisis: false });
    expect(await runProcessCallReport(reportDeps(), conversationId)).toEqual({ bookingRequests: 0, tickets: 0, crisis: false });
  });

  it("Vapi says crisis but no event was raised (caller declined): the report raises it and pages", async () => {
    const { conversationId } = await voiceCall("crisis", false);
    await client().query("set role phi_tasks");
    const deps = reportDeps();
    expect((await runProcessCallReport(deps, conversationId)) as { crisis: boolean }).toMatchObject({ crisis: true });
    expect(deps.log).toHaveLength(1);
    expect(deps.log[0]).toMatch(/^page:/);
    await client().query("reset role");
    expect((await client().query(`select detected_by::text, call_ref from phi.crisis_events`)).rows).toEqual([{ detected_by: "voice", call_ref: CALL }]);
  });

  it("a Vapi API outage writes nothing but still answers a crisis", async () => {
    await asEdge();
    const { enqueue } = recorder();
    const down = createVapiTools(
      { secret: SECRET, assistantId: ASSISTANT, vapi: { getCall: () => Promise.reject(new Error("vapi 503")) } },
      { db: clientDb(client()), enqueue, now: () => new Date() },
    );
    expect(await result(await down(toolCall("crisis_transfer")))).toBe(REPLIES.crisis);
    expect(await result(await down(toolCall("take_message", { reason: "billing" })))).toBe(REPLIES.unavailable);
  });

  it("a clean wrong number opens nothing", async () => {
    const { conversationId } = await voiceCall("wrong_number", false);
    await client().query("set role phi_tasks");
    expect(await runProcessCallReport(reportDeps(), conversationId)).toEqual({ bookingRequests: 0, tickets: 0, crisis: false });
  });

  it("re-queues the page for an unacknowledged voice crisis", async () => {
    const { conversationId, contactId } = await voiceCall("crisis", true);
    const e = await client().query<{ id: string }>(
      `insert into phi.crisis_events (contact_id, channel, conversation_id, detected_by) values ($1, 'voice', $2, 'voice') returning id`,
      [contactId, conversationId],
    );
    await client().query("set role phi_tasks");
    const deps = reportDeps();
    expect((await runProcessCallReport(deps, conversationId)) as { crisis: boolean }).toMatchObject({ crisis: true });
    expect(deps.log).toEqual([`page:${e.rows[0]?.id ?? ""}`]);
  });

  it("ops.reconcile finds a call left open with no report", async () => {
    const { conversationId } = await voiceCall(null, null);
    await client().query(`update phi.conversations set started_at = now() - interval '40 minutes'`);
    await client().query("set role phi_tasks");
    expect((await findStranded(clientDb(client()), "ops.reconcile")).calls).toEqual([conversationId]);
  });
});

describe("assistant config (D4, D13, D15, D21)", () => {
  const config = {
    model: { provider: "vapi-default", model: "hipaa-default" },
    transcriber: { provider: "vapi-default" },
    voice: { provider: "vapi-default", voiceId: "default" },
    toolsUrl: "https://edge.example.test/vapi-tools",
    eventsUrl: "https://edge.example.test/vapi-events",
    crisisTransferNumber: "+16095550199",
  };
  it("is HIPAA mode, never records, and says it is automated in its first sentence", () => {
    const a = buildAssistant(config);
    expect(a["hipaaEnabled"]).toBe(true);
    expect(a["artifactPlan"]).toEqual({ recordingEnabled: false, videoRecordingEnabled: false });
    expect(FIRST_MESSAGE).toMatch(/automated assistant/);
    expect(FIRST_MESSAGE).toMatch(/not recorded/);
    expect((a["analysisPlan"] as { summaryPlan: unknown }).summaryPlan).toEqual({ enabled: false });
  });
  it("tells the model to page first and to transfer only with transferCall", () => {
    expect(SYSTEM_PROMPT).toMatch(/Use crisis_transfer immediately, every time, whether or not they want to be transferred/);
    expect(SYSTEM_PROMPT).toMatch(/use transferCall\. Never say you are transferring them unless you use transferCall/);
    const tools = ((buildAssistant(config)["model"] as { tools: { type: string }[] }).tools).map((t) => t.type);
    expect(tools).toContain("transferCall");
  });

  it("puts crisis first, forbids clinical talk, and is English only", () => {
    expect(SYSTEM_PROMPT).toMatch(/911/);
    expect(SYSTEM_PROMPT).toMatch(/988/);
    expect(SYSTEM_PROMPT).toMatch(/Never give medical advice/);
    expect(SYSTEM_PROMPT).toMatch(/English only/);
    expect(FIRST_MESSAGE).not.toMatch(/psychiatr|mental/i);
  });
  it("refuses a crisis transfer destination that is not a dialable US number (D15 decides it)", () => {
    expect(() => buildAssistant({ ...config, crisisTransferNumber: "988" })).toThrow("D15");
  });
});
