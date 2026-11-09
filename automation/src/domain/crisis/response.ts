/**
 * The crisis script (D15). **A PLACEHOLDER until clinicians approve it.**
 *
 * docs/automation-architecture.md §5.8: on detection the person immediately gets a
 * fixed, clinician-approved message with 988 and 911. The wording below is a draft
 * that follows the site's crisis wording as the client set it on 2026-11-02: "call
 * 988" (never "call or text"), and no "not monitored around the clock" sentence.
 * The PHI runtime refuses to start in production while `approved` is false
 * (src/trigger/phi/runtime.ts).
 *
 * To approve: a clinician reviews the exact text, then a person sets `approved`,
 * `approvedBy` and `approvedOn` here in one commit, and the version goes up.
 */
export const CRISIS_SCRIPT = {
  version: 0,
  approved: false,
  approvedBy: null as string | null,
  approvedOn: null as string | null,
  /** SMS auto-response (also the basis for the voice script). */
  // "Notified ... may not reply right away. Do not wait for us": the page has no response-time
  // guarantee, so the reply must never read as a promise that someone will answer soon
  // (healthcare-reviewer, 2026-11-09). A question for D15 sign-off, as is "call" vs "call or text".
  sms: "Newpoint here. If you are thinking about harming yourself or are in crisis, do not wait for us: call 988 now, or 911 in an emergency. A clinician has been notified but may not reply right away.",
  /** What the voice assistant says before offering the 988 transfer (Phase 8). */
  voice:
    "If you are thinking about harming yourself or are in crisis, please call 988, the Suicide and Crisis Lifeline. If this is an emergency, hang up and call 911. I can transfer you to 988 now.",
} as const;
