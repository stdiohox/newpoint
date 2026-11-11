import { defineConfig } from "@trigger.dev/sdk";

/**
 * Trigger.dev project `newpoint-marketing` — the PUBLIC zone.
 * See docs/automation-architecture.md §0.1 and §3.
 *
 * Only `src/trigger/marketing` is deployed from here. Tasks in this project
 * never hold a PHI-zone credential; `loadMarketingEnv()` refuses to start if
 * one is present in the environment.
 */
/**
 * The project ref is an identifier, not a secret. It is written here because
 * Trigger's cloud indexer imports this file without the local env; the env var
 * still overrides it for a local `trigger dev` against another project.
 */
const project = process.env["TRIGGER_PROJECT_REF_MARKETING"] ?? "proj_xueejjzxufoytsmtozfo";

/**
 * Tasks NOT deployed yet. Going live with one = delete its line here and redeploy.
 * The site is in holding mode (middleware.ts) and these lack accounts, so on 2026-11-09
 * only seo.keyword-research, geo.probe and ops.geo-retention went live.
 */
const NOT_YET_LIVE = [
  "**/seo/rank-tracker.ts", // nothing to rank while the site holds
  "**/geo/recommendations.ts", // would audit the holding page's schema; enable at launch
  "**/gbp/**", // Business Profile access + Google API approval (docs/gbp-access.md)
];

export default defineConfig({
  project,
  dirs: ["./src/trigger/marketing"],
  ignorePatterns: ["**/*.test.ts", "**/*.spec.ts", ...NOT_YET_LIVE],
  runtime: "node",
  logLevel: "info",
  maxDuration: 300,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1_000,
      maxTimeoutInMs: 30_000,
      factor: 2,
      randomize: true,
    },
  },
});
