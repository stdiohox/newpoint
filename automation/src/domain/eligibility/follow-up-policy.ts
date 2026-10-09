/**
 * Lead follow-up policy (docs/automation-architecture.md §5.5). Pure.
 *
 * Enrolment: a self-submitted (web) new-patient inquiry. Referral-sourced contacts are
 * never enrolled: they gave their number to the referrer, not to Newpoint. Existing
 * patients, billing questions and "something else" get a staff callback only.
 *
 * Each step is re-checked just before it sends: the inquiry still open (not booked, not
 * handed to a callback, not closed), THIS inquiry's code confirmed (a phone verified for some
 * earlier contact does not count), consent active, no open crisis, and not stale.
 * send-sms checks consent, D18 and the crisis pause again; this decides earlier so a
 * skipped step is recorded as skipped, not as a refused send.
 */
export const LEAD_STEPS = [
  { step: 1, afterMs: 5 * 60_000, template: "lead_follow_up_1" },
  { step: 2, afterMs: 24 * 3_600_000, template: "lead_follow_up_2" },
  { step: 3, afterMs: 72 * 3_600_000, template: "lead_follow_up_3" },
] as const;

export interface LeadState {
  readonly source: "sms" | "voice" | "web" | "referral";
  readonly reason: "new_patient" | "existing_patient" | "billing_insurance" | "other";
  readonly inquiryStatus: "open" | "callback" | "booked" | "closed";
  readonly phoneVerified: boolean;
  readonly consentActive: boolean;
  readonly crisisOpen: boolean;
  readonly adult: boolean;
}

export type Enrolment = "enrol" | "not_self_submitted" | "not_new_patient";
export type StepDecision = "send" | "skip_not_open" | "skip_unverified" | "skip_no_consent" | "skip_crisis" | "skip_not_adult" | "skip_stale";

/** A step this far past its due time is skipped, never sent late: overdue steps must not burst out together. */
export const STALE_AFTER_MS = 2 * 3_600_000;

export function enrolment(state: Pick<LeadState, "source" | "reason">): Enrolment {
  if (state.source !== "web") return "not_self_submitted";
  if (state.reason !== "new_patient") return "not_new_patient";
  return "enrol";
}

export function stepDecision(state: LeadState, overdueMs = 0): StepDecision {
  if (overdueMs > STALE_AFTER_MS) return "skip_stale";
  if (state.inquiryStatus !== "open") return "skip_not_open";
  if (!state.adult) return "skip_not_adult";
  if (!state.consentActive) return "skip_no_consent";
  if (!state.phoneVerified) return "skip_unverified";
  if (state.crisisOpen) return "skip_crisis";
  return "send";
}
