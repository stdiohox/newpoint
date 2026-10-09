/**
 * Booking rules that hold for every adapter (docs/automation-architecture.md §5.1). Pure.
 *
 * In order; the first that applies decides:
 *   - D18: a minor or an unknown age → staff callback, no automated booking.
 *   - D19: weight management → staff callback until its open facts are confirmed.
 *   - State unknown or outside NJ/PA → callback (licensure cannot be checked).
 *   - Only providers licensed in the patient's state, offering the requested modality
 *     there, and matching a stated preference are eligible; none → callback.
 *   - New patients: the first visit is the comprehensive psychiatric assessment.
 */
import { PROVIDERS, type Modality, type Provider, type ProviderId, type State } from "./providers.js";

export type Service = "assessment" | "medication_management" | "weight_management" | "unknown";

export interface BookingFacts {
  readonly minorStatus: "adult" | "minor" | "unknown";
  readonly state: string | null;
  readonly modality: Modality | null;
  readonly service: Service;
  readonly newPatient: boolean | null;
  readonly providerPref: string | null;
}

export type CallbackReason =
  | "age_not_confirmed"
  | "weight_management"
  | "state_unknown"
  | "no_eligible_provider"
  | "new_patient_unknown";

export type PolicyDecision =
  | { readonly kind: "callback"; readonly reason: CallbackReason }
  | { readonly kind: "eligible"; readonly providers: readonly Provider[]; readonly service: Exclude<Service, "weight_management" | "unknown">; readonly state: State };

export function slotPolicy(facts: BookingFacts): PolicyDecision {
  if (facts.minorStatus !== "adult") return { kind: "callback", reason: "age_not_confirmed" };
  if (facts.service === "weight_management") return { kind: "callback", reason: "weight_management" };
  if (facts.state !== "NJ" && facts.state !== "PA") return { kind: "callback", reason: "state_unknown" };
  const state: State = facts.state;
  if (facts.newPatient === null) return { kind: "callback", reason: "new_patient_unknown" };
  // New patients start with the assessment, whatever they asked for.
  const service = facts.newPatient ? "assessment" : facts.service === "unknown" ? "medication_management" : facts.service;
  const providers = PROVIDERS.filter(
    (p) =>
      p.licensedIn.includes(state) &&
      (facts.modality === null || p.modalities[state].includes(facts.modality)) &&
      (facts.providerPref === null || p.id === (facts.providerPref as ProviderId)),
  );
  if (providers.length === 0) return { kind: "callback", reason: "no_eligible_provider" };
  return { kind: "eligible", providers, service, state };
}
