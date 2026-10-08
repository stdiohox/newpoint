-- newpoint-phi: the HIPAA project. Phase 5, PHI foundations.
-- docs/automation-architecture.md §4 (phi schema, roles), §5.0, §5.8, §6, §7 Phase 5.
--
-- Every table here holds PHI or is keyed to it. Nothing in this project is ever
-- joined to newpoint-marketing; the only data that leaves is suppressed counts,
-- pushed by ops.aggregate-metrics through an insert-only key (§1).
--
-- Runtimes connect as login users that are members of these NOLOGIN group roles,
-- created per environment outside git. service_role is for migrations only.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'phi_tasks') then create role phi_tasks nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'phi_edge') then create role phi_edge nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'staff_console') then create role staff_console nologin; end if;
end
$$;

comment on role phi_tasks is 'Trigger.dev newpoint-phi tasks. Not service_role: RLS applies.';
comment on role phi_edge is 'Supabase Edge Functions: inbound rows only, plus what tool calls read.';
comment on role staff_console is 'The staff console server. Every query runs with the signed-in user''s verified claims; RLS keys on staff_role.';

create schema if not exists phi;
create schema if not exists ops;
revoke all on schema phi from public;
revoke all on schema ops from public;
grant usage on schema phi to phi_tasks, phi_edge, staff_console;
grant usage on schema ops to phi_tasks;

-- Who is acting, for the audit log. Tasks set newpoint.actor (task id + run id);
-- the console sets request.jwt.claims from the verified session. Invoker functions.
create function phi.staff_role() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'staff_role'
$$;
create function phi.staff_user() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
$$;
create function phi.actor() returns text language sql stable as $$
  select coalesce(nullif(current_setting('newpoint.actor', true), ''), phi.staff_user(), current_user)
$$;

-- Enums ------------------------------------------------------------------------
create type phi.minor_status as enum ('adult', 'minor', 'unknown');
create type phi.consent_kind as enum ('sms_transactional', 'sms_marketing', 'review_requests', 'unencrypted_sms_ack');
create type phi.channel as enum ('sms', 'voice', 'web', 'referral');
-- Mirrors the site form's constrained reason set (lib/content.ts); never free text.
create type phi.inquiry_reason as enum ('new_patient', 'existing_patient', 'billing_insurance', 'other');
create type phi.inquiry_status as enum ('open', 'callback', 'booked', 'closed');
create type phi.direction as enum ('inbound', 'outbound');
create type phi.modality as enum ('in_person', 'telehealth');
create type phi.booking_status as enum ('pending', 'offered', 'booked', 'handed_off', 'callback', 'abandoned');
create type phi.appointment_status as enum ('scheduled', 'completed', 'cancelled', 'no_show');
create type phi.referral_status as enum ('received', 'extracted', 'needs_review', 'confirmed', 'rejected');
create type phi.follow_up_kind as enum ('lead', 'no_show', 'post_visit_logistics', 'referrer_update');
create type phi.follow_up_status as enum ('scheduled', 'sent', 'skipped', 'done', 'cancelled');
create type phi.review_request_status as enum ('pending_clinician_window', 'sent', 'excluded', 'skipped');
create type phi.detected_by as enum ('keyword', 'llm', 'voice');
create type phi.audit_action as enum ('read', 'write', 'send');
create type phi.ticket_kind as enum ('callback', 'message', 'booking', 'clinician_review', 'referral_review', 'crisis_follow_up');
create type phi.ticket_status as enum ('open', 'in_progress', 'done', 'cancelled');
create type ops.failure_class as enum ('vendor_4xx', 'vendor_5xx', 'rate_limited', 'validation', 'timeout', 'unknown');

-- Tables -----------------------------------------------------------------------
create table phi.contacts (
  id                uuid primary key default gen_random_uuid(),
  first_name        text check (length(first_name) <= 100),
  last_name         text check (length(last_name) <= 100),
  phone_e164        text unique check (phone_e164 ~ '^\+1[2-9]\d{9}$'),
  phone_verified_at timestamptz,
  email             text check (length(email) <= 254),
  state             text check (state in ('NJ', 'PA')),
  -- §4: from the adapter or from staff. `unknown` is treated as minor everywhere (D18).
  minor_status      phi.minor_status not null default 'unknown',
  created_at        timestamptz not null default now()
);

