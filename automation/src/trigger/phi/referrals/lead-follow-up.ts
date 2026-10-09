/**
 * referrals.lead-follow-up (docs/automation-architecture.md §5.5).
 *
 * Every web inquiry opens a staff callback ticket at once (and a generic "action
 * required" notice to n8n). A self-submitted new-patient inquiry is then enrolled in a
 * durable sequence: SMS at +5 min, +24 h and +72 h after submission, each through
 * messaging.send-sms. `follow_ups` holds one row per step and is re-read before each
 * send; a step is skipped if the inquiry is no longer open, the phone is not verified,
 * consent is gone, the contact is not a confirmed adult (D18) or a crisis is open.
 * Waits are checkpointed (wait.until): no compute while waiting.
 */
import { tasks, wait } from "@trigger.dev/sdk";
import type { PhiNotifier } from "../../../adapters/n8n/phi-notify.js";
import { auditRead, hasActiveConsent, openTicket, sequencesPaused, type PhiDb } from "../../../lib/db-phi.js";
import { phiTask } from "../../../lib/task.js";
import { enrolment, LEAD_STEPS, stepDecision, type Enrolment, type LeadState, type StepDecision } from "../../../domain/eligibility/follow-up-policy.js";
import { PHI_PAYLOADS } from "../payloads.js";
import { phiRuntime } from "../runtime.js";
import type { SendOutcome, SendSmsPayload } from "../messaging/send-sms.js";

export interface LeadDeps {
  readonly db: PhiDb;
  readonly notifier: PhiNotifier;
  readonly now: () => Date;
  readonly actor: string;
}

interface Inquiry {
  readonly contactId: string;
  readonly createdAt: Date;
  readonly state: Pick<LeadState, "source" | "reason">;
}

/** Opens the callback ticket and decides enrolment. Returns the scheduled steps' due times. */
export async function startLead(
  deps: LeadDeps,
  inquiryId: string,
): Promise<{ readonly enrolment: Enrolment | "missing"; readonly contactId: string | null; readonly steps: readonly { step: number; dueAt: Date }[] }> {
  const inquiry = await loadInquiry(deps, inquiryId);
  if (inquiry === null) return { enrolment: "missing", contactId: null, steps: [] };
  const opened = await deps.db.tx(deps.actor, (q) =>
    openTicket(q, { contactId: inquiry.contactId, kind: "callback", sourceKind: "inquiry", sourceId: inquiryId }),
  );
  // Best effort: the ticket is the record; n8n's email is a nudge.
  if (opened) await deps.notifier.actionRequired(deps.now()).catch(() => undefined);

  const decision = enrolment(inquiry.state);
  if (decision !== "enrol") return { enrolment: decision, contactId: inquiry.contactId, steps: [] };

  const steps = LEAD_STEPS.map((s) => ({ step: s.step, dueAt: new Date(inquiry.createdAt.getTime() + s.afterMs) }));
  await deps.db.tx(deps.actor, async (q) => {
    for (const s of steps) {
      await q.query(
        `insert into phi.follow_ups (contact_id, kind, step, due_at, source_id) values ($1, 'lead', $2, $3, $4)
         on conflict (kind, source_id, step) where source_id is not null do nothing`,
        [inquiry.contactId, s.step, s.dueAt, inquiryId],
      );
    }
  });
  return { enrolment: "enrol", contactId: inquiry.contactId, steps };
}

/**
 * Re-reads everything for one step and decides; a skip is recorded on the follow_ups row.
 * While this inquiry's code is still live and unconfirmed, the answer is to wait for it
 * (until the code expires), not to skip: a visitor who confirms at minute 6 still gets step 1.
 */
