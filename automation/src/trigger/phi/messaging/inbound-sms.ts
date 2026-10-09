/**
 * messaging.inbound-sms (docs/automation-architecture.md §5.1, §5.5, §5.8).
 *
 * Triggered by edge/twilio-inbound with { messageId }. In this order, deterministic
 * before any model:
 *   1. Crisis (domain/crisis/detect.ts). A crisis_events row (one per message), the
 *      clinician page (ops.crisis-page), then the fixed crisis reply, awaited, BEFORE any
 *      opt-out in the same message is recorded, so "stop texting me, I want to end it"
 *      still gets 988 and 911 (healthcare review). send-sms still applies D18 and consent.
 *   2. STOP / HELP. A bare keyword revokes consent at once (Twilio's Advanced Opt-Out sends
 *      the carrier confirmation). A free-text opt-out still goes past the classifier first,
 *      as the second crisis detector ("no more texts, I won't be around"), then revokes.
 *   3. The intent classifier (Haiku 4.5, HIPAA org, no tools, enum only). The model is a
 *      second crisis detector, never the only one. If it fails or is unreachable, a person
 *      gets a ticket; there is no default category.
 * A crisis reply that is refused or fails is recorded on the event for the paged clinician;
 * a failure throws before the intent is written, so the retry sends it.
 *   4. Everything else is a staff ticket and a neutral template reply. Nothing about
 *      symptoms, medication or diagnosis is ever answered by text (§5.5).
 *   5. D18, age at first contact: a texter whose age is unknown is asked once per conversation
 *      "are you 18 or older?" (age_check) in reply to their text; a clear YES or NO reply to
 *      that question sets the age (only ever from unknown). Crisis, STOP and HELP still come
 *      first; an unclear reply leaves the age unknown and is handled as any other message.
 * The message's intent is written last; each step is idempotent, so a retry repeats none.
 */
import { tasks } from "@trigger.dev/sdk";
import type { PhiClaude } from "../../../adapters/llm/anthropic-phi.js";
import type { PhiNotifier } from "../../../adapters/n8n/phi-notify.js";
import { answerUnknownAge, auditRead, openTicket, revokeConsent, type PhiDb } from "../../../lib/db-phi.js";
import type { Logger } from "../../../lib/logger.js";
import { phi } from "../../../lib/phi.js";
import { phiTask } from "../../../lib/task.js";
import { keywordIntent } from "../../../domain/consent/opt-out.js";
import { detectCrisis } from "../../../domain/crisis/detect.js";
import { parseAgeAnswer } from "../../../domain/messaging/age.js";
import { INTENT_SYSTEM, intentSchema, ROUTES, type Intent } from "../../../domain/messaging/intent.js";
import { PHI_PAYLOADS } from "../payloads.js";
import { phiRuntime } from "../runtime.js";
import type { SendSmsPayload } from "./send-sms.js";

export type Handled = "crisis" | "stop" | "help" | "routed" | "unclassified" | "age_answer" | "already_handled" | "no_body";

export interface InboundDeps {
  readonly db: PhiDb;
  readonly classifier: Pick<PhiClaude, "parse">;
  /** Sends a template and waits for the result (the crisis reply must land before an opt-out is recorded). */
  readonly sendNow: (payload: SendSmsPayload) => Promise<"sent" | "duplicate" | "deferred" | "failed" | { readonly reason: string }>;
  /** Queues a template send; idempotent on (template, entity, step). */
  readonly send: (payload: SendSmsPayload) => Promise<void>;
  readonly pageCrisis: (crisisEventId: string) => Promise<void>;
  /** Queues booking.request for a new booking_requests row (Phase 7). */
  readonly startBooking: (bookingRequestId: string) => Promise<void>;
  readonly notifier: PhiNotifier;
  readonly logger: Logger;
  readonly now: () => Date;
  readonly actor: string;
}

interface Loaded {
  readonly contactId: string;
  readonly minorStatus: "adult" | "minor" | "unknown";
  /** An age question already went to this conversation (it is never asked twice). */
  readonly ageAsked: boolean;
  /** This message is a direct reply to that question (the last outbound text, within 24 h). */
  readonly answersAge: boolean;
  readonly conversationId: string;
  readonly body: string | null;
  readonly intent: string | null;
}

