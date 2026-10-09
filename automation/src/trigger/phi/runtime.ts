/**
 * Process-wide dependencies for the newpoint-phi Trigger.dev project.
 *
 * Built once per worker, on first use; `init.ts` builds it before every attempt, so
 * a public-zone credential, a missing variable or a database URL for another
 * Supabase project fails the run before any task code reads a row.
 *
 * LLM calls here go to the Anthropic HIPAA org (§2) and set no `fallbacks`: whether
 * server-side fallback is covered there is unverified, so the PHI zone does not use it.
 */
import type pg from "pg";
import { createPhiClaude, type PhiClaude } from "../../adapters/llm/anthropic-phi.js";
import { createTwilio, type Twilio } from "../../adapters/messaging/twilio.js";
import { createSupabaseReferralStore, type ReferralStore } from "../../adapters/storage/referral-store.js";
import { createPhiNotifier, type PhiNotifier } from "../../adapters/n8n/phi-notify.js";
import { createHeadwayHandoff } from "../../adapters/scheduling/headway-handoff.js";
import { createManualQueue } from "../../adapters/scheduling/manual-queue.js";
import type { SchedulingAdapter } from "../../adapters/scheduling/SchedulingAdapter.js";
import { bookingTicket } from "./booking/ticket.js";
import { createPhiPool, poolDb, type PhiDb } from "../../lib/db-phi.js";
import { loadPhiEnv, type PhiEnv } from "../../lib/env-phi.js";
import { ConfigError } from "../../lib/errors.js";
import { createLogger, type Logger } from "../../lib/logger.js";
import { CONSENT_WORDING } from "../../domain/consent/wording.js";
import { CRISIS_SCRIPT } from "../../domain/crisis/response.js";
import { noRetryFetch, vendorFetch } from "../../lib/vendor-fetch.js";

export interface PhiRuntime {
  readonly env: PhiEnv;
  readonly pool: pg.Pool;
  readonly db: PhiDb;
  readonly twilio: Twilio;
  /** The HIPAA org (§2). vendorFetch: a model call is safe to retry on 429/5xx. */
  readonly claude: PhiClaude;
  readonly notifier: PhiNotifier;
  /** Phase 10: the private referral bucket; null until PHI_STORAGE_* is set. */
  readonly referralStore: ReferralStore | null;
  /** D1: manual-queue always; headway-handoff when PHI_SCHEDULING_ADAPTERS lists it. */
  readonly scheduling: { readonly manual: SchedulingAdapter; readonly headway: SchedulingAdapter | null };
  readonly logger: Logger;
}

/**
 * D15 and D20: production refuses to start while the crisis script or the consent
 * wording is a placeholder. Staging and development run, against fakes and test numbers.
 */
export function assertApprovedForEnvironment(
  environmentType: string,
  approvals: { readonly crisis: { readonly approved: boolean }; readonly consent: { readonly approved: boolean } } = {
    crisis: CRISIS_SCRIPT,
    consent: CONSENT_WORDING,
  },
): void {
  if (environmentType !== "PRODUCTION") return;
  const missing = [
    ...(approvals.crisis.approved ? [] : ["CRISIS_SCRIPT"]),
    ...(approvals.consent.approved ? [] : ["CONSENT_WORDING"]),
  ];
  if (missing.length > 0) throw new ConfigError("unapproved_wording_in_production", missing);
}

let runtime: PhiRuntime | undefined;

/**
 * Drops the runtime and closes its pool. Called before a wait (init.ts onWait): Trigger.dev
 * checkpoints the process, and pooled sockets do not survive the restore. The next
 * phiRuntime() call builds a fresh pool.
 */
export async function resetPhiRuntime(): Promise<void> {
  const current = runtime;
  runtime = undefined;
  await current?.pool.end().catch(() => undefined);
}

export function phiRuntime(): PhiRuntime {
  if (runtime) return runtime;
  const env = loadPhiEnv();
  const pool = createPhiPool(env.PHI_DATABASE_URL, env.PHI_DATABASE_CA_CERT);
  const db = poolDb(pool);
  runtime = Object.freeze({
    env,
    pool,
    db,
    referralStore:
      env.PHI_STORAGE_URL === undefined || env.PHI_STORAGE_BUCKET === undefined || env.PHI_STORAGE_JWT === undefined
        ? null
        : createSupabaseReferralStore({ projectUrl: env.PHI_STORAGE_URL, bucket: env.PHI_STORAGE_BUCKET, jwt: env.PHI_STORAGE_JWT, fetch: vendorFetch }),
    scheduling: {
      manual: createManualQueue(async (bookingRequestId, contactId) =>
        (await db.tx("booking.request", (q) => bookingTicket(q, bookingRequestId, contactId))).id,
      ),
      headway: env.PHI_SCHEDULING_ADAPTERS.includes("headway-handoff") ? createHeadwayHandoff() : null,
    },
    twilio: createTwilio(
      {
        accountSid: env.TWILIO_ACCOUNT_SID,
        authToken: env.TWILIO_AUTH_TOKEN,
        messagingServiceSid: env.TWILIO_MESSAGING_SERVICE_SID,
        voiceFrom: env.TWILIO_VOICE_FROM,
      },
      noRetryFetch,
    ),
    claude: createPhiClaude({ apiKey: env.ANTHROPIC_API_KEY_PHI, fetch: vendorFetch }),
    notifier: createPhiNotifier({ url: env.PHI_N8N_ACTION_WEBHOOK_URL, secret: env.PHI_N8N_ACTION_WEBHOOK_SECRET, fetch: vendorFetch }),
    logger: createLogger(),
  });
  return runtime;
}
