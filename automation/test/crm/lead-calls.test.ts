/** Joyce's lead calls (crm.lead-calls, crm.lead-call-outcome) against the embedded Postgres, AS crm_alerts. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  callableNumber,
  firstName,
  readCall,
  type CallResult,
  type CallsClient,
  type PlaceCallRequest,
  type PlaceCallResult,
} from "../../src/adapters/calls/cartesia.js";
import type { Email, EmailSender } from "../../src/adapters/email/resend.js";
import { loadCrmEnv } from "../../src/lib/env.js";
import { VendorHttpError } from "../../src/lib/errors.js";
import { createLogger } from "../../src/lib/logger.js";
import {
  noteLeadCallOutcome,
  outcomeOf,
  placeLeadCalls,
  recordLeadCallResults,
} from "../../src/trigger/marketing/crm/lead-calls.js";
import { startMarketingDb, type MarketingDb } from "../db/marketing-db.js";

const DESK = "00000000-0000-4000-8000-0000000000f1";
const CRM = "https://www.newpointnp.com/crm";
/** A Tuesday at 10:00 ET. */
const DAYTIME = new Date("2026-11-10T15:00:00Z");
/** 22:00 ET. */
const EVENING = new Date("2026-11-11T03:00:00Z");

let db: MarketingDb | undefined;
const client = () => {
  if (!db) throw new Error("database did not start");
  return db.client;
};
const quiet = () => createLogger(() => undefined);

async function asOwner<T>(fn: () => Promise<T>): Promise<T> {
  await client().query("reset role");
  try {
    return await fn();
  } finally {
    await client().query("set role crm_alerts");
  }
}

/** key: one hex digit (crm.submit_lead wants a hex client key). */
async function submit(
  name: string,
  key: string,
  phone: string | null,
  options: { hoursAgo?: number; reason?: string } = {},
): Promise<string> {
  return asOwner(async () => {
    const { rows } = await client().query<{ id: string }>("select crm.submit_lead($1, $2, $3, $4, $5) as id", [
      name,
      `lead${key}@example.com`,
      phone,
      options.reason ?? "New patient inquiry",
      key.repeat(64),
    ]);
    const id = rows[0]?.id;
    if (!id) throw new Error("no id");
    await client().query("update crm.leads set created_at = now() - make_interval(hours => $2) where id = $1", [
      id,
      options.hoursAgo ?? 0,
    ]);
    return id;
  });
}

function recordingSender(): EmailSender & { sent: Email[] } {
  const sent: Email[] = [];
  return { sent, send: (email) => (sent.push(email), Promise.resolve()) };
}

function fakeCalls(
  place: (request: PlaceCallRequest) => Promise<PlaceCallResult>,
  results: Record<string, CallResult | null | Error> = {},
): CallsClient & { placed: PlaceCallRequest[]; deleted: string[] } {
  const placed: PlaceCallRequest[] = [];
  const deleted: string[] = [];
  return {
    placed,
    deleted,
    placeCall: (request) => (placed.push(request), place(request)),
    getCall: (id) => {
      const result = results[id];
      return result instanceof Error ? Promise.reject(result) : Promise.resolve(result ?? null);
    },
    deleteRecording: (id) => (id === failDelete ? Promise.reject(new VendorHttpError("cartesia", 500)) : (deleted.push(id), Promise.resolve())),
  };
}

let n = 0;
let failDelete: string | null = null;
const accepts = () => fakeCalls(() => Promise.resolve({ ok: true, callId: `ac_${String((n += 1))}` }));

const deps = (calls: CallsClient | null, email = recordingSender()) => ({
  db: client(),
  email,
  crmBaseUrl: CRM,
  logger: quiet(),
  calls,
});

async function callRow(leadId: string): Promise<Record<string, unknown> | undefined> {
  return asOwner(
    async () =>
      (await client().query<Record<string, unknown>>("select * from crm.lead_calls where lead_id = $1", [leadId])).rows[0],
  );
}

const ended = (over: Partial<CallResult>): CallResult => ({
  status: "completed",
  startedAt: new Date("2026-11-10T15:00:05Z"),
  endedAt: new Date("2026-11-10T15:03:05Z"),
  endReason: "agent_hangup",
  recorded: null,
  transferred: false,
  ...over,
});

