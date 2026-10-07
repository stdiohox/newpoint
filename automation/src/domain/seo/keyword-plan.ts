/**
 * Pure logic for seo.keyword-research (docs/automation-architecture.md §5.3).
 * No I/O: the task feeds it Search Console rows and the model's answer, and
 * writes what it returns.
 */
import { z } from "zod";
import { contentRuleGuidance, contentRulesTouched } from "../content-rules/newpoint-rules.js";
import { SERVICE_SLUGS, type KeywordIntent, type Seed, type ServiceSlug, type UsState } from "./seed-matrix.js";
import type { PublicText } from "../../lib/phi.js";

/** Bounds the clustering prompt. Seeds always go in; Search Console fills the rest by impressions. */
export const MAX_CANDIDATES = 300;
/** A question query needs this many impressions in the window to become an FAQ candidate. */
export const FAQ_MIN_IMPRESSIONS = 20;
/** A cluster with no service page needs this many impressions to become a page-gap candidate. */
export const PAGE_GAP_MIN_IMPRESSIONS = 50;

export interface QueryStat {
  readonly query: PublicText;
  readonly impressions: number;
}

export interface Candidate {
  readonly term: PublicText;
  readonly source: "manual" | "search_console";
  readonly serviceSlug: ServiceSlug | null;
  readonly state: UsState | null;
  readonly town: PublicText | null;
  readonly intent: KeywordIntent | null;
  /** Impressions in the research window; 0 for a seed Search Console has not seen. */
  readonly impressions: number;
}

const normalise = (term: string): string => term.trim().replace(/\s+/g, " ").toLowerCase();

/** Seeds first (they carry place and service), then Search Console queries not already seeded. */
export function mergeCandidates(seeds: readonly Seed[], queries: readonly QueryStat[]): Candidate[] {
  const impressions = new Map<string, number>();
  for (const { query, impressions: n } of queries) {
    const key = normalise(query);
    impressions.set(key, (impressions.get(key) ?? 0) + n);
  }

  const seen = new Set<string>();
  const fromSeeds: Candidate[] = [];
  for (const seed of seeds) {
    const key = normalise(seed.term);
    if (seen.has(key)) continue;
    seen.add(key);
    fromSeeds.push({ ...seed, source: "manual", impressions: impressions.get(key) ?? 0 });
  }

  const fromSearch: Candidate[] = [];
  for (const { query } of [...queries].sort((a, b) => b.impressions - a.impressions)) {
    const key = normalise(query);
    if (seen.has(key) || key === "") continue;
    seen.add(key);
    fromSearch.push({
      term: query,
      source: "search_console",
      serviceSlug: null,
      state: null,
      town: null,
      intent: null,
      impressions: impressions.get(key) ?? 0,
    });
  }

  return [...fromSeeds, ...fromSearch].slice(0, Math.max(MAX_CANDIDATES, fromSeeds.length));
}

/** What the model returns. Terms are referenced by index, so it can never invent or rewrite one. */
export const clusteringSchema = z.object({
  clusters: z.array(
    z.object({
      name: z.string(),
      intent: z.enum(["informational", "navigational", "commercial", "transactional", "local"]),
      service_slug: z.enum(SERVICE_SLUGS).nullable(),
      term_indexes: z.array(z.number().int()),
    }),
  ),
});
export type Clustering = z.output<typeof clusteringSchema>;

export interface ClusteredCandidate extends Candidate {
  /** null = not clustered; a human assigns it (§5: never a default category). */
  readonly cluster: string | null;
}

export type ClusterOutcome =
  | { readonly ok: true; readonly candidates: ClusteredCandidate[]; readonly unclustered: number }
  | { readonly ok: false; readonly candidates: ClusteredCandidate[]; readonly unclustered: number };

/**
 * Applies the model's clusters. Any structural problem (an index out of range,
 * a term in two clusters, an empty or overlong name) rejects the WHOLE answer:
 * a partly wrong clustering is not trusted piecemeal. Seeds keep their own
 * service and intent; the model fills those only for Search Console queries.
 */
export function applyClustering(candidates: readonly Candidate[], clustering: Clustering | null): ClusterOutcome {
  const unclustered = (): ClusterOutcome => ({
    ok: false,
    candidates: candidates.map((candidate) => ({ ...candidate, cluster: null })),
    unclustered: candidates.length,
  });
  if (clustering === null) return unclustered();

  const assigned = new Map<number, Clustering["clusters"][number]>();
  for (const cluster of clustering.clusters) {
    const name = cluster.name.trim();
    if (name.length === 0 || name.length > 80) return unclustered();
    for (const index of cluster.term_indexes) {
      if (index < 0 || index >= candidates.length || assigned.has(index)) return unclustered();
      assigned.set(index, cluster);
    }
  }

  let flagged = 0;
  const result = candidates.map((candidate, index): ClusteredCandidate => {
    const cluster = assigned.get(index);
    // A label is a backlog page target in waiting, so a label that breaks a content
    // rule is not stored: its terms stay unclustered for a person to place.
    if (!cluster || contentRulesTouched(cluster.name).length > 0) {
      if (cluster) flagged += 1;
      return { ...candidate, cluster: null };
    }
    return {
      ...candidate,
      cluster: normalise(cluster.name),
      // A query such as "psychiatrist near me" is tracked as data but never credited to
      // a service page, so no ranking report argues for putting the word on that page.
      serviceSlug:
        candidate.source === "manual"
          ? candidate.serviceSlug
          : contentRulesTouched(candidate.term).length > 0
            ? null
            : cluster.service_slug,
      intent: candidate.intent ?? cluster.intent,
    };
  });
  return { ok: true, candidates: result, unclustered: candidates.length - assigned.size + flagged };
}

export interface BacklogItem {
  readonly kind: "page" | "faq";
  readonly target: string;
  readonly rationale: string;
}

const QUESTION = /^(how|what|when|where|why|who|which|can|does|do|is|are|should|will)\b/i;

/**
 * Backlog candidates for a human to review (§4: agents never change the site).
 * - faq: question-shaped Search Console queries with enough impressions;
 * - page: clusters with demand but no service page behind them.
 */
export function deriveBacklog(candidates: readonly ClusteredCandidate[]): BacklogItem[] {
  const faqs = candidates
    .filter((c) => c.source === "search_console" && QUESTION.test(c.term) && c.impressions >= FAQ_MIN_IMPRESSIONS)
    .map((c) => {
      const rules = contentRulesTouched(c.term);
      const base = `Question query with ${String(c.impressions)} Search Console impressions in the research window.`;
      return {
        kind: "faq" as const,
        target: normalise(c.term),
        // Kept, because the demand is real; the answer must stay inside the brief.
        rationale: rules.length === 0 ? base : `${base} Restricted wording, answer only within the brief: ${contentRuleGuidance(rules)}.`,
      };
    });

  const unmapped = new Map<string, number>();
  for (const c of candidates) {
    if (c.cluster === null || c.serviceSlug !== null) continue;
    unmapped.set(c.cluster, (unmapped.get(c.cluster) ?? 0) + c.impressions);
  }
  const pages = [...unmapped]
    .filter(([, impressions]) => impressions >= PAGE_GAP_MIN_IMPRESSIONS)
    .sort(([, a], [, b]) => b - a)
    .map(([cluster, impressions]) => ({
      kind: "page" as const,
      target: cluster,
      rationale: `Cluster with ${String(impressions)} Search Console impressions and no service page.`,
    }));

  return [...pages, ...faqs];
}
