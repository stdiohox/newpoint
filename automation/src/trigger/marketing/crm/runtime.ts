/**
 * Process-wide dependencies for the lead CRM's tasks (`crm.*`).
 *
 * Separate from marketingRuntime() on purpose: an alert needs the database and
 * an email sender, and must not fail to start because the Anthropic or Search
 * Console keys are missing. init.ts picks this one for any task id `crm.*`.
 */
import type pg from "pg";
import { createCartesiaCalls, type CallsClient } from "../../../adapters/calls/cartesia.js";
import { createResendSender, type EmailSender } from "../../../adapters/email/resend.js";
import { createMarketingPool } from "../../../lib/db-marketing.js";
import { loadCrmEnv, type CrmEnv } from "../../../lib/env.js";
import { createLogger, type Logger } from "../../../lib/logger.js";
import { noRetryFetch, vendorFetch } from "../../../lib/vendor-fetch.js";

export interface CrmRuntime {
  readonly env: CrmEnv;
  readonly db: pg.Pool;
  readonly email: EmailSender;
  readonly logger: Logger;
  /** null = lead calls are off (no CRM_VOICE_* configured). */
  readonly calls: CallsClient | null;
}

let runtime: CrmRuntime | undefined;

export function crmRuntime(): CrmRuntime {
  if (runtime) return runtime;
  const env = loadCrmEnv();
  const logger = createLogger();
  // Calls off, alerts on: say so in every worker's log until it is fixed in Trigger.dev.
  if (env.crmVoiceProblem) logger.error("crm.lead_call.config_invalid", null, env.crmVoiceProblem);
  runtime = Object.freeze({
    env,
    db: createMarketingPool(env.MARKETING_DATABASE_URL, env.MARKETING_DATABASE_CA_CERT),
    email: createResendSender({ apiKey: env.RESEND_API_KEY, from: env.CRM_ALERT_FROM, fetch: vendorFetch }),
    logger,
    calls:
      env.CRM_VOICE_API_KEY && env.CRM_VOICE_AGENT_ID && env.CRM_VOICE_FROM_NUMBER_ID
        ? createCartesiaCalls({
            apiKey: env.CRM_VOICE_API_KEY,
            agentId: env.CRM_VOICE_AGENT_ID,
            fromNumberId: env.CRM_VOICE_FROM_NUMBER_ID,
            placeFetch: noRetryFetch,
            readFetch: vendorFetch,
          })
        : null,
  });
  return runtime;
}