beforeAll(async () => {
  db = await startMarketingDb();
  await db.client.query(`insert into auth.users (id, email) values ($1, 'desk@example.com')`, [DESK]);
  await db.client.query(`insert into crm.staff (user_id, email, display_name) values ($1, 'desk@example.com', 'Front desk')`, [DESK]);
  await db.client.query("set role crm_alerts");
});

afterAll(async () => {
  await db?.stop();
});

beforeEach(async () => {
  await asOwner(() => client().query("delete from crm.leads"));
});

describe("placing calls", () => {
  it("is off without Cartesia config and quiet outside 09:00–19:59 ET", async () => {
    await submit("Ada Lane", "a", "(609) 555-0100");
    expect(await placeLeadCalls(deps(null), DAYTIME)).toEqual({ skipped: "off", placed: 0, notPlaced: 0 });
    const calls = accepts();
    expect(await placeLeadCalls(deps(calls), EVENING)).toEqual({ skipped: "quiet_hours", placed: 0, notPlaced: 0 });
    expect(calls.placed).toEqual([]);
  });

  it("calls a new lead with a phone once, by first name, in E.164, with the right script", async () => {
    const id = await submit("Ada Lane", "b", "(609) 555-0100");
    await submit("Bo Reed", "c", "215-555-0100", { reason: "Existing patient" });
    await submit("No Phone", "d", null);
    const calls = accepts();
    expect(await placeLeadCalls(deps(calls), DAYTIME)).toEqual({ placed: 2, notPlaced: 0 });
    expect(calls.placed).toEqual([
      { to: "+16095550100", firstName: "Ada", requestType: "new_patient" },
      { to: "+12155550100", firstName: "Bo", requestType: "other" },
    ]);
    expect(await callRow(id)).toMatchObject({ status: "placed" });
    expect(await placeLeadCalls(deps(calls), DAYTIME)).toEqual({ placed: 0, notPlaced: 0 });
    expect(calls.placed).toHaveLength(2);
  });

  it("skips leads older than 24 hours or already contacted", async () => {
    await submit("Old Lead", "e", "6095550101", { hoursAgo: 30 });
    const contacted = await submit("Got Called", "f", "6095550102");
    await asOwner(() => client().query("update crm.leads set status = 'contacted' where id = $1", [contacted]));
    const calls = accepts();
    expect(await placeLeadCalls(deps(calls), DAYTIME)).toEqual({ placed: 0, notPlaced: 0 });
  });

  it("calls one number at most once in 30 days", async () => {
    await submit("Ada Lane", "1", "609-555-0103");
    const again = await submit("Ada Lane", "2", "+1 (609) 555 0103");
    const calls = accepts();
    expect(await placeLeadCalls(deps(calls), DAYTIME)).toEqual({ placed: 1, notPlaced: 0 });
    expect(await placeLeadCalls(deps(calls), DAYTIME)).toEqual({ placed: 0, notPlaced: 0 });
    expect(await callRow(again)).toBeUndefined();
  });

  it("never dials outside the allowed area codes", async () => {
    const pacific = await submit("Ada Lane", "3", "(415) 555-0100");
    const premium = await submit("Bo Reed", "4", "900-555-0100");
    const uk = await submit("Cy Moss", "5", "+44 20 7946 0958");
    const calls = accepts();
    expect(await placeLeadCalls(deps(calls), DAYTIME)).toEqual({ placed: 0, notPlaced: 3 });
    expect(calls.placed).toEqual([]);
    expect(await callRow(pacific)).toMatchObject({ status: "not_placed", error: "outside_area" });
    expect(await callRow(premium)).toMatchObject({ status: "not_placed", error: "outside_area" });
    expect(await callRow(uk)).toMatchObject({ status: "not_placed", error: "outside_area" });
  });

  it("retries a 503 later, at most 3 attempts; never retries a 500 or a timeout", async () => {
    const id = await submit("Ada Lane", "6", "6095550104");
    const down = fakeCalls(() => Promise.reject(new VendorHttpError("cartesia", 503)));
    await placeLeadCalls(deps(down), DAYTIME);
    expect(await callRow(id)).toMatchObject({ status: "retry", attempts: 1, error: "http_503" });
    for (let attempt = 2; attempt <= 3; attempt += 1) {
      await asOwner(() => client().query("update crm.lead_calls set updated_at = now() - interval '6 minutes'"));
      await placeLeadCalls(deps(down), DAYTIME);
    }
    expect(await callRow(id)).toMatchObject({ status: "not_placed", attempts: 3 });

    const gateway = await submit("Bo Reed", "7", "6095550105");
    await placeLeadCalls(deps(fakeCalls(() => Promise.reject(new VendorHttpError("cartesia", 500)))), DAYTIME);
    expect(await callRow(gateway)).toMatchObject({ status: "not_placed", error: "ambiguous" });

    const timeout = await submit("Cy Moss", "8", "6095550106");
    await placeLeadCalls(deps(fakeCalls(() => Promise.reject(new TypeError("fetch failed")))), DAYTIME);
    expect(await callRow(timeout)).toMatchObject({ status: "not_placed", error: "ambiguous" });
  });

  it("closes a pending retry once staff contact the lead", async () => {
    const id = await submit("Ada Lane", "9", "6095550107");
    await placeLeadCalls(deps(fakeCalls(() => Promise.reject(new VendorHttpError("cartesia", 429)))), DAYTIME);
    await asOwner(() => client().query("update crm.leads set status = 'contacted' where id = $1", [id]));
    await placeLeadCalls(deps(accepts()), DAYTIME);
    expect(await callRow(id)).toMatchObject({ status: "not_placed", error: "expired" });
  });
});

