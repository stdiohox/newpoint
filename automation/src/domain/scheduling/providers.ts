/**
 * The two providers, as the booking agent may use them (docs/automation-architecture.md
 * §5.1 slot policy). Every fact here is sourced in the repo's CLAUDE.md; nothing is
 * inferred. Facts that are open stay closed: a booking that would need one becomes a
 * staff callback.
 *
 * - Licensure: both providers in NJ and PA (client confirmation, 2026-09-29).
 * - Modality: telehealth in both states; in-person confirmed in NJ only (the only place
 *   signal is Lawrence Township, NJ). In-person in PA is open, so it is never offered.
 * - Display name in texts: name plus credential, never "Dr." alone — the site's rule
 *   allows "Dr." only beside the full credentials or "nurse practitioner", which an SMS
 *   slot cannot carry.
 * - Headway booking page: only Whitaker's is recorded (CLAUDE.md, the client's source).
 *   Ofoegbu's is not in the repo, so a handoff to her is a callback until it is supplied.
 */
export type ProviderId = "funmilayo-whitaker" | "anastasia-ofoegbu";
export type State = "NJ" | "PA";
export type Modality = "in_person" | "telehealth";

export interface Provider {
  readonly id: ProviderId;
  /** Used in SMS templates (slot `provider`). */
  readonly smsName: string;
  readonly licensedIn: readonly State[];
  readonly modalities: Readonly<Record<State, readonly Modality[]>>;
  /** A generic public booking page; never prefilled with contact data (§5.1). null = not supplied. */
  readonly headwayUrl: string | null;
}

export const PROVIDERS: readonly Provider[] = [
  {
    id: "funmilayo-whitaker",
    smsName: "Funmilayo Whitaker, DNP",
    licensedIn: ["NJ", "PA"],
    modalities: { NJ: ["in_person", "telehealth"], PA: ["telehealth"] },
    headwayUrl: "https://care.headway.co/providers/funmilayo-whitaker-2",
  },
  {
    id: "anastasia-ofoegbu",
    smsName: "Anastasia Ofoegbu, DNP",
    licensedIn: ["NJ", "PA"],
    modalities: { NJ: ["in_person", "telehealth"], PA: ["telehealth"] },
    // CLIENT: supply Dr. Ofoegbu's Headway booking URL to enable handoff for her.
    headwayUrl: null,
  },
];

export function provider(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/** Every URL a handoff text may carry: the allowlist the slot resolver checks against. */
export const HANDOFF_URLS: ReadonlySet<string> = new Set(PROVIDERS.flatMap((p) => (p.headwayUrl === null ? [] : [p.headwayUrl])));