-- Append-only: a grant and a revocation are each a row. Current state is phi.consent_state.
create table phi.consents (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null references phi.contacts (id),
  kind        phi.consent_kind not null,
  granted_at  timestamptz,
  revoked_at  timestamptz,
  source      text not null check (source in ('web_form', 'sms_keyword', 'sms_free_text', 'voice', 'staff')),
  -- The exact wording shown, its version, and when (D20). Never clinical.
  evidence    jsonb not null,
  created_at  timestamptz not null default now(),
  -- Insertion order decides the latest event (created_at is the transaction start, so
  -- a slow transaction's grant could otherwise sort before a STOP that committed first).
  seq         bigint generated always as identity unique,
  check ((granted_at is null) <> (revoked_at is null))
);

create table phi.inquiries (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null references phi.contacts (id),
  source      phi.channel not null,
  reason      phi.inquiry_reason not null,
  status      phi.inquiry_status not null default 'open',
  assigned_to text,
  created_at  timestamptz not null default now()
);

create table phi.conversations (
  id           uuid primary key default gen_random_uuid(),
  contact_id   uuid not null references phi.contacts (id),
  channel      phi.channel not null,
  external_ref text,
  started_at   timestamptz not null default now(),
  closed_at    timestamptz
);

create table phi.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references phi.conversations (id),
  direction       phi.direction not null,
  body            text,
  intent          text check (intent is null or intent ~ '^[a-z_]+$'),
  -- Twilio MessageSid: an inbound duplicate is dropped on this.
  external_ref    text unique,
  -- (template, entity, step) for outbound: a retry never double-sends (§5.0).
  idempotency_key text unique,
  template        text check (template is null or template ~ '^[a-z][a-z0-9_]*$'),
  created_at      timestamptz not null default now(),
  -- An outbound send Twilio refused: the claim is released (key cleared) so a retry can send.
  failed_at       timestamptz,
  -- Set by writers once D16 fixes retention periods; ops.retention-sweep clears body after it.
  purge_after     timestamptz
);
alter table phi.messages add constraint messages_released_claim check (failed_at is null or idempotency_key is null);
create index messages_conversation_time on phi.messages (conversation_id, created_at);
create index messages_purge on phi.messages (purge_after) where body is not null and purge_after is not null;
create index messages_outbound_today on phi.messages (created_at) where direction = 'outbound' and failed_at is null;

create table phi.booking_requests (
  id                 uuid primary key default gen_random_uuid(),
  contact_id         uuid not null references phi.contacts (id),
  inquiry_id         uuid references phi.inquiries (id),
  requested_modality phi.modality,
  requested_state    text check (requested_state in ('NJ', 'PA')),
  preferred_windows  jsonb not null default '[]',
  provider_pref      text,
  status             phi.booking_status not null default 'pending',
  adapter            text,
  adapter_result     jsonb,
  created_at         timestamptz not null default now()
);

create table phi.appointments (
  id                        uuid primary key default gen_random_uuid(),
  contact_id                uuid not null references phi.contacts (id),
  provider_id               text not null,
  external_ref              text,
  adapter                   text not null,
  starts_at                 timestamptz not null,
  modality                  phi.modality,
  status                    phi.appointment_status not null default 'scheduled',
  source_booking_request_id uuid references phi.booking_requests (id),
  unique (adapter, external_ref)
);

create table phi.referrals (
  id                    uuid primary key default gen_random_uuid(),
  referrer_org          text,
  referrer_name         text,
  referrer_contact      text,
  contact_id            uuid references phi.contacts (id),
  document_path         text,
  extracted             jsonb,
  extraction_confidence numeric(4, 3) check (extraction_confidence between 0 and 1),
  status                phi.referral_status not null default 'received',
  received_at           timestamptz not null default now()
);

create table phi.follow_ups (
  id             uuid primary key default gen_random_uuid(),
  contact_id     uuid not null references phi.contacts (id),
  kind           phi.follow_up_kind not null,
  step           smallint not null default 0,
  due_at         timestamptz not null,
  status         phi.follow_up_status not null default 'scheduled',
  trigger_run_id text,
  source_id      uuid
);

create table phi.review_requests (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references phi.appointments (id),
  contact_id     uuid not null references phi.contacts (id),
  scheduled_for  timestamptz not null,
  sent_at        timestamptz,
  status         phi.review_request_status not null default 'pending_clinician_window',
  check (status <> 'sent' or sent_at is not null)
);

