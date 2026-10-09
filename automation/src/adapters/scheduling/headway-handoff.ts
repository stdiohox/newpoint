/**
 * headway-handoff (§5.1). Headway publishes no public API; an iCal feed gives busy times at
 * most, so this adapter cannot write a booking. It can only hand the patient the provider's
 * generic Headway booking page, never prefilled with contact data. With more than one
 * eligible provider it does not choose for the patient: a person does (callback).
 *
 * No iCal feed is configured in v1 (D1 open), so availability is not read.
 * Note for D1: a patient who books through Headway is billed by Headway, not by Newpoint.
 */
import { provider } from "../../domain/scheduling/providers.js";
import { err, ok, type SchedulingAdapter } from "./SchedulingAdapter.js";

export function createHeadwayHandoff(): SchedulingAdapter {
  return {
    id: "headway-handoff",
    capabilities: { readAvailability: false, writeBooking: false, webhooks: false },
    getAvailability: () => Promise.resolve(ok([])),
    book(req) {
      if (req.providers.length !== 1) return Promise.resolve(err({ code: "no_booking_page" }));
      const url = provider(req.providers[0] ?? "")?.headwayUrl ?? null;
      return Promise.resolve(url === null ? err({ code: "no_booking_page" }) : ok({ kind: "handoff", url }));
    },
    cancel: () => Promise.resolve(err({ code: "unsupported" })),
    listAppointments: () => Promise.resolve(ok([])),
  };
}
