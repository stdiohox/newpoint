import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // The pgTAP suite boots a real Postgres 17; give it room on a cold cache.
    testTimeout: 120_000,
    hookTimeout: 180_000,
  },
});
