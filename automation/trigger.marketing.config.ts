import { defineConfig } from "@trigger.dev/sdk";

/**
 * Trigger.dev project `newpoint-marketing` — the PUBLIC zone.
 * See docs/automation-architecture.md §0.1 and §3.
 *
 * Only `src/trigger/marketing` is deployed from here. Tasks in this project
 * never hold a PHI-zone credential; `loadMarketingEnv()` refuses to start if
 * one is present in the environment.
 */
const project = process.env["TRIGGER_PROJECT_REF_MARKETING"];
if (!project) {
  throw new Error(
    "TRIGGER_PROJECT_REF_MARKETING is not set. It is the newpoint-marketing project ref (proj_…) from the Trigger.dev dashboard.",
  );
}

/**
 * Tasks NOT deployed yet. Going live with one = delete its line here and redeploy.
 * The site is in holding mode (middleware.ts) and these lack accounts, so on 2026-11-09
 * only seo.keyword-research, geo.probe and ops.geo-retention went live.
 */
const NOT_YET_LIVE = [
  "**/seo/rank-tracker.ts", // nothing to rank while the site holds
  "**/geo/recommendations.ts", // would audit the holding page's schema; enable at launch
  "**/social/**", // Meta app review + n8n approval webhook
  "**/gbp/**", // GBP API access + n8n webhooks
  "**/ops/heartbeat.ts", // n8n ops alert webhook; only watches social/GBP posts
  "**/approval-gate.ts", // used only by social and GBP
  "**/crm/**", // lead alerts: needs RESEND_API_KEY + CRM_ALERT_FROM (docs/lead-crm.md)
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