describe("recording results", () => {
  it("stores Joyce's structured answers, and leaves a call in progress alone", async () => {
    const id = await submit("Ada Lane", "a", "6095550108");
    const live = await submit("Bo Reed", "b", "6095550109");
    const calls = fakeCalls(
      (request) => Promise.resolve({ ok: true, callId: request.firstName === "Ada" ? "ac_done" : "ac_live" }),
      {
        ac_done: ended({
          recorded: {
            outcome: "appointment_requested",
            state: "NJ",
            modality: "telehealth",
            seenBefore: "no",
            preferredWindows: ["weekday_morning"],
          },
        }),
        ac_live: ended({ status: "started", endedAt: null }),
      },
    );
    await placeLeadCalls(deps(calls), DAYTIME);
    expect(await recordLeadCallResults(deps(calls), new Date())).toMatchObject({ recorded: 1, pending: 1, crisisAlerts: 0 });
    expect(await callRow(id)).toMatchObject({
      status: "ended",
      outcome: "appointment_requested",
      state: "NJ",
      modality: "telehealth",
      seen_before: "no",
      preferred_windows: ["weekday_morning"],
    });
    expect(await callRow(live)).toMatchObject({ status: "placed" });
    // The answers are kept; the recording of the ended call is deleted, the live one is not.
    expect(calls.deleted).toEqual(["ac_done"]);
  });

  it("retries a failed recording delete on the next sweep", async () => {
    await submit("Ada Lane", "9", "6095550119");
    const calls = fakeCalls(() => Promise.resolve({ ok: true, callId: "ac_retry" }), { ac_retry: ended({}) });
    await placeLeadCalls(deps(calls), DAYTIME);
    failDelete = "ac_retry";
    await recordLeadCallResults(deps(calls), new Date());
    expect(calls.deleted).toEqual([]);
    failDelete = null;
    await recordLeadCallResults(deps(calls), new Date());
    await recordLeadCallResults(deps(calls), new Date());
    expect(calls.deleted).toEqual(["ac_retry"]);
  });

  it("one unreadable call does not stop the others or the crisis alerts", async () => {
    const broken = await submit("Ada Lane", "c", "6095550110");
    const fine = await submit("Bo Reed", "d", "6095550111");
    const calls = fakeCalls(
      (request) => Promise.resolve({ ok: true, callId: request.firstName === "Ada" ? "ac_broken" : "ac_fine" }),
      { ac_broken: new VendorHttpError("cartesia", 500), ac_fine: ended({ transferred: true }) },
    );
    await placeLeadCalls(deps(calls), DAYTIME);
    const email = recordingSender();
    expect(await recordLeadCallResults(deps(calls, email), new Date())).toMatchObject({ recorded: 1, pending: 1, crisisAlerts: 1 });
    expect(await callRow(broken)).toMatchObject({ status: "placed" });
    expect(await callRow(fine)).toMatchObject({ status: "ended", outcome: "crisis" });
    expect(email.sent).toHaveLength(1);
  });

  it("records a call with no result after 2 hours as failed, keeping answers noted during the call", async () => {
    const lost = await submit("Ada Lane", "e", "6095550112");
    const noted = await submit("Bo Reed", "f", "6095550113");
    const calls = fakeCalls((request) =>
      Promise.resolve({ ok: true, callId: request.firstName === "Ada" ? "ac_lost" : "ac_noted" }),
    );
    await placeLeadCalls(deps(calls), DAYTIME);
    await noteLeadCallOutcome(deps(calls), { call_id: "ac_noted", outcome: "callback_requested" });
    await recordLeadCallResults(deps(calls), new Date(Date.now() + 3 * 60 * 60 * 1000));
    expect(await callRow(lost)).toMatchObject({ status: "ended", outcome: "failed", end_reason: "no_result" });
    expect(await callRow(noted)).toMatchObject({ status: "ended", outcome: "callback_requested", end_reason: "no_result" });
  });
});

