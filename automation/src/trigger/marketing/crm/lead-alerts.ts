/**
 * crm.new-lead-alert and crm.new-lead-alert-sweep (docs/lead-crm.md).
 *
 * The site triggers crm.new-lead-alert right after a lead is stored, so staff
 * hear within seconds. The sweep runs every 10 minutes and sends whatever a
 * lost trigger or a failed send left behind.
 *
 * At least once: leads are claimed, emailed, then marked sent. A send that
 * fails leaves them claimed-not-sent, and they are claimable again after 10
 * minutes (up to 5 attempts, crm.claim_lead_alerts). A duplicate alert is
 * better than a missed lead.
 *
 * Runs as the trigger_marketing login, which must be a member of crm_alerts.
 * Those functions return a lead's id, reason and time only.
 */
import { queue } from "@trigger.dev/sdk";
import { z } from "zod";
import type { EmailSender } from "../../../adapters/email/resend.js";
import { alertEmail, type ClaimedLead } from "../../../domain/crm/alert-email.js";
import type { Queryable } from "../../../lib/db-marketing.js";
import type { Logger } from "../../../lib/logger.js";
import { marketingSchedule, marketingTask } from "../../../lib/task.js";
import { crmRuntime } from "./runtime.js";

export const crmQueue = queue({ name: "crm", concurrencyLimit: 1 });

export interface LeadAlertDeps {
  readonly db: Queryable;
  readonly email: EmailSender;
  readonly crmBaseUrl: string;
  readonly logger: Logger;
}

export interface LeadAlertResult {
  readonly claimed: number;
  readonly sent: number;
  readonly recipients: number;
}

export async function sendLeadAlerts(deps: LeadAlertDeps): Promise<LeadAlertResult> {
  const { rows } = await deps.db.query<{ id: string; reason: string; created_at: Date }>(
    "select id, reason, created_at from crm.claim_lead_alerts(50)",
  );
  if (rows.length === 0) return { claimed: 0, sent: 0, recipients: 0 };

  const recipients = (await deps.db.query<{ email: string }>("select email from crm.alert_recipients()")).rows.map(
    (row) => row.email,
  );
  if (recipients.length === 0) {
    // Nobody to tell. Leave the claim to expire so the alert goes out once someone
    // turns alerts on, and say so in the run log.
    deps.logger.warn("crm.lead_alert.no_recipients", { claimed: rows.length });
    return { claimed: rows.length, sent: 0, recipients: 0 };
  }

  const leads: ClaimedLead[] = rows.map((row) => ({ id: row.id, reason: row.reason, createdAt: row.created_at }));
  await deps.email.send(alertEmail(leads, recipients, deps.crmBaseUrl));

  const marked = await deps.db.query<{ marked: number }>("select crm.mark_leads_alerted($1::uuid[]) as marked", [
    leads.map((lead) => lead.id),
  ]);
  const sent = marked.rows[0]?.marked ?? 0;
  deps.logger.info("crm.lead_alert.sent", { claimed: rows.length, sent, recipients: recipients.length });
  return { claimed: rows.length, sent, recipients: recipients.length };
}

function deps(): LeadAlertDeps {
  const runtime = crmRuntime();
  return { db: runtime.db, email: runtime.email, crmBaseUrl: runtime.env.CRM_BASE_URL, logger: runtime.logger };
}

/** Triggered by the site's /api/leads with an empty payload: the task finds what is unsent. */
export const newLeadAlert = marketingTask({
  id: "crm.new-lead-alert",
  schema: z.object({}).strict(),
  queue: crmQueue,
  maxDuration: 120,
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 5_000, maxTimeoutInMs: 60_000 },
  run: () => sendLeadAlerts(deps()),
});

export const newLeadAlertSweep = marketingSchedule({
  id: "crm.new-lead-alert-sweep",
  cron: { pattern: "*/10 * * * *", timezone: "America/New_York" },
  queue: crmQueue,
  maxDuration: 120,
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 5_000, maxTimeoutInMs: 60_000 },
  run: () => sendLeadAlerts(deps()),
});