create table phi.review_exclusions (
  contact_id  uuid primary key references phi.contacts (id),
  set_by      text not null,
  reason_code text check (reason_code is null or reason_code ~ '^[a-z_]+$'),
  set_at      timestamptz not null default now()
);

create table phi.crisis_events (
  id                    uuid primary key default gen_random_uuid(),
  contact_id            uuid not null references phi.contacts (id),
  channel               phi.channel not null,
  conversation_id       uuid references phi.conversations (id),
  detected_by           phi.detected_by not null,
  detected_at           timestamptz not null default now(),
  auto_response_sent_at timestamptz,
  paged_at              timestamptz,
  -- Paging loop state (§5.8): pages repeat every 10 min, escalate after 30.
  page_count            integer not null default 0 check (page_count >= 0),
  escalated_at          timestamptz,
  staff_ack_at          timestamptz,
  staff_ack_by          text,
  sequences_resumed_at  timestamptz,
  resumed_by            text,
  check (sequences_resumed_at is null or staff_ack_at is not null)
);
create index crisis_events_unacked on phi.crisis_events (detected_at) where staff_ack_at is null;
create index crisis_events_paused on phi.crisis_events (contact_id) where sequences_resumed_at is null;

-- The staff work queue: callbacks, messages, booking requests to book by hand,
-- clinician reviews, referral reviews. Not in §4's table list; the callback queue
-- the console shows (§7 Phase 5) needs a home.
create table phi.tickets (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid references phi.contacts (id),
  kind        phi.ticket_kind not null,
  source_kind text check (source_kind is null or source_kind ~ '^[a-z_]+$'),
  source_id   uuid,
  status      phi.ticket_status not null default 'open',
  assigned_to text,
  created_at  timestamptz not null default now(),
  closed_at   timestamptz,
  check ((status in ('done', 'cancelled')) = (closed_at is not null))
);
-- One OPEN ticket per source: a retried task adds nothing, and a later event on the same
-- source can open a new one once the first is closed.
create unique index tickets_one_open on phi.tickets (kind, source_kind, source_id) where status in ('open', 'in_progress');
create index tickets_open on phi.tickets (created_at) where status in ('open', 'in_progress');
create index tickets_contact on phi.tickets (contact_id);

-- Append-only; no runtime role has UPDATE or DELETE. Holds no PHI values.
create table phi.audit_log (
  id        bigint generated always as identity primary key,
  actor     text not null,
  action    phi.audit_action not null,
  entity    text not null check (entity ~ '^[a-z_]+$'),
  entity_id text,
  at        timestamptz not null default now()
);

create table ops.agent_health (
  task_id         text primary key check (task_id ~ '^[a-z][a-z0-9-]*(\.[a-z0-9-]+)*$'),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  -- A fixed enum: raw error text never lands here (§4).
  failure_class   ops.failure_class
);

-- Pages to Koret ops that must go out once per key (the SMS circuit breaker once a
-- day, a dead-man miss once per crisis event). Codes and opaque keys only.
create table ops.page_log (
  code    text not null check (code ~ '^[a-z_]+$'),
  key     text not null check (key ~ '^[A-Za-z0-9:_-]{1,80}$'),
  sent_at timestamptz not null default now(),
  primary key (code, key)
);

-- Indexes for the hot paths: consent check and conversation lookup on every send,
-- the per-number count, crisis pause check (db-phi.ts).
create index consents_latest on phi.consents (contact_id, kind, seq desc);
create index conversations_contact on phi.conversations (contact_id);
create index conversations_open_sms on phi.conversations (contact_id, started_at desc) where channel = 'sms' and closed_at is null;
create unique index follow_ups_once on phi.follow_ups (kind, source_id, step) where source_id is not null;

-- Clinician actions on a crisis are final and attributed to the signed-in user: the console
-- cannot un-acknowledge (which would restart paging) or write someone else's name.
create function phi.crisis_console_guard() returns trigger language plpgsql as $$
begin
  if current_user = 'staff_console' then
    if old.staff_ack_at is not null and new.staff_ack_at is distinct from old.staff_ack_at then
      raise exception 'crisis acknowledgment is final' using errcode = '42501';
    end if;
    if old.sequences_resumed_at is not null and new.sequences_resumed_at is distinct from old.sequences_resumed_at then
      raise exception 'sequence resume is final' using errcode = '42501';
    end if;
    new.staff_ack_by := case when new.staff_ack_at is distinct from old.staff_ack_at then phi.staff_user() else old.staff_ack_by end;
    new.resumed_by := case when new.sequences_resumed_at is distinct from old.sequences_resumed_at then phi.staff_user() else old.resumed_by end;
  end if;
  return new;
