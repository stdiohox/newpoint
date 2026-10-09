/**
 * messaging.send-sms: the outbound-message contract (docs/automation-architecture.md
 * §5.0). Every text to a patient goes through here; nothing else calls
 * Twilio.sendSms.
 *
 * The payload is ids only. Checks, in order; the first that fails decides:
 *   1. idempotency: (template, entity id, step) already sent → duplicate, nothing sent;
 *   2. the contact and its phone exist;
 *   3. D18: the contact is a confirmed adult. A minor or an unknown age gets no
 *      automated message; staff call back;
 *   4. an active sms_transactional consent;
 *   5. a verified phone (only the verification code itself goes before);
 *   6. no open crisis for a sequence template (§5.8: reminders keep running);
 *   7. quiet hours 08:00–21:00 America/New_York (NJ and PA), or the template's narrower window
 *      (review requests 10:00–19:00): deferred, never dropped;
 *   8. the global daily budget (trips the breaker and pages Koret ops once a day) and
 *      the per-number daily limit.
 * The crisis auto-response is exempt from 7 and 8 only: it answers a message the
 * patient just sent, and no budget holds it back.
 *
 * Delivery is at most once. The message row is claimed (unique idempotency key) and
 * committed before Twilio is called. Only a definite rejection (Twilio answered 4xx)
 * releases the claim so a retry can send. A timeout, a 5xx, a connection error or an
 * unreadable response is ambiguous (Twilio may have sent it): the claim stays, the run
 * fails, and the retry sends nothing rather than risk a second text. Twilio is called
 * without in-call retries (lib/vendor-fetch.ts noRetryFetch).
 *
 * The budget and per-number counts are serialised with an advisory lock, so concurrent
 * runs on the queue cannot all read N-1 and overshoot.
 */
import { queue, wait } from "@trigger.dev/sdk";
import type { z } from "zod";
import { pageText, type Twilio } from "../../../adapters/messaging/twilio.js";
import {
  auditSend,
  getContact,
  hasActiveConsent,
  latestConsent,
  openSmsConversation,
  outboundToday,
  sequencesPaused,
  type PhiDb,
  type Queryable,
} from "../../../lib/db-phi.js";
import type { PhiEnv } from "../../../lib/env-phi.js";
import { VendorHttpError } from "../../../lib/errors.js";
import { phiTask } from "../../../lib/task.js";
import type { Phi } from "../../../lib/phi.js";
import { inWindow, nextInWindow, REVIEW_WINDOW, SMS_WINDOW } from "../../../domain/messaging/quiet-hours.js";
import { renderTemplate, templateDef, type SmsBody } from "../../../domain/messaging/templates.js";
import { PHI_PAYLOADS } from "../payloads.js";
import { phiRuntime } from "../runtime.js";
import { resolveSlots } from "./slots.js";

export const sendSmsPayload = PHI_PAYLOADS["messaging.send-sms"];
export type SendSmsPayload = z.output<typeof sendSmsPayload>;

export type RefusalReason =
  | "no_contact"
  | "no_phone"
  | "not_adult"
  | "no_consent"
  | "phone_unverified"
  | "sequences_paused"
  | "global_budget"
  | "number_limit"
  | "age_check_limit";

export type SendOutcome =
  | { readonly status: "sent"; readonly messageId: string }
  | { readonly status: "duplicate" }
  | { readonly status: "deferred"; readonly until: Date }
  | { readonly status: "refused"; readonly reason: RefusalReason };

export interface SendSmsDeps {
  readonly db: PhiDb;
  readonly twilio: Pick<Twilio, "sendSms" | "page">;
  readonly env: Pick<PhiEnv, "SMS_DAILY_BUDGET" | "SMS_PER_NUMBER_DAILY" | "PHI_OPS_PAGE_PHONE"> & { readonly PHI_GOOGLE_REVIEW_URL?: string | undefined };
  readonly now: () => Date;
  readonly actor: string;
}

type Prepared =
  | Exclude<SendOutcome, { status: "sent" }>
  | { readonly status: "claimed"; readonly messageId: string; readonly phone: Phi<string>; readonly body: SmsBody }
  | { readonly status: "trip" };

export const idempotencyKey = (p: SendSmsPayload): string => `${p.template}:${p.entityId}:${String(p.step)}`;

