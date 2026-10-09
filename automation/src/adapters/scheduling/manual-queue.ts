/**
 * manual-queue (§5.1, ships first, works with any system). The agent has already
 * collected the request; this opens a staff booking ticket and a person books it in the
 * real system, then records the appointment in the staff console. It reads and writes no
 * calendar.
 */
import { err, ok, type SchedulingAdapter } from "./SchedulingAdapter.js";

/** Opens (or finds) the booking ticket for a request; returns its id. Injected so the adapter holds no database. */
export type OpenBookingTicket = (bookingRequestId: string, contactId: string) => Promise<string>;

export function createManualQueue(openBookingTicket: OpenBookingTicket): SchedulingAdapter {
  return {
    id: "manual-queue",
    capabilities: { readAvailability: false, writeBooking: false, webhooks: false },
    getAvailability: () => Promise.resolve(ok([])),
    async book(req) {
      return ok({ kind: "callback", ticketId: await openBookingTicket(req.bookingRequestId, req.contactId) });
    },
    cancel: () => Promise.resolve(err({ code: "unsupported" })),
    // Appointments come from staff entering them in the console, not from a feed.
    listAppointments: () => Promise.resolve(ok([])),
  };
}
