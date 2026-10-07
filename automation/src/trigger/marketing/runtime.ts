/**
 * Process-wide dependencies for the newpoint-marketing Trigger.dev project.
 *
 * Built once per worker process, on first use. `init.ts` calls
 * `marketingRuntime()` before every attempt, so a bad or PHI-tainted
 * environment fails the run before any task code executes.
 */
import { retry } from "@trigger.dev/sdk";
import type pg from "pg";
import { createSearchConsole, serviceAccountToken, type SearchConsole } from "../../adapters/google/search-console.js";
import { createPublicClaude, type PublicClaude } from "../../adapters/llm/anthropic-public.js";
import { createMarketingPool } from "../../lib/db-marketing.js";
import { loadMarketingEnv, type MarketingEnv } from "../../lib/env.js";
import { createLogger, type Logger } from "../../lib/logger.js";

export interface MarketingRuntime {
  readonly env: MarketingEnv;
  readonly db: pg.Pool;
  readonly searchConsole: SearchConsole;
  readonly claude: PublicClaude;
  readonly logger: Logger;
}

/**
 * Vendor HTTP: retry 429 and 5xx with backoff, nothing else (§5.9).
 * A 4xx is a bug or a revoked credential, and retrying it only repeats it.
 * Connection errors and timeouts are not retried here; they fail the attempt as
 * `unknown`/`timeout`, which the task-level retry picks up (init.ts catchError).
 *
 * Headers are flattened to a plain object first: retry.fetch rebuilds them as
 * `{ ...init.headers, "x-retry-count": n }`, and spreading a `Headers` instance
 * (what the Anthropic SDK passes) yields `{}`, which would drop the API key.
 */
const BACKOFF = { strategy: "backoff", maxAttempts: 4, factor: 2, minTimeoutInMs: 2_000, maxTimeoutInMs: 60_000 } as const;

export const vendorFetch: typeof fetch = (input, init) =>
  retry.fetch(input, {
    ...init,
    headers: Object.fromEntries(new Headers(init?.headers).entries()),
    retry: {
      byStatus: { "429": BACKOFF, "500-599": BACKOFF },
      timeout: { maxAttempts: 1 },
      connectionError: { maxAttempts: 1 },
    },
  });

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
    logger: createLogger(),
  });
  return runtime;
}
