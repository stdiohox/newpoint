/**
 * geo.recommendations' pure logic (docs/automation-architecture.md §5.6).
 * Four weeks of geo_runs → citation targets and the prompts where Newpoint is
 * missing; the model's FAQ suggestions for those are screened against the brief
 * before anything reaches the backlog.
 */
import { z } from "zod";
import type { BacklogItem } from "../backlog.js";
import { blockingRulesTouched, contentRuleGuidance, contentRulesTouched } from "../content-rules/newpoint-rules.js";
import { NEWPOINT_HOST } from "./analysis.js";
import type { PublicText } from "../../lib/phi.js";

/** A prompt is weak when Newpoint appears in fewer than half of its answers. */
export const WEAK_MENTION_RATE = 0.5;
/** Weak needs evidence: at least this many measured answers. */
export const MIN_RUNS = 2;
export const MAX_CITATION_TARGETS = 5;
export const MIN_CITATIONS = 2;
export const MAX_FAQ_SUGGESTIONS = 8;

export interface GeoRunRow {
  readonly promptId: string;
  readonly prompt: PublicText;
  readonly newpointMentioned: boolean;
  readonly newpointCited: boolean;
  /** Hostnames of the cited URLs (lowercase, no "www."), derived in SQL by listGeoRuns. */
  readonly citedHosts: readonly PublicText[];
  /** null = extraction failed for that run; it is left out of the counts, not read as "none". */
  readonly competitors: readonly PublicText[] | null;
}

export interface PromptStats {
  readonly promptId: string;
  readonly prompt: PublicText;
  readonly runs: number;
  readonly mentions: number;
  readonly citations: number;
  /** Most frequent first. */
  readonly competitors: readonly PublicText[];
  readonly domains: readonly PublicText[];
}

const isNewpointHost = (host: string): boolean => host === NEWPOINT_HOST || host.endsWith(`.${NEWPOINT_HOST}`);

const ranked = <T extends string>(counts: Map<T, number>): T[] =>
  [...counts].sort(([a, x], [b, y]) => y - x || a.localeCompare(b)).map(([key]) => key);

export function aggregate(rows: readonly GeoRunRow[]): PromptStats[] {
  const byPrompt = new Map<string, GeoRunRow[]>();
  for (const row of rows) byPrompt.set(row.promptId, [...(byPrompt.get(row.promptId) ?? []), row]);

  return [...byPrompt.values()].flatMap((runs) => {
    const first = runs[0];
    if (!first) return [];
    const competitors = new Map<PublicText, number>();
    const domains = new Map<PublicText, number>();
    for (const run of runs) {
      for (const name of run.competitors ?? []) competitors.set(name, (competitors.get(name) ?? 0) + 1);
      for (const host of new Set(run.citedHosts)) {
        if (!isNewpointHost(host)) domains.set(host, (domains.get(host) ?? 0) + 1);
      }
    }
    return [
      {
        promptId: first.promptId,
        prompt: first.prompt,
        runs: runs.length,
        mentions: runs.filter((r) => r.newpointMentioned).length,
        citations: runs.filter((r) => r.newpointCited).length,
        competitors: ranked(competitors).slice(0, 5),
        domains: ranked(domains).slice(0, 5),
      },
    ];
  });
}

export function weakPrompts(stats: readonly PromptStats[]): PromptStats[] {
  return stats.filter((s) => s.runs >= MIN_RUNS && s.mentions / s.runs < WEAK_MENTION_RATE);
}

/**
 * Sites engines cite when they do not cite Newpoint: directories and listings
 * the practice may belong in. A person checks each one; nothing is submitted.
 */
export function citationTargets(rows: readonly GeoRunRow[]): BacklogItem[] {
  const counts = new Map<string, number>();
  for (const row of rows.filter((r) => !r.newpointCited)) {
    for (const host of new Set(row.citedHosts)) {
      if (!isNewpointHost(host)) counts.set(host, (counts.get(host) ?? 0) + 1);
    }
  }
  return ranked(counts)
    .filter((host) => (counts.get(host) ?? 0) >= MIN_CITATIONS)
    .slice(0, MAX_CITATION_TARGETS)
    .map((host) => ({
      kind: "citation" as const,
      target: host,
      rationale: `Cited in ${String(counts.get(host) ?? 0)} AI answers in the last four weeks that did not cite ${NEWPOINT_HOST}. If it is a directory or listing, check whether the practice belongs there, and if it is listed, that the name, phone and delivery line match the site exactly. If it is another practice's own site, ignore it. On any listing: never a Psychiatrist or Physician category or title (CLAUDE.md: Clinician titles), only the confirmed payers and never the nine under review (Payer list), and never an address the client has not confirmed.`,
    }));
}

/** Model text stored in the backlog: one line, no control characters. */
const oneLine = (text: string): string => text.replace(/[\p{Cc}\p{Cf}]+/gu, " ").replace(/\s+/g, " ").trim();

export const faqSuggestionSchema = z.object({
  suggestions: z.array(z.object({ prompt_index: z.number().int(), question: z.string(), covers: z.string() })),
});
export type FaqSuggestions = z.output<typeof faqSuggestionSchema>;

export interface FaqScreening {
  readonly items: BacklogItem[];
  /** Suggestions dropped before entering the backlog (§5.6): a blocking content rule, or a named practice. */
  readonly rejected: number;
  readonly status: "ok" | "invalid_structure" | "no_answer";
}

/**
 * The whole answer is refused on any structural problem; a single suggestion
 * that touches a content rule is dropped and counted. The rationale states the
 * evidence and the constraint, so the person writing the answer has both.
 */
export function screenFaqSuggestions(weak: readonly PromptStats[], answer: FaqSuggestions | null): FaqScreening {
  if (answer === null) return { items: [], rejected: 0, status: "no_answer" };
  const valid = answer.suggestions.every(
    (s) =>
      s.prompt_index >= 0 &&
      s.prompt_index < weak.length &&
      s.question.trim().length > 0 &&
      s.question.length <= 200 &&
      s.covers.length <= 400,
  );
  if (!valid || answer.suggestions.length > MAX_FAQ_SUGGESTIONS) return { items: [], rejected: 0, status: "invalid_structure" };

  let rejected = 0;
  const items: BacklogItem[] = [];
  for (const suggestion of answer.suggestions) {
    const stats = weak[suggestion.prompt_index];
    if (!stats) continue;
    const text = `${suggestion.question} ${suggestion.covers}`;
    // A question about a named practice or clinician is a comparison, never site copy.
    const namesCompetitor = stats.competitors.some((name) => text.toLowerCase().includes(name.toLowerCase()));
    // A link or an address in a suggestion came from the web, not from the practice.
    const carriesLink = /https?:|www\.|\b[\w-]+\.(com|org|net|io|health)\b|@/i.test(text);
    if (namesCompetitor || carriesLink || blockingRulesTouched(text).length > 0) {
      rejected += 1;
      continue;
    }
    const guidance = contentRulesTouched(text);
    items.push({
      kind: "faq",
      target: oneLine(suggestion.question),
      rationale:
        `Asked of AI assistants as "${stats.prompt}": Newpoint appeared in ${String(stats.mentions)} of ${String(stats.runs)} answers. ` +
        `The answer should cover: ${oneLine(suggestion.covers)} ` +
        "Use only confirmed facts: never a PAYER_GROUPS name under review, never an OPEN_CLIENT_ITEMS fact; anything else is a CLIENT placeholder." +
        (guidance.length === 0 ? "" : ` Also: ${contentRuleGuidance(guidance)}.`),
    });
  }
  return { items, rejected, status: "ok" };
}
