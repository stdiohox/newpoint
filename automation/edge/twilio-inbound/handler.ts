/**
 * edge/twilio-inbound (docs/automation-architecture.md §5.1). Twilio's inbound-SMS webhook.
 *
 * - The X-Twilio-Signature is checked against the exact public URL before anything else
 *   is read; a bad or missing signature is 403.
 * - A duplicate MessageSid is dropped (messages.external_ref is unique) and re-queued with
 *   the same idempotency key; a lost enqueue is caught by ops.reconcile.
 * - An unknown number becomes a new contact (age unknown: D18 means staff call back).
 * - The reply is an empty TwiML response: every answer is a template sent by
 *   messaging.send-sms, never inline.
 */
import { verifyTwilioSignature } from "../../src/adapters/messaging/twilio.js";
import type { Queryable } from "../../src/lib/db-phi.js";
import { boundedText, XML, type EdgeDeps } from "../shared/deps.js";

const EMPTY = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>";
const SID = /^(SM|MM)[0-9a-f]{32}$/;
const US = /^\+1[2-9]\d{9}$/;

export interface TwilioInboundConfig {
  readonly authToken: string;
  /** The exact URL Twilio is configured to call, scheme to path, as Twilio signs it. */
  readonly publicUrl: string;
}

export function createTwilioInbound(config: TwilioInboundConfig, deps: EdgeDeps): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== "POST") return new Response(null, { status: 405 });
    const text = await boundedText(request, 16_384);
    if (text === null) return new Response(null, { status: 413 });
    const form = new URLSearchParams(text);
    const params: Record<string, string> = {};
    for (const [key, value] of form) params[key] = value;
    if (!verifyTwilioSignature(config.authToken, config.publicUrl, params, request.headers.get("x-twilio-signature"))) {
      return new Response(null, { status: 403 });
    }

    const sid = params["MessageSid"] ?? "";
    const from = params["From"] ?? "";
    const body = (params["Body"] ?? "").slice(0, 1600);
    // Signed but not a US SMS we can answer (Geo Permissions are US only): accept and drop.
    if (!SID.test(sid) || !US.test(from)) return new Response(EMPTY, { status: 200, headers: XML });

    const messageId = await deps.db.tx("edge.twilio-inbound", (q) => record(q, sid, from, body));
    // Twilio does not retry inbound webhooks, so the row is the record: if queueing fails,
    // ops.reconcile re-queues any inbound message left unhandled (same idempotency key).
    await deps.enqueue("messaging.inbound-sms", { messageId }, `inbound-sms:${messageId}`).catch(() => undefined);
    return new Response(EMPTY, { status: 200, headers: XML });
  };
}

async function record(q: Queryable, sid: string, from: string, body: string): Promise<string> {
  const existing = await q.query<{ id: string }>(`select id from phi.messages where external_ref = $1`, [sid]);
  if (existing.rows[0]) return existing.rows[0].id;

  const contactId = await contactFor(q, from);
  // One open SMS thread per contact (unique partial index): a concurrent insert loses and re-reads.
  const opened = await q.query<{ id: string }>(
    `insert into phi.conversations (contact_id, channel) values ($1, 'sms')
     on conflict (contact_id) where channel = 'sms' and closed_at is null do nothing returning id`,
    [contactId],
  );
  const conversationId =
    opened.rows[0]?.id ??
    (await q.query<{ id: string }>(`select id from phi.conversations where contact_id = $1 and channel = 'sms' and closed_at is null`, [contactId]))
      .rows[0]?.id;
  if (conversationId === undefined) throw new Error("twilio-inbound: no conversation");

  const inserted = await q.query<{ id: string }>(
    `insert into phi.messages (conversation_id, direction, body, external_ref) values ($1, 'inbound', $2, $3)
     on conflict (external_ref) do nothing returning id`,
    [conversationId, body, sid],
  );
  const id = inserted.rows[0]?.id ?? (await q.query<{ id: string }>(`select id from phi.messages where external_ref = $1`, [sid])).rows[0]?.id;
  if (id === undefined) throw new Error("twilio-inbound: no message");
  return id;
}

export async function contactFor(q: Queryable, phone: string): Promise<string> {
  const found = await q.query<{ id: string }>(`select id from phi.contacts where phone_e164 = $1`, [phone]);
  if (found.rows[0]) return found.rows[0].id;
  const created = await q.query<{ id: string }>(
    `insert into phi.contacts (phone_e164) values ($1) on conflict (phone_e164) do nothing returning id`,
    [phone],
  );
  const id = created.rows[0]?.id ?? (await q.query<{ id: string }>(`select id from phi.contacts where phone_e164 = $1`, [phone])).rows[0]?.id;
  if (id === undefined) throw new Error("contactFor: no contact");
  return id;
}
