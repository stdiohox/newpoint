/**
 * referrals.no-show and referrals.post-visit-logistics (docs/automation-architecture.md
 * §5.1, §5.5), one follow_ups row each.
 *
 * - No-show: only a patient positively known to be NEW (the visit came from a booking request
 *   marked new_patient) gets one automated rebooking offer. Everyone else, including a
 *   long-standing patient whose first visit recorded here is the no-show, goes to a
 *   clinician review ticket. If the rebooking text is refused (consent, D18, crisis pause),
 *   staff get a callback ticket instead: a no-show never just disappears.
 * - Post-visit logistics: one non-clinical text (forms, telehealth link help), requested by
 *   staff in the console.
 * Both texts go through send-sms, which applies consent, D18, the crisis pause (both are
 * sequence templates) and quiet hours. The follow_ups row records what happened.
 */
import { tasks } from "@trigger.dev/sdk";
import type { PhiNotifier } from "../../../adapters/n8n/phi-notify.js";
import { auditRead, openTicket, type PhiDb } from "../../../lib/db-phi.js";
import { phiTask } from "../../../lib/task.js";
import type { SendSmsPayload } from "../messaging/send-sms.js";
import { PHI_PAYLOADS } from "../payloads.js";
import { phiRuntime } from "../runtime.js";

export interface FollowUpDeps {
  readonly db: PhiDb;
  /** Resolves to send-sms's status ("sent", "duplicate", "refused", …) or "failed". */
  readonly sendNow: (payload: SendSmsPayload) => Promise<string>;
  readonly notifier: PhiNotifier;
  readonly actor: string;
}

export type FollowUpResult = "clinician_review" | "rebook_sent" | "logistics_sent" | "skipped" | "already_done" | "missing";

interface Row {
  readonly contactId: string;
  readonly kind: "no_show" | "post_visit_logistics";
  readonly status: string;
  readonly sourceId: string | null;
}

async function load(deps: FollowUpDeps, id: string): Promise<Row | null> {
  return deps.db.tx(deps.actor, async (q) => {
    const { rows } = await q.query<{ contact_id: string; kind: Row["kind"]; status: string; source_id: string | null }>(
      `select contact_id, kind::text as kind, status::text as status, source_id from phi.follow_ups where id = $1`,
      [id],
    );
    const row = rows[0];
    if (row === undefined) return null;
    await auditRead(q, "follow_ups", id);
    return { contactId: row.contact_id, kind: row.kind, status: row.status, sourceId: row.source_id };
  });
}

async function finish(deps: FollowUpDeps, id: string, status: "sent" | "skipped" | "done"): Promise<void> {
  await deps.db.tx(deps.actor, (q) => q.query(`update phi.follow_ups set status = $2 where id = $1 and status = 'scheduled'`, [id, status]));
}

export async function runNoShow(deps: FollowUpDeps, followUpId: string): Promise<{ readonly result: FollowUpResult }> {
  const row = await load(deps, followUpId);
  if (row === null || row.kind !== "no_show") return { result: "missing" };
  if (row.status !== "scheduled") return { result: "already_done" };
  const knownNew = await deps.db.tx(deps.actor, async (q) => {
    const { rows } = await q.query(
      `select 1 from phi.appointments missed join phi.booking_requests r on r.id = missed.source_booking_request_id
        where missed.id = $1 and r.new_patient is true
          and not exists (select 1 from phi.appointments earlier
                           where earlier.contact_id = missed.contact_id and earlier.status = 'completed' and earlier.starts_at < missed.starts_at)`,
      [row.sourceId],
    );
    return rows.length > 0;
  });
  if (!knownNew) {
    const opened = await deps.db.tx(deps.actor, (q) =>
      openTicket(q, { contactId: row.contactId, kind: "clinician_review", sourceKind: "follow_up", sourceId: followUpId }),
    );
    if (opened) await deps.notifier.actionRequired(new Date()).catch(() => undefined);
    await finish(deps, followUpId, "done");
    return { result: "clinician_review" };
  }
  const sent = await deps.sendNow({ template: "no_show_rebook", contactId: row.contactId, entityId: followUpId, step: 0 });
  // A transport failure is retried; only a deliberate refusal (consent, D18, crisis pause) is a skip.
  if (sent === "failed") throw new Error("referrals.no-show: send failed");
  if (sent === "sent" || sent === "duplicate") {
    await finish(deps, followUpId, "sent");
    return { result: "rebook_sent" };
  }
  const opened = await deps.db.tx(deps.actor, (q) =>
    openTicket(q, { contactId: row.contactId, kind: "callback", sourceKind: "follow_up", sourceId: followUpId }),
  );
  if (opened) await deps.notifier.actionRequired(new Date()).catch(() => undefined);
  await finish(deps, followUpId, "skipped");
  return { result: "skipped" };
}

export async function runPostVisitLogistics(deps: FollowUpDeps, followUpId: string): Promise<{ readonly result: FollowUpResult }> {
  const row = await load(deps, followUpId);
  if (row === null || row.kind !== "post_visit_logistics") return { result: "missing" };
  if (row.status !== "scheduled") return { result: "already_done" };
  const sent = await deps.sendNow({ template: "post_visit_logistics", contactId: row.contactId, entityId: followUpId, step: 0 });
  if (sent === "failed") throw new Error("referrals.post-visit-logistics: send failed");
  await finish(deps, followUpId, sent === "sent" || sent === "duplicate" ? "sent" : "skipped");
  return { result: sent === "sent" || sent === "duplicate" ? "logistics_sent" : "skipped" };
}

function deps(actor: string): FollowUpDeps {
  const rt = phiRuntime();
  return {
    db: rt.db,
    notifier: rt.notifier,
    actor,
    sendNow: async (payload) => {
      const run = await tasks.triggerAndWait<typeof import("../messaging/send-sms.js").sendSms>("messaging.send-sms", payload, {
        idempotencyKey: `send-sms:${payload.template}:${payload.entityId}:${String(payload.step)}`,
      });
      return run.ok ? run.output.status : "failed";
    },
  };
}

export const noShow = phiTask({
  id: "referrals.no-show",
  schema: PHI_PAYLOADS["referrals.no-show"],
  retry: { maxAttempts: 4, factor: 2, minTimeoutInMs: 5_000, maxTimeoutInMs: 60_000 },
  maxDuration: 120,
  run: ({ followUpId }) => runNoShow(deps("referrals.no-show"), followUpId),
});

export const postVisitLogistics = phiTask({
  id: "referrals.post-visit-logistics",
  schema: PHI_PAYLOADS["referrals.post-visit-logistics"],
  retry: { maxAttempts: 4, factor: 2, minTimeoutInMs: 5_000, maxTimeoutInMs: 60_000 },
  maxDuration: 120,
  run: ({ followUpId }) => runPostVisitLogistics(deps("referrals.post-visit-logistics"), followUpId),
});
