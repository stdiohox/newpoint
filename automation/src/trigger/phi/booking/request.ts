/**
 * booking.request (docs/automation-architecture.md §5.1). One booking_requests row (from
 * SMS now; voice in Phase 8) → the slot policy → an adapter → a staff callback ticket or a
 * Headway handoff → a template text through send-sms.
 *
 * D1 conservative default: only manual-queue and headway-handoff. A handoff happens only
 * when the policy leaves exactly one eligible provider and that provider's Headway page is
 * recorded; everything else is a person (callback). D18 and D19 are policy callbacks.
 * Idempotent: the request is decided once (status pending → final, conditionally), the
 * ticket is unique per request, and the text has its own idempotency key.
 */
import { tasks } from "@trigger.dev/sdk";
import type { PhiNotifier } from "../../../adapters/n8n/phi-notify.js";
import type { BookingCommand, SchedulingAdapter } from "../../../adapters/scheduling/SchedulingAdapter.js";
import { auditRead, type PhiDb } from "../../../lib/db-phi.js";
import { phi } from "../../../lib/phi.js";
import { phiTask } from "../../../lib/task.js";
import type { Modality } from "../../../domain/scheduling/providers.js";
import { slotPolicy, type Service } from "../../../domain/scheduling/slot-policy.js";
import type { SendSmsPayload } from "../messaging/send-sms.js";
import { PHI_PAYLOADS } from "../payloads.js";
import { phiRuntime } from "../runtime.js";

export interface BookingDeps {
  readonly db: PhiDb;
  readonly manual: SchedulingAdapter;
  /** null when headway-handoff is not enabled. */
  readonly headway: SchedulingAdapter | null;
  readonly send: (payload: SendSmsPayload) => Promise<void>;
  readonly notifier: PhiNotifier;
  readonly actor: string;
}

export type BookingResult = "handed_off" | "callback" | "booked" | "already_handled" | "missing";

interface Loaded {
  readonly contactId: string;
  readonly status: string;
  readonly minorStatus: "adult" | "minor" | "unknown";
  readonly state: string | null;
  readonly modality: Modality | null;
  readonly service: Service;
  readonly newPatient: boolean | null;
  readonly providerPref: string | null;
}

export async function runBookingRequest(deps: BookingDeps, bookingRequestId: string): Promise<{ readonly result: BookingResult }> {
  const loaded = await deps.db.tx(deps.actor, async (q) => {
    const { rows } = await q.query<{
      contact_id: string; status: string; minor_status: Loaded["minorStatus"]; state: string | null; requested_state: string | null;
      requested_modality: Modality | null; service: Service; new_patient: boolean | null; provider_pref: string | null;
    }>(
      `select r.contact_id, r.status::text as status, c.minor_status::text as minor_status, c.state, r.requested_state,
              r.requested_modality::text as requested_modality, r.service, r.new_patient, r.provider_pref
         from phi.booking_requests r join phi.contacts c on c.id = r.contact_id where r.id = $1`,
      [bookingRequestId],
    );
    const row = rows[0];
    if (row === undefined) return null;
    await auditRead(q, "booking_requests", bookingRequestId);
    return {
      contactId: row.contact_id,
      status: row.status,
      minorStatus: row.minor_status,
      state: row.requested_state ?? row.state,
      modality: row.requested_modality,
      service: row.service,
      newPatient: row.new_patient,
      providerPref: row.provider_pref,
    } satisfies Loaded;
  });
  if (loaded === null) return { result: "missing" };
  if (loaded.status !== "pending") {
    // The decision committed but the text may not have been queued (a failed attempt): queue it
    // again. send-sms's idempotency key makes this a no-op when it already went.
    if (loaded.status === "handed_off") await deps.send({ template: "booking_handoff", contactId: loaded.contactId, entityId: bookingRequestId, step: 0 });
    if (loaded.status === "callback") await deps.send({ template: "booking_callback", contactId: loaded.contactId, entityId: bookingRequestId, step: 0 });
    return { result: "already_handled" };
  }

  const policy = slotPolicy({
    minorStatus: loaded.minorStatus,
    state: loaded.state,
    modality: loaded.modality,
    service: loaded.service,
    newPatient: loaded.newPatient,
    providerPref: loaded.providerPref,
  });

  // A handoff only for an ESTABLISHED patient asking for a concrete modality, with exactly one
  // eligible provider whose page is recorded: Headway's page lets the patient pick any visit
  // type, so a new patient (who must start with the assessment) is always a person's job.
  if (
    policy.kind === "eligible" &&
    deps.headway !== null &&
    policy.providers.length === 1 &&
    loaded.newPatient === false &&
    loaded.modality !== null
  ) {
    const command: BookingCommand = {
      bookingRequestId,
      contactId: loaded.contactId,
      providers: policy.providers.map((p) => p.id),
      state: policy.state,
      modality: loaded.modality,
      slot: null,
    };
    const outcome = await deps.headway.book(phi(command));
    if (outcome.ok && outcome.value.kind === "handoff") {
      await decide(deps, bookingRequestId, "handed_off", "headway-handoff", { kind: "handoff", url: outcome.value.url }, null);
      await deps.send({ template: "booking_handoff", contactId: loaded.contactId, entityId: bookingRequestId, step: 0 });
      return { result: "handed_off" };
    }
  }

  // Everything else is a person: the manual queue's ticket (through the adapter boundary).
  const reason = policy.kind === "callback" ? policy.reason : "manual_queue";
  const queued = await deps.manual.book(
    phi({ bookingRequestId, contactId: loaded.contactId, providers: [], state: "NJ", modality: loaded.modality, slot: null }),
  );
  if (!queued.ok || queued.value.kind !== "callback") throw new Error("booking.request: manual queue failed");
  const decided = await decide(deps, bookingRequestId, "callback", "manual-queue", { kind: "callback", ticket_id: queued.value.ticketId }, reason);
  if (decided) await deps.notifier.actionRequired(new Date()).catch(() => undefined);
  await deps.send({ template: "booking_callback", contactId: loaded.contactId, entityId: bookingRequestId, step: 0 });
  return { result: "callback" };
}

async function decide(
  deps: BookingDeps,
  id: string,
  status: "handed_off" | "callback",
  adapter: string,
  result: object,
  reason: string | null,
): Promise<boolean> {
  const updated = await deps.db.tx(deps.actor, (q) =>
    q.query(
      `update phi.booking_requests set status = $2, adapter = $3, adapter_result = $4, callback_reason = $5 where id = $1 and status = 'pending'`,
      [id, status, adapter, JSON.stringify(result), reason],
    ),
  );
  return (updated.rowCount ?? 0) === 1;
}

const ID = "booking.request";

export const bookingRequest = phiTask({
  id: ID,
  schema: PHI_PAYLOADS["booking.request"],
  retry: { maxAttempts: 4, factor: 2, minTimeoutInMs: 5_000, maxTimeoutInMs: 60_000 },
  maxDuration: 120,
  run: async ({ bookingRequestId }) => {
    const rt = phiRuntime();
    return runBookingRequest(
      {
        db: rt.db,
        manual: rt.scheduling.manual,
        headway: rt.scheduling.headway,
        notifier: rt.notifier,
        actor: ID,
        send: async (payload) => {
          await tasks.trigger("messaging.send-sms", payload, {
            idempotencyKey: `send-sms:${payload.template}:${payload.entityId}:${String(payload.step)}`,
          });
        },
      },
      bookingRequestId,
    );
  },
});
