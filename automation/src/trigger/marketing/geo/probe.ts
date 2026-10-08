/**
 * geo.probe (docs/automation-architecture.md §5.6, §7 Phase 2).
 *
 * Weekly. First seeds geo_prompts from the Phase 1 keyword clusters (new prompts
 * only). Then asks each engine (D9: Claude with web search, public org) the
 * active prompts it has not answered this week, least recently probed first,
 * capped per run. Each answer becomes a geo_runs row: mentioned, cited, the
 * cited URLs and the providers named. An answer that was refused or cut off is
 * logged and not stored: it measured nothing.
 */
import { queue } from "@trigger.dev/sdk";
import type { GeoEngine, NotMeasured } from "../../../adapters/geo/engine.js";
import type { PublicClaude } from "../../../adapters/llm/anthropic-public.js";
import { insertGeoRun, listClusterKeywords, listPromptsToProbe, markProbeFailed, seedGeoPrompts, type Queryable } from "../../../lib/db-marketing.js";
import type { Logger } from "../../../lib/logger.js";
import { publicText, type PublicText } from "../../../lib/phi.js";
import { marketingSchedule } from "../../../lib/task.js";
import { citesNewpoint, cleanCompetitors, excerpt, mentionsNewpoint } from "../../../domain/geo/analysis.js";
import { buildGeoPrompts } from "../../../domain/geo/prompts.js";
import { competitorSchema, GEO_COMPETITORS_SYSTEM, geoCompetitorsUser } from "../../../prompts/geo.js";
import { marketingRuntime } from "../runtime.js";

/** One GEO run at a time; probes are paid calls and are made one by one. */
export const geoQueue = queue({ name: "geo", concurrencyLimit: 1 });

/** Probes per engine per run. Each is one web-search answer plus one extraction call. */
export const MAX_PROBES_PER_RUN = 30;

export interface GeoProbeDeps {
  readonly db: Queryable;
  readonly engines: readonly GeoEngine[];
  readonly claude: PublicClaude;
  readonly logger: Logger;
}

export interface GeoProbeOutput {
  readonly promptsAdded: number;
  readonly probed: number;
  readonly notMeasured: number;
  readonly mentioned: number;
  readonly cited: number;
  readonly competitorsUnknown: number;
}

const NOT_MEASURED: Readonly<Record<NotMeasured, PublicText>> = {
  refusal: publicText("refusal"),
  max_tokens: publicText("max_tokens"),
  paused: publicText("paused"),
  empty: publicText("empty"),
  incomplete: publicText("incomplete"),
  fallback: publicText("fallback"),
};

/** The providers an answer names, or null when extraction failed (never "none" by default). */
async function extractCompetitors(claude: PublicClaude, answer: PublicText): Promise<string[] | null> {
  const result = await claude.parse({
    route: "drafting",
    system: GEO_COMPETITORS_SYSTEM,
    user: geoCompetitorsUser(answer),
    schema: competitorSchema,
    maxTokens: 2_000,
  });
  return result.ok ? cleanCompetitors(result.value.providers) : null;
}

export async function runGeoProbe(deps: GeoProbeDeps, now: Date): Promise<GeoProbeOutput> {
  const promptsAdded = await seedGeoPrompts(deps.db, buildGeoPrompts(await listClusterKeywords(deps.db)));

  let probed = 0;
  let notMeasured = 0;
  let mentioned = 0;
  let cited = 0;
  let competitorsUnknown = 0;
  for (const engine of deps.engines) {
    for (const prompt of await listPromptsToProbe(deps.db, engine.id, MAX_PROBES_PER_RUN, now)) {
      const result = await engine.ask({ prompt: prompt.prompt, state: prompt.state });
      if (!result.ok) {
        notMeasured += 1;
        // Recorded so a prompt that keeps failing waits its turn instead of sorting first every week.
        await markProbeFailed(deps.db, prompt.id, now);
        deps.logger.warn("geo.probe.not_measured", { reason: NOT_MEASURED[result.reason] });
        continue;
      }
      const { text, citedUrls } = result.answer;
      const competitors = await extractCompetitors(deps.claude, text);
      const run = {
        promptId: prompt.id,
        engine: engine.id,
        runAt: now,
        answerExcerpt: excerpt(text),
        newpointMentioned: mentionsNewpoint(text),
        newpointCited: citesNewpoint(citedUrls),
        citedUrls,
        competitors,
      };
      await insertGeoRun(deps.db, run);
      probed += 1;
      if (run.newpointMentioned) mentioned += 1;
      if (run.newpointCited) cited += 1;
      if (competitors === null) competitorsUnknown += 1;
    }
  }

  const output = { promptsAdded, probed, notMeasured, mentioned, cited, competitorsUnknown };
  deps.logger.info("geo.probe.completed", {
    prompts_added: promptsAdded,
    probed,
    not_measured: notMeasured,
    mentioned,
    cited,
    competitors_unknown: competitorsUnknown,
  });
  return output;
}

export const geoProbe = marketingSchedule({
  id: "geo.probe",
  // Weekly (§5.6). Tuesday, so Monday's rank tracker and this never share a morning.
  cron: { pattern: "0 7 * * 2", timezone: "America/New_York" },
  queue: geoQueue,
  maxDuration: 3_600,
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 60_000, maxTimeoutInMs: 600_000 },
  run: (payload) => runGeoProbe(marketingRuntime(), payload.timestamp),
});
