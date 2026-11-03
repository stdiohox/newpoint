-- newpoint-phi: indexes for the foreign keys that had none, and the console's review queue.
--
-- Indexes only. They hold ids and timestamps already in these tables: no PHI is copied
-- anywhere new.
--
--   phi.follow_ups.contact_id, phi.referrals.contact_id, phi.booking_requests.inquiry_id,
--   phi.crisis_events.conversation_id   foreign keys without an index. crisis_events'
--                                       also serves the voice crisis dedupe lookup; the rest
--                                       keep a future delete (e.g. an erasure request) from
--                                       scanning the referencing table.
--   phi.review_requests                 the console's "waiting on the clinician window" list
--                                       (status = 'pending_clinician_window' order by
--                                       scheduled_for, src/console/app.ts).

create index follow_ups_contact_idx on phi.follow_ups (contact_id);
create index referrals_contact_idx on phi.referrals (contact_id) where contact_id is not null;
create index booking_requests_inquiry_idx on phi.booking_requests (inquiry_id) where inquiry_id is not null;
create index crisis_events_conversation_idx on phi.crisis_events (conversation_id) where conversation_id is not null;
create index review_requests_pending_idx on phi.review_requests (scheduled_for)
  where status = 'pending_clinician_window';
