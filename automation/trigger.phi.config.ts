import { defineConfig } from "@trigger.dev/sdk";

/**
 * Trigger.dev project `newpoint-phi` — the PHI zone. See docs/automation-architecture.md
 * §0.1, §2, §3 and §7 Phase 5.
 *
 * DO NOT DEPLOY until the Trigger.dev HIPAA add-on and BAA are signed (§2, D3), the
 * other Phase 5 BAAs are signed, and D15 and D20 are approved. Production refuses to
 * start while the crisis script or consent wording is a placeholder
 * (src/trigger/phi/runtime.ts assertApprovedForEnvironment).
 *
 * Only `src/trigger/phi` is deployed from here. `loadPhiEnv()` refuses to start if any
 * public-zone credential is present.
 */
const project = process.env["TRIGGER_PROJECT_REF_PHI"];
if (!project) {
  throw new Error("TRIGGER_PROJECT_REF_PHI is not set. It is the newpoint-phi project ref (proj_…) from the Trigger.dev dashboard.");
}

export default defineConfig({
  project,
  dirs: ["./src/trigger/phi"],
  runtime: "node",
  logLevel: "info",
  maxDuration: 300,
  retries: {
    enabledInDev: false,
    default: { maxAttempts: 3, minTimeoutInMs: 1_000, maxTimeoutInMs: 30_000, factor: 2, randomize: true },
  },
});
