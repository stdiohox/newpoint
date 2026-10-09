/**
 * What edge/vapi-tools and edge/vapi-events share: the shared-secret check (constant time),
 * verifying the call id against Vapi's API, and the call's contact and conversation. The
 * caller's number always comes from Vapi's record of the call, never from tool arguments
 * the voice model wrote.
 */
import { timingSafeEqual } from "node:crypto";
import type { VapiClient, VerifiedCall } from "../../src/adapters/voice/vapi.js";
import type { Queryable } from "../../src/lib/db-phi.js";
import { contactFor } from "../twilio-inbound/handler.js";
export { crisisEventIdFor } from "../../src/domain/crisis/ids.js";

export interface VapiEdgeConfig {
  /** The server secret configured on the assistant; Vapi sends it as x-vapi-secret. */
  readonly secret: string;
  readonly assistantId: string;
  readonly vapi: VapiClient;
}

export function secretMatches(expected: string, given: string | null): boolean {
  // An unset secret must never match an empty header.
  if (given === null || expected.length < 32) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * A call is trusted only if Vapi knows it and it belongs to our assistant. "unreachable" when
 * Vapi's API fails or is slow: the caller can then be helped (crisis) but nothing is written.
 */
export async function verifiedCall(config: VapiEdgeConfig, callId: string): Promise<VerifiedCall | null | "unreachable"> {
  let call: VerifiedCall | null;
  try {
    call = await config.vapi.getCall(callId);
  } catch {
    return "unreachable";
  }
  return call !== null && call.assistantId === config.assistantId ? call : null;
}


/** The call's conversation (one per call id), creating the contact and conversation if new. */
export async function callConversation(q: Queryable, call: VerifiedCall): Promise<{ contactId: string; conversationId: string } | null> {
  if (call.callerNumber === null) return null; // withheld or non-US caller: nothing to link
  const contactId = await contactFor(q, call.callerNumber);
  const inserted = await q.query<{ id: string }>(
    `insert into phi.conversations (contact_id, channel, external_ref) values ($1, 'voice', $2)
     on conflict (channel, external_ref) where external_ref is not null do nothing returning id`,
    [contactId, call.id],
  );
  const conversationId =
    inserted.rows[0]?.id ??
    (await q.query<{ id: string }>(`select id from phi.conversations where channel = 'voice' and external_ref = $1`, [call.id])).rows[0]?.id;
  if (conversationId === undefined) throw new Error("vapi: no conversation");
  return { contactId, conversationId };
}
