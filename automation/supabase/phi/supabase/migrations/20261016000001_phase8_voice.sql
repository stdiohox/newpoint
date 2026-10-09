-- newpoint-phi Phase 8: voice receptionist (docs/automation-architecture.md §5.1 Vapi rows,
-- §5.8 voice crisis, §7 Phase 8). D4/D13/D21 conservative defaults: Vapi's HIPAA default
-- provider, no recording, automated-assistant disclosure, English only.

-- A call is one conversation, keyed by the Vapi call id. No transcript is stored (minimum
-- necessary; D16 open): only a structured outcome code.
create unique index conversations_external_ref on phi.conversations (channel, external_ref) where external_ref is not null;
alter table phi.conversations
  add column outcome text check (outcome is null or outcome ~ '^[a-z_]+$'),
  add column callback_requested boolean;

-- Requests and messages taken on a call carry "<call id>:<tool call id>": a second request in
-- the same call is its own row, and a redelivered tool call adds nothing.
alter table phi.booking_requests add column source_ref text unique check (source_ref is null or source_ref ~ '^[A-Za-z0-9_:-]{1,200}$');
alter table phi.inquiries add column source_ref text unique check (source_ref is null or source_ref ~ '^[A-Za-z0-9_:-]{1,200}$');

-- One voice crisis event per call, keyed by the call id. A caller in crisis often withholds
-- their number: the event (and the clinician page) must not depend on knowing who called,
-- so a voice event may have no contact and no conversation.
alter table phi.crisis_events
  add column call_ref text unique check (call_ref is null or call_ref ~ '^[A-Za-z0-9_-]{1,64}$'),
  alter column contact_id drop not null,
  add constraint crisis_events_contact check (contact_id is not null or (channel = 'voice' and call_ref is not null));

-- Edge (vapi-tools, vapi-events): find a call's conversation, record the outcome, raise a voice
-- crisis. Still no read of names, bodies, consents or crisis rows.
grant select (id, contact_id, channel, closed_at, external_ref) on phi.conversations to phi_edge;
grant update (outcome, callback_requested) on phi.conversations to phi_edge;
grant select (id, source_ref) on phi.booking_requests, phi.inquiries to phi_edge;
grant insert (id, contact_id, channel, conversation_id, detected_by, call_ref) on phi.crisis_events to phi_edge;
create policy phi_edge_voice_crisis on phi.crisis_events for insert to phi_edge
  with check (channel = 'voice' and detected_by = 'voice' and call_ref is not null);