export async function runInboundSms(deps: InboundDeps, messageId: string): Promise<{ readonly handled: Handled }> {
  const message = await deps.db.tx(deps.actor, async (q) => {
    const { rows } = await q.query<{
      contact_id: string; conversation_id: string; body: string | null; intent: string | null; minor_status: Loaded["minorStatus"];
      age_asked: boolean; answers_age: boolean;
    }>(
      `select c.contact_id, m.conversation_id, m.body, m.intent, k.minor_status::text as minor_status,
              -- Asked at all in this conversation (so never asked twice) ...
              exists (select 1 from phi.messages a where a.conversation_id = m.conversation_id and a.direction = 'outbound'
                        and a.template = 'age_check' and a.failed_at is null) as age_asked,
              -- ... and THIS message answers it: the last outbound text before it was the question,
              -- sent within the previous 24 hours.
              coalesce((select a.template = 'age_check' and a.created_at > m.created_at - interval '24 hours'
                          from phi.messages a
                         where a.conversation_id = m.conversation_id and a.direction = 'outbound' and a.failed_at is null
                           and a.created_at < m.created_at
                         order by a.created_at desc limit 1), false) as answers_age
         from phi.messages m join phi.conversations c on c.id = m.conversation_id join phi.contacts k on k.id = c.contact_id
        where m.id = $1 and m.direction = 'inbound'`,
      [messageId],
    );
    const row = rows[0];
    if (row === undefined) return null;
    await auditRead(q, "messages", messageId);
    return {
      contactId: row.contact_id,
      conversationId: row.conversation_id,
      body: row.body,
      intent: row.intent,
      minorStatus: row.minor_status,
      ageAsked: row.age_asked,
      answersAge: row.answers_age,
    } satisfies Loaded;
  });
  if (message === null) return { handled: "no_body" };
  if (message.intent !== null) return { handled: "already_handled" };
  if (message.body === null || message.body.trim() === "") {
    await setIntent(deps, messageId, "empty");
    return { handled: "no_body" };
  }
  const body = message.body;
  const keyword = keywordIntent(body);

  // 1. Crisis, deterministic.
  if (detectCrisis(body)) {
    await handleCrisis(deps, messageId, message, "keyword");
    if (keyword === "stop") await optOut(deps, message.contactId, messageId, body);
    await setIntent(deps, messageId, "crisis");
    return { handled: "crisis" };
  }

  // 2. STOP / HELP. Only a bare keyword skips the model.
  if (keyword === "stop" && isBareKeyword(body)) {
    await optOut(deps, message.contactId, messageId, body);
    await setIntent(deps, messageId, "stop");
    return { handled: "stop" };
  }
  if (keyword === "help") {
    await deps.send({ template: "help", contactId: message.contactId, entityId: messageId, step: 0 });
    await askAge(deps, message, messageId);
    await setIntent(deps, messageId, "help");
    return { handled: "help" };
  }

  // D18: a clear answer to the age question this conversation was asked.
  if (message.minorStatus === "unknown" && message.answersAge) {
    const answer = parseAgeAnswer(body);
    if (answer !== null) {
      // One transaction: the age, the staff callback for a "no", and "this message is handled"
      // commit together, so a retry never re-reads the reply as a fresh request.
      const opened = await deps.db.tx(deps.actor, async (q) => {
        await answerUnknownAge(q, message.contactId, answer === "yes" ? "adult" : "minor", "sms");
        // Under 18: no automated texts, so a person must call them back.
        const ticketOpened =
          answer === "no" && (await openTicket(q, { contactId: message.contactId, kind: "callback", sourceKind: "message", sourceId: messageId }));
        await q.query(`update phi.messages set intent = 'age_answer' where id = $1 and intent is null`, [messageId]);
        return ticketOpened;
      });
      if (opened) await deps.notifier.actionRequired(deps.now()).catch(() => undefined);
      return { handled: "age_answer" };
    }
  }

  // 3. The classifier: enum only.
  const result = await deps.classifier.parse({ route: "intent", system: INTENT_SYSTEM, untrusted: phi(body), schema: intentSchema, maxTokens: 64 });
  if (result.ok && result.value.intent === "crisis") {
    await handleCrisis(deps, messageId, message, "llm");
    if (keyword === "stop") await optOut(deps, message.contactId, messageId, body);
    await setIntent(deps, messageId, "crisis");
    return { handled: "crisis" };
  }
  // A free-text opt-out the model did not flag as crisis: honoured whatever else it says.
  if (keyword === "stop") {
    await optOut(deps, message.contactId, messageId, body);
    await setIntent(deps, messageId, "stop");
    return { handled: "stop" };
  }
  if (!result.ok) {
    await ticket(deps, message.contactId, "message", messageId);
    await askAge(deps, message, messageId);
    await setIntent(deps, messageId, "unclassified");
    return { handled: "unclassified" };
  }
  const intent: Intent = result.value.intent;
  if (intent === "crisis") return { handled: "crisis" }; // handled above; narrows the type
  if (intent === "stop") {
    await optOut(deps, message.contactId, messageId, body);
    await setIntent(deps, messageId, "stop");
    return { handled: "stop" };
  }
  if (intent === "help") {
    await deps.send({ template: "help", contactId: message.contactId, entityId: messageId, step: 0 });
    await askAge(deps, message, messageId);
    await setIntent(deps, messageId, "help");
    return { handled: "help" };
  }

  // 4a. A booking request goes to booking.request, which decides (D1, D18, D19) and replies.
  if (intent === "book") {
    const bookingRequestId = await deps.db.tx(deps.actor, async (q) => {
      const inserted = await q.query<{ id: string }>(
        `insert into phi.booking_requests (contact_id, source_message_id) values ($1, $2)
         on conflict (source_message_id) do nothing returning id`,
        [message.contactId, messageId],
      );
      return (
        inserted.rows[0]?.id ??
        (await q.query<{ id: string }>(`select id from phi.booking_requests where source_message_id = $1`, [messageId])).rows[0]?.id
      );
    });
    if (bookingRequestId === undefined) throw new Error("inbound-sms: no booking request");
    await deps.startBooking(bookingRequestId);
    await askAge(deps, message, messageId);
    await setIntent(deps, messageId, intent);
    return { handled: "routed" };
  }

  // 4b. A person handles it; the patient gets a neutral acknowledgment.
  const route = ROUTES[intent];
  await ticket(deps, message.contactId, route.ticket, messageId);
  await deps.send({ template: route.reply, contactId: message.contactId, entityId: messageId, step: 0 });
  await askAge(deps, message, messageId);
  await setIntent(deps, messageId, intent);
  return { handled: "routed" };
}

