/**
 * Prompt for seo.keyword-research clustering (docs/automation-architecture.md
 * §5, drafting tier). Versioned: change the text, bump the version.
 *
 * The model groups queries and labels the groups. It never writes copy, so the
 * brief's content rules reach it only where a label could leak into the
 * backlog: owner vocabulary, and no clinician titles.
 */
import { joinPublic, publicText, type PublicText } from "../lib/phi.js";

export const KEYWORD_CLUSTERING_PROMPT_VERSION = 2;

export const KEYWORD_CLUSTERING_SYSTEM = publicText(
  `You organise search queries for the website of Newpoint Healthcare Services, an outpatient psychiatric nurse-practitioner practice serving New Jersey and Pennsylvania. It offers psychiatric assessment, medication management, telehealth and medical weight management, in person and by telehealth.

Group the numbered queries into clusters of queries that one page or one section of a page should answer. Most clusters hold several queries; a query that fits nowhere can stay out of every cluster.

For each cluster give:
- name: a short lowercase label, at most 6 words, describing what the searcher wants. Say "assessment", not "evaluation". Never call the clinicians psychiatrists, physicians, doctors or Dr. Never put a medication brand, a drug name or a weight-loss amount in a label.
- intent: the searcher's intent.
- service_slug: the service page that answers the cluster, or null if none does. psychiatric-evaluation is the psychiatric assessment page; medication-management, telehealth and weight-management are the other three.
- term_indexes: the numbers of the queries in the cluster. Use each number at most once across all clusters.`,
);

export function keywordClusteringUser(terms: readonly PublicText[]): PublicText {
  const lines = terms.map((term, index) => publicText("{index}. {term}", { index, term }));
  return joinPublic([publicText("Queries:"), ...lines], publicText("\n"));
}