export async function runSendSms(deps: SendSmsDeps, payload: SendSmsPayload): Promise<SendOutcome> {
  const prepared = await deps.db.tx(deps.actor, (q) => prepare(deps, q, payload));
  if (prepared.status === "trip") {
    await tripBreaker(deps);
    return { status: "refused", reason: "global_budget" };
  }
  if (prepared.status !== "claimed") return prepared;

  let sid: string;
  try {
    sid = await deps.twilio.sendSms(prepared.phone, prepared.body);
  } catch (error) {
    if (error instanceof VendorHttpError && error.failureClass === "vendor_4xx") {
      try {
        await deps.db.tx(deps.actor, (q) =>
          q.query(`update phi.messages set idempotency_key = null, failed_at = now() where id = $1`, [prepared.messageId]),
        );
      } catch {
        // The claim stays: at most once still holds. The Twilio error is the one reported.
      }
    }
    throw error;
  }
  await deps.db.tx(deps.actor, async (q) => {
    await q.query(`update phi.messages set external_ref = $2 where id = $1`, [prepared.messageId, sid]);
    await auditSend(q, "messages", prepared.messageId);
  });
  return { status: "sent", messageId: prepared.messageId };
}

async function prepare(deps: SendSmsDeps, q: Queryable, payload: SendSmsPayload): Promise<Prepared> {
  const key = idempotencyKey(payload);
  const def = templateDef(payload.template);
  const refused = (reason: RefusalReason): Prepared => ({ status: "refused", reason });

  if ((await q.query(`select 1 from phi.messages where idempotency_key = $1`, [key])).rows.length > 0) return { status: "duplicate" };

  const contact = await getContact(q, payload.contactId);
  if (contact === null) return refused("no_contact");
  if (contact.phone === null) return refused("no_phone");
  if (contact.minorStatus !== "adult" && !(await pendingAdult(q, payload, contact.minorStatus))) return refused("not_adult");
  if (!(await consentFor(q, payload, contact.id))) return refused("no_consent");
  if (!def.beforeVerification && contact.phoneVerifiedAt === null) return refused("phone_unverified");
  if (def.sequence && (await sequencesPaused(q, contact.id))) return refused("sequences_paused");

  if (!def.anyHour) {
    const now = deps.now();
    const window = def.window === "review" ? REVIEW_WINDOW : SMS_WINDOW;
    if (!inWindow(now, window)) return { status: "deferred", until: nextInWindow(now, window) };
    // Held to commit: the count and the claim below are one step for every concurrent run.
    await q.query(`select pg_advisory_xact_lock(hashtext('phi.sms_budget'))`);
    if ((await outboundToday(q, null)) >= deps.env.SMS_DAILY_BUDGET) return { status: "trip" };
    if ((await outboundToday(q, contact.id)) >= deps.env.SMS_PER_NUMBER_DAILY) return refused("number_limit");
    // The age question can go to numbers that never consented (as a reply): its own hourly
    // ceiling keeps it from being a cheap way to make Newpoint text many numbers.
    if (payload.template === "age_check") {
      const { rows } = await q.query<{ n: number }>(
        `select count(*)::int as n from phi.messages where template = 'age_check' and failed_at is null and created_at > now() - interval '1 hour'`,
      );
      if ((rows[0]?.n ?? 0) >= AGE_CHECK_PER_HOUR) return refused("age_check_limit");
    }
  }

  const body = renderTemplate(payload.template, await resolveSlots(q, payload.template, payload.entityId, { reviewUrl: deps.env.PHI_GOOGLE_REVIEW_URL ?? null }));
  const conversationId = await openSmsConversation(q, contact.id);
  const claim = await q.query<{ id: string }>(
    `insert into phi.messages (conversation_id, direction, body, template, idempotency_key)
     values ($1, 'outbound', $2, $3, $4) on conflict (idempotency_key) do nothing returning id`,
    [conversationId, body, payload.template, key],
  );
  const messageId = claim.rows[0]?.id;
  // A concurrent run claimed the same key between our check and our insert.
  if (messageId === undefined) return { status: "duplicate" };
  return { status: "claimed", messageId, phone: contact.phone, body };
}

/**
 * Consent for this send. The verification code is the one exception to "an active consent
 * row": the visitor's consent is held pending on the code's own row until they confirm the
 * code (edge/intake), and a number whose latest event is a STOP gets no code at all, so
 * typing someone else's number into the site can never text them after they opted out.
 */
