/**
 * geo.recommendations (docs/automation-architecture.md §5.6, §7 Phase 2).
 *
 * Monthly. Inputs: four weeks of geo_runs, the site's schema.org coverage and
 * the keyword clusters. Output: content_backlog items for a person editing the
 * site repo, never a commit (§5.6):
 *   - schema: violations and gaps against the brief, advice written in source;
 *   - citation: sites engines cite instead of Newpoint;
 *   - faq: questions to answer where Newpoint is missing, suggested by the
 *     drafting tier and dropped if they touch a content rule.
 */
import type { SiteSchemaReader } from "../../../adapters/site/schema-coverage.js";
import type { PublicClaude } from "../../../adapters/llm/anthropic-public.js";
import { listClusters, listGeoRuns, proposeBacklog, type Queryable } from "../../../lib/db-marketing.js";
import type { Logger } from "../../../lib/logger.js";
import { publicText, type PublicText } from "../../../lib/phi.js";
import { marketingSchedule } from "../../../lib/task.js";
import { aggregate, citationTargets, faqSuggestionSchema, screenFaqSuggestions, weakPrompts } from "../../../domain/geo/recommendations.js";
import { auditSchema } from "../../../domain/geo/schema-audit.js";
import { GEO_RECOMMENDATIONS_SYSTEM, geoRecommendationsUser } from "../../../prompts/geo.js";
import { marketingRuntime } from "../runtime.js";
import { geoQueue } from "./probe.js";

export const LOOKBACK_DAYS = 28;

export interface GeoRecommendationsDeps {
  readonly db: Queryable;
  readonly claude: PublicClaude;
  readonly site: SiteSchemaReader;
  readonly logger: Logger;
}

export interface GeoRecommendationsOutput {
  readonly runs: number;
  readonly weakPrompts: number;
  readonly schemaItems: number;
  readonly citationItems: number;
  readonly faqItems: number;
  readonly faqRejected: number;
  readonly faqStatus: "ok" | "invalid_structure" | "no_answer" | "not_needed";
  readonly pagesUnreadable: number;
  readonly backlogAdded: number;
}

const STATUS_TEXT: Readonly<Record<"invalid_structure" | "no_answer", PublicText>> = {
  invalid_structure: publicText("invalid_structure"),
  no_answer: publicText("no_answer"),
};

export async function runGeoRecommendations(deps: GeoRecommendationsDeps, now: Date): Promise<GeoRecommendationsOutput> {
  const rows = await listGeoRuns(deps.db, new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000));
  const weak = weakPrompts(aggregate(rows));

  const audit = auditSchema(await deps.site.read());
  const citations = citationTargets(rows);

  let faq: ReturnType<typeof screenFaqSuggestions> | undefined;
  if (weak.length > 0) {
    const answer = await deps.claude.parse({
      route: "drafting",
      system: GEO_RECOMMENDATIONS_SYSTEM,
      user: geoRecommendationsUser(weak, await listClusters(deps.db)),
      schema: faqSuggestionSchema,
      maxTokens: 8_000,
    });
    faq = screenFaqSuggestions(weak, answer.ok ? answer.value : null);
    if (faq.status !== "ok") deps.logger.warn("geo.recommendations.no_faq", { reason: STATUS_TEXT[faq.status] });
  }

  const items = [...audit.items, ...citations, ...(faq?.items ?? [])];
  const backlogAdded = await proposeBacklog(deps.db, items, "geo.recommendations");

  const output: GeoRecommendationsOutput = {
    runs: rows.length,
    weakPrompts: weak.length,
    schemaItems: audit.items.length,
    citationItems: citations.length,
    faqItems: faq?.items.length ?? 0,
    faqRejected: faq?.rejected ?? 0,
    faqStatus: faq?.status ?? "not_needed",
    pagesUnreadable: audit.unreadable,
    backlogAdded,
  };
  deps.logger.info("geo.recommendations.completed", {
    runs: output.runs,
    weak_prompts: output.weakPrompts,
    schema_items: output.schemaItems,
    citation_items: output.citationItems,
    faq_items: output.faqItems,
    faq_rejected: output.faqRejected,
    pages_unreadable: output.pagesUnreadable,
    backlog_added: backlogAdded,
  });
  return output;
}

export const geoRecommendations = marketingSchedule({
  id: "geo.recommendations",
  // Monthly (§5.6): the 4th, after the month's last weekly probe has landed.
  cron: { pattern: "0 8 4 * *", timezone: "America/New_York" },
  queue: geoQueue,
  maxDuration: 900,
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 60_000, maxTimeoutInMs: 600_000 },
  run: (payload) => runGeoRecommendations(marketingRuntime(), payload.timestamp),
});
