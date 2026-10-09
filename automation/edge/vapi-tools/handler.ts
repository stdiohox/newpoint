/**
 * edge/vapi-tools (docs/automation-architecture.md §5.1, §5.8). Vapi's tool-call webhook.
 *
 * - The shared secret is checked in constant time, then the call id is verified against
 *   Vapi's API (and our assistant id) before ANY write.
 * - Arguments are zod-validated enums: the voice model cannot write free text into a row.
 * - Writes create requests only. A caller cannot cancel or change an appointment by voice.
 * - Synchronous, < 800 ms: rows are written and work is queued; nothing slow runs here.
 * - crisis_transfer records a voice crisis event and queues the clinician page FIRST; the
 *   assistant's transferCall tool then sends the caller to the D15 destination.
 */
import { z } from "zod";
import { boundedText, type EdgeDeps } from "../shared/deps.js";
import { callConversation, crisisEventIdFor, secretMatches, verifiedCall, type VapiEdgeConfig } from "../shared/vapi.js";

const toolCallsSchema = z.object({
  message: z.object({
    type: z.literal("tool-calls"),
    call: z.object({ id: z.string().min(1).max(64) }),
    toolCallList: z
      .array(
        z.object({
          id: z.string().min(1).max(128),
          function: z.object({ name: z.string().max(64), arguments: z.union([z.record(z.string(), z.unknown()), z.string()]) }),
        }),
      )
      .max(5),
  }),
});

const bookingArgs = z
  .object({
    state: z.enum(["NJ", "PA", "other", "unknown"]),
    modality: z.enum(["in_person", "telehealth", "either"]),
    seen_before: z.enum(["yes", "no", "unknown"]),
    preferred_windows: z.array(z.enum(["weekday_morning", "weekday_afternoon", "weekday_evening", "weekend"])).max(4).optional(),
  })
  .strict();
const messageArgs = z.object({ reason: z.enum(["appointment_change", "billing", "language_help", "other"]) }).strict();
const emptyArgs = z.object({}).strict();

const REASON = { appointment_change: "existing_patient", billing: "billing_insurance", language_help: "other", other: "other" } as const;

/** Every answer is a fixed sentence: the voice model never reads back stored data. */
export const REPLIES = {
  availability: "I can't see the calendar, but I can pass your request to the team and they'll get back to you with a time.",
  booked: "Thanks. I've passed your request to the team. They'll be in touch by text or phone to confirm a time.",
  message: "Thanks. I've asked the team to call you back.",
  crisis: "I've alerted our on-call clinician. I'm going to transfer you to 988 now. If you are in immediate danger, call 911.",
  noCaller: "I can't take that request on this line because your number isn't available. Please call back from a phone that shows its number, or call 911 or 988 if you need help now.",
  invalid: "Sorry, I didn't catch that. Could you say it again?",
  unavailable: "Sorry, I can't pass that on right now. Please call back shortly, or call 911 or 988 if you need help now.",
} as const;