/** D18: ask an unknown-age texter once per conversation, in reply to this message. */
async function askAge(deps: InboundDeps, message: Loaded, messageId: string): Promise<void> {
  if (message.minorStatus !== "unknown" || message.ageAsked) return;
  await deps.send({ template: "age_check", contactId: message.contactId, entityId: messageId, step: 0 });
}

async function handleCrisis(deps: InboundDeps, messageId: string, message: Loaded, detectedBy: "keyword" | "llm"): Promise<void> {
  const eventId = await deps.db.tx(deps.actor, async (q) => {
    const inserted = await q.query<{ id: string }>(
      `insert into phi.crisis_events (contact_id, channel, conversation_id, detected_by, message_id)
       values ($1, 'sms', $2, $3, $4) on conflict (message_id) do nothing returning id`,
      [message.contactId, message.conversationId, detectedBy, messageId],
    );
    return (
      inserted.rows[0]?.id ??
      (await q.query<{ id: string }>(`select id from phi.crisis_events where message_id = $1`, [messageId])).rows[0]?.id
    );
  });
  if (eventId === undefined) throw new Error("inbound-sms: no crisis event");
  // The page first: a clinician is reached whatever happens to the reply.
  await deps.pageCrisis(eventId);
  const sent = await deps.sendNow({ template: "crisis_response", contactId: message.contactId, entityId: eventId, step: 0 });
  const status = typeof sent === "string" ? sent : `refused_${sent.reason}`;
  await deps.db.tx(deps.actor, (q) =>
    q.query(
      `update phi.crisis_events set auto_response_status = $2,
              auto_response_sent_at = case when $2 in ('sent', 'duplicate') then coalesce(auto_response_sent_at, now()) else auto_response_sent_at end
        where id = $1`,
      [eventId, status],
    ),
  );
  // A transport failure is retried (the intent is not yet written); a refusal is a decision, recorded above.
  if (sent === "failed") throw new Error("inbound-sms: crisis reply failed");
}

