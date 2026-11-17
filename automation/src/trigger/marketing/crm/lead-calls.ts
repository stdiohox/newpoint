/**
 * Joyce calls new leads who gave a phone number (docs/lead-crm.md "Lead calls").
 *
 * placeLeadCalls: runs right after the confirmation email and staff alert
 * (processNewLeads in lead-alerts.ts) and in the crm.lead-calls sweep. Only
 * 09:00–19:59 Eastern, and only to Eastern area codes (callableNumber), so it
 * is always inside the callee's local hours. A lead from the evening is called
 * the next morning if it is still "New" and less than 24 hours old.
 *
 * crm.lead-call-outcome: the site's /api/voice/outcome hands it Joyce's
 * record_outcome answers DURING the call. A crisis is emailed then, not after.
 *
 * recordLeadCallResults: the sweep reads each placed call back from Cartesia
 * and records how it ended (crm.record_lead_call keeps answers already noted).
 *
 * Never two requests for one call: the POST is not retried, an unreadable
 * answer or a timeout is "ambiguous" and final. Only 429 and 503 (Cartesia
 * placed nothing) go back for a retry, 3 attempts at most.
 *
 * Each lead's bookkeeping is isolated: one bad row never stops the others, the
 * crisis alerts, or the next run.
 *
 * Placing and reading are off while CRM_VOICE_* are unset (runtime.calls = null).
 */
import { z } from "zod";
import type { CallResult, CallsClient, RequestType } from "../../../adapters/calls/cartesia.js";
import { callableNumber, firstName, outcomeArgsSchema, readOutcomeArgs } from "../../../adapters/calls/cartesia.js";
import type { EmailSender } from "../../../adapters/email/resend.js";
import { crisisCallEmail } from "../../../domain/crm/call-email.js";
import type { Queryable } from "../../../lib/db-marketing.js";
import { VendorHttpError } from "../../../lib/errors.js";
import { entityId, type Logger } from "../../../lib/logger.js";
import { marketingSchedule, marketingTask } from "../../../lib/task.js";
import { easternHour } from "./follow-up.js";
import { crmQueue } from "./queue.js";
import { crmRuntime } from "./runtime.js";

export interface LeadCallDeps {
  readonly db: Queryable;
  readonly email: EmailSender;
  readonly crmBaseUrl: string;
  readonly logger: Logger;
  readonly calls: CallsClient | null;
}

/** TCPA allows 08:00–21:00 at the callee; every callable area code is Eastern. */
export const CALL_HOURS = { from: 9, until: 20 } as const;
/** A placed call with no result after this long is recorded as "failed" (no_result). */
const RESULT_DEADLINE_MS = 2 * 60 * 60 * 1000;

export interface PlaceResult {
  readonly skipped?: "off" | "quiet_hours";
  readonly placed: number;
  readonly notPlaced: number;
}

/** The new-patient script for a new-patient inquiry; "the team will call you back" for everything else. */
export function requestTypeOf(reason: string): RequestType {
  return reason === "New patient inquiry" ? "new_patient" : "other";
}

