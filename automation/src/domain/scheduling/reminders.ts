/**
 * Appointment reminders (docs/automation-architecture.md §5.1): 48 h and 2 h before,
 * subject to §5.0 quiet hours. Pure. Reminders are not a sequence: they keep running
 * during a crisis pause (§5.8).
 *
 * The windows overlap several 15-minute cron runs so a missed run still sends; the
 * send-sms idempotency key (template, appointment, 0) makes the rest no-ops. A 2 h reminder
 * that quiet hours would push to within 30 minutes of the visit (or past it) is dropped
 * rather than sent late.
 */
import { inWindow, nextInWindow, SMS_WINDOW } from "../messaging/quiet-hours.js";

export type ReminderTemplate = "appointment_reminder_48h" | "appointment_reminder_2h";

const H = 3_600_000;

export function remindersDue(startsAt: Date, now: Date): ReminderTemplate[] {
  const lead = startsAt.getTime() - now.getTime();
  const due: ReminderTemplate[] = [];
  if (lead <= 48 * H && lead > 46 * H) due.push("appointment_reminder_48h");
  if (lead <= 2 * H && lead > 1 * H) {
    const sendAt = inWindow(now, SMS_WINDOW) ? now : nextInWindow(now, SMS_WINDOW);
    if (startsAt.getTime() - sendAt.getTime() >= 30 * 60_000) due.push("appointment_reminder_2h");
  }
  return due;
}