const BARE = /^\s*(stop|stopall|unsubscribe|cancel|end|quit|revoke|optout|opt[ -]out)\s*[.!]*\s*$/i;
const isBareKeyword = (body: string): boolean => BARE.test(body);

async function optOut(deps: InboundDeps, contactId: string, messageId: string, body: string): Promise<void> {
  // A STOP ends every kind of text, the review request included: a later SMS re-consent must
  // not quietly revive an old review consent.
  const source = isBareKeyword(body) ? "sms_keyword" : "sms_free_text";
  await deps.db.tx(deps.actor, async (q) => {
    await revokeConsent(q, contactId, "sms_transactional", source, { message_id: messageId });
    await revokeConsent(q, contactId, "review_requests", source, { message_id: messageId });
  });
}

async function ticket(deps: InboundDeps, contactId: string, kind: "callback" | "message" | "booking", messageId: string): Promise<void> {
  const opened = await deps.db.tx(deps.actor, (q) => openTicket(q, { contactId, kind, sourceKind: "message", sourceId: messageId }));
  // Best effort: the ticket is the record and the console shows it; n8n's email is a nudge.
  if (opened) {
    await deps.notifier.actionRequired(deps.now()).catch((error: unknown) => {
      deps.logger.error("inbound_sms.notify_failed", error);
    });
  }
}

async function setIntent(deps: InboundDeps, messageId: string, intent: string): Promise<void> {
  await deps.db.tx(deps.actor, (q) => q.query(`update phi.messages set intent = $2 where id = $1 and intent is null`, [messageId, intent]));
}

const ID = "messaging.inbound-sms";

export const inboundSms = phiTask({
  id: ID,
  schema: PHI_PAYLOADS["messaging.inbound-sms"],
  retry: { maxAttempts: 4, factor: 2, minTimeoutInMs: 2_000, maxTimeoutInMs: 30_000 },
  maxDuration: 120,
  run: async ({ messageId }) => {
    const rt = phiRuntime();
    const deps: InboundDeps = {
      db: rt.db,
      classifier: rt.claude,
      sendNow: async (payload) => {
        const run = await tasks.triggerAndWait<typeof import("./send-sms.js").sendSms>("messaging.send-sms", payload, {
          idempotencyKey: `send-sms:${payload.template}:${payload.entityId}:${String(payload.step)}`,
        });
        if (!run.ok) return "failed";
        return run.output.status === "refused" ? { reason: run.output.reason ?? "unknown" } : run.output.status;
      },
      send: async (payload) => {
        await tasks.trigger<typeof import("./send-sms.js").sendSms>("messaging.send-sms", payload, {
          idempotencyKey: `send-sms:${payload.template}:${payload.entityId}:${String(payload.step)}`,
        });
      },
      pageCrisis: async (crisisEventId) => {
        await tasks.trigger<typeof import("../ops/crisis-page.js").crisisPage>("ops.crisis-page", { crisisEventId }, {
          idempotencyKey: `crisis-page:${crisisEventId}`,
        });
      },
      startBooking: async (bookingRequestId) => {
        await tasks.trigger<typeof import("../booking/request.js").bookingRequest>("booking.request", { bookingRequestId }, {
          idempotencyKey: `booking-request:${bookingRequestId}`,
        });
      },
      notifier: rt.notifier,
      logger: rt.logger,
      now: () => new Date(),
      actor: ID,
    };
    return runInboundSms(deps, messageId);
  },
});
