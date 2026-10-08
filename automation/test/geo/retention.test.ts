/** ops.geo-retention against the embedded Postgres, AS marketing_rw. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createLogger, type LogRecord } from "../../src/lib/logger.js";
import { RETENTION_DAYS, runGeoRetention } from "../../src/trigger/marketing/ops/geo-retention.js";
import { startMarketingDb, type MarketingDb } from "../db/marketing-db.js";

const NOW = new Date("2026-11-01T08:00:00Z");
const DAY = 86_400_000;

let db: MarketingDb | undefined;
const client = () => {
  if (!db) throw new Error("database did not start");
  return db.client;
};

beforeAll(async () => {
  db = await startMarketingDb();
  await db.client.query(
    `insert into marketing.geo_prompts (id, prompt, state) values ('00000000-0000-4000-8000-0000000000c1', 'Who offers psychiatric assessment in New Jersey?', 'NJ')`,
  );
  const insert = (id: string, daysAgo: number, competitors: string[] | null) =>
    db?.client.query(
      `insert into marketing.geo_runs (id, prompt_id, engine, run_at, answer_excerpt, newpoint_mentioned, newpoint_cited, cited_urls, competitors_mentioned)
       values ($1, '00000000-0000-4000-8000-0000000000c1', 'e', $2, 'Try Princeton House or Dr. Example.', true, false, '{https://psychologytoday.com/x}', $3)`,
      [id, new Date(NOW.getTime() - daysAgo * DAY).toISOString(), competitors],
    );
  await insert("00000000-0000-4000-8000-0000000000d1", RETENTION_DAYS + 30, ["Princeton House"]);
  await insert("00000000-0000-4000-8000-0000000000d2", RETENTION_DAYS + 1, null);
  await insert("00000000-0000-4000-8000-0000000000d3", RETENTION_DAYS - 1, ["Princeton House"]);
  await db.client.query("set role marketing_rw");
});

afterAll(async () => {
  await db?.stop();
});

describe("ops.geo-retention", () => {
  it("clears details older than 90 days, keeps the measurement, and is idempotent", async () => {
    const records: LogRecord[] = [];
    const deps = { db: client(), logger: createLogger((r) => records.push(r)) };

    expect(await runGeoRetention(deps, NOW)).toEqual({ purged: 2 });

    const { rows } = await client().query<{
      id: string;
      answer_excerpt: string | null;
      competitors_mentioned: string[] | null;
      details_purged_at: Date | null;
      newpoint_mentioned: boolean;
      cited_urls: string[];
    }>("select id, answer_excerpt, competitors_mentioned, details_purged_at, newpoint_mentioned, cited_urls from marketing.geo_runs order by id");

    const [old, failedExtraction, recent] = rows;
    expect(old).toMatchObject({ answer_excerpt: null, competitors_mentioned: null, newpoint_mentioned: true });
    expect(old?.cited_urls).toEqual(["https://psychologytoday.com/x"]);
    expect(old?.details_purged_at?.toISOString()).toBe(NOW.toISOString());
    // A purged failed-extraction row is now told apart by details_purged_at, not by the NULL.
    expect(failedExtraction?.details_purged_at).not.toBeNull();
    expect(recent).toMatchObject({ answer_excerpt: "Try Princeton House or Dr. Example.", competitors_mentioned: ["Princeton House"], details_purged_at: null });

    expect(await runGeoRetention(deps, new Date(NOW.getTime() + 60_000))).toEqual({ purged: 0 });
    expect(records.map((r) => r.fields)).toEqual([{ purged: 2 }, { purged: 0 }]);
  });
});
