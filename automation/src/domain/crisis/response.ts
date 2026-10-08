/**
 * The crisis script (D15). **A PLACEHOLDER until clinicians approve it.**
 *
 * docs/automation-architecture.md §5.8: on detection the person immediately gets a
 * fixed, clinician-approved message with 988 and 911, which also says the practice
 * line is not monitored around the clock. The wording below is a draft written to
 * that requirement. The PHI runtime refuses to start in production while
 * `approved` is false (src/trigger/phi/runtime.ts).
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
  sms: "Newpoint here. If you are thinking about harming yourself or are in crisis, call or text 988 now. In an emergency, call 911. This line is not monitored around the clock. We have alerted a clinician.",
  /** What the voice assistant says before offering the 988 transfer (Phase 8). */
  voice:
    "If you are thinking about harming yourself or are in crisis, please call or text 988, the Suicide and Crisis Lifeline. If this is an emergency, hang up and call 911. This line is not monitored around the clock. I can transfer you to 988 now.",
} as const;