describe("during the call (record_outcome via the site)", () => {
  it("emails staff at once, with a link only, on a crisis; once", async () => {
    const id = await submit("Ada Lane", "1", "6095550114");
    const calls = fakeCalls(() => Promise.resolve({ ok: true, callId: "ac_crisis" }), {
      ac_crisis: ended({ recorded: { outcome: "callback_requested", state: null, modality: null, seenBefore: null, preferredWindows: [] } }),
    });
    await placeLeadCalls(deps(calls), DAYTIME);
    const email = recordingSender();
    expect(await noteLeadCallOutcome(deps(calls, email), { call_id: "ac_crisis", outcome: "crisis" })).toEqual({
      noted: true,
      crisisAlerts: 1,
    });
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]?.to).toEqual(["desk@example.com"]);
    expect(email.sent[0]?.text).toContain(`${CRM}/leads/${id}`);
    expect(email.sent[0]?.text).not.toContain("Ada");
    // The call ends; Cartesia's copy says callback_requested. Crisis stays, and no second email.
    await recordLeadCallResults(deps(calls, email), new Date());
    expect(await callRow(id)).toMatchObject({ status: "ended", outcome: "crisis" });
    expect(email.sent).toHaveLength(1);
    // A crisis call's recording stays for the clinicians.
    expect(calls.deleted).toEqual([]);
  });

  it("throws (so the task retries) when no open call has that id", async () => {
    await expect(noteLeadCallOutcome(deps(null), { call_id: "ac_nobody", outcome: "crisis" })).rejects.toThrow();
  });
});

