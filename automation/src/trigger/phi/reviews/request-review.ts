/**
 * reviews.request-review (docs/automation-architecture.md §5.4).
 *
 * booking.sync queues it when an appointment is completed. If every eligibility rule holds,
 * a review_requests row is created as `pending_clinician_window` and shown in the console
 * for 24 h, so a clinician can exclude the patient. Eligibility is checked again before the
 * one text goes out, only between 10:00 and 19:00 New York time, with the practice's generic
 * Google review link as its only URL. No reminder, no click tracking (D14). No gating: the
 * same message to every eligible patient, whatever the visit was like.
 */
import { tasks, wait } from "@trigger.dev/sdk";
import { auditRead, hasActiveConsent, type PhiDb, type Queryable } from "../../../lib/db-phi.js";
import { phiTask } from "../../../lib/task.js";
import { CLINICIAN_WINDOW_MS, reviewEligibility, type Ineligible, type ReviewFacts } from "../../../domain/eligibility/review-eligibility.js";
import { inWindow, nextInWindow, REVIEW_WINDOW } from "../../../domain/messaging/quiet-hours.js";
import type { SendSmsPayload } from "../messaging/send-sms.js";
import { PHI_PAYLOADS } from "../payloads.js";
import { phiRuntime } from "../runtime.js";

export interface ReviewDeps {
  readonly db: PhiDb;
  /** false while PHI_GOOGLE_REVIEW_URL is unset: no window is opened for a text that cannot go. */
  readonly linkConfigured: boolean;
  /** Resolves to send-sms's status, or { reason } for a refusal, or "failed". */
  readonly sendNow: (payload: SendSmsPayload) => Promise<string | { readonly reason: string }>;
  readonly now: () => Date;
  readonly actor: string;
}

async function facts(q: Queryable, appointmentId: string, excludeRequestId: string | null): Promise<(ReviewFacts & { contactId: string }) | null> {
  const { rows } = await q.query<{ contact_id: string; status: ReviewFacts["appointmentStatus"]; minor_status: ReviewFacts["minorStatus"] }>(
    `select a.contact_id, a.status::text as status, c.minor_status::text as minor_status
       from phi.appointments a join phi.contacts c on c.id = a.contact_id where a.id = $1`,
    [appointmentId],
  );
  const row = rows[0];
  if (row === undefined) return null;
  await auditRead(q, "appointments", appointmentId);
  const flags = await q.query<{ excluded: boolean; crisis: boolean; sent: boolean }>(
    `select exists (select 1 from phi.review_exclusions x where x.contact_id = $1) as excluded,
            exists (select 1 from phi.crisis_events e where e.contact_id = $1 and e.detected_at > now() - interval '90 days') as crisis,
            exists (select 1 from phi.review_requests r where r.contact_id = $1 and r.sent_at > now() - interval '12 months'
                      and r.id is distinct from $2) as sent`,
    [row.contact_id, excludeRequestId],
  );
  const f = flags.rows[0];
  return {
    contactId: row.contact_id,
    appointmentStatus: row.status,
    minorStatus: row.minor_status,
    excluded: f?.excluded ?? true,
    crisisInLast90Days: f?.crisis ?? true,
    sentInLast12Months: f?.sent ?? true,
    reviewConsent: await hasActiveConsent(q, row.contact_id, "review_requests"),
    smsConsent: await hasActiveConsent(q, row.contact_id, "sms_transactional"),
  };
}

export type Opened =
  | { readonly reviewRequestId: string; readonly scheduledFor: Date }
  | { readonly ineligible: Ineligible | "missing" | "review_link_unconfigured" };

