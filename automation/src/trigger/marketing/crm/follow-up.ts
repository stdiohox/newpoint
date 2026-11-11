/**
 * crm.stale-lead-nudge (hourly, 08:00–19:59 ET) and crm.weekly-summary
 * (Monday 08:00 ET). See docs/lead-crm.md, "Follow-up nudges".
 *
 * Nudges: crm.stale_leads() lists leads still "New" past their first (level 1)
 * or second (level 2) threshold whose nudge has not gone out; one email per level, then
 * crm.mark_leads_nudged. A failed send is simply not marked, so the next hour
 * sends it. Nothing is sent outside 08:00–19:59 Eastern.
 *
 * Weekly: crm.weekly_summary() computes last week's counts in the database.
 */
import type { EmailSender } from "../../../adapters/email/resend.js";
import { nudgeEmail, weeklySummaryEmail, type StaleLead, type WeeklySummary } from "../../../domain/crm/follow-up-email.js";
import type { Queryable } from "../../../lib/db-marketing.js";
import type { Logger } from "../../../lib/logger.js";
import { marketingSchedule } from "../../../lib/task.js";
import { crmQueue } from "./lead-alerts.js";
import { crmRuntime } from "./runtime.js";

export interface FollowUpDeps {
  readonly db: Queryable;
  readonly email: EmailSender;
  readonly crmBaseUrl: string;
  readonly logger: Logger;
}

const ET_HOUR = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" });

export function easternHour(at: Date): number {
  const hour = Number(ET_HOUR.formatToParts(at).find((part) => part.type === "hour")?.value ?? "0");
  return hour === 24 ? 0 : hour;
}

export const NUDGE_HOURS = { from: 8, until: 20 } as const;

export interface NudgeResult {
  readonly skipped?: "quiet_hours";
  readonly level1: number;
  readonly level2: number;
}

export async function sendStaleLeadNudges(deps: FollowUpDeps, now: Date = new Date()): Promise<NudgeResult> {
  const hour = easternHour(now);
  if (hour < NUDGE_HOURS.from || hour >= NUDGE_HOURS.until) return { skipped: "quiet_hours", level1: 0, level2: 0 };

  const { rows } = await deps.db.query<{ id: string; reason: string; created_at: Date; level: number }>(
    "select id, reason, created_at, level from crm.stale_leads()",
  );
  const sent = { level1: 0, level2: 0 };
  for (const level of [2, 1] as const) {
    const leads: StaleLead[] = rows
      .filter((row) => row.level === level)
      .map((row) => ({ id: row.id, reason: row.reason, createdAt: row.created_at, level }));
    if (leads.length === 0) continue;

    const recipients = (
      await deps.db.query<{ email: string }>("select email from crm.nudge_recipients($1::smallint)", [level])
    ).rows.map((row) => row.email);
    if (recipients.length === 0) {
      // Nobody to tell: the leads stay unmarked, so this repeats every hour until someone turns alerts on.
      deps.logger.error("crm.nudge.no_recipients", null, { level, leads: leads.length });
      continue;
    }

    await deps.email.send(nudgeEmail(level, leads, recipients, deps.crmBaseUrl, now));
    const marked = await deps.db.query<{ marked: number }>("select crm.mark_leads_nudged($1::uuid[], $2::smallint) as marked", [
      leads.map((lead) => lead.id),
      level,
    ]);
    sent[level === 1 ? "level1" : "level2"] = marked.rows[0]?.marked ?? 0;
    deps.logger.info("crm.nudge.sent", { level, leads: leads.length, recipients: recipients.length });
  }
  return sent;
}

export interface WeeklyResult {
  readonly sent: boolean;
  readonly recipients: number;
  readonly week: string;
}

export async function sendWeeklySummary(deps: FollowUpDeps): Promise<WeeklyResult> {
  const summary = (await deps.db.query<{ s: WeeklySummary }>("select crm.weekly_summary() as s")).rows[0]?.s;
  if (!summary) throw new Error("crm.weekly_summary returned nothing");
  const recipients = (await deps.db.query<{ email: string }>("select email from crm.alert_recipients()")).rows.map(
    (row) => row.email,
  );
  const week = summary.from.slice(0, 10);
  if (recipients.length === 0) {
    deps.logger.warn("crm.weekly_summary.no_recipients");
    return { sent: false, recipients: 0, week };
  }
  await deps.email.send(weeklySummaryEmail(summary, recipients, deps.crmBaseUrl));
  deps.logger.info("crm.weekly_summary.sent", { recipients: recipients.length, new_in: summary.new_in });
  return { sent: true, recipients: recipients.length, week };
}

function deps(): FollowUpDeps {
  const runtime = crmRuntime();
  return { db: runtime.db, email: runtime.email, crmBaseUrl: runtime.env.CRM_BASE_URL, logger: runtime.logger };
}

export const staleLeadNudge = marketingSchedule({
  id: "crm.stale-lead-nudge",
  cron: { pattern: "0 * * * *", timezone: "America/New_York" },
  queue: crmQueue,
  maxDuration: 120,
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 5_000, maxTimeoutInMs: 60_000 },
  run: () => sendStaleLeadNudges(deps()),
});

export const weeklySummary = marketingSchedule({
  id: "crm.weekly-summary",
  cron: { pattern: "0 8 * * 1", timezone: "America/New_York" },
  queue: crmQueue,
  maxDuration: 120,
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 5_000, maxTimeoutInMs: 60_000 },
  run: () => sendWeeklySummary(deps()),
});
