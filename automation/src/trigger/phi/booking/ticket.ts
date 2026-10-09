import { openTicket, type Queryable } from "../../../lib/db-phi.js";

/** Opens (or finds) the request's booking ticket and says whether it is new. */
export async function bookingTicket(q: Queryable, bookingRequestId: string, contactId: string): Promise<{ id: string; opened: boolean }> {
  const opened = await openTicket(q, { contactId, kind: "booking", sourceKind: "booking_request", sourceId: bookingRequestId });
  const { rows } = await q.query<{ id: string }>(
    `select id from phi.tickets where kind = 'booking' and source_kind = 'booking_request' and source_id = $1 and status in ('open', 'in_progress')`,
    [bookingRequestId],
  );
  const id = rows[0]?.id;
  if (id === undefined) throw new Error("booking.request: no ticket");
  return { id, opened };
}