export async function decideStep(
  deps: LeadDeps,
  inquiryId: string,
  step: number,
): Promise<StepDecision | "already_done" | { readonly waitUntil: Date }> {
  return deps.db.tx(deps.actor, async (q) => {
    const { rows } = await q.query<{
      status: string; due_at: Date; inquiry_status: LeadState["inquiryStatus"]; source: LeadState["source"]; reason: LeadState["reason"];
      contact_id: string; minor_status: string; verified: boolean; pending_until: Date | null;
    }>(
      `select f.status::text as status, f.due_at, i.status::text as inquiry_status, i.source::text as source, i.reason::text as reason,
              i.contact_id, c.minor_status::text as minor_status,
              exists (select 1 from phi.phone_verifications v where v.inquiry_id = i.id and v.verified_at is not null) as verified,
              (select max(v.expires_at) from phi.phone_verifications v
                where v.inquiry_id = i.id and v.verified_at is null and v.expires_at > now() and v.attempts < 5) as pending_until
         from phi.follow_ups f join phi.inquiries i on i.id = f.source_id join phi.contacts c on c.id = i.contact_id
        where f.kind = 'lead' and f.source_id = $1 and f.step = $2`,
      [inquiryId, step],
    );
    const row = rows[0];
    if (row === undefined || row.status !== "scheduled") return "already_done";
    await auditRead(q, "contacts", row.contact_id);
    if (!row.verified && row.pending_until !== null) return { waitUntil: new Date(row.pending_until.getTime() + 60_000) };
    const decision = stepDecision(
      {
        source: row.source,
        reason: row.reason,
        inquiryStatus: row.inquiry_status,
        phoneVerified: row.verified,
        consentActive: await hasActiveConsent(q, row.contact_id, "sms_transactional"),
        crisisOpen: await sequencesPaused(q, row.contact_id),
        adult: row.minor_status === "adult",
      },
      deps.now().getTime() - row.due_at.getTime(),
    );
    if (decision !== "send") {
      await q.query(`update phi.follow_ups set status = 'skipped' where kind = 'lead' and source_id = $1 and step = $2`, [inquiryId, step]);
    }
    return decision;
  });
}

export async function markStepSent(deps: LeadDeps, inquiryId: string, step: number, outcome: SendOutcome["status"] | "failed"): Promise<void> {
  await deps.db.tx(deps.actor, (q) =>
    q.query(`update phi.follow_ups set status = $3 where kind = 'lead' and source_id = $1 and step = $2 and status = 'scheduled'`, [
      inquiryId,
      step,
      outcome === "sent" || outcome === "duplicate" ? "sent" : "skipped",
    ]),
  );
}

async function loadInquiry(deps: LeadDeps, inquiryId: string): Promise<Inquiry | null> {
  return deps.db.tx(deps.actor, async (q) => {
    const { rows } = await q.query<{ contact_id: string; created_at: Date; source: LeadState["source"]; reason: LeadState["reason"] }>(
      `select contact_id, created_at, source::text as source, reason::text as reason from phi.inquiries where id = $1`,
      [inquiryId],
    );
    const row = rows[0];
    if (row === undefined) return null;
    return { contactId: row.contact_id, createdAt: row.created_at, state: { source: row.source, reason: row.reason } };
  });
}

const ID = "referrals.lead-follow-up";

export const leadFollowUp = phiTask({
  id: ID,
  schema: PHI_PAYLOADS["referrals.lead-follow-up"],
  retry: { maxAttempts: 4, factor: 2, minTimeoutInMs: 5_000, maxTimeoutInMs: 60_000 },
  maxDuration: 120,
  run: async ({ inquiryId }) => {
    const rt = phiRuntime();
    const deps: LeadDeps = { db: rt.db, notifier: rt.notifier, now: () => new Date(), actor: ID };
    const started = await startLead(deps, inquiryId);
    if (started.enrolment !== "enrol" || started.contactId === null) return { enrolment: started.enrolment };
    const contactId = started.contactId;
    const template = (step: number) => LEAD_STEPS.find((s) => s.step === step)?.template ?? "lead_follow_up_1";
    for (const { step, dueAt } of started.steps) {
      if (dueAt.getTime() > Date.now()) await wait.until({ date: dueAt });
      let decision = await decideStep(deps, inquiryId, step);
      if (typeof decision === "object") {
        await wait.until({ date: decision.waitUntil });
        decision = await decideStep(deps, inquiryId, step);
      }
      if (decision !== "send") continue;
      const payload: SendSmsPayload = { template: template(step), contactId, entityId: inquiryId, step };
      const run = await tasks.triggerAndWait<typeof import("../messaging/send-sms.js").sendSms>("messaging.send-sms", payload, {
        idempotencyKey: `send-sms:${payload.template}:${inquiryId}:${String(step)}`,
      });
      await markStepSent(deps, inquiryId, step, run.ok ? run.output.status : "failed");
    }
    return { enrolment: "enrol" as const };
  },
});
