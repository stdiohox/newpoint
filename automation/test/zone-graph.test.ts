import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { isPhiZoneModule, phiZoneChains } from "./zone-graph.js";

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
