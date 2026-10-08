import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FAILURE_CLASSES } from "../../src/lib/errors.js";
import { listTestFiles, runTapFile, startProjectDb, type MarketingDb } from "./marketing-db.js";

const files = await listTestFiles("phi");
let db: MarketingDb | undefined;

beforeAll(async () => {
  db = await startProjectDb("phi");
});

afterAll(async () => {
  await db?.stop();
});

function started(): MarketingDb {
  if (db === undefined) throw new Error("phi database did not start");
  return db;
}

describe("newpoint-phi pgTAP suite", () => {
  it("has test files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s", async (file) => {
    const result = await runTapFile(started().client, file, "phi");
    expect(result.failures, result.output.join("\n")).toEqual([]);
    expect(result.planned).toBeGreaterThan(0);
    expect(result.passed, result.output.join("\n")).toBe(result.planned);
  });

  it("ops.failure_class matches FAILURE_CLASSES in src/lib/errors.ts", async () => {
    const { rows } = await started().client.query<{ label: string }>(`select unnest(enum_range(null::ops.failure_class))::text as label`);
    expect(rows.map((row) => row.label)).toEqual([...FAILURE_CLASSES]);
  });
});
