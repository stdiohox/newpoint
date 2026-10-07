/**
 * seo.keyword-research and seo.rank-tracker end to end, against:
 * - Supabase: the embedded Postgres shaped like newpoint-marketing, with the
 *   real migrations, connected AS marketing_rw (the runtime's role);
 * - Search Console and Claude: in-memory fakes of the adapter interfaces.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PublicClaude, ParseResult } from "../../src/adapters/llm/anthropic-public.js";
import type { SearchAnalyticsRequest, SearchAnalyticsRow, SearchConsole } from "../../src/adapters/google/search-console.js";
import { SafeTaskError, VendorHttpError } from "../../src/lib/errors.js";
import { createLogger, type LogRecord } from "../../src/lib/logger.js";
import type { PublicText } from "../../src/lib/phi.js";
import { runSafely } from "../../src/lib/task.js";
import { runKeywordResearch } from "../../src/trigger/marketing/seo/keyword-research.js";
import { runRankTracker } from "../../src/trigger/marketing/seo/rank-tracker.js";
import { startMarketingDb, type MarketingDb } from "../db/marketing-db.js";

const NOW = new Date("2026-10-12T10:00:00Z");
const q = (text: string) => text as PublicText;

let db: MarketingDb | undefined;
const client = () => {
  if (!db) throw new Error("database did not start");
  return db.client;
};

beforeAll(async () => {
  db = await startMarketingDb();
  // Everything below runs with the runtime role's privileges, not the owner's.
  await db.client.query("set role marketing_rw");
});

afterAll(async () => {
  await db?.stop();
});

beforeEach(async () => {
  await client().query("reset role");
  await client().query("truncate marketing.keywords, marketing.keyword_snapshots, marketing.content_backlog cascade");
  await client().query("set role marketing_rw");
});

function fakeSearchConsole(respond: (request: SearchAnalyticsRequest) => SearchAnalyticsRow[] | Error) {
  const requests: SearchAnalyticsRequest[] = [];
  const searchConsole: SearchConsole = {
    searchAnalytics(request) {
      requests.push(request);
      const result = respond(request);
      return result instanceof Error ? Promise.reject(result) : Promise.resolve(result);
    },
  };
  return { searchConsole, requests };
}

const RESEARCH_ROWS: SearchAnalyticsRow[] = [
  { keys: [q("psychiatric assessment lawrence township nj")], clicks: 3, impressions: 40, position: 7.5 },
  { keys: [q("adhd evaluation for adults nj")], clicks: 1, impressions: 45, position: 12 },
  { keys: [q("adult adhd testing near me")], clicks: 0, impressions: 30, position: 18 },
  { keys: [q("how long does a psychiatric assessment take")], clicks: 0, impressions: 25, position: 9 },
  { keys: [q("newpoint healthcare")], clicks: 9, impressions: 12, position: 1.1 },
];

/** Clusters by reading the numbered prompt, the way the real model would be asked to. */
function fakeClaude(mode: "cluster" | "refuse" = "cluster") {
  const prompts: PublicText[] = [];
  const claude: PublicClaude = {
    parse(request) {
      prompts.push(request.user);
      if (mode === "refuse") return Promise.resolve({ ok: false, reason: "refusal" } as ParseResult<never>);
      const lines = request.user.split("\n").slice(1);
      const indexes = (pattern: RegExp) =>
        lines.flatMap((line) => {
          const match = /^(\d+)\. (.*)$/.exec(line);
          return match?.[1] !== undefined && match[2] !== undefined && pattern.test(match[2]) ? [Number(match[1])] : [];
        });
      const value = {
        clusters: [
          { name: "psychiatric assessment", intent: "commercial", service_slug: "psychiatric-evaluation", term_indexes: indexes(/^(?!.*adhd).*(assessment|evaluation)/) },
          { name: "adult adhd assessment", intent: "local", service_slug: null, term_indexes: indexes(/adhd/) },
        ],
      };
      return Promise.resolve({ ok: true, value } as ParseResult<never>);
    },
  };
  return { claude, prompts };
}

function capturingLogger() {
  const records: LogRecord[] = [];
  return { logger: createLogger((record) => records.push(record)), records };
}