export async function placeLeadCalls(deps: LeadCallDeps, now: Date = new Date()): Promise<PlaceResult> {
  const calls = deps.calls;
  if (!calls) return { skipped: "off", placed: 0, notPlaced: 0 };
  const hour = easternHour(now);
  if (hour < CALL_HOURS.from || hour >= CALL_HOURS.until) return { skipped: "quiet_hours", placed: 0, notPlaced: 0 };

  const { rows } = await deps.db.query<{ lead_id: string; name: string; phone: string; reason: string }>(
    "select lead_id, name, phone, reason from crm.claim_lead_calls(5)",
  );
  let placed = 0;
  let notPlaced = 0;
  const fail = async (leadId: string, error: string, retry: boolean) => {
    await deps.db.query("select crm.mark_lead_call_failed($1::uuid, $2, $3)", [leadId, error, retry]);
    if (!retry) notPlaced += 1;
  };

  // One at a time: Cartesia numbers dial at most one call per second.
  for (const row of rows) {
    try {
      const number = callableNumber(row.phone);
      if (!number.ok) {
        await fail(row.lead_id, number.error, false);
        continue;
      }
      const name = firstName(row.name);
      if (!name) {
        await fail(row.lead_id, "no_name", false);
        continue;
      }

      let result;
      try {
        result = await calls.placeCall({ to: number.e164, firstName: name, requestType: requestTypeOf(row.reason) });
      } catch (error) {
        if (error instanceof VendorHttpError && (error.status === 429 || error.status === 503)) {
          await fail(row.lead_id, `http_${String(error.status)}`, true);
        } else if (error instanceof VendorHttpError && error.status < 500) {
          // Our configuration (key, agent, number): every lead would fail the same way.
          await fail(row.lead_id, `http_${String(error.status)}`, false);
          deps.logger.error("crm.lead_call.rejected_request", null, { status: error.status });
        } else {
          // Timeout, network, or a 5xx a proxy may have sent after Cartesia dialled. Not retried.
          await fail(row.lead_id, "ambiguous", false);
          deps.logger.warn("crm.lead_call.ambiguous");
        }
        continue;
      }

      if (!result.ok) {
        await fail(row.lead_id, result.error, false);
        if (result.error === "ambiguous") deps.logger.warn("crm.lead_call.ambiguous");
        continue;
      }
      const marked = await deps.db.query<{ n: number }>("select crm.mark_lead_call_placed($1::uuid, $2) as n", [
        row.lead_id,
        result.callId,
      ]);
      if ((marked.rows[0]?.n ?? 0) === 0) deps.logger.error("crm.lead_call.mark_missed", null, { lead: entityId(row.lead_id) });
      placed += 1;
    } catch (error) {
      // Bookkeeping failed (database). The claim turns 'lost' after 15 minutes; carry on with the rest.
      deps.logger.error("crm.lead_call.row_failed", error);
    }
  }
  if (rows.length > 0) deps.logger.info("crm.lead_call.placed", { claimed: rows.length, placed, not_placed: notPlaced });
  return { placed, notPlaced };
}

type Outcome = NonNullable<CallResult["recorded"]>["outcome"] | "voicemail" | "no_answer" | "no_outcome" | "failed";

/** Pure: what the CRM shows for a finished call. Exported for tests. */
export function outcomeOf(call: CallResult): Outcome {
  if (call.transferred || call.recorded?.outcome === "crisis") return "crisis";
  if (call.recorded) return call.recorded.outcome;
  switch (call.endReason) {
    case "voicemail_detected":
      return "voicemail";
    case "dial_no_answer":
    case "dial_busy":
    case "dial_timeout":
      return "no_answer";
    default:
      return call.status === "failed" ? "failed" : "no_outcome";
  }
}

export interface RecordResult {
  readonly recorded: number;
  readonly pending: number;
  readonly crisisAlerts: number;
}

export async function recordLeadCallResults(deps: LeadCallDeps, now: Date = new Date()): Promise<RecordResult> {
  const calls = deps.calls;
  let recorded = 0;
  let pending = 0;
  if (calls) {
    const { rows } = await deps.db.query<{ lead_id: string; provider_call_id: string; placed_at: Date }>(
      "select lead_id, provider_call_id, placed_at from crm.open_lead_calls(20)",
    );
    for (const row of rows) {
      const overdue = now.getTime() - row.placed_at.getTime() > RESULT_DEADLINE_MS;
      try {
        let call: CallResult | null = null;
        try {
          call = await calls.getCall(row.provider_call_id);
        } catch (error) {
          if (!overdue) {
            pending += 1;
            deps.logger.warn("crm.lead_call.read_failed", { status: error instanceof VendorHttpError ? error.status : null });
            continue;
          }
        }
        const finished = call !== null && (call.status === "completed" || call.status === "failed");
        if (!finished && !overdue) {
          pending += 1;
          continue;
        }
        const params =
          finished && call
            ? [
                row.lead_id,
                call.startedAt,
                call.endedAt,
                call.endReason,
                outcomeOf(call),
                call.recorded?.state ?? null,
                call.recorded?.modality ?? null,
                call.recorded?.seenBefore ?? null,
                call.recorded?.preferredWindows.length ? [...call.recorded.preferredWindows] : null,
              ]
            : [row.lead_id, null, null, "no_result", "failed", null, null, null, null];
        if (!finished) deps.logger.warn("crm.lead_call.no_result", { lead: entityId(row.lead_id) });
        const marked = await deps.db.query<{ n: number }>(
          "select crm.record_lead_call($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9::text[]) as n",
          params,
        );
        recorded += marked.rows[0]?.n ?? 0;
      } catch (error) {
        deps.logger.error("crm.lead_call.record_failed", error, { lead: entityId(row.lead_id) });
      }
    }
  }

  // Runs even with calls off, so a crisis recorded before they were turned off still goes out.
  const crisisAlerts = await sendCrisisCallAlerts(deps);
  if (recorded > 0 || crisisAlerts > 0) deps.logger.info("crm.lead_call.recorded", { recorded, pending, crisis_alerts: crisisAlerts });
  return { recorded, pending, crisisAlerts };
}

