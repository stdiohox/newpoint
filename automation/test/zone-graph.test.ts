import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { isPhiZoneModule, isPublicZoneModule, phiZoneChains, publicZoneChains } from "./zone-graph.js";

const PROJECT = join(import.meta.dirname, "..");

async function fixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "newpoint-zone-"));
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), text);
  }
  await writeFile(join(root, "package.json"), '{"type":"module"}');
  return root;
}

describe("zone graph: no PHI-zone module is reachable from src/trigger/marketing", () => {
  it("holds for the real source tree", () => {
    expect(phiZoneChains(PROJECT)).toEqual([]);
  });

  it("finds a PHI adapter reached through a shared module", async () => {
    const root = await fixture({
      "src/trigger/marketing/seo/task.ts": 'import { x } from "../../../domain/shared.js";\nexport { x };\n',
      "src/domain/shared.ts": 'export { send as x } from "../adapters/messaging/twilio.js";\n',
      "src/adapters/messaging/twilio.ts": "export const send = 1;\n",
    });
    try {
      expect(phiZoneChains(root)).toEqual([
        ["src/trigger/marketing/seo/task.ts", "src/domain/shared.ts", "src/adapters/messaging/twilio.ts"],
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("classifies modules like the ESLint rule", () => {
    expect(isPhiZoneModule("adapters/messaging/twilio.ts")).toBe(true);
    expect(isPhiZoneModule("adapters/llm/anthropic-phi.ts")).toBe(true);
    expect(isPhiZoneModule("lib/db-phi.ts")).toBe(true);
    expect(isPhiZoneModule("trigger/phi/booking/request.ts")).toBe(true);
    expect(isPhiZoneModule("lib/phi.ts")).toBe(false);
    expect(isPhiZoneModule("adapters/llm/anthropic-public.ts")).toBe(false);
    expect(isPhiZoneModule("lib/db-marketing.ts")).toBe(false);
  });
});

describe("zone graph: no public-zone module is reachable from the PHI zone", () => {
  it("holds for the real source tree", () => {
    expect(publicZoneChains(PROJECT)).toEqual([]);
  });

  it("finds a public adapter reached through a shared module", async () => {
    const root = await fixture({
      "src/trigger/phi/messaging/task.ts": 'import { x } from "../../../domain/shared.js";\nexport { x };\n',
      "src/domain/shared.ts": 'export { emit as x } from "../adapters/n8n/emit.js";\n',
      "src/adapters/n8n/emit.ts": "export const emit = 1;\n",
    });
    try {
      expect(publicZoneChains(root)).toEqual([
        ["src/trigger/phi/messaging/task.ts", "src/domain/shared.ts", "src/adapters/n8n/emit.ts"],
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("classifies modules like the ESLint rule", () => {
    expect(isPublicZoneModule("adapters/llm/anthropic-public.ts")).toBe(true);
    expect(isPublicZoneModule("adapters/google/search-console.ts")).toBe(true);
    expect(isPublicZoneModule("adapters/n8n/emit.ts")).toBe(true);
    expect(isPublicZoneModule("lib/db-marketing.ts")).toBe(true);
    expect(isPublicZoneModule("trigger/marketing/runtime.ts")).toBe(true);
    expect(isPublicZoneModule("adapters/n8n/phi-notify.ts")).toBe(false);
    expect(isPublicZoneModule("lib/http.ts")).toBe(false);
    expect(isPublicZoneModule("lib/env-phi.ts")).toBe(false);
    expect(isPhiZoneModule("lib/env-phi.ts")).toBe(true);
    expect(isPhiZoneModule("console/db.ts")).toBe(true);
    expect(isPhiZoneModule("domain/crisis/response.ts")).toBe(true);
    expect(isPhiZoneModule("adapters/n8n/phi-notify.ts")).toBe(true);
    expect(isPhiZoneModule("domain/social/plan.ts")).toBe(false);
  });
});
