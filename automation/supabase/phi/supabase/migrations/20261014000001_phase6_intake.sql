-- newpoint-phi Phase 6: SMS concierge and web intake (docs/automation-architecture.md
-- §5.1 messaging.inbound-sms, §5.5 lead follow-up and edge/intake hardening, §7 Phase 6).

-- One-time phone codes (§5.5: "phone verification first"). The code is kept only until it
-- is used or expires; ops.retention-sweep clears it. Five wrong tries and it is dead.
create table phi.phone_verifications (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null references phi.contacts (id),
  inquiry_id  uuid references phi.inquiries (id),
  -- The plaintext code is for messaging.send-sms only (phi_tasks). The edge role never
  -- reads it back: it checks code_hmac, keyed by a secret that is not in the database.
  code        text check (code ~ '^\d{6}$'),
  code_hmac   text not null check (code_hmac ~ '^[A-Za-z0-9_-]{43}$'),
  -- The consent the visitor ticked, held PENDING until the code is confirmed. Only then
  -- does edge/intake write it to phi.consents, so typing someone else's number can never
  -- grant (or re-grant, after a STOP) consent for it.
  consent_evidence jsonb,
  expires_at  timestamptz not null,
  attempts    smallint not null default 0 check (attempts between 0 and 5),
  verified_at timestamptz,
  created_at  timestamptz not null default now()
);
create index phone_verifications_contact on phi.phone_verifications (contact_id, created_at desc);
create index phone_verifications_purge on phi.phone_verifications (expires_at) where code is not null;
create index phone_verifications_inquiry on phi.phone_verifications (inquiry_id) where inquiry_id is not null;

-- The edge may only count a wrong try (+1) or close the row; never reset attempts or set a code.
create function phi.phone_verification_guard() returns trigger language plpgsql as $$
begin
  if current_user = 'phi_edge' then
    if new.attempts not in (old.attempts, old.attempts + 1) then
      raise exception 'attempts only go up by one' using errcode = '42501';
    end if;
    if new.code is not null and new.code is distinct from old.code then
      raise exception 'the edge cannot set a code' using errcode = '42501';
    end if;
  end if;
  return new;
end
$$;
create trigger phone_verifications_guard before update on phi.phone_verifications
  for each row execute function phi.phone_verification_guard();
create trigger phone_verifications_audit after insert or update or delete on phi.phone_verifications
  for each row execute function phi.audit_write();

-- Intake rate limits (§5.5): per IP and per phone. Keys are HMACs, never the IP or the number.
create table ops.intake_rate (
  key          text not null check (key ~ '^(ip|phone):[A-Za-z0-9_-]{43}$' or key ~ '^global:[a-z_]+$'),
  window_start timestamptz not null,
  hits         integer not null default 1 check (hits > 0),
  primary key (key, window_start)
);
-- Old windows are removed by a maintenance job outside the runtime roles (no runtime role
-- deletes anything; see automation/README.md go-live steps).
create index intake_rate_window on ops.intake_rate (window_start);

create index inquiries_contact on phi.inquiries (contact_id);
create index messages_inbound_after on phi.messages (conversation_id, created_at) where direction = 'inbound';

-- One open SMS conversation per contact: two texts arriving together cannot split a thread.
drop index phi.conversations_open_sms;
create unique index conversations_one_open_sms on phi.conversations (contact_id) where channel = 'sms' and closed_at is null;

-- What happened to the crisis auto-reply, for the clinician who was paged.
alter table phi.crisis_events add column auto_response_status text
  check (auto_response_status is null or auto_response_status ~ '^[a-z_]+$');
grant update (auto_response_status) on phi.crisis_events to phi_tasks;

-- Grants -------------------------------------------------------------------------
revoke all on phi.phone_verifications from public, anon, authenticated, service_role;
revoke all on ops.intake_rate from public, anon, authenticated, service_role;
grant usage on schema ops to phi_edge;

-- Edge: create a code row, check it (attempts, verified_at), and mark the phone verified.
grant insert on phi.phone_verifications to phi_edge;
grant select (id, contact_id, inquiry_id, code_hmac, consent_evidence, expires_at, attempts, verified_at, created_at) on phi.phone_verifications to phi_edge;

-- The edge is internet-facing: it may read back only what it needs to dedupe and link
-- (ids, the phone it looks up, the Twilio MessageSid), never names, bodies or consents.
revoke select on phi.contacts, phi.conversations, phi.messages, phi.inquiries, phi.booking_requests,
  phi.referrals, phi.consents, phi.consent_state from phi_edge;
grant select (id, phone_e164) on phi.contacts to phi_edge;
grant select (id, contact_id, channel, closed_at) on phi.conversations to phi_edge;
grant select (id, external_ref) on phi.messages to phi_edge;
grant select (id) on phi.inquiries, phi.booking_requests, phi.referrals, phi.consents to phi_edge;
grant update (attempts, verified_at, code) on phi.phone_verifications to phi_edge;
grant execute on function phi.phone_verification_guard() to phi_tasks, phi_edge;
grant update (phone_verified_at) on phi.contacts to phi_edge;
grant select, insert, update on ops.intake_rate to phi_edge;

-- Tasks: the slot resolver reads the code; the retention sweep clears expired codes.
grant select, update (code) on phi.phone_verifications to phi_tasks;
-- No runtime role deletes anything (001_boundary). Rate rows hold only HMACs and counts.

alter table phi.phone_verifications enable row level security;
create policy phi_tasks_all on phi.phone_verifications for all to phi_tasks using (true) with check (true);
create policy phi_edge_inbound on phi.phone_verifications for all to phi_edge using (true) with check (true);
alter table ops.intake_rate enable row level security;
create policy phi_edge_rate on ops.intake_rate for all to phi_edge using (true) with check (true);

-- One crisis event per inbound message, so a retried messaging.inbound-sms never opens a
-- second event (and never pages twice for one message).
alter table phi.crisis_events add column message_id uuid unique references phi.messages (id);
