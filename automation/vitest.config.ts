import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // pgTAP is fetched once here, not by each database suite (test/db/pgtap-source.ts).
    globalSetup: ["test/db/global-setup.ts"],
    // The pgTAP suite boots a real Postgres 17; give it room on a cold cache.
    testTimeout: 120_000,
    hookTimeout: 180_000,
  },
});
