/**
 * GEO prompts from the Phase 1 keyword clusters (docs/automation-architecture.md
 * §5.6, §7 Phase 2: "Phase 1's keyword clusters seed the prompts").
 *
 * One question per cluster per state, phrased the way a person asks an AI
 * assistant rather than a search box, plus a town question where the cluster
 * holds town-level keywords. Clusters touching a content rule are skipped:
 * a prompt about "psychiatrists" measures a claim the practice must not make.
 */
import { blockingRulesTouched } from "../content-rules/newpoint-rules.js";
import { publicText, type PublicText } from "../../lib/phi.js";

export type UsState = "NJ" | "PA";

export interface ClusterKeyword {
  readonly cluster: PublicText;
  readonly state: UsState | null;
  readonly town: PublicText | null;
  readonly intent: string | null;
}

export interface GeoPromptSeed {
  readonly prompt: PublicText;
  readonly cluster: PublicText;
  readonly state: UsState;
  readonly intent: string | null;
}

const STATE_NAME: Readonly<Record<UsState, PublicText>> = {
  NJ: publicText("New Jersey"),
  PA: publicText("Pennsylvania"),
};

/** The most common non-null value, ties broken alphabetically, so the output is stable. */
function mode(values: readonly (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const value of values) if (value !== null) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].sort(([a, x], [b, y]) => y - x || a.localeCompare(b))[0]?.[0] ?? null;
}

export function buildGeoPrompts(keywords: readonly ClusterKeyword[]): GeoPromptSeed[] {
  const byCluster = new Map<string, ClusterKeyword[]>();
  for (const keyword of keywords) {
    byCluster.set(keyword.cluster, [...(byCluster.get(keyword.cluster) ?? []), keyword]);
  }

  const seeds: GeoPromptSeed[] = [];
  for (const [, members] of [...byCluster].sort(([a], [b]) => a.localeCompare(b))) {
    const first = members[0];
    if (!first || blockingRulesTouched(first.cluster).length > 0) continue;
    const cluster = first.cluster;
    const intent = mode(members.map((member) => member.intent));

    const stated = [...new Set(members.flatMap((member) => (member.state === null ? [] : [member.state])))].sort();
    // A cluster with no state-bound keyword is asked about in both states the practice serves.
    const states: UsState[] = stated.length > 0 ? stated : ["NJ", "PA"];
    for (const state of states) {
      seeds.push({ prompt: publicText("Who offers {cluster} in {state}?", { cluster, state: STATE_NAME[state] }), cluster, state, intent });
    }

    const towns = [...new Map(members.flatMap((m) => (m.town !== null && m.state !== null ? [[m.town, m.state] as const] : []))).entries()];
    for (const [town, state] of towns.sort(([a], [b]) => a.localeCompare(b))) {
      seeds.push({
        prompt: publicText("Where can I get {cluster} near {town}, {state}?", {
          cluster,
          town,
          state: state === "NJ" ? publicText("NJ") : publicText("PA"),
        }),
        cluster,
        state,
        intent,
      });
    }
  }
  return seeds;
}