/** Step 1: eligibility, then the pending row and its 24 h clinician window. */
export async function openReviewRequest(deps: ReviewDeps, appointmentId: string): Promise<Opened> {
  if (!deps.linkConfigured) return { ineligible: "review_link_unconfigured" };
  return deps.db.tx(deps.actor, async (q) => {
    const f = await facts(q, appointmentId, null);
    if (f === null) return { ineligible: "missing" as const };
    const verdict = reviewEligibility(f);
    if (!verdict.eligible) return { ineligible: verdict.reason };
    const scheduledFor = new Date(deps.now().getTime() + CLINICIAN_WINDOW_MS);
    await q.query(
      `insert into phi.review_requests (appointment_id, contact_id, scheduled_for) values ($1, $2, $3) on conflict (appointment_id) do nothing`,
      [appointmentId, f.contactId, scheduledFor],
    );
    const { rows } = await q.query<{ id: string; scheduled_for: Date }>(`select id, scheduled_for from phi.review_requests where appointment_id = $1`, [appointmentId]);
    const row = rows[0];
    if (row === undefined) throw new Error("request-review: no row");
    return { reviewRequestId: row.id, scheduledFor: row.scheduled_for };
  });
}

export type SendDecision =
  | { readonly status: "sent" }
  | { readonly status: "skipped"; readonly reason: string }
  | { readonly status: "excluded" }
  | { readonly status: "wait"; readonly until: Date };

/** Step 2, after the window: re-check everything, respect 10:00–19:00, send once. */
/**
 * Step 2, after the window. The request is CLAIMED before the text goes out, in one
 * transaction: the patient's review-cap lock (the trigger's own key), the row locked,
 * eligibility re-checked, then status 'sent' and sent_at set (the 12-month cap trigger fires
 * here). So two visits for one patient can never both text, and a clinician's exclusion
 * either lands first (no text) or is refused because the request is already sent. A refusal
 * or a hold rolls the claim back; a failure rolls it back and throws so the task retries.
 */
export async function sendReviewRequest(deps: ReviewDeps, reviewRequestId: string): Promise<SendDecision> {
  const now = deps.now();
  if (!inWindow(now, REVIEW_WINDOW)) return { status: "wait", until: nextInWindow(now, REVIEW_WINDOW) };

  type Claim =
    | { readonly kind: "missing" }
    | { readonly kind: "decided"; readonly status: string }
    | { readonly kind: "ineligible"; readonly reason: string }
    | { readonly kind: "claimed"; readonly contactId: string };
  const claim = await deps.db
    .tx(deps.actor, async (q): Promise<Claim> => {
    const peek = await q.query<{ contact_id: string }>(`select contact_id from phi.review_requests where id = $1`, [reviewRequestId]);
    const contactId = peek.rows[0]?.contact_id;
    if (contactId === undefined) return { kind: "missing" };
    await q.query(`select pg_advisory_xact_lock(hashtext('review_cap:' || $1::text))`, [contactId]);
    const { rows } = await q.query<{ appointment_id: string; status: string }>(
      `select appointment_id, status::text as status from phi.review_requests where id = $1 for update`,
      [reviewRequestId],
    );
    const row = rows[0];
    if (row === undefined) return { kind: "missing" };
    if (row.status !== "pending_clinician_window") return { kind: "decided", status: row.status };
    const f = await facts(q, row.appointment_id, reviewRequestId);
    const verdict = f === null ? null : reviewEligibility(f);
    if (verdict === null || !verdict.eligible) {
      const reason = verdict === null ? "missing" : verdict.reason;
      await q.query(`update phi.review_requests set status = 'skipped', skip_reason = $2 where id = $1`, [reviewRequestId, reason]);
      return { kind: "ineligible", reason };
    }
    await q.query(`update phi.review_requests set status = 'sent', sent_at = now() where id = $1`, [reviewRequestId]);
    return { kind: "claimed", contactId };
  })
    .catch(async (error: unknown): Promise<Claim> => {
      // The database's own 12-month cap refused the claim: a decision, not a failure.
      if ((error as { code?: unknown }).code !== "23514") throw error;
      await skip(deps, reviewRequestId, "sent_within_12_months");
      return { kind: "ineligible", reason: "sent_within_12_months" };
    });
  if (claim.kind === "missing") return { status: "skipped", reason: "missing" };
  if (claim.kind === "decided") return claim.status === "excluded" ? { status: "excluded" } : { status: "skipped", reason: "already_decided" };
  if (claim.kind === "ineligible") return { status: "skipped", reason: claim.reason };

  const sent = await deps.sendNow({ template: "review_request", contactId: claim.contactId, entityId: reviewRequestId, step: 0 });
  if (sent === "sent" || sent === "duplicate") return { status: "sent" };
  if (sent === "failed") {
    await release(deps, reviewRequestId);
    throw new Error("reviews.request-review: send failed");
  }
  // A budget, rate or quiet-hours hold is not a decision about this patient: try again in the
  // next 10:00–19:00 window rather than lose the request.
  if (sent === "deferred" || (typeof sent === "object" && TRANSIENT.has(sent.reason))) {
    await release(deps, reviewRequestId);
    return { status: "wait", until: nextInWindow(new Date(now.getTime() + 3_600_000), REVIEW_WINDOW) };
  }
  const reason = typeof sent === "string" ? sent : `refused_${sent.reason}`;
  await deps.db.tx(deps.actor, (q) =>
    q.query(`update phi.review_requests set status = 'skipped', sent_at = null, skip_reason = $2 where id = $1 and status = 'sent'`, [reviewRequestId, reason]),
  );
  return { status: "skipped", reason };
}

