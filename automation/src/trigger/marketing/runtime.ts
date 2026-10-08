/**
 * Process-wide dependencies for the newpoint-marketing Trigger.dev project.
 *
 * Built once per worker process, on first use. `init.ts` calls
 * `marketingRuntime()` before every attempt, so a bad or PHI-tainted
 * environment fails the run before any task code executes.
 */
import type pg from "pg";
import { createClaudeWebSearchEngine } from "../../adapters/geo/claude-web-search.js";
import type { GeoEngine } from "../../adapters/geo/engine.js";
import { createSearchConsole, serviceAccountToken, type SearchConsole } from "../../adapters/google/search-console.js";
import { createSiteSchemaReader, type SiteSchemaReader } from "../../adapters/site/schema-coverage.js";
import { createPublicClaude, type PublicClaude } from "../../adapters/llm/anthropic-public.js";
import { createMarketingPool } from "../../lib/db-marketing.js";
import { loadMarketingEnv, type MarketingEnv } from "../../lib/env.js";
import { createLogger, type Logger } from "../../lib/logger.js";
import { vendorFetch } from "../../lib/vendor-fetch.js";

export interface MarketingRuntime {
  readonly env: MarketingEnv;
  readonly db: pg.Pool;
  readonly searchConsole: SearchConsole;
  readonly claude: PublicClaude;
  /** D9: Claude only in v1. Another engine is one more entry here. */
  readonly engines: readonly GeoEngine[];
  readonly site: SiteSchemaReader;
  readonly logger: Logger;
}

export { vendorFetch } from "../../lib/vendor-fetch.js";

let runtime: MarketingRuntime | undefined;

export function marketingRuntime(): MarketingRuntime {
  if (runtime) return runtime;
  const env = loadMarketingEnv();
  runtime = Object.freeze({
    env,
    db: createMarketingPool(env.MARKETING_DATABASE_URL, env.MARKETING_DATABASE_CA_CERT),
    searchConsole: createSearchConsole({
      siteUrl: env.GSC_SITE_URL,
      fetch: vendorFetch,
      accessToken: serviceAccountToken(env.GSC_SERVICE_ACCOUNT_JSON),
    }),
    claude: createPublicClaude({ apiKey: env.ANTHROPIC_API_KEY_PUBLIC, fetch: vendorFetch }),
    engines: [createClaudeWebSearchEngine({ apiKey: env.ANTHROPIC_API_KEY_PUBLIC, fetch: vendorFetch })],
    site: createSiteSchemaReader({ siteUrl: env.GEO_SITE_URL, fetch: vendorFetch }),
    logger: createLogger(),
  });
  return runtime;
}