describe("seo.keyword-research", () => {
  it("writes clustered keywords and backlog candidates as marketing_rw", async () => {
    const { searchConsole, requests } = fakeSearchConsole(() => RESEARCH_ROWS);
    const { claude, prompts } = fakeClaude();
    const { logger } = capturingLogger();

    const output = await runKeywordResearch({ db: client(), searchConsole, claude, logger }, NOW);

    expect(requests).toEqual([{ startDate: "2026-09-12", endDate: "2026-10-09", dimensions: ["query"] }]);
    expect(prompts[0]).toContain("adhd evaluation for adults nj");
    expect(output.clustering).toBe("ok");
    expect(output.keywordsUpserted).toBe(output.candidates);

    const { rows: keywords } = await client().query<{ term: string; cluster: string | null; source: string; volume: number | null }>(
      "select term, cluster, source, volume from marketing.keywords order by term",
    );
    expect(keywords.find((k) => k.term === "adhd evaluation for adults nj")).toMatchObject({
      cluster: "adult adhd assessment",
      source: "search_console",
    });
    // A seed that Search Console also reported keeps its seed provenance.
    expect(keywords.find((k) => k.term === "psychiatric assessment lawrence township nj")?.source).toBe("manual");
    // D8: Search Console only, so there is no volume source.
    expect(keywords.every((k) => k.volume === null)).toBe(true);

    const { rows: backlog } = await client().query<{ kind: string; target: string; source_agent: string }>(
      "select kind, target, source_agent from marketing.content_backlog order by kind, target",
    );
    // Ordered by the backlog_kind enum's declaration order: page before faq.
    expect(backlog).toEqual([
      { kind: "page", target: "adult adhd assessment", source_agent: "seo.keyword-research" },
      { kind: "faq", target: "how long does a psychiatric assessment take", source_agent: "seo.keyword-research" },
    ]);
  });

  it("is idempotent: a second run adds no rows and no backlog items", async () => {
    const deps = {
      db: client(),
      searchConsole: fakeSearchConsole(() => RESEARCH_ROWS).searchConsole,
      claude: fakeClaude().claude,
      logger: capturingLogger().logger,
    };
    await runKeywordResearch(deps, NOW);
    const count = async () =>
      (await client().query<{ k: number; b: number }>(
        "select (select count(*) from marketing.keywords)::int as k, (select count(*) from marketing.content_backlog)::int as b",
      )).rows[0];
    const first = await count();
    const second = await runKeywordResearch(deps, NOW);
    expect(await count()).toEqual(first);
    expect(second.backlogAdded).toBe(0);
  });

  it("on a refusal leaves terms unclustered, keeps earlier clusters, and logs no query text", async () => {
    const deps = { db: client(), searchConsole: fakeSearchConsole(() => RESEARCH_ROWS).searchConsole };
    await runKeywordResearch({ ...deps, claude: fakeClaude().claude, logger: capturingLogger().logger }, NOW);

    const { logger, records } = capturingLogger();
    const output = await runKeywordResearch({ ...deps, claude: fakeClaude("refuse").claude, logger }, NOW);

    expect(output).toMatchObject({ clustering: "refusal", unclustered: output.candidates });
    const { rows } = await client().query<{ cluster: string | null }>(
      "select cluster from marketing.keywords where term = 'adhd evaluation for adults nj'",
    );
    expect(rows[0]?.cluster).toBe("adult adhd assessment");
    expect(records.map((r) => r.event)).toEqual(["seo.keyword_research.unclustered", "seo.keyword_research.completed"]);
    expect(JSON.stringify(records)).not.toContain("adhd");
  });

  it("fails with a SafeTaskError that carries no vendor text when Search Console errors", async () => {
    const vendor = new VendorHttpError("google", 503, { cause: new Error("backend error for site sc-domain:newpointnp.com") });
    const deps = {
      db: client(),
      searchConsole: fakeSearchConsole(() => vendor).searchConsole,
      claude: fakeClaude().claude,
      logger: capturingLogger().logger,
    };
    const error = await runSafely(() => runKeywordResearch(deps, NOW)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SafeTaskError);
    expect((error as SafeTaskError).message).toBe("vendor_5xx vendor_http_error google http_503");
    expect((error as SafeTaskError).safe.retryable).toBe(true);
  });
});

describe("seo.rank-tracker", () => {
  async function seedKeywords(): Promise<Record<string, string>> {
    const { rows } = await client().query<{ id: string; term: string }>(
      `insert into marketing.keywords (term, source) values
         ('medication management new jersey', 'manual'),
         ('psychiatric assessment lawrence township nj', 'manual'),
         ('telehealth psychiatric care pennsylvania', 'manual')
       returning id, term`,
    );
    return Object.fromEntries(rows.map((row) => [row.term, row.id]));
  }

  const day = (date: string, query: string, position: number): SearchAnalyticsRow => ({
    keys: [q(query), q(date)],
    clicks: 1,
    impressions: 20,
    position,
  });

  it("writes daily snapshots for tracked keywords only and counts movers week over week", async () => {
    const ids = await seedKeywords();
    // Two weeks of history first: last week at position 12 for one keyword.
    const lastWeek = ["2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"];
    for (const date of lastWeek) {
      await client().query(
        "insert into marketing.keyword_snapshots (keyword_id, date, gsc_position, impressions, clicks) values ($1, $2, 12, 20, 0)",
        [ids["medication management new jersey"], date],
      );
    }

    const thisWeek = ["2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"];
    const { searchConsole, requests } = fakeSearchConsole(() => [
      ...thisWeek.map((date) => day(date, "Medication Management New Jersey", 5)),
      day("2026-10-09", "psychiatric assessment lawrence township nj", 8),
      day("2026-10-09", "some untracked query", 2),
    ]);
    const { logger } = capturingLogger();

    const output = await runRankTracker({ db: client(), searchConsole, logger }, NOW);

    expect(requests).toEqual([{ startDate: "2026-10-03", endDate: "2026-10-09", dimensions: ["query", "date"] }]);
    expect(output).toEqual({ keywords: 3, snapshotsWritten: 8, movers: 1 });

    const { rows: movers } = await client().query<{ keyword_id: string; improvement: string }>(
      "select keyword_id, improvement::text from marketing.rank_movers",
    );
    expect(movers).toEqual([{ keyword_id: ids["medication management new jersey"], improvement: "7.00" }]);

    // A re-run of the same week overwrites, it does not duplicate.
    await runRankTracker({ db: client(), searchConsole, logger }, NOW);
    const { rows } = await client().query<{ n: number }>("select count(*)::int as n from marketing.keyword_snapshots");
    expect(rows[0]?.n).toBe(15);
  });

  it("does nothing, and calls nothing, when no keyword is tracked yet", async () => {
    const { searchConsole, requests } = fakeSearchConsole(() => []);
    const output = await runRankTracker({ db: client(), searchConsole, logger: capturingLogger().logger }, NOW);
    expect(output).toEqual({ keywords: 0, snapshotsWritten: 0, movers: 0 });
    expect(requests).toEqual([]);
  });
});
