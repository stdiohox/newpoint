/**
 * The D1 boundary (docs/automation-architecture.md §5.1). Every scheduling system the
 * practice might use sits behind this interface; booking rules live in
 * domain/scheduling/slot-policy.ts and hold for all of them. Phase 7 ships two
 * implementations (D1 conservative default): manual-queue and headway-handoff.
 */
import type { Phi } from "../../lib/phi.js";
import type { Modality, ProviderId, State } from "../../domain/scheduling/providers.js";

export type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export interface AdapterError {
  readonly code: "unsupported" | "no_booking_page" | "vendor_unavailable" | "rejected";
}

export interface DateRange {
  readonly from: Date;
  readonly to: Date;
}

export interface AvailabilityQuery {
  readonly providers: readonly ProviderId[];
  readonly state: State;
  readonly modality: Modality | null;
  readonly range: DateRange;
}

export interface Slot {
  readonly providerId: ProviderId;
  readonly startsAt: Date;
  readonly modality: Modality;
}

export interface BookingCommand {
  readonly bookingRequestId: string;
  readonly contactId: string;
  readonly providers: readonly ProviderId[];
  readonly state: State;
  readonly modality: Modality | null;
  readonly slot: Slot | null;
}

export interface AppointmentRef {
  readonly adapter: string;
  readonly externalRef: string;
}

export interface AppointmentRecord {
  readonly externalRef: string;
  readonly providerId: ProviderId;
  readonly startsAt: Date;
  readonly modality: Modality | null;
  readonly status: "scheduled" | "completed" | "cancelled" | "no_show";
  /** The adapter's own patient reference, matched to a contact by the sync. */
  readonly patientRef: string;
}

export type BookingOutcome =
  | { readonly kind: "booked"; readonly appointment: AppointmentRef }
  | { readonly kind: "handoff"; readonly url: string } // generic provider booking page; never prefilled with contact data
  | { readonly kind: "callback"; readonly ticketId: string }; // staff completes it

export interface SchedulingAdapter {
  readonly id: "manual-queue" | "headway-handoff" | (string & {});
  readonly capabilities: { readonly readAvailability: boolean; readonly writeBooking: boolean; readonly webhooks: boolean };
  getAvailability(q: AvailabilityQuery): Promise<Result<Slot[], AdapterError>>;
  book(req: Phi<BookingCommand>): Promise<Result<BookingOutcome, AdapterError>>;
  cancel(ref: AppointmentRef): Promise<Result<void, AdapterError>>;
  listAppointments(window: DateRange): Promise<Result<Phi<AppointmentRecord>[], AdapterError>>;
}
