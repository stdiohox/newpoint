/**
 * Review-request eligibility (docs/automation-architecture.md §5.4). Pure. EVERY condition
 * must hold; the first that fails is the reason.
 *
 * Compliance (§5.4): no review gating (no sentiment filter, nobody routed to private
 * feedback instead), no incentives, neutral wording, the review link the only URL. Nothing
 * here looks at how the visit went: that is the rule against gating, in code.
 */
export interface ReviewFacts {
  readonly appointmentStatus: "scheduled" | "completed" | "cancelled" | "no_show";
  readonly reviewConsent: boolean;
  readonly smsConsent: boolean;
  readonly excluded: boolean;
  readonly crisisInLast90Days: boolean;
  readonly sentInLast12Months: boolean;
  readonly minorStatus: "adult" | "minor" | "unknown";
}

export type Ineligible =
  | "not_completed"
  | "no_review_consent"
  | "no_sms_consent"
  | "excluded"
  | "recent_crisis"
  | "sent_within_12_months"
  | "not_adult";

export function reviewEligibility(f: ReviewFacts): { readonly eligible: true } | { readonly eligible: false; readonly reason: Ineligible } {
  if (f.appointmentStatus !== "completed") return { eligible: false, reason: "not_completed" };
  if (f.minorStatus !== "adult") return { eligible: false, reason: "not_adult" };
  if (f.excluded) return { eligible: false, reason: "excluded" };
  if (f.crisisInLast90Days) return { eligible: false, reason: "recent_crisis" };
  if (f.sentInLast12Months) return { eligible: false, reason: "sent_within_12_months" };
  if (!f.reviewConsent) return { eligible: false, reason: "no_review_consent" };
  if (!f.smsConsent) return { eligible: false, reason: "no_sms_consent" };
  return { eligible: true };
}

/** The clinician window (§5.4): the treating clinician can exclude the patient for 24 h. */
export const CLINICIAN_WINDOW_MS = 24 * 3_600_000;

/**
 * Small-cell suppression for anything leaving the PHI zone (§4 metrics.daily): counts
 * below 5 become null ("<5"). Never 0–4.
 */
export const suppress = (n: number): number | null => (n < 5 ? null : n);