export function createVapiTools(config: VapiEdgeConfig, deps: EdgeDeps): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== "POST") return new Response(null, { status: 405 });
    if (!secretMatches(config.secret, request.headers.get("x-vapi-secret"))) return new Response(null, { status: 401 });
    const text = await boundedText(request, 32_768);
    if (text === null) return new Response(null, { status: 413 });
    let parsed;
    try {
      parsed = toolCallsSchema.safeParse(JSON.parse(text));
    } catch {
      return new Response(null, { status: 400 });
    }
    if (!parsed.success) return new Response(null, { status: 400 });
    const { call: callRef, toolCallList } = parsed.data.message;

    const call = await verifiedCall(config, callRef.id);
    // Vapi's API down or slow: write nothing, but a caller in crisis still hears 988 / 911 and is transferred.
    if (call === "unreachable") {
      return Response.json(
        { results: toolCallList.map((t) => ({ toolCallId: t.id, result: t.function.name === "crisis_transfer" ? REPLIES.crisis : REPLIES.unavailable })) },
        { headers: { "cache-control": "no-store" } },
      );
    }
    if (call === null || call.status === "ended") {
      // Not a verified live call: write nothing. A crisis_transfer still gets the 988 / 911 words
      // (harmless to a forger, vital if verification is wrong); anything else is refused.
      if (!toolCallList.some((t) => t.function.name === "crisis_transfer")) return new Response(null, { status: 403 });
      return Response.json(
        { results: toolCallList.map((t) => ({ toolCallId: t.id, result: t.function.name === "crisis_transfer" ? REPLIES.crisis : REPLIES.unavailable })) },
        { headers: { "cache-control": "no-store" } },
      );
    }

    const results: { toolCallId: string; result: string }[] = [];
    for (const toolCall of toolCallList) {
      const args = typeof toolCall.function.arguments === "string" ? safeJson(toolCall.function.arguments) : toolCall.function.arguments;
      // One failing tool never takes the others down, and crisis_transfer ALWAYS answers with the
      // 988 / 911 instruction and the transfer, whatever happened to the database write.
      const result = await runTool(deps, call, toolCall.id, toolCall.function.name, args).catch(() =>
        toolCall.function.name === "crisis_transfer" ? REPLIES.crisis : REPLIES.unavailable,
      );
      results.push({ toolCallId: toolCall.id, result });
    }
    return Response.json({ results }, { headers: { "cache-control": "no-store" } });
  };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function runTool(deps: EdgeDeps, call: Parameters<typeof callConversation>[1], toolCallId: string, name: string, raw: unknown): Promise<string> {
  // One row per tool call (a second request in the same call is its own request); a retried
  // delivery of the same tool call adds nothing.
  const sourceRef = `${call.id}:${toolCallId}`.slice(0, 200);
  switch (name) {
    case "check_availability":
      return REPLIES.availability;

    case "crisis_transfer": {
      if (!emptyArgs.safeParse(raw ?? {}).success) return REPLIES.crisis;
      // A withheld number still raises the event and the page: the clinician is told even when
      // nobody knows who called (the console shows it as a call with no number).
      const linked = await deps.db.tx("edge.vapi-tools", (q) => callConversation(q, call));
      const eventId = crisisEventIdFor(call.id);
      // A plain insert, not ON CONFLICT: the edge role may not read crisis_events, not even the
      // conflict columns. A unique violation means this call already raised it; the page is
      // queued again either way, under the same key, so a lost first enqueue is not final.
      await deps.db
        .tx("edge.vapi-tools", (q) =>
          q.query(
            `insert into phi.crisis_events (id, contact_id, channel, conversation_id, detected_by, call_ref) values ($1, $2, 'voice', $3, 'voice', $4)`,
            [eventId, linked?.contactId ?? null, linked?.conversationId ?? null, call.id],
          ),
        )
        .catch((error: unknown) => {
          if ((error as { code?: unknown }).code !== "23505") throw error;
        });
      await deps.enqueue("ops.crisis-page", { crisisEventId: eventId }, `crisis-page:${eventId}`).catch(() => undefined);
      return REPLIES.crisis;
    }

    case "request_booking": {
      const args = bookingArgs.safeParse(raw);
      if (!args.success) return REPLIES.invalid;
      const linked = await deps.db.tx("edge.vapi-tools", (q) => callConversation(q, call));
      if (linked === null) return REPLIES.noCaller;
      const a = args.data;
      const id = await deps.db.tx("edge.vapi-tools", async (q) => {
        const inserted = await q.query<{ id: string }>(
          `insert into phi.booking_requests (contact_id, requested_state, requested_modality, new_patient, preferred_windows, source_ref)
           values ($1, $2, $3, $4, $5, $6) on conflict (source_ref) do nothing returning id`,
          [
            linked.contactId,
            a.state === "NJ" || a.state === "PA" ? a.state : null,
            a.modality === "either" ? null : a.modality,
            a.seen_before === "unknown" ? null : a.seen_before === "no",
            JSON.stringify(a.preferred_windows ?? []),
            sourceRef,
          ],
        );
        return inserted.rows[0]?.id ?? (await q.query<{ id: string }>(`select id from phi.booking_requests where source_ref = $1`, [sourceRef])).rows[0]?.id;
      });
      if (id !== undefined) await deps.enqueue("booking.request", { bookingRequestId: id }, `booking-request:${id}`).catch(() => undefined);
      return REPLIES.booked;
    }

    case "take_message": {
      const args = messageArgs.safeParse(raw);
      if (!args.success) return REPLIES.invalid;
      const linked = await deps.db.tx("edge.vapi-tools", (q) => callConversation(q, call));
      if (linked === null) return REPLIES.noCaller;
      await deps.db.tx("edge.vapi-tools", (q) =>
        q.query(
          `insert into phi.inquiries (contact_id, source, reason, source_ref) values ($1, 'voice', $2, $3) on conflict (source_ref) do nothing`,
          [linked.contactId, REASON[args.data.reason], sourceRef],
        ),
      );
      // The callback ticket is opened by booking.process-call-report at the end of the call.
      return REPLIES.message;
    }

    default:
      return REPLIES.invalid;
  }
}
