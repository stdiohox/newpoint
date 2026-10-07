/**
 * The seed matrix for seo.keyword-research (docs/automation-architecture.md
 * §5.3): services × places × NJ/PA × intent.
 *
 * Vocabulary is the owners' (CLAUDE.md "Terminology and service names"):
 * "psychiatric assessment" and "mental and behavioral care". "Psychiatric
 * evaluation" stays a tracked query because the brief keeps it for query
 * coverage. "Psychiatrist" is not seeded: neither provider is one (CLAUDE.md
 * "Clinician titles"), and a seed becomes a backlog suggestion. Search Console
 * still reports it if people search it.
 *
 * Places are only the ones `research/` evidences. The single place-level signal
 * is Lawrence Township, NJ (also written Lawrenceville). Pennsylvania has no
 * confirmed town (the Morrisville office is an open client item), so PA is
 * seeded at state level only. Add a town here when the practice confirms it.
 */
import { publicText, type PublicText } from "../../lib/phi.js";

/** `SERVICE_PAGES[].slug` in the site's lib/content.ts, plus null for the practice as a whole. */
export const SERVICE_SLUGS = ["psychiatric-evaluation", "medication-management", "telehealth", "weight-management"] as const;
export type ServiceSlug = (typeof SERVICE_SLUGS)[number];

export type UsState = "NJ" | "PA";
export type KeywordIntent = "informational" | "navigational" | "commercial" | "transactional" | "local";

interface Service {
  readonly term: PublicText;
  readonly slug: ServiceSlug | null;
}

const SERVICES: readonly Service[] = [
  { term: publicText("psychiatric assessment"), slug: "psychiatric-evaluation" },
  { term: publicText("psychiatric evaluation"), slug: "psychiatric-evaluation" },
  { term: publicText("medication management"), slug: "medication-management" },
  { term: publicText("psychiatric medication management"), slug: "medication-management" },
  { term: publicText("telehealth psychiatric care"), slug: "telehealth" },
  { term: publicText("medical weight management"), slug: "weight-management" },
  { term: publicText("mental and behavioral care"), slug: null },
  { term: publicText("psychiatric nurse practitioner"), slug: null },
];

const STATES: readonly { readonly code: UsState; readonly name: PublicText }[] = [
  { code: "NJ", name: publicText("new jersey") },
  { code: "PA", name: publicText("pennsylvania") },
];

const TOWNS: readonly { readonly name: PublicText; readonly state: UsState }[] = [
  { name: publicText("lawrence township"), state: "NJ" },
  { name: publicText("lawrenceville"), state: "NJ" },
];

export interface Seed {
  readonly term: PublicText;
  readonly serviceSlug: ServiceSlug | null;
  readonly state: UsState | null;
  readonly town: PublicText | null;
  readonly intent: KeywordIntent;
}

export function buildSeedMatrix(): Seed[] {
  return SERVICES.flatMap((service): Seed[] => [
    // Place-bound: the local pack and "<service> <town> nj" queries.
    ...TOWNS.map((town) => ({
      term: publicText("{service} {town} {state}", {
        service: service.term,
        town: town.name,
        state: town.state === "NJ" ? publicText("nj") : publicText("pa"),
      }),
      serviceSlug: service.slug,
      state: town.state,
      town: town.name,
      intent: "local" as const,
    })),
    // State-level: telehealth reaches the whole state, and PA has no confirmed town.
    ...STATES.map((state) => ({
      term: publicText("{service} {state}", { service: service.term, state: state.name }),
      serviceSlug: service.slug,
      state: state.code,
      town: null,
      intent: "commercial" as const,
    })),
    {
      term: publicText("{service} near me", { service: service.term }),
      serviceSlug: service.slug,
      state: null,
      town: null,
      intent: "local" as const,
    },
  ]);
}