export async function sendCrisisCallAlerts(deps: Pick<LeadCallDeps, "db" | "email" | "crmBaseUrl" | "logger">): Promise<number> {
  const { rows } = await deps.db.query<{ lead_id: string; ended_at: Date | null }>(
    "select lead_id, ended_at from crm.unalerted_crisis_calls()",
  );
  if (rows.length === 0) return 0;
  const recipients = (await deps.db.query<{ email: string }>("select email from crm.alert_recipients()")).rows.map(
    (row) => row.email,
  );
  if (recipients.length === 0) {
    // Left unmarked: it goes out as soon as someone has alerts on.
    deps.logger.error("crm.lead_call.crisis_no_recipients", null, { calls: rows.length });
    return 0;
  }
  await deps.email.send(
    crisisCallEmail(
      rows.map((row) => ({ leadId: row.lead_id, endedAt: row.ended_at })),
      recipients,
      deps.crmBaseUrl,
    ),
  );
  const marked = await deps.db.query<{ n: number }>("select crm.mark_crisis_call_alerted($1::uuid[]) as n", [
    rows.map((row) => row.lead_id),
  ]);
  return marked.rows[0]?.n ?? 0;
}

/** What the site's /api/voice/outcome forwards: Joyce's record_outcome arguments and Cartesia's call id. */
export const outcomePayloadSchema = outcomeArgsSchema.extend({
  call_id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
});

export interface NoteResult {
  readonly noted: boolean;
  readonly crisisAlerts: number;
}

/**
 * Store Joyce's answers on the open call; on a crisis, email staff now. Throws
 * when no open call has that id yet, so the task retries (the call id is marked
 * placed milliseconds after Cartesia accepts it, normally long before anyone answers).
 */
export async function noteLeadCallOutcome(
  deps: Pick<LeadCallDeps, "db" | "email" | "crmBaseUrl" | "logger">,
  payload: z.output<typeof outcomePayloadSchema>,
): Promise<NoteResult> {
  const answers = readOutcomeArgs(payload);
  if (!answers) throw new Error("unreadable outcome");
  const marked = await deps.db.query<{ n: number }>(
    "select crm.note_lead_call_outcome($1, $2, $3, $4, $5, $6::text[]) as n",
    [
      payload.call_id,
      answers.outcome,
      answers.state,
      answers.modality,
      answers.seenBefore,
      answers.preferredWindows.length ? [...answers.preferredWindows] : null,
    ],
  );
  if ((marked.rows[0]?.n ?? 0) === 0) throw new Error("no open call for this id yet");
  const crisisAlerts = answers.outcome === "crisis" ? await sendCrisisCallAlerts(deps) : 0;
  return { noted: true, crisisAlerts };
}

export function leadCallDeps(): LeadCallDeps {
  const runtime = crmRuntime();
  return {
    db: runtime.db,
    email: runtime.email,
    crmBaseUrl: runtime.env.CRM_BASE_URL,
    logger: runtime.logger,
    calls: runtime.calls,
  };
}

/** Morning calls for evening leads, retries, and every call's result. */
export const leadCallsSweep = marketingSchedule({
  id: "crm.lead-calls",
  cron: { pattern: "*/5 * * * *", timezone: "America/New_York" },
  queue: crmQueue,
  maxDuration: 120,
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 5_000, maxTimeoutInMs: 60_000 },
  run: async () => {
    const deps = leadCallDeps();
    // Results first (also sends any leftover crisis alert, calls on or off), then new calls.
    const results = await recordLeadCallResults(deps);
    const place = await placeLeadCalls(deps);
    return { place, results };
  },
});

/**
 * Triggered by the site's /api/voice/outcome while the call is on. Not on the
 * crm queue: a crisis email must not wait behind a sweep. Retries cover the
 * moment before the call's id is marked placed.
 */
export const leadCallOutcome = marketingTask({
  id: "crm.lead-call-outcome",
  schema: outcomePayloadSchema,
  maxDuration: 60,
  retry: { maxAttempts: 5, factor: 2, minTimeoutInMs: 3_000, maxTimeoutInMs: 30_000 },
  run: (payload) => noteLeadCallOutcome(leadCallDeps(), payload),
});
