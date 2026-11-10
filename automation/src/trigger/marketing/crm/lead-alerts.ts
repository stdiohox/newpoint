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
 * Both also send each new lead their confirmation email (sendLeadConfirmations):
 * same claim/send/mark shape, one email per lead, skipped entirely while
 * CRM_CONFIRM_REPLY_TO is unset.
 *
 * Runs as the trigger_marketing login, which must be a member of crm_alerts.
 * The alert functions return a lead's id, reason and time only; the
 * confirmation claim also returns name and email, to address the email.
 */
import { queue } from "@trigger.dev/sdk";
import { z } from "zod";
import type { EmailSender } from "../../../adapters/email/resend.js";
import { VendorHttpError } from "../../../lib/errors.js";
import { alertEmail, type ClaimedLead } from "../../../domain/crm/alert-email.js";
import { confirmationEmail, type ConfirmationOptions } from "../../../domain/crm/confirmation-email.js";
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
  /** null = confirmations off (no reply-to inbox configured). */
  readonly confirm: ConfirmationOptions | null;
}

export interface LeadAlertResult {
  readonly claimed: number;
  readonly sent: number;
  readonly recipients: number;
}

export async function sendLeadAlerts(deps: LeadAlertDeps): Promise<LeadAlertResult> {
  const stuck = (await deps.db.query<{ n: number }>("select crm.stuck_lead_alerts() as n")).rows[0]?.n ?? 0;
  if (stuck > 0) deps.logger.error("crm.lead_alert.gave_up", null, { leads: stuck });

  const { rows } = await deps.db.query<{ id: string; reason: string; created_at: Date }>(
    "select id, reason, created_at from crm.claim_lead_alerts(50)",
  );
  if (rows.length === 0) return { claimed: 0, sent: 0, recipients: 0 };
  const ids = rows.map((row) => row.id);
  const release = () => deps.db.query("select crm.release_lead_alerts($1::uuid[])", [ids]);

  const recipients = (await deps.db.query<{ email: string }>("select email from crm.alert_recipients()")).rows.map(
    (row) => row.email,
  );
  if (recipients.length === 0) {
    // Nobody to tell. Give the claim back without spending an attempt, so the
    // alert goes out once someone turns alerts on.
    await release();
    deps.logger.warn("crm.lead_alert.no_recipients", { claimed: rows.length });
    return { claimed: rows.length, sent: 0, recipients: 0 };
  }

  const leads: ClaimedLead[] = rows.map((row) => ({ id: row.id, reason: row.reason, createdAt: row.created_at }));
  try {
    await deps.email.send(alertEmail(leads, recipients, deps.crmBaseUrl));
  } catch (error) {
    // Released so the task's own retry (seconds later) can send it, rather than
    // waiting out the claim. The attempt counter still caps a permanent failure.
    await release().catch(() => undefined);
    throw error;
  }

  const marked = await deps.db.query<{ marked: number }>("select crm.mark_leads_alerted($1::uuid[]) as marked", [
    leads.map((lead) => lead.id),
  ]);
  const sent = marked.rows[0]?.marked ?? 0;
  deps.logger.info("crm.lead_alert.sent", { claimed: rows.length, sent, recipients: recipients.length });
  return { claimed: rows.length, sent, recipients: recipients.length };
}

export interface ConfirmationResult {
  readonly claimed: number;
  readonly sent: number;
}

export async function sendLeadConfirmations(deps: LeadAlertDeps): Promise<ConfirmationResult> {
  const confirm = deps.confirm;
  if (!confirm) return { claimed: 0, sent: 0 };

  const stuck = (await deps.db.query<{ n: number }>("select crm.stuck_lead_confirmations() as n")).rows[0]?.n ?? 0;
  if (stuck > 0) deps.logger.error("crm.lead_confirmation.gave_up", null, { leads: stuck });

  const { rows } = await deps.db.query<{ id: string; name: string; email: string; reason: string }>(
    "select id, name, email, reason from crm.claim_lead_confirmations(50)",
  );
  if (rows.length === 0) return { claimed: 0, sent: 0 };

  let sent = 0;
  let failed = 0;
  let retryable: Error | undefined;
  for (const row of rows) {
    try {
      await deps.email.send(confirmationEmail(row, confirm));
    } catch (error) {
      failed += 1;
      // A 4xx (bad address, rejected content) repeats on every retry: keep the
      // claim so the attempt counts toward the cap of 5. Anything else (429,
      // 5xx, network) is given back for the task's retry.
      if (error instanceof VendorHttpError && error.failureClass === "vendor_4xx") continue;
      retryable ??= error instanceof Error ? error : new Error("lead confirmation send failed");
      await deps.db.query("select crm.release_lead_confirmations($1::uuid[])", [[row.id]]).catch(() => undefined);
      continue;
    }
    // Marked one at a time, straight after its send, so a task cut short
    // cannot leave sent emails unmarked (and the idempotency key covers a lost mark).
    const marked = await deps.db.query<{ marked: number }>("select crm.mark_leads_confirmed($1::uuid[]) as marked", [
      [row.id],
    ]);
    sent += marked.rows[0]?.marked ?? 0;
  }

  if (failed > 0) deps.logger.warn("crm.lead_confirmation.failed", { failed, sent });
  if (retryable) throw retryable;
  deps.logger.info("crm.lead_confirmation.sent", { claimed: rows.length, sent });
  return { claimed: rows.length, sent };
}

/** Both jobs, each attempted even if the other fails; the first failure is rethrown so the task retries. */
export async function processNewLeads(deps: LeadAlertDeps) {
  const [confirmations, alerts] = await Promise.allSettled([sendLeadConfirmations(deps), sendLeadAlerts(deps)]);
  if (confirmations.status === "rejected") throw confirmations.reason;
  if (alerts.status === "rejected") throw alerts.reason;
  return { confirmations: confirmations.value, alerts: alerts.value };
}

function deps(): LeadAlertDeps {
  const runtime = crmRuntime();
  const env = runtime.env;
  return {
    db: runtime.db,
    email: runtime.email,
    crmBaseUrl: env.CRM_BASE_URL,
    logger: runtime.logger,
    confirm: env.CRM_CONFIRM_REPLY_TO
      ? { siteOrigin: new URL(env.CRM_BASE_URL).origin, from: env.CRM_CONFIRM_FROM, replyTo: env.CRM_CONFIRM_REPLY_TO }
      : null,
  };
}

/** Triggered by the site's /api/leads with an empty payload: the task finds what is unsent. */
export const newLeadAlert = marketingTask({
  id: "crm.new-lead-alert",
  schema: z.object({}).strict(),
  queue: crmQueue,
  maxDuration: 120,
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 5_000, maxTimeoutInMs: 60_000 },
  run: () => processNewLeads(deps()),
});

export const newLeadAlertSweep = marketingSchedule({
  id: "crm.new-lead-alert-sweep",
  cron: { pattern: "*/10 * * * *", timezone: "America/New_York" },
  queue: crmQueue,
  maxDuration: 120,
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 5_000, maxTimeoutInMs: 60_000 },
  run: () => processNewLeads(deps()),
});
