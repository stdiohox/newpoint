/**
 * Dependencies for the GBP tasks: the marketing runtime (database, Claude, GBP
 * credentials) plus the CRM's email sender and base URL, because review
 * approvals happen in the CRM and staff are told by the same emails as leads.
 */
import { createBusinessProfile, gbpAccessToken, type BusinessProfile } from "../../../adapters/google/business-profile.js";
import { createResendSender, type EmailSender } from "../../../adapters/email/resend.js";
import type { PublicClaude } from "../../../adapters/llm/anthropic-public.js";
import type { Queryable } from "../../../lib/db-marketing.js";
import { gbpEnv, loadCrmEnv, type MarketingEnv } from "../../../lib/env.js";
import type { Logger } from "../../../lib/logger.js";
import { vendorFetch } from "../../../lib/vendor-fetch.js";
import { marketingRuntime } from "../runtime.js";

export interface GbpRuntime {
  readonly db: Queryable;
  readonly claude: PublicClaude;
  readonly gbp: BusinessProfile;
  readonly logger: Logger;
  readonly email: EmailSender;
  readonly crmBaseUrl: string;
  readonly now: () => Date;
}

export function businessProfileFrom(env: MarketingEnv): BusinessProfile {
  const gbp = gbpEnv(env);
  return createBusinessProfile({ env: gbp, fetch: vendorFetch, accessToken: gbpAccessToken(gbp) });
}

let runtime: GbpRuntime | undefined;

export function gbpRuntime(): GbpRuntime {
  if (runtime) return runtime;
  const marketing = marketingRuntime();
  const crm = loadCrmEnv();
  runtime = Object.freeze({
    db: marketing.db,
    claude: marketing.claude,
    gbp: businessProfileFrom(marketing.env),
    logger: marketing.logger,
    email: createResendSender({ apiKey: crm.RESEND_API_KEY, from: crm.CRM_ALERT_FROM, fetch: vendorFetch }),
    crmBaseUrl: crm.CRM_BASE_URL,
    now: () => new Date(),
  });
  return runtime;
}
