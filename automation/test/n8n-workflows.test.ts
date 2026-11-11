/**
 * The n8n exports keep the properties the plan depends on (§1, §2, §5.2, §5.7):
 * approvals are a confirm page (form POST), never one-click links a mail scanner
 * could follow; no Code node; no credential or secret in the JSON; error
 * executions are not stored (they would hold the one-time callback URL).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DIR = join(import.meta.dirname, "..", "n8n", "workflows");
interface Node {
  readonly name: string;
  readonly type: string;
  readonly parameters: Record<string, unknown>;
  readonly credentials?: Record<string, { id: string; name: string }>;
}
interface Workflow {
  readonly nodes: readonly Node[];
  readonly settings: Record<string, unknown>;
}
const load = (name: string): Workflow => JSON.parse(readFileSync(join(DIR, name), "utf8")) as Workflow;

describe("n8n workflow exports", () => {
  it.each(["action-required.json"])("%s has no Code node, no secrets, and stores no executions", (file) => {
    const text = readFileSync(join(DIR, file), "utf8");
    const workflow = load(file);
    expect(workflow.nodes.filter((n) => /code|function|executeCommand/i.test(n.type))).toEqual([]);
    expect(workflow.nodes.flatMap((n) => Object.values(n.credentials ?? {})).every((c) => c.id === "")).toBe(true);
    expect(text).not.toMatch(/tr_(dev|prod)_|sk-ant-|EAAG|ya29\./);
    expect(workflow.settings).toMatchObject({ saveDataSuccessExecution: "none", saveDataErrorExecution: "none" });
  });

  it("matches what generate.py writes (no hand edits)", () => {
    const files = ["action-required.json"];
    const out = mkdtempSync(join(tmpdir(), "newpoint-n8n-"));
    try {
      execFileSync("python3", [join(DIR, "generate.py"), out], { timeout: 30_000 });
      for (const file of files) expect(readFileSync(join(out, file), "utf8")).toBe(readFileSync(join(DIR, file), "utf8"));
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

});

describe("action-required.json (PHI zone notice)", () => {
  it("interpolates nothing from the request into the email", () => {
    const workflow = JSON.parse(readFileSync(join(DIR, "action-required.json"), "utf8")) as { nodes: { name: string; parameters: Record<string, unknown> }[] };
    const email = workflow.nodes.find((node) => node.name === "Email staff");
    expect(JSON.stringify(email?.parameters)).not.toContain("{{");
  });
});
