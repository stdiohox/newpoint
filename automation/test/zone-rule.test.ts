/**
 * The ESLint zone rule actually fires (docs/automation-architecture.md §6 layer 1).
 * Lints in-memory sources at paths inside and outside the public zone.
 */
import { ESLint } from "eslint";
import tseslint from "typescript-eslint";
import { describe, expect, it } from "vitest";

// The sources below exist only in memory, so the type-aware parser cannot load
// them. The zone rule needs no type information: switch type-aware parsing off
// for this run and keep every other part of the real eslint.config.mjs.
const eslint = new ESLint({
  cwd: new URL("..", import.meta.url).pathname,
  overrideConfig: [{ files: ["**/*.ts"], ...tseslint.configs.disableTypeChecked }],
});

async function zoneMessages(
  code: string,
  filePath: string,
  ruleId = "@typescript-eslint/no-restricted-imports",
): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  const messages = result?.messages ?? [];
  const fatal = messages.filter((message) => message.fatal === true);
  // A parse failure would make every assertion below pass vacuously.
  if (fatal.length > 0) throw new Error(`ESLint could not parse ${filePath}: ${fatal[0]?.message ?? ""}`);
  return messages.filter((message) => message.ruleId === ruleId).map((message) => message.message);
}

const restrictedImportMessages = (code: string, filePath: string) => zoneMessages(code, filePath);

const MARKETING_TASK = "src/trigger/marketing/seo/keyword-research.ts";

describe("zone rule: public-zone tasks cannot import PHI-zone modules", () => {
  it.each([
    'import { send } from "../../../adapters/messaging/twilio.js";\nexport { send };\n',
    'import { complete } from "../../../adapters/llm/anthropic-phi.js";\nexport { complete };\n',
    'import { vapi } from "../../../adapters/voice/vapi.js";\nexport { vapi };\n',
    'import type { SchedulingAdapter } from "../../../adapters/scheduling/SchedulingAdapter.js";\nexport type { SchedulingAdapter };\n',
    'import { db } from "../../../lib/db-phi.js";\nexport { db };\n',
    'import { remind } from "../../phi/booking/reminders.js";\nexport { remind };\n',
    'import { remind } from "../../../trigger/phi/booking/reminders.js";\nexport { remind };\n',
    // Bare directories resolve to an index file.
    'import * as messaging from "../../../adapters/messaging";\nexport { messaging };\n',
    'import * as voice from "../../../adapters/voice";\nexport { voice };\n',
    'import * as phiTasks from "../../phi";\nexport { phiTasks };\n',
    'export * from "../../../adapters/scheduling/manual-queue.js";\n',
    'import { consoleDb } from "../../../console/db.js";\nexport { consoleDb };\n',
    'import { CRISIS_SCRIPT } from "../../../domain/crisis/response.js";\nexport { CRISIS_SCRIPT };\n',
    'import { renderTemplate } from "../../../domain/messaging/templates.js";\nexport { renderTemplate };\n',
    'import { createPhiNotifier } from "../../../adapters/n8n/phi-notify.js";\nexport { createPhiNotifier };\n',
  ])("rejects %s", async (code) => {
    const messages = await restrictedImportMessages(code, MARKETING_TASK);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("PHI-zone module imported from the public zone");
  });

  it.each([
    'export const load = () => import("../../../adapters/messaging/twilio.js");\n',
    'const name = "x";\nexport const load = () => import(name);\n',
    'declare const require: (id: string) => unknown;\nexport const m = require("../../../lib/db-phi.js");\n',
  ])("rejects dynamic loading: %s", async (code) => {
    expect(await zoneMessages(code, MARKETING_TASK, "no-restricted-syntax")).toHaveLength(1);
  });

  it("ignores eslint-disable comments in the public zone", async () => {
    const code =
      '/* eslint-disable @typescript-eslint/no-restricted-imports */\nimport { send } from "../../../adapters/messaging/twilio.js";\nexport { send };\n';
    expect(await restrictedImportMessages(code, MARKETING_TASK)).toHaveLength(1);
  });

  it.each([
    'import { schedules } from "@trigger.dev/sdk";\nexport const s = schedules;\n',
    'import { task } from "@trigger.dev/sdk";\nexport const t = task;\n',
    'import { schemaTask } from "@trigger.dev/sdk/v3";\nexport const t = schemaTask;\n',
    'import { fromPublicSource } from "../../../lib/phi.js";\nexport const f = fromPublicSource;\n',
  ])("rejects bypassing the task wrapper or the public-source gate: %s", async (code) => {
    expect(await restrictedImportMessages(code, MARKETING_TASK)).toHaveLength(1);
  });

  it("confines fromPublicSource to the public-source adapters", async () => {
    const code = 'import { fromPublicSource } from "../lib/phi.js";\nexport const f = fromPublicSource;\n';
    expect(await restrictedImportMessages(code, "src/domain/example.ts")).toHaveLength(1);
    expect(await restrictedImportMessages(code.replace("../lib", "../../lib"), "src/adapters/google/x.ts")).toEqual([]);
  });

  it("allows shared lib modules", async () => {
    const code = 'import { publicText } from "../../../lib/phi.js";\nexport const t = publicText("ok");\n';
    expect(await restrictedImportMessages(code, MARKETING_TASK)).toEqual([]);
  });

  it("does not apply outside src/trigger/marketing", async () => {
    const code = 'import { send } from "../adapters/messaging/twilio.js";\nexport { send };\n';
    expect(await restrictedImportMessages(code, "src/domain/example.ts")).toEqual([]);
  });
});

describe("zone rule: PHI-zone code cannot import public-zone modules", () => {
  const PHI_TASK = "src/trigger/phi/messaging/send-sms.ts";
  it.each([
    'import { c } from "../../../adapters/llm/anthropic-public.js";\nexport { c };\n',
    'import { e } from "../../../adapters/n8n/emit.js";\nexport { e };\n',
    'import { d } from "../../../lib/db-marketing.js";\nexport { d };\n',
    'import { g } from "../../../adapters/google/search-console.js";\nexport { g };\n',
    'import { r } from "../../marketing/runtime.js";\nexport { r };\n',
    'import { task } from "@trigger.dev/sdk";\nexport const t = task;\n',
  ])("rejects %s", async (code) => {
    expect(await restrictedImportMessages(code, PHI_TASK)).toHaveLength(1);
  });

  it("allows the PHI zone's own modules", async () => {
    const code = 'import { createTwilio } from "../../../adapters/messaging/twilio.js";\nimport { phiTask } from "../../../lib/task.js";\nexport { createTwilio, phiTask };\n';
    expect(await restrictedImportMessages(code, PHI_TASK)).toEqual([]);
  });

  it("rejects dynamic loading in the PHI zone", async () => {
    expect(await zoneMessages('export const load = () => import("x");\n', "src/console/server.ts", "no-restricted-syntax")).toHaveLength(1);
  });
});
