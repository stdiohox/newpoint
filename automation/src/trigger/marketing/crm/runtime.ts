/**
 * Process-wide dependencies for the lead CRM's tasks (`crm.*`).
 *
 * Separate from marketingRuntime() on purpose: an alert needs the database and
 * an email sender, and must not fail to start because the Anthropic or Search
 * Console keys are missing. init.ts picks this one for any task id `crm.*`.
 */
import type pg from "pg";
import { createResendSender, type EmailSender } from "../../../adapters/email/resend.js";
import { createMarketingPool } from "../../../lib/db-marketing.js";
import { loadCrmEnv, type CrmEnv } from "../../../lib/env.js";
import { createLogger, type Logger } from "../../../lib/logger.js";
import { vendorFetch } from "../../../lib/vendor-fetch.js";

export interface CrmRuntime {
  readonly env: CrmEnv;
  readonly db: pg.Pool;
  readonly email: EmailSender;
  readonly logger: Logger;
}

let runtime: CrmRuntime | undefined;

export function crmRuntime(): CrmRuntime {
  if (runtime) return runtime;
  const env = loadCrmEnv();
  runtime = Object.freeze({
    env,
    db: createMarketingPool(env.MARKETING_DATABASE_URL, env.MARKETING_DATABASE_CA_CERT),
    email: createResendSender({ apiKey: env.RESEND_API_KEY, from: env.CRM_ALERT_FROM, fetch: vendorFetch }),
    logger: createLogger(),
  });
  return runtime;
}
