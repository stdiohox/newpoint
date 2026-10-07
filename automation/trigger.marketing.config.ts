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

export default defineConfig({
  project,
  dirs: ["./src/trigger/marketing"],
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
