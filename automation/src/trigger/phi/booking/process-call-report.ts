/**
 * booking.process-call-report (docs/automation-architecture.md §5.1). One voice call,
 * after edge/vapi-events recorded its outcome (or after ops.reconcile found a call whose
 * report never came).
 *
 * - A booking request made on the call → booking.request (idempotent key).
 * - A message taken on the call → a callback ticket.
 * - Callback requested, or an outcome we cannot act on automatically → a callback ticket.
 * - A voice crisis → the page is (re)queued; the clinician's console ticket follows the ack.
 *   If Vapi's analysis says "crisis" but the call raised no event (the caller declined the
 *   transfer, or the tool never ran), the event is raised here and paged: a crisis call never
 *   becomes an ordinary callback.
 * - The conversation is closed. Nothing about what was said is stored.
 */
import { tasks } from "@trigger.dev/sdk";
import type { PhiNotifier } from "../../../adapters/n8n/phi-notify.js";
import { auditRead, openTicket, type PhiDb } from "../../../lib/db-phi.js";
import { phiTask } from "../../../lib/task.js";
import { crisisEventIdFor } from "../../../domain/crisis/ids.js";
import { PHI_PAYLOADS } from "../payloads.js";
import { phiRuntime } from "../runtime.js";

export interface CallReportDeps {
  readonly db: PhiDb;
  readonly startBooking: (bookingRequestId: string) => Promise<void>;
  readonly pageCrisis: (crisisEventId: string) => Promise<void>;
  readonly notifier: PhiNotifier;
  readonly actor: string;
}

export interface CallReportResult {
  readonly bookingRequests: number;
  readonly tickets: number;
  readonly crisis: boolean;
}

export async function runProcessCallReport(deps: CallReportDeps, conversationId: string): Promise<CallReportResult | { readonly missing: true }> {
  const found = await deps.db.tx(deps.actor, async (q) => {
    const { rows } = await q.query<{ contact_id: string; external_ref: string | null; outcome: string | null; callback_requested: boolean | null }>(
      `select contact_id, external_ref, outcome, callback_requested from phi.conversations where id = $1 and channel = 'voice'`,
      [conversationId],
    );
    const row = rows[0];
    if (row === undefined || row.external_ref === null) return null;
    await auditRead(q, "conversations", conversationId);
    // source_ref is "<call id>:<tool call id>"; call ids are [A-Za-z0-9_-], so the prefix match is exact.
    const bookings = await q.query<{ id: string }>(`select id from phi.booking_requests where starts_with(source_ref, $1 || ':')`, [row.external_ref]);
    const inquiries = await q.query<{ id: string }>(`select id from phi.inquiries where starts_with(source_ref, $1 || ':')`, [row.external_ref]);
    const crises = await q.query<{ id: string }>(
      `select id from phi.crisis_events where conversation_id = $1 and channel = 'voice' and staff_ack_at is null`,
      [conversationId],
    );
    return { ...row, bookings: bookings.rows.map((r) => r.id), inquiries: inquiries.rows.map((r) => r.id), crises: crises.rows.map((r) => r.id) };
  });
  if (found === null) return { missing: true };

  if (found.outcome === "crisis" && found.crises.length === 0 && found.external_ref !== null) {
    const eventId = crisisEventIdFor(found.external_ref);
    await deps.db.tx(deps.actor, (q) =>
      q.query(
        `insert into phi.crisis_events (id, contact_id, channel, conversation_id, detected_by, call_ref)
         values ($1, $2, 'voice', $3, 'voice', $4) on conflict do nothing`,
        [eventId, found.contact_id, conversationId, found.external_ref],
      ),
    );
    // An event that existed but was already acknowledged is not re-paged.
    const open = await deps.db.tx(deps.actor, (q) => q.query(`select 1 from phi.crisis_events where id = $1 and staff_ack_at is null`, [eventId]));
    if (open.rows.length > 0) found.crises.push(eventId);
  }

  for (const id of found.crises) await deps.pageCrisis(id);
  for (const id of found.bookings) await deps.startBooking(id);

  let opened = 0;
  await deps.db.tx(deps.actor, async (q) => {
    for (const id of found.inquiries) {
      if (await openTicket(q, { contactId: found.contact_id, kind: "callback", sourceKind: "inquiry", sourceId: id })) opened += 1;
    }
    // Anything the call did not turn into a request or a message still reaches a person, unless
    // it is a clean "wrong number" or hang-up with no callback asked for. A report that never
    // arrived (outcome null) is treated as "call them back".
    const handled = found.bookings.length > 0 || found.inquiries.length > 0 || found.crises.length > 0;
    const quiet = (found.outcome === "wrong_number" || found.outcome === "hung_up") && found.callback_requested === false;
    if (!handled && !quiet) {
      if (await openTicket(q, { contactId: found.contact_id, kind: "callback", sourceKind: "conversation", sourceId: conversationId })) opened += 1;
    }
    await q.query(`update phi.conversations set closed_at = coalesce(closed_at, now()) where id = $1`, [conversationId]);
  });
  if (opened > 0) await deps.notifier.actionRequired(new Date()).catch(() => undefined);
  return { bookingRequests: found.bookings.length, tickets: opened, crisis: found.crises.length > 0 };
}

const ID = "booking.process-call-report";

export const processCallReport = phiTask({
  id: ID,
  schema: PHI_PAYLOADS["booking.process-call-report"],
  retry: { maxAttempts: 4, factor: 2, minTimeoutInMs: 5_000, maxTimeoutInMs: 60_000 },
  maxDuration: 120,
  run: async ({ conversationId }) => {
    const rt = phiRuntime();
    return runProcessCallReport(
      {
        db: rt.db,
        notifier: rt.notifier,
        actor: ID,
        startBooking: async (bookingRequestId) => {
          await tasks.trigger("booking.request", { bookingRequestId }, { idempotencyKey: `booking-request:${bookingRequestId}` });
        },
        pageCrisis: async (crisisEventId) => {
          await tasks.trigger("ops.crisis-page", { crisisEventId }, { idempotencyKey: `crisis-page:${crisisEventId}` });
        },
      },
      conversationId,
    );
  },
});