end
$$;
create trigger crisis_events_console_guard before update on phi.crisis_events
  for each row execute function phi.crisis_console_guard();

-- Current consent state, per contact and kind: the latest event decides.
create view phi.consent_state with (security_invoker = true) as
select distinct on (contact_id, kind)
       contact_id, kind, (granted_at is not null) as active, coalesce(granted_at, revoked_at) as since
  from phi.consents
 order by contact_id, kind, seq desc;

-- 12-month cap on review requests (§4), enforced in SQL.
create function phi.enforce_review_cap() returns trigger language plpgsql as $$
begin
  -- Serialise per contact so two concurrent sends cannot both pass the cap.
  perform pg_advisory_xact_lock(hashtext('review_cap:' || new.contact_id::text));
  if new.sent_at is not null and exists (
       select 1 from phi.review_requests r
        where r.contact_id = new.contact_id and r.id <> new.id
          and r.sent_at is not null and r.sent_at > new.sent_at - interval '12 months') then
    raise exception 'review request cap: one per contact per 12 months' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger review_requests_cap before insert or update of sent_at on phi.review_requests
  for each row execute function phi.enforce_review_cap();

-- Every write to a PHI table is audited (§6.6), by whoever made it. Reads are
-- audited by the code that reads (lib/db-phi.ts, the console).
create function phi.audit_write() returns trigger language plpgsql as $$
begin
  insert into phi.audit_log (actor, action, entity, entity_id)
  values (phi.actor(), 'write', tg_table_name,
          case when tg_op = 'DELETE' then (to_jsonb(old) ->> 'id') else coalesce(to_jsonb(new) ->> 'id', to_jsonb(new) ->> 'contact_id') end);
  return null;
end
$$;
do $$
declare t text;
begin
  foreach t in array array['contacts','consents','inquiries','conversations','messages','booking_requests','appointments',
                           'referrals','follow_ups','review_requests','review_exclusions','crisis_events','tickets']
  loop
    execute format('create trigger %I after insert or update or delete on phi.%I for each row execute function phi.audit_write()',
                   t || '_audit', t);
  end loop;
end
$$;

-- Grants ------------------------------------------------------------------------
revoke all on all tables in schema phi from public, anon, authenticated, service_role;
revoke all on all tables in schema ops from public, anon, authenticated, service_role;
revoke all on all functions in schema phi from public, anon, authenticated, service_role;
alter default privileges in schema phi, ops revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema phi, ops revoke all on functions from public, anon, authenticated, service_role;
grant execute on function phi.staff_role(), phi.staff_user(), phi.actor() to phi_tasks, phi_edge, staff_console;
grant execute on function phi.audit_write(), phi.enforce_review_cap(), phi.crisis_console_guard() to phi_tasks, phi_edge, staff_console;

-- Tasks: read and write what task families need; never delete (retention clears values).
grant select, insert, update on phi.contacts, phi.inquiries, phi.conversations, phi.messages, phi.booking_requests,
  phi.appointments, phi.referrals, phi.follow_ups, phi.review_requests, phi.tickets to phi_tasks;
-- Crisis events: tasks record detection and paging only. Acknowledging and resuming are
-- clinician decisions (§5.8), so a task credential cannot stop the page loop.
grant select, insert on phi.crisis_events to phi_tasks;
grant update (auto_response_sent_at, paged_at, page_count, escalated_at) on phi.crisis_events to phi_tasks;
grant select, insert on phi.consents to phi_tasks;
grant select on phi.review_exclusions, phi.consent_state to phi_tasks;
grant select, insert, update on ops.agent_health to phi_tasks;
grant select, insert on ops.page_log to phi_tasks;

-- Edge Functions: inbound rows, and what they read back to dedupe and link. Contacts and
-- conversations are inbound too (an unknown number texting is a new contact).
grant select, insert on phi.contacts, phi.conversations, phi.messages, phi.inquiries, phi.booking_requests,
  phi.referrals, phi.consents to phi_edge;
grant select on phi.consent_state to phi_edge;

