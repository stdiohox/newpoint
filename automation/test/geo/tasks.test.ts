/**
 * geo.probe and geo.recommendations end to end against the embedded Postgres
 * shaped like newpoint-marketing (real migrations, connected AS marketing_rw),
 * with fake engines, a fake public Claude and a fake site.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { GeoEngine, GeoAskResult } from "../../src/adapters/geo/engine.js";
import type { ParseResult, PublicClaude } from "../../src/adapters/llm/anthropic-public.js";
import type { PageSchema, SiteSchemaReader } from "../../src/adapters/site/schema-coverage.js";
import { createLogger, type LogRecord } from "../../src/lib/logger.js";
import type { PublicText } from "../../src/lib/phi.js";
import { runGeoProbe } from "../../src/trigger/marketing/geo/probe.js";
import { runGeoRecommendations } from "../../src/trigger/marketing/geo/recommendations.js";
import { startMarketingDb, type MarketingDb } from "../db/marketing-db.js";

const NOW = new Date("2026-10-13T11:00:00Z");
const DAY = 86_400_000;

let db: MarketingDb | undefined;
const client = () => {
  if (!db) throw new Error("database did not start");
  return db.client;
};

beforeAll(async () => {
  db = await startMarketingDb();
  await db.client.query("set role marketing_rw");
});

afterAll(async () => {
  await db?.stop();
});

beforeEach(async () => {
  await client().query("reset role");
  await client().query("truncate marketing.keywords, marketing.geo_prompts, marketing.geo_runs, marketing.content_backlog cascade");
  await client().query(
    `insert into marketing.keywords (term, cluster, state, town, intent, source) values
       ('psychiatric assessment lawrence township nj', 'psychiatric assessment', 'NJ', 'lawrence township', 'local', 'manual'),
       ('psychiatric assessment pennsylvania', 'psychiatric assessment', 'PA', null, 'commercial', 'manual'),
       ('telehealth psychiatric care new jersey', 'telehealth psychiatric care', 'NJ', null, 'commercial', 'manual'),
       ('best psychiatrist near me', null, null, null, null, 'search_console')`,
  );
  await client().query("set role marketing_rw");
});

function logs() {
  const records: LogRecord[] = [];
  return { logger: createLogger((record) => records.push(record)), records };
}

function fakeEngine(answer: (prompt: string) => GeoAskResult) {
  const asked: string[] = [];
  const engine: GeoEngine = {
    id: "fake+web_search",
    ask({ prompt }) {
      asked.push(prompt);
      return Promise.resolve(answer(prompt));
    },
  };
  return { engine, asked };
}

const answered = (text: string, citedUrls: string[]): GeoAskResult => ({ ok: true, answer: { text: text as PublicText, citedUrls } });

function fakeClaude(respond: (user: string, system: string) => ParseResult<unknown>) {
  const calls: { system: string; user: string }[] = [];
  const claude: PublicClaude = {
    parse(request) {
      calls.push({ system: request.system, user: request.user });
      return Promise.resolve(respond(request.user, request.system) as ParseResult<never>);
    },
  };
  return { claude, calls };
}

const extractor = fakeClaude((user) => ({
  ok: true,
  value: { providers: user.includes("Princeton House") ? ["Princeton House", "Newpoint Healthcare"] : [] },
}));

describe("geo.probe", () => {
  it("seeds prompts from the keyword clusters and stores one measured run per prompt", async () => {
    const { engine, asked } = fakeEngine((prompt) =>
      prompt.includes("telehealth")
        ? answered("Newpoint Healthcare offers telehealth.", ["https://newpointnp.com/services/telehealth"])
        : answered("Try Princeton House.", ["https://www.psychologytoday.com/us/x", "https://princetonhouse.org/"]),
    );

    const output = await runGeoProbe({ db: client(), engines: [engine], claude: extractor.claude, logger: logs().logger }, NOW);

    expect(output).toEqual({ promptsAdded: 4, probed: 4, notMeasured: 0, mentioned: 1, cited: 1, competitorsUnknown: 0 });
    expect([...asked].sort()).toEqual([
      "Where can I get psychiatric assessment near lawrence township, NJ?",
      "Who offers psychiatric assessment in New Jersey?",
      "Who offers psychiatric assessment in Pennsylvania?",
      "Who offers telehealth psychiatric care in New Jersey?",
    ]);

    const { rows } = await client().query<{ prompt: string; cluster: string; engine: string; competitors_mentioned: string[] | null }>(
      `select p.prompt, p.cluster, r.engine, r.competitors_mentioned
         from marketing.geo_runs r join marketing.geo_prompts p on p.id = r.prompt_id order by p.prompt`,
    );
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.engine === "fake+web_search")).toBe(true);
    // Newpoint is never recorded as its own competitor.
    expect(rows.find((r) => r.prompt.includes("Pennsylvania"))?.competitors_mentioned).toEqual(["Princeton House"]);
  });

  it("is resumable: a re-run in the same week probes nothing again", async () => {
    const { engine, asked } = fakeEngine(() => answered("Some answer.", []));
    const deps = { db: client(), engines: [engine], claude: extractor.claude, logger: logs().logger };
    await runGeoProbe(deps, NOW);
    const second = await runGeoProbe(deps, new Date(NOW.getTime() + 2 * 60 * 60 * 1000));
    expect(second).toMatchObject({ promptsAdded: 0, probed: 0 });
    expect(asked).toHaveLength(4);

    const nextWeek = await runGeoProbe(deps, new Date(NOW.getTime() + 7 * DAY));
    expect(nextWeek.probed).toBe(4);
  });

  it("keeps a prompt a person deactivated out of the probe", async () => {
    await runGeoProbe({ db: client(), engines: [], claude: extractor.claude, logger: logs().logger }, NOW);
    await client().query("update marketing.geo_prompts set active = false where prompt like '%Pennsylvania%'");
    const { engine, asked } = fakeEngine(() => answered("x", []));
    await runGeoProbe({ db: client(), engines: [engine], claude: extractor.claude, logger: logs().logger }, NOW);
    expect(asked.some((prompt) => prompt.includes("Pennsylvania"))).toBe(false);
  });

  it("stores nothing for an answer that measured nothing, and NULL when extraction fails", async () => {
    const { engine } = fakeEngine((prompt) => (prompt.includes("Pennsylvania") ? { ok: false, reason: "refusal" } : answered("An answer.", [])));
    const failing = fakeClaude(() => ({ ok: false, reason: "invalid_output" }));
    const { logger, records } = logs();

    const output = await runGeoProbe({ db: client(), engines: [engine], claude: failing.claude, logger }, NOW);

    expect(output).toMatchObject({ probed: 3, notMeasured: 1, competitorsUnknown: 3 });
    const { rows } = await client().query<{ n: number; unknown: number }>(
      "select count(*)::int as n, count(*) filter (where competitors_mentioned is null)::int as unknown from marketing.geo_runs",
    );
    expect(rows[0]).toEqual({ n: 3, unknown: 3 });
    expect(records.filter((r) => r.event === "geo.probe.not_measured")).toHaveLength(1);
    expect(JSON.stringify(records)).not.toContain("Pennsylvania");
  });

  it("does not let prompts that keep failing starve the rest", async () => {
    const deps = { claude: extractor.claude, logger: logs().logger, db: client() };
    // Week 1: every NJ prompt fails, the PA prompt is answered.
    const week1 = fakeEngine((prompt) => (prompt.includes("Pennsylvania") ? answered("x", []) : { ok: false, reason: "incomplete" }));
    await runGeoProbe({ ...deps, engines: [week1.engine] }, NOW);
    const { rows } = await client().query<{ n: number }>("select count(*)::int as n from marketing.geo_prompts where last_failed_at is not null");
    expect(rows[0]?.n).toBe(3);

    // Same week, retried: nothing is re-paid.
    const retry = fakeEngine(() => answered("x", []));
    await runGeoProbe({ ...deps, engines: [retry.engine] }, new Date(NOW.getTime() + 60 * 60 * 1000));
    expect(retry.asked).toEqual([]);
  });

  it("seeds no prompt from a cluster that touches a content rule", async () => {
    await client().query("reset role");
    await client().query("update marketing.keywords set cluster = 'psychiatrist near me' where term = 'best psychiatrist near me'");
    await client().query("set role marketing_rw");
    await runGeoProbe({ db: client(), engines: [], claude: extractor.claude, logger: logs().logger }, NOW);
    const { rows } = await client().query<{ prompt: string }>("select prompt from marketing.geo_prompts");
    expect(rows.some((r) => /psychiatrist/i.test(r.prompt))).toBe(false);
  });
});

describe("geo.recommendations", () => {
  async function seedRuns(): Promise<void> {
    await runGeoProbe({ db: client(), engines: [], claude: extractor.claude, logger: logs().logger }, NOW);
    for (const daysAgo of [17, 10, 3]) {
      const { engine } = fakeEngine((prompt) =>
        prompt.includes("telehealth")
          ? answered("Newpoint Healthcare offers it.", ["https://newpointnp.com/"])
          : answered("Try Princeton House.", ["HTTPS://WWW.PsychologyToday.com/a", "https://user@zocdoc.com/b", "not a url"]),
      );
      await runGeoProbe({ db: client(), engines: [engine], claude: extractor.claude, logger: logs().logger }, new Date(NOW.getTime() - daysAgo * DAY));
    }
  }

  const site = (pages: PageSchema[]): SiteSchemaReader => ({ read: () => Promise.resolve(pages) });
  const livePages: PageSchema[] = [
    { url: "https://newpointnp.com/", blocks: [{ "@type": "WebSite" }] },
    { url: "https://newpointnp.com/providers/funmilayo-whitaker", blocks: [{ "@type": "Physician", areaServed: "NJ" }] },
  ];

  const recommender = fakeClaude((user, system) =>
    system.includes("FAQ")
      ? {
          ok: true,
          value: {
            suggestions: [
              { prompt_index: 0, question: "What happens at a psychiatric assessment?", covers: "What the visit involves, how long it takes, and what to bring." },
              { prompt_index: 0, question: "Is a psychiatrist needed for an assessment?", covers: "Who does the assessment." },
            ],
          },
        }
      : { ok: false, reason: "invalid_output" },
  );

  it("proposes schema fixes, citation targets and screened FAQ entries, from four weeks of runs", async () => {
    await seedRuns();
    const output = await runGeoRecommendations(
      { db: client(), claude: recommender.claude, site: site(livePages), logger: logs().logger },
      NOW,
    );

    expect(output).toMatchObject({
      runs: 12,
      weakPrompts: 3,
      faqItems: 1,
      faqRejected: 1,
      faqStatus: "ok",
      citationItems: 2,
      pagesUnreadable: 0,
    });
    // The model saw the weak prompts with their evidence, and the keyword clusters.
    expect(recommender.calls[0]?.user).toContain("Newpoint in 0 of 3 answers");
    expect(recommender.calls[0]?.user).toContain("psychologytoday.com");
    expect(recommender.calls[0]?.user).toContain("telehealth psychiatric care");

    const { rows } = await client().query<{ kind: string; target: string; source_agent: string }>(
      "select kind::text, target, source_agent from marketing.content_backlog order by kind, target",
    );
    // Sorted by kind as text. The provider page carries a bare Physician node (no Person),
    // so it gets "remove Physician" and "add Person"; areaServed-on-Person is a domain test.
    expect(rows.map((r) => [r.kind, r.target])).toEqual([
      ["citation", "psychologytoday.com"],
      ["citation", "zocdoc.com"],
      ["faq", "What happens at a psychiatric assessment?"],
      ["schema", "add MedicalClinic to every page"],
      ["schema", "add Person to /providers/funmilayo-whitaker"],
      ["schema", "remove Physician from /providers/funmilayo-whitaker"],
    ]);
    expect(rows.every((r) => r.source_agent === "geo.recommendations")).toBe(true);

    const again = await runGeoRecommendations({ db: client(), claude: recommender.claude, site: site(livePages), logger: logs().logger }, NOW);
    expect(again.backlogAdded).toBe(0);
  });

  it("skips the model when no prompt is weak, and ignores runs older than four weeks", async () => {
    await seedRuns();
    const later = new Date(NOW.getTime() + 30 * DAY);
    const quiet = fakeClaude(() => ({ ok: false, reason: "refusal" }));
    const output = await runGeoRecommendations(
      { db: client(), claude: quiet.claude, site: site([{ url: "https://newpointnp.com/", blocks: [{ "@type": "MedicalClinic", medicalSpecialty: "Psychiatric" }] }]), logger: logs().logger },
      later,
    );
    expect(output).toMatchObject({ runs: 0, weakPrompts: 0, faqStatus: "not_needed", schemaItems: 0, backlogAdded: 0 });
    expect(quiet.calls).toHaveLength(0);
  });
});
