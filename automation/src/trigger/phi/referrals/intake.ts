/**
 * referrals.intake (docs/automation-architecture.md §5.5). One referral from the clinician
 * web form (D17), with its document in the private bucket.
 *
 * The document goes only to the Anthropic HIPAA org (Opus 5.5, effort high, no tools), as
 * untrusted data, and the model only fills a fixed schema. EVERY referral then opens a
 * clinician_review ticket: the model's urgency is shown to staff as model-stated and
 * unverified, never trusted to route a referral away from a clinician (a document can
 * contain "urgency: routine"). A model refusal or invalid output is a review with no values,
 * never a default. Nothing here creates a contact or sends a message: staff confirm
 * the values first, and a referral contact's first contact is a staff call (§5.5).
 */
import type { PhiClaude } from "../../../adapters/llm/anthropic-phi.js";
import type { PhiNotifier } from "../../../adapters/n8n/phi-notify.js";
import type { ReferralStore } from "../../../adapters/storage/referral-store.js";
import { auditRead, openTicket, type PhiDb } from "../../../lib/db-phi.js";
import { ConfigError } from "../../../lib/errors.js";
import { phi } from "../../../lib/phi.js";
import { phiTask } from "../../../lib/task.js";
import { EXTRACTION_SYSTEM, extractionSchema, isUrgent } from "../../../domain/referrals/extraction.js";
import { PHI_PAYLOADS } from "../payloads.js";
import { phiRuntime } from "../runtime.js";

export interface IntakeDeps {
  readonly db: PhiDb;
  readonly store: ReferralStore;
  readonly claude: Pick<PhiClaude, "parse">;
  readonly notifier: PhiNotifier;
  readonly actor: string;
}

export type IntakeResult = "clinician_review" | "referral_review" | "already_handled" | "missing" | "no_document";

export async function runReferralIntake(deps: IntakeDeps, referralId: string): Promise<{ readonly result: IntakeResult }> {
  const row = await deps.db.tx(deps.actor, async (q) => {
    const { rows } = await q.query<{ status: string; document_path: string | null }>(
      `select status::text as status, document_path from phi.referrals where id = $1`,
      [referralId],
    );
    if (rows[0] !== undefined) await auditRead(q, "referrals", referralId);
    return rows[0] ?? null;
  });
  if (row === null) return { result: "missing" };
  if (row.status !== "received") return { result: "already_handled" };

  const bytes = row.document_path === null ? null : await deps.store.get(row.document_path);
  let extracted = null;
  let error: string | null = null;
  if (bytes === null) {
    error = "no_document";
  } else {
    const result = await deps.claude.parse({
      route: "extraction",
      system: EXTRACTION_SYSTEM,
      untrusted: phi("The attached document is a referral sent to the practice. Fill in the form from it."),
      document: phi({ pdfBase64: Buffer.from(bytes).toString("base64") }),
      schema: extractionSchema,
      maxTokens: 1_024,
    });
    if (result.ok) extracted = result.value;
    else error = result.reason;
  }

  // No values (or an urgency we could not read) is treated as possibly urgent: a clinician looks.
  const urgent = extracted === null || isUrgent(extracted);
  const opened = await deps.db.tx(deps.actor, async (q) => {
    const updated = await q.query(
      `update phi.referrals set status = 'needs_review', extracted = $2, extraction_confidence = $3, urgency = $4, extraction_error = $5
        where id = $1 and status = 'received'`,
      [referralId, extracted === null ? null : JSON.stringify(extracted), extracted?.confidence ?? null, extracted?.urgency ?? null, error],
    );
    if ((updated.rowCount ?? 0) === 0) return null;
    return openTicket(q, { contactId: null, kind: "clinician_review", sourceKind: "referral", sourceId: referralId });
  });
  if (opened === null) return { result: "already_handled" };
  if (opened) await deps.notifier.actionRequired(new Date()).catch(() => undefined);
  return { result: urgent ? "clinician_review" : "referral_review" };
}

const ID = "referrals.intake";

export const referralIntake = phiTask({
  id: ID,
  schema: PHI_PAYLOADS["referrals.intake"],
  retry: { maxAttempts: 4, factor: 2, minTimeoutInMs: 10_000, maxTimeoutInMs: 120_000 },
  maxDuration: 300,
  run: async ({ referralId }) => {
    const rt = phiRuntime();
    if (rt.referralStore === null) throw new ConfigError("referral_store_unconfigured", ["PHI_STORAGE_URL"]);
    return runReferralIntake({ db: rt.db, store: rt.referralStore, claude: rt.claude, notifier: rt.notifier, actor: ID }, referralId);
  },
});
