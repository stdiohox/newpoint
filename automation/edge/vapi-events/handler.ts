/**
 * edge/vapi-events (docs/automation-architecture.md §5.1). Vapi's end-of-call report.
 *
 * Shared secret, then the call id verified against Vapi's API and our assistant. Only the
 * structured outcome (an enum and a flag) is kept: no transcript, no summary, no recording
 * (D13, D16, minimum necessary). The conversation is queued to booking.process-call-report.
 */
import { z } from "zod";
import { boundedText, type EdgeDeps } from "../shared/deps.js";
import { callConversation, secretMatches, verifiedCall, type VapiEdgeConfig } from "../shared/vapi.js";

const OUTCOMES = ["booking_requested", "message_taken", "crisis", "wrong_number", "hung_up", "other"] as const;

const reportSchema = z.object({
  message: z.object({
    type: z.literal("end-of-call-report"),
    call: z.object({ id: z.string().min(1).max(64) }),
    analysis: z
      .object({
        structuredData: z.object({ outcome: z.enum(OUTCOMES).catch("other"), callback_requested: z.boolean().catch(true) }).partial().optional(),
      })
      .optional(),
  }),
});

export function createVapiEvents(config: VapiEdgeConfig, deps: EdgeDeps): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== "POST") return new Response(null, { status: 405 });
    if (!secretMatches(config.secret, request.headers.get("x-vapi-secret"))) return new Response(null, { status: 401 });
    // End-of-call reports can be large (they carry a transcript we do not keep).
    const text = await boundedText(request, 1_048_576);
    if (text === null) return new Response(null, { status: 413 });
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return new Response(null, { status: 400 });
    }
    // Other server messages are acknowledged and ignored.
    if ((body as { message?: { type?: unknown } } | null)?.message?.type !== "end-of-call-report") return new Response(null, { status: 204 });
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) return new Response(null, { status: 400 });

    const call = await verifiedCall(config, parsed.data.message.call.id);
    // Unreachable: 503 so Vapi may retry; ops.reconcile also sweeps calls left open.
    if (call === "unreachable") return new Response(null, { status: 503 });
    if (call === null) return new Response(null, { status: 403 });
    const data = parsed.data.message.analysis?.structuredData;
    // A missing or unreadable outcome means a person looks at it: callback requested.
    const outcome = data?.outcome ?? "other";
    const callback = data?.callback_requested ?? true;

    const conversationId = await deps.db.tx("edge.vapi-events", async (q) => {
      const linked = await callConversation(q, call);
      if (linked === null) return null;
      // A late or replayed report never rewrites a call already processed.
      await q.query(`update phi.conversations set outcome = $2, callback_requested = $3 where id = $1 and closed_at is null`, [
        linked.conversationId,
        outcome,
        callback,
      ]);
      return linked.conversationId;
    });
    if (conversationId !== null) {
      await deps
        .enqueue("booking.process-call-report", { conversationId }, `process-call-report:${conversationId}`)
        .catch(() => undefined);
    }
    return new Response(null, { status: 204 });
  };
}
