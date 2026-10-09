/**
 * booking.sync (docs/automation-architecture.md §5.1). Every 15 minutes.
 *
 * 1. Each adapter that can list appointments is read and its rows upserted by
 *    (adapter, external_ref). Neither v1 adapter can (D1): manual-queue appointments are
 *    entered by staff in the console, and Headway has no API. A real EHR adapter plugs in here.
 * 2. Staff-recorded appointments get their confirmation text once (booking_confirmed).
 * 3. A no-show opens a `no_show` follow-up and queues referrals.no-show (§5.1, §5.5).
 * 4. Due follow-ups (no_show, post_visit_logistics) are queued to their tasks.
 * A newly completed appointment is the review-eligibility signal Phase 9 consumes.
 *
 * Reminders and confirmations are keyed by appointment id, so a reschedule is a new
 * appointment row (cancel, then record), never an in-place change of starts_at.
 * The adapter update below therefore never moves starts_at (D1: no v1 adapter has a feed).
 */
import { tasks } from "@trigger.dev/sdk";
import type { SchedulingAdapter } from "../../../adapters/scheduling/SchedulingAdapter.js";
import type { PhiDb } from "../../../lib/db-phi.js";
import { phiSchedule } from "../../../lib/task.js";
import { phiRuntime } from "../runtime.js";

export interface SyncPlan {
  readonly confirmations: readonly { readonly appointmentId: string; readonly contactId: string }[];
  readonly followUps: readonly { readonly id: string; readonly kind: "no_show" | "post_visit_logistics" }[];
  readonly upserted: number;
}

export async function planSync(db: PhiDb, actor: string, adapters: readonly SchedulingAdapter[], now: Date): Promise<SyncPlan> {
  let upserted = 0;
  for (const adapter of adapters.filter((a) => a.capabilities.readAvailability || a.capabilities.writeBooking)) {
    const listed = await adapter.listAppointments({ from: new Date(now.getTime() - 7 * 86_400_000), to: new Date(now.getTime() + 60 * 86_400_000) });
    if (!listed.ok) continue;
    await db.tx(actor, async (q) => {
      for (const a of listed.value) {
        // Only rows already linked to a contact are updated; matching a new feed row to a person is a staff job.
        const r = await q.query(
          `update phi.appointments set status = $3, modality = coalesce($4, modality)
            where adapter = $1 and external_ref = $2 and status = 'scheduled' and starts_at = $5`,
          [adapter.id, a.externalRef, a.status, a.modality, a.startsAt],
        );
        upserted += r.rowCount ?? 0;
      }
    });
  }

  return db.tx(actor, async (q) => {
    const confirmations = await q.query<{ id: string; contact_id: string }>(
      `select a.id, a.contact_id from phi.appointments a
        where a.adapter = 'manual-queue' and a.status = 'scheduled' and a.starts_at > now()
          and not exists (select 1 from phi.messages m where m.idempotency_key = 'booking_confirmed:' || a.id || ':0')
          and a.starts_at < now() + interval '60 days'
        order by a.starts_at limit 200`,
    );
    await q.query(
      `insert into phi.follow_ups (contact_id, kind, step, due_at, source_id)
       select a.contact_id, 'no_show', 0, now(), a.id from phi.appointments a
        where a.status = 'no_show' and a.starts_at > now() - interval '30 days'
       on conflict (kind, source_id, step) where source_id is not null do nothing`,
    );
    const due = await q.query<{ id: string; kind: "no_show" | "post_visit_logistics" }>(
      `select id, kind::text as kind from phi.follow_ups
        where status = 'scheduled' and kind in ('no_show', 'post_visit_logistics') and due_at <= now() limit 200`,
    );
    return {
      confirmations: confirmations.rows.map((r) => ({ appointmentId: r.id, contactId: r.contact_id })),
      followUps: due.rows,
      upserted,
    };
  });
}

const ID = "booking.sync";

export const bookingSync = phiSchedule({
  id: ID,
  cron: { pattern: "*/15 * * * *", timezone: "America/New_York" },
  retry: { maxAttempts: 2 },
  maxDuration: 180,
  run: async () => {
    const rt = phiRuntime();
    const plan = await planSync(rt.db, ID, [rt.scheduling.manual, ...(rt.scheduling.headway === null ? [] : [rt.scheduling.headway])], new Date());
    for (const c of plan.confirmations) {
      await tasks.trigger(
        "messaging.send-sms",
        { template: "booking_confirmed", contactId: c.contactId, entityId: c.appointmentId, step: 0 },
        { idempotencyKey: `send-sms:booking_confirmed:${c.appointmentId}:0` },
      );
    }
    for (const f of plan.followUps) {
      const task = f.kind === "no_show" ? "referrals.no-show" : "referrals.post-visit-logistics";
      await tasks.trigger(task, { followUpId: f.id }, { idempotencyKey: `${task}:${f.id}` });
    }
    return { confirmations: plan.confirmations.length, followUps: plan.followUps.length, upserted: plan.upserted };
  },
});