/** Undo a claim whose text did not go out, so the request can be tried again. */
async function release(deps: ReviewDeps, id: string): Promise<void> {
  await deps.db.tx(deps.actor, (q) =>
    q.query(`update phi.review_requests set status = 'pending_clinician_window', sent_at = null where id = $1 and status = 'sent'`, [id]),
  );
}

const TRANSIENT = new Set(["global_budget", "number_limit"]);

/** The send loop gives up after this many windows; the row is then skipped, never left pending. */
export const MAX_WINDOWS = 7;

export async function exhausted(deps: ReviewDeps, reviewRequestId: string): Promise<void> {
  await skip(deps, reviewRequestId, "window_exhausted");
}

async function skip(deps: ReviewDeps, id: string, reason: string): Promise<void> {
  await deps.db.tx(deps.actor, (q) =>
    q.query(`update phi.review_requests set status = 'skipped', skip_reason = $2 where id = $1 and status = 'pending_clinician_window'`, [id, reason]),
  );
}

const ID = "reviews.request-review";

export const requestReview = phiTask({
  id: ID,
  schema: PHI_PAYLOADS["reviews.request-review"],
  retry: { maxAttempts: 4, factor: 2, minTimeoutInMs: 5_000, maxTimeoutInMs: 60_000 },
  maxDuration: 120,
  run: async ({ appointmentId }) => {
    const rt = phiRuntime();
    const deps: ReviewDeps = {
      db: rt.db,
      linkConfigured: rt.env.PHI_GOOGLE_REVIEW_URL !== undefined,
      now: () => new Date(),
      actor: ID,
      sendNow: async (payload) => {
        // A fresh Trigger key per attempt: a held (deferred, budget) attempt must not hand its cached
        // result to the next window's attempt. The message table's own key still stops a double text.
        const run = await tasks.triggerAndWait<typeof import("../messaging/send-sms.js").sendSms>("messaging.send-sms", payload, {
          idempotencyKey: `send-sms:${payload.template}:${payload.entityId}:${String(payload.step)}:${String(Date.now())}`,
        });
        if (!run.ok) return "failed";
        return run.output.status === "refused" ? { reason: run.output.reason ?? "unknown" } : run.output.status;
      },
    };
    const opened = await openReviewRequest(deps, appointmentId);
    if ("ineligible" in opened) return { result: opened.ineligible };
    // The clinician window: checkpointed, no compute while waiting.
    if (opened.scheduledFor.getTime() > Date.now()) await wait.until({ date: opened.scheduledFor });
    for (let round = 0; round < MAX_WINDOWS; round += 1) {
      const decision = await sendReviewRequest(deps, opened.reviewRequestId);
      if (decision.status !== "wait") return { result: decision.status };
      await wait.until({ date: decision.until });
    }
    await exhausted(deps, opened.reviewRequestId);
    return { result: "skipped" as const };
  },
});
