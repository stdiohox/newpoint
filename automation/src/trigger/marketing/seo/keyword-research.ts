/**
 * seo.keyword-research (docs/automation-architecture.md §5.3, §7 Phase 1).
 *
 * Monthly. Seed matrix + 28 days of Search Console queries (D8: the only data
 * source, so `volume` stays null) → clustered by the drafting tier (§5) →
 * marketing.keywords, plus page-gap and FAQ candidates in content_backlog for
 * a human to apply. A refused, truncated or malformed clustering leaves the
 * terms unclustered (cluster null) for a human; nothing is guessed.
 */
import { queue } from "@trigger.dev/sdk";
import type { PublicClaude } from "../../../adapters/llm/anthropic-public.js";
import type { SearchConsole } from "../../../adapters/google/search-console.js";
import { proposeBacklog, upsertKeywords, type Queryable } from "../../../lib/db-marketing.js";
import type { Logger } from "../../../lib/logger.js";
import { publicText, type PublicText } from "../../../lib/phi.js";
import { marketingSchedule } from "../../../lib/task.js";
import { applyClustering, clusteringSchema, deriveBacklog, mergeCandidates } from "../../../domain/seo/keyword-plan.js";
import { researchWindow } from "../../../domain/seo/rank-snapshots.js";
import { buildSeedMatrix } from "../../../domain/seo/seed-matrix.js";
import { KEYWORD_CLUSTERING_SYSTEM, keywordClusteringUser } from "../../../prompts/seo-keyword-clustering.js";
import { marketingRuntime } from "../runtime.js";

/** One SEO run at a time: both tasks write marketing.keywords. */
export const seoQueue = queue({ name: "seo", concurrencyLimit: 1 });

export interface SeoDeps {
  readonly db: Queryable;
  readonly searchConsole: SearchConsole;
  readonly claude: PublicClaude;
  readonly logger: Logger;
}

export type ClusteringStatus = "ok" | "refusal" | "max_tokens" | "invalid_output" | "invalid_structure";

/** Counts and a status only: Trigger run outputs carry no content (§6 layer 5). */
export interface KeywordResearchOutput {
  readonly candidates: number;
  readonly unclustered: number;
  readonly clustering: ClusteringStatus;
  readonly keywordsUpserted: number;
  readonly backlogAdded: number;
}

const STATUS_TEXT: Readonly<Record<ClusteringStatus, PublicText>> = {
  ok: publicText("ok"),
  refusal: publicText("refusal"),
  max_tokens: publicText("max_tokens"),
  invalid_output: publicText("invalid_output"),
  invalid_structure: publicText("invalid_structure"),
};

export async function runKeywordResearch(deps: SeoDeps, now: Date): Promise<KeywordResearchOutput> {
  const rows = await deps.searchConsole.searchAnalytics({ ...researchWindow(now), dimensions: ["query"] });
  const queries = rows.flatMap((row) => (row.keys[0] === undefined ? [] : [{ query: row.keys[0], impressions: row.impressions }]));
  const candidates = mergeCandidates(buildSeedMatrix(), queries);

  const answer = await deps.claude.parse({
    route: "drafting",
    system: KEYWORD_CLUSTERING_SYSTEM,
    user: keywordClusteringUser(candidates.map((candidate) => candidate.term)),
    schema: clusteringSchema,
    maxTokens: 16_000,
  });
  const outcome = applyClustering(candidates, answer.ok ? answer.value : null);
  const clustering: ClusteringStatus = !answer.ok ? answer.reason : outcome.ok ? "ok" : "invalid_structure";
  if (clustering !== "ok") {
    deps.logger.warn("seo.keyword_research.unclustered", { reason: STATUS_TEXT[clustering], terms: outcome.unclustered });
  }

  const keywordsUpserted = await upsertKeywords(deps.db, outcome.candidates);
  const backlogAdded = await proposeBacklog(deps.db, deriveBacklog(outcome.candidates), "seo.keyword-research");

  const output: KeywordResearchOutput = {
    candidates: candidates.length,
    unclustered: outcome.unclustered,
    clustering,
    keywordsUpserted,
    backlogAdded,
  };
  deps.logger.info("seo.keyword_research.completed", {
    candidates: output.candidates,
    unclustered: output.unclustered,
    keywords_upserted: keywordsUpserted,
    backlog_added: backlogAdded,
  });
  return output;
}

export const keywordResearch = marketingSchedule({
  id: "seo.keyword-research",
  // Monthly (§5.3): the 2nd, after Search Console has settled the 1st.
  cron: { pattern: "0 5 2 * *", timezone: "America/New_York" },
  queue: seoQueue,
  maxDuration: 900,
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 60_000, maxTimeoutInMs: 600_000 },
  run: (payload) => runKeywordResearch(marketingRuntime(), payload.timestamp),
});