describe("pure helpers", () => {
  it("accepts NJ/PA and neighbouring Eastern area codes only", () => {
    expect(callableNumber("(609) 527-9438")).toEqual({ ok: true, e164: "+16095279438" });
    expect(callableNumber("+1 215.555.0100")).toEqual({ ok: true, e164: "+12155550100" });
    expect(callableNumber("1-917-555-0100")).toEqual({ ok: true, e164: "+19175550100" });
    expect(callableNumber("(415) 555-0100")).toEqual({ ok: false, error: "outside_area" });
    expect(callableNumber("876-555-0100")).toEqual({ ok: false, error: "outside_area" });
    expect(callableNumber("+44 20 7946 0958")).toEqual({ ok: false, error: "outside_area" });
    expect(callableNumber("555-0100")).toEqual({ ok: false, error: "invalid_number" });
  });

  it("greets by a plain first name only", () => {
    expect(firstName("  Ada Lane ")).toBe("Ada");
    expect(firstName("O’Neil")).toBe("O’Neil");
    expect(firstName("{{system__x}}")).toBeNull();
  });

  it("reads outcomes from Cartesia's call, crisis winning, unknown status not final", () => {
    const call = readCall({
      status: "completed",
      start_time: "2026-11-10T15:00:05Z",
      end_time: "2026-11-10T15:03:05Z",
      end_reason: "agent_hangup",
      summary: "never kept",
      transcript: [
        { role: "assistant", text: "Hi", tool_calls: [{ name: "record_outcome", arguments: { outcome: "crisis" } }] },
        { role: "assistant", text: "Bye", tool_calls: [{ name: "record_outcome", arguments: { outcome: "callback_requested" } }] },
      ],
    });
    expect(call?.recorded?.outcome).toBe("crisis");
    expect(JSON.stringify(call)).not.toContain("never kept");
    expect(readCall({ status: "ringing" })?.status).toBe("other");
    const base: CallResult = { status: "completed", startedAt: null, endedAt: null, endReason: null, recorded: null, transferred: false };
    expect(outcomeOf({ ...base, endReason: "voicemail_detected" })).toBe("voicemail");
    expect(outcomeOf({ ...base, endReason: "dial_no_answer" })).toBe("no_answer");
    expect(outcomeOf({ ...base, status: "failed", endReason: "dial_failed" })).toBe("failed");
    expect(outcomeOf({ ...base, endReason: "client_hangup" })).toBe("no_outcome");
  });

  it("treats a blank CRM_VOICE_* as unset; a wrong or partial set turns calls off, never the alerts", () => {
    const base = {
      MARKETING_DATABASE_URL: "postgresql://trigger_marketing.utxaczptucbqrnnzmziz:pw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres",
      MARKETING_DATABASE_CA_CERT: "-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----",
      SUPABASE_MARKETING_PROJECT_REF: "utxaczptucbqrnnzmziz",
      RESEND_API_KEY: "re_abcdefghijkl",
      CRM_ALERT_FROM: "Newpoint CRM <crm@newpointnp.com>",
    };
    const blank = loadCrmEnv({ ...base, CRM_VOICE_API_KEY: "", CRM_VOICE_AGENT_ID: " " });
    expect(blank.CRM_VOICE_API_KEY).toBeUndefined();
    expect(blank.crmVoiceProblem).toBeUndefined();

    // Partial set (the 2026-11-23 outage: key saved under another name): calls off, env loads.
    const partial = loadCrmEnv({ ...base, CRM_VOICE_AGENT_ID: "agent_abcdefgh", CRM_VOICE_FROM_NUMBER_ID: "ap_abcdefgh" });
    expect(partial.CRM_VOICE_AGENT_ID).toBeUndefined();
    expect(partial.RESEND_API_KEY).toBe(base.RESEND_API_KEY);
    expect(partial.crmVoiceProblem).toEqual({ apiKeyOk: false, agentIdOk: true, fromNumberIdOk: true });

    // Malformed value: calls off, the bad one named.
    const bad = loadCrmEnv({
      ...base,
      CRM_VOICE_API_KEY: "sk_car_abcdefghijkl",
      CRM_VOICE_AGENT_ID: "not-an-agent",
      CRM_VOICE_FROM_NUMBER_ID: "ap_abcdefgh",
    });
    expect(bad.CRM_VOICE_API_KEY).toBeUndefined();
    expect(bad.crmVoiceProblem).toEqual({ apiKeyOk: true, agentIdOk: false, fromNumberIdOk: true });

    // A pasted tab or newline is trimmed, not an error.
    const pasted = loadCrmEnv({
      ...base,
      CRM_VOICE_API_KEY: "sk_car_abcdefghijkl\n",
      CRM_VOICE_AGENT_ID: "\tagent_abcdefgh",
      CRM_VOICE_FROM_NUMBER_ID: " ap_abcdefgh ",
    });
    expect(pasted.crmVoiceProblem).toBeUndefined();
    expect(pasted.CRM_VOICE_AGENT_ID).toBe("agent_abcdefgh");

    // The alerts' own settings stay strict.
    expect(() => loadCrmEnv({ ...base, RESEND_API_KEY: "nope" })).toThrow("invalid_crm_env");
  });
});
