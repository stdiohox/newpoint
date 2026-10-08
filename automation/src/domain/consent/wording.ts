/**
 * The SMS consent wording (D20). **A PLACEHOLDER until counsel approves it.**
 *
 * Captured verbatim, with this version, into phi.consents.evidence at every capture
 * point (web form, SMS keyword, voice). The PHI runtime refuses to start in
 * production while `approved` is false. Revocation is "by any reasonable means"
 * (FCC 2024): STOP keywords and free-text opt-outs both revoke (src/domain/consent/opt-out.ts).
 */
export const CONSENT_WORDING = {
  version: 0,
  approved: false,
  approvedBy: null as string | null,
  approvedOn: null as string | null,
  smsTransactional:
    "I agree that Newpoint Healthcare Services may text this number about my inquiry and appointments. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of care.",
} as const;