-- Console: read the queues; write only what each role may decide.
grant select on phi.contacts, phi.inquiries, phi.tickets, phi.crisis_events, phi.review_requests, phi.review_exclusions,
  phi.appointments, phi.referrals, phi.booking_requests, phi.consent_state to staff_console;
grant update (status, assigned_to, closed_at) on phi.tickets to staff_console;
grant update (staff_ack_at, staff_ack_by, sequences_resumed_at, resumed_by) on phi.crisis_events to staff_console;
grant update (status) on phi.review_requests to staff_console;
grant update (minor_status) on phi.contacts to staff_console;
grant insert on phi.review_exclusions to staff_console;
-- Acknowledging a crisis opens the clinician's follow-up ticket in the same transaction.
grant insert (contact_id, kind, source_kind, source_id) on phi.tickets to staff_console;

-- Everyone writes the audit log (the triggers write as the acting role); no one edits it.
grant insert on phi.audit_log to phi_tasks, phi_edge, staff_console;

-- RLS ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['contacts','consents','inquiries','conversations','messages','booking_requests','appointments',
                           'referrals','follow_ups','review_requests','review_exclusions','crisis_events','tickets']
  loop
    execute format('alter table phi.%I enable row level security', t);
    execute format('create policy phi_tasks_all on phi.%I for all to phi_tasks using (true) with check (true)', t);
  end loop;
  foreach t in array array['contacts','conversations','messages','inquiries','booking_requests','referrals','consents']
  loop
    execute format('create policy phi_edge_inbound on phi.%I for all to phi_edge using (true) with check (true)', t);
  end loop;
end
$$;
alter table ops.agent_health enable row level security;
create policy phi_tasks_all on ops.agent_health for all to phi_tasks using (true) with check (true);
alter table ops.page_log enable row level security;
create policy phi_tasks_all on ops.page_log for all to phi_tasks using (true) with check (true);
-- The audit log: every role inserts, and only as itself (no forged actor).
alter table phi.audit_log enable row level security;
create policy phi_tasks_audit on phi.audit_log for insert to phi_tasks with check (actor = phi.actor());
create policy phi_edge_audit on phi.audit_log for insert to phi_edge with check (actor = phi.actor());

-- Console policies key on the verified role claim; no claim, no rows.
create policy staff_read on phi.contacts for select to staff_console using (phi.staff_role() in ('staff_clinician', 'staff_admin'));
create policy staff_age on phi.contacts for update to staff_console
  using (phi.staff_role() in ('staff_clinician', 'staff_admin')) with check (phi.staff_role() in ('staff_clinician', 'staff_admin'));
do $$
declare t text;
begin
  foreach t in array array['inquiries','tickets','crisis_events','review_requests','review_exclusions','appointments','referrals','booking_requests']
  loop
    execute format('create policy staff_read on phi.%I for select to staff_console using (phi.staff_role() in (''staff_clinician'', ''staff_admin''))', t);
  end loop;
end
$$;
create policy staff_work on phi.tickets for update to staff_console
  using (phi.staff_role() in ('staff_clinician', 'staff_admin')) with check (phi.staff_role() in ('staff_clinician', 'staff_admin'));
-- §4: only clinicians acknowledge crises, resume sequences and exclude patients from reviews.
create policy clinician_crisis on phi.crisis_events for update to staff_console
  using (phi.staff_role() = 'staff_clinician') with check (phi.staff_role() = 'staff_clinician');
create policy clinician_review_window on phi.review_requests for update to staff_console
  using (phi.staff_role() = 'staff_clinician' and status = 'pending_clinician_window')
  with check (phi.staff_role() = 'staff_clinician' and status = 'excluded');
create policy clinician_crisis_follow_up on phi.tickets for insert to staff_console
  with check (phi.staff_role() = 'staff_clinician' and kind = 'crisis_follow_up' and source_kind = 'crisis_event');
create policy clinician_exclude on phi.review_exclusions for insert to staff_console
  with check (phi.staff_role() = 'staff_clinician' and set_by = phi.staff_user());
create policy staff_audit on phi.audit_log for insert to staff_console with check (actor = phi.actor());
-- consent_state is a security_invoker view over consents: the reader needs consents' rows.
create policy staff_read on phi.consents for select to staff_console using (phi.staff_role() in ('staff_clinician', 'staff_admin'));
grant select on phi.consents to staff_console;