async function consentFor(q: Queryable, payload: SendSmsPayload, contactId: string): Promise<boolean> {
  if (payload.template === "age_check") {
    // Only ever a direct reply: the entity is an inbound text from this contact in the last
    // 30 minutes, and never after a STOP. One question, in answer to their own message.
    if ((await latestConsent(q, contactId, "sms_transactional")) === "revoked") return false;
    const { rows } = await q.query(
      `select 1 from phi.messages m join phi.conversations c on c.id = m.conversation_id
        where m.id = $1 and m.direction = 'inbound' and c.contact_id = $2 and m.created_at > now() - interval '30 minutes'`,
      [payload.entityId, contactId],
    );
    return rows.length > 0;
  }
  if (payload.template !== "verification_code") return hasActiveConsent(q, contactId, "sms_transactional");
  if ((await latestConsent(q, contactId, "sms_transactional")) === "revoked") return false;
  const pending = await q.query(
    `select 1 from phi.phone_verifications where id = $1 and contact_id = $2 and consent_evidence is not null`,
    [payload.entityId, contactId],
  );
  return pending.rows.length > 0;
}

/**
 * D18 exceptions, both for an UNKNOWN age only (never a known minor):
 *   - the verification code, when the visitor answered "yes" on the form (their answer is
 *     applied once the code proves the number is theirs);
 *   - the age question itself, which is how an unknown age gets answered by text.
 */
async function pendingAdult(q: Queryable, payload: SendSmsPayload, status: "adult" | "minor" | "unknown"): Promise<boolean> {
  if (status !== "unknown") return false;
  if (payload.template === "age_check") return true;
  if (payload.template !== "verification_code") return false;
  const { rows } = await q.query(`select 1 from phi.phone_verifications where id = $1 and age_answer = 'yes'`, [payload.entityId]);
  return rows.length > 0;
}

export const AGE_CHECK_PER_HOUR = 30;

const BUDGET_PAGE = pageText("Newpoint ops: the daily SMS budget was reached. Automated texts are stopped until tomorrow. Check messaging.send-sms.");

/** Pages Koret ops once per practice-local day. The page goes first, so a failed page is retried, not lost. */
async function tripBreaker(deps: SendSmsDeps): Promise<void> {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(deps.now());
  const already = await deps.db.tx(deps.actor, (q) =>
    q.query(`select 1 from ops.page_log where code = 'sms_budget_tripped' and key = $1`, [day]),
  );
  if (already.rows.length > 0) return;
  await deps.twilio.page(deps.env.PHI_OPS_PAGE_PHONE, BUDGET_PAGE);
  await deps.db.tx(deps.actor, (q) =>
    q.query(`insert into ops.page_log (code, key) values ('sms_budget_tripped', $1) on conflict do nothing`, [day]),
  );
}

/** One queue for every patient text, inside Twilio's rate. Keys and budgets are guarded in the database. */
export const smsQueue = queue({ name: "phi-sms", concurrencyLimit: 5 });

const SEND_SMS_ID = "messaging.send-sms";

export const sendSms = phiTask({
  id: SEND_SMS_ID,
  schema: sendSmsPayload,
  queue: smsQueue,
  retry: { maxAttempts: 4, factor: 2, minTimeoutInMs: 5_000, maxTimeoutInMs: 120_000 },
  maxDuration: 120,
  run: async (payload) => {
    const rt = phiRuntime();
    const deps: SendSmsDeps = { db: rt.db, twilio: rt.twilio, env: rt.env, now: () => new Date(), actor: SEND_SMS_ID };
    // A deferral waits for the window and checks everything again (consent may be gone by then).
    for (let round = 0; round < 3; round += 1) {
      const outcome = await runSendSms(deps, payload);
      if (outcome.status !== "deferred") return outcomeSummary(outcome);
      await wait.until({ date: outcome.until });
    }
    return { status: "deferred" as const };
  },
});

/** Run output: status and reason enums only. */
function outcomeSummary(outcome: SendOutcome): { status: SendOutcome["status"]; reason?: RefusalReason } {
  return outcome.status === "refused" ? { status: outcome.status, reason: outcome.reason } : { status: outcome.status };
}
