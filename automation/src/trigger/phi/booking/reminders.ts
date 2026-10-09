/**
 * booking.reminders (docs/automation-architecture.md §5.1). Every 15 minutes, America/New_York.
 * Texts 48 h and 2 h before each scheduled appointment through send-sms (which applies
 * consent, D18 and quiet hours). Reminders are not a sequence: a crisis pause does not stop
 * them (§5.8).
 */
import { tasks } from "@trigger.dev/sdk";
import type { PhiDb } from "../../../lib/db-phi.js";
import { phiSchedule } from "../../../lib/task.js";
import { remindersDue, type ReminderTemplate } from "../../../domain/scheduling/reminders.js";
import { phiRuntime } from "../runtime.js";

export interface DueReminder {
  readonly appointmentId: string;
  readonly contactId: string;
  readonly template: ReminderTemplate;
}

export async function findDueReminders(db: PhiDb, actor: string, now: Date): Promise<DueReminder[]> {
  const { rows } = await db.tx(actor, (q) =>
    q.query<{ id: string; contact_id: string; starts_at: Date }>(
      `select id, contact_id, starts_at from phi.appointments
        where status = 'scheduled' and starts_at > $1::timestamptz and starts_at <= $1::timestamptz + interval '48 hours'`,
      [now],
    ),
  );
  return rows.flatMap((r) => remindersDue(r.starts_at, now).map((template) => ({ appointmentId: r.id, contactId: r.contact_id, template })));
}

const ID = "booking.reminders";

export const bookingReminders = phiSchedule({
  id: ID,
  cron: { pattern: "*/15 * * * *", timezone: "America/New_York" },
  retry: { maxAttempts: 2 },
  maxDuration: 120,
  run: async () => {
    const due = await findDueReminders(phiRuntime().db, ID, new Date());
    for (const r of due) {
      await tasks.trigger(
        "messaging.send-sms",
        { template: r.template, contactId: r.contactId, entityId: r.appointmentId, step: 0 },
        { idempotencyKey: `send-sms:${r.template}:${r.appointmentId}:0` },
      );
    }
    return { reminders: due.length };
  },
});
