-- newpoint-marketing: Joyce calls new leads who gave a phone number (docs/lead-crm.md,
-- "Lead calls"; the agent's script is docs/voice-agent-outbound.md).
--
-- Owner request 2026-11-17: when a lead leaves a phone number, the voice agent
-- calls them as well as the confirmation email, and the call is logged in the CRM.
--
-- One row per lead, at most one call per lead. The crm.lead-calls task claims a
-- lead (a row in 'dialing'), asks Cartesia to place the call, then marks it
-- 'placed' with Cartesia's call id. Later runs read the result from Cartesia and
-- record it here. A request Cartesia surely did not accept (429, 503) goes back
-- to 'retry', at most 3 attempts in all.
--
-- Joyce's record_outcome tool also reaches us DURING the call (site
-- /api/voice/outcome -> Trigger crm.lead-call-outcome -> crm.note_lead_call_outcome),
-- so a crisis is emailed while the call is still on, and the answers are kept
-- even if Cartesia's copy of the call is never readable.
--
-- WHAT IS KEPT is structured only: times, Cartesia's end reason, and the enum
-- answers. No transcript, no summary, no free text; the transcript stays in
-- Cartesia. One value is health information: outcome 'crisis', kept so staff
-- call back. Every active staff account can see it, like the lead itself.
--
-- Only leads still 'new', from the last 24 hours, are called: a call never
-- arrives days late, and a lead staff already contacted is not called. One
-- number is called at most once in 30 days, and at most 50 calls go out a day.
-- crm_alerts only for the task; staff read the rows through RLS.

create table crm.lead_calls (
  lead_id           uuid primary key references crm.leads (id) on delete cascade,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  status            text not null default 'dialing'
                      check (status in ('dialing', 'retry', 'placed', 'ended', 'not_placed')),
  attempts          smallint not null default 1 check (attempts between 0 and 3),
  provider_call_id  text unique check (provider_call_id ~ '^[A-Za-z0-9_-]{1,80}$'),
  placed_at         timestamptz,
  started_at        timestamptz,
  ended_at          timestamptz,
  -- Cartesia's EndReason enum, or one of ours (no_result, lost).
  end_reason        text check (end_reason ~ '^[a-z_]{1,40}$'),
  outcome           text check (outcome in (
                      'appointment_requested', 'callback_requested', 'not_interested',
                      'wrong_person', 'language_help', 'under_18', 'crisis',
                      'voicemail', 'no_answer', 'no_outcome', 'failed')),
  state             text check (state in ('NJ', 'PA', 'other', 'unknown')),
  modality          text check (modality in ('in_person', 'telehealth', 'either')),
  seen_before       text check (seen_before in ('yes', 'no', 'unknown')),
  preferred_windows text[] check (preferred_windows <@ array['weekday_morning', 'weekday_afternoon', 'weekday_evening', 'weekend']::text[]),
  -- Why a call was not placed: a code, never a vendor message.
  error             text check (error ~ '^[a-z0-9_]{1,40}$'),
  crisis_alerted_at timestamptz,
  -- When the CRM deleted the recording and transcript at Cartesia.
  recording_deleted_at timestamptz,
  check ((status = 'placed') <= (provider_call_id is not null)),
  check ((status = 'ended') <= (outcome is not null))
);

create index lead_calls_open on crm.lead_calls (status, updated_at) where status in ('dialing', 'placed', 'retry');
create index lead_calls_created_at on crm.lead_calls (created_at);

comment on table crm.lead_calls is
  'One automated call per website lead with a phone number (Joyce, Cartesia). Structured outcome only; no transcript.';

-- ---------------------------------------------------------------- task functions

-- The last 10 digits of a stored phone: how one number is recognised across leads.
create function crm.phone_key(p_phone text)
returns text
language sql
immutable
set search_path = ''
as $$ select right(regexp_replace(p_phone, '\D', '', 'g'), 10) $$;

-- At most this many calls a day in all: a brake on a form flooded with numbers
-- (each call costs money), well above the practice's real volume.
create function crm.lead_call_daily_cap()
returns integer
language sql
immutable
set search_path = ''
as $$ select 50 $$;

-- Leads to call now, at most p_limit in all: calls Cartesia did not accept,
-- retried after 5 minutes, then leads still 'new', from the last 24 hours, with
-- a phone, never claimed, whose number has not been called in 30 days. Each one
-- returned is held in 'dialing'. The phone is returned as stored; the task
-- normalises it and refuses anything outside the allowed area codes.
create function crm.claim_lead_calls(p_limit integer default 5)
returns table (lead_id uuid, name text, phone text, reason text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_room integer;
  v_retried uuid[];
  v_fresh uuid[];
begin
  -- A claim the task never finished (crashed between Cartesia and the mark).
  -- Cartesia may have dialled, so it is not retried: 'lost'.
  update crm.lead_calls c
     set status = 'not_placed', error = 'lost', updated_at = now()
   where c.status = 'dialing' and c.updated_at < now() - interval '15 minutes';

  -- Retries whose lead was contacted meanwhile, or aged out: closed, not left pending.
  update crm.lead_calls c
     set status = 'not_placed', error = 'expired', updated_at = now()
    from crm.leads l
   where l.id = c.lead_id and c.status = 'retry'
     and (l.status <> 'new' or l.created_at <= now() - interval '24 hours' or c.attempts >= 3);

  v_room := least(greatest(p_limit, 1), 20,
                  crm.lead_call_daily_cap()
                  - (select count(*)::int from crm.lead_calls c where c.created_at > now() - interval '24 hours'));
  if v_room <= 0 then
    return;
  end if;

  with retried as (
    update crm.lead_calls c
       set status = 'dialing', attempts = c.attempts + 1, updated_at = now()
     where c.lead_id in (
             select r.lead_id from crm.lead_calls r
              where r.status = 'retry' and r.updated_at < now() - interval '5 minutes'
              order by r.updated_at
              limit v_room
              for update skip locked)
    returning c.lead_id)
  select coalesce(array_agg(r.lead_id), '{}') into v_retried from retried r;

  v_room := v_room - cardinality(v_retried);
  if v_room > 0 then
    with candidates as (
      -- One lead per number in a batch: the oldest.
      select distinct on (crm.phone_key(l.phone)) l.id, l.created_at
        from crm.leads l
       where l.phone is not null
         and l.status = 'new'
         and l.created_at > now() - interval '24 hours'
         and not exists (select 1 from crm.lead_calls c where c.lead_id = l.id)
         and not exists (
               select 1 from crm.lead_calls c
                 join crm.leads o on o.id = c.lead_id
                where c.created_at > now() - interval '30 days'
                  and crm.phone_key(o.phone) = crm.phone_key(l.phone))
       order by crm.phone_key(l.phone), l.created_at),
    fresh as (
      insert into crm.lead_calls (lead_id)
      select c.id from candidates c order by c.created_at limit v_room
      on conflict do nothing
      returning crm.lead_calls.lead_id)
    select coalesce(array_agg(f.lead_id), '{}') into v_fresh from fresh f;
  else
    v_fresh := '{}';
  end if;

  return query
  select l.id, l.name, l.phone, l.reason
    from crm.leads l
   where l.id = any (v_retried || v_fresh)
   order by l.created_at;
end;
$$;

-- Cartesia accepted the call. Also accepts a claim already marked 'lost' (the
-- task stalled past 15 minutes but the call went out), so its result is still read.
create function crm.mark_lead_call_placed(p_lead_id uuid, p_call_id text)
returns integer
language sql
security definer
set search_path = ''
as $$
  with marked as (
    update crm.lead_calls c
       set status = 'placed', provider_call_id = p_call_id, placed_at = now(), error = null, updated_at = now()
     where c.lead_id = p_lead_id
       and (c.status = 'dialing' or (c.status = 'not_placed' and c.error = 'lost'))
    returning 1)
  select count(*)::int from marked;
$$;

-- Not placed. p_retry = true for a failure that may pass (network, 429, 5xx):
-- back to 'retry' while attempts remain. Otherwise final.
create function crm.mark_lead_call_failed(p_lead_id uuid, p_error text, p_retry boolean)
returns integer
language sql
security definer
set search_path = ''
as $$
  with marked as (
    update crm.lead_calls c
       set status = case when p_retry and c.attempts < 3 then 'retry' else 'not_placed' end,
           error = p_error, updated_at = now()
     where c.lead_id = p_lead_id and c.status = 'dialing'
    returning 1)
  select count(*)::int from marked;
$$;

-- Placed calls whose result is not recorded yet, oldest first.
create function crm.open_lead_calls(p_limit integer default 20)
returns table (lead_id uuid, provider_call_id text, placed_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.lead_id, c.provider_call_id, c.placed_at from crm.lead_calls c
   where c.status = 'placed'
   order by c.placed_at
   limit greatest(1, least(p_limit, 50));
$$;

-- The call's result, after it ended. Answers Joyce already sent during the call
-- (crm.note_lead_call_outcome) are kept: a crisis is never overwritten, and an
-- outcome Cartesia could not tell us (no_outcome, failed, ...) does not replace
-- one Joyce recorded. A call already ended is left alone. Returns 1 when recorded.
create function crm.record_lead_call(
  p_lead_id uuid, p_started_at timestamptz, p_ended_at timestamptz, p_end_reason text,
  p_outcome text, p_state text, p_modality text, p_seen_before text, p_preferred_windows text[])
returns integer
language sql
security definer
set search_path = ''
as $$
  with marked as (
    update crm.lead_calls c
       set status = 'ended', started_at = p_started_at, ended_at = p_ended_at,
           -- A vendor value the constraint would refuse must not wedge the queue.
           end_reason = case when p_end_reason ~ '^[a-z_]{1,40}$' then p_end_reason else 'other' end,
           outcome = case
                       when c.outcome = 'crisis' or p_outcome = 'crisis' then 'crisis'
                       when c.outcome is not null
                            and p_outcome in ('voicemail', 'no_answer', 'no_outcome', 'failed') then c.outcome
                       else p_outcome end,
           state = coalesce(p_state, c.state), modality = coalesce(p_modality, c.modality),
           seen_before = coalesce(p_seen_before, c.seen_before),
           preferred_windows = coalesce(p_preferred_windows, c.preferred_windows), updated_at = now()
     where c.lead_id = p_lead_id and c.status = 'placed'
    returning 1)
  select count(*)::int from marked;
$$;

-- Joyce's record_outcome, sent during the call, by Cartesia's call id. Only
-- while the call is open ('placed'); 'crisis' is sticky. Returns 1 when noted,
-- 0 when no open call has that id (the task retries: the mark may not be in yet).
create function crm.note_lead_call_outcome(
  p_call_id text, p_outcome text, p_state text, p_modality text, p_seen_before text, p_preferred_windows text[])
returns integer
language sql
security definer
set search_path = ''
as $$
  with marked as (
    update crm.lead_calls c
       set outcome = case when c.outcome = 'crisis' then 'crisis' else p_outcome end,
           state = coalesce(p_state, c.state), modality = coalesce(p_modality, c.modality),
           seen_before = coalesce(p_seen_before, c.seen_before),
           preferred_windows = coalesce(p_preferred_windows, c.preferred_windows), updated_at = now()
     where c.provider_call_id = p_call_id and c.status = 'placed'
    returning 1)
  select count(*)::int from marked;
$$;

-- Calls flagged 'crisis', during or after the call, that staff have not been emailed about yet.
create function crm.unalerted_crisis_calls()
returns table (lead_id uuid, ended_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.lead_id, c.ended_at from crm.lead_calls c
   where c.outcome = 'crisis' and c.crisis_alerted_at is null
   order by c.updated_at;
$$;

create function crm.mark_crisis_call_alerted(p_lead_ids uuid[])
returns integer
language sql
security definer
set search_path = ''
as $$
  with marked as (
    update crm.lead_calls c set crisis_alerted_at = now(), updated_at = now()
     where c.lead_id = any (p_lead_ids) and c.crisis_alerted_at is null
    returning 1)
  select count(*)::int from marked;
$$;

-- Ended calls whose recording and transcript are still at Cartesia: every one
-- except a crisis call, which is kept 30 days for the clinicians, then goes too.
-- Retried every sweep until Cartesia confirms (or says the call is gone).
create function crm.lead_call_recordings_to_delete(p_limit integer)
returns table (lead_id uuid, provider_call_id text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.lead_id, c.provider_call_id from crm.lead_calls c
   where c.status = 'ended' and c.provider_call_id is not null and c.recording_deleted_at is null
     and (c.outcome <> 'crisis' or coalesce(c.ended_at, c.updated_at) < now() - interval '30 days')
   order by c.updated_at
   limit greatest(1, least(p_limit, 50));
$$;

create function crm.mark_lead_call_recording_deleted(p_lead_id uuid)
returns integer
language sql
security definer
set search_path = ''
as $$
  with marked as (
    update crm.lead_calls c set recording_deleted_at = now()
     where c.lead_id = p_lead_id and c.recording_deleted_at is null
    returning 1)
  select count(*)::int from marked;
$$;

revoke all on function crm.lead_call_recordings_to_delete(integer) from public, anon, authenticated, service_role;
revoke all on function crm.mark_lead_call_recording_deleted(uuid) from public, anon, authenticated, service_role;
grant execute on function crm.lead_call_recordings_to_delete(integer) to crm_alerts;
grant execute on function crm.mark_lead_call_recording_deleted(uuid) to crm_alerts;

revoke all on function crm.phone_key(text) from public, anon, authenticated, service_role;
revoke all on function crm.lead_call_daily_cap() from public, anon, authenticated, service_role;
revoke all on function crm.claim_lead_calls(integer) from public, anon, authenticated, service_role;
revoke all on function crm.mark_lead_call_placed(uuid, text) from public, anon, authenticated, service_role;
revoke all on function crm.mark_lead_call_failed(uuid, text, boolean) from public, anon, authenticated, service_role;
revoke all on function crm.open_lead_calls(integer) from public, anon, authenticated, service_role;
revoke all on function crm.record_lead_call(uuid, timestamptz, timestamptz, text, text, text, text, text, text[]) from public, anon, authenticated, service_role;
revoke all on function crm.note_lead_call_outcome(text, text, text, text, text, text[]) from public, anon, authenticated, service_role;
revoke all on function crm.unalerted_crisis_calls() from public, anon, authenticated, service_role;
revoke all on function crm.mark_crisis_call_alerted(uuid[]) from public, anon, authenticated, service_role;
grant execute on function crm.claim_lead_calls(integer) to crm_alerts;
grant execute on function crm.mark_lead_call_placed(uuid, text) to crm_alerts;
grant execute on function crm.mark_lead_call_failed(uuid, text, boolean) to crm_alerts;
grant execute on function crm.open_lead_calls(integer) to crm_alerts;
grant execute on function crm.record_lead_call(uuid, timestamptz, timestamptz, text, text, text, text, text, text[]) to crm_alerts;
grant execute on function crm.note_lead_call_outcome(text, text, text, text, text, text[]) to crm_alerts;
grant execute on function crm.unalerted_crisis_calls() to crm_alerts;
grant execute on function crm.mark_crisis_call_alerted(uuid[]) to crm_alerts;

-- ---------------------------------------------------------------- staff read

alter table crm.lead_calls enable row level security;
create policy lead_calls_read on crm.lead_calls
  for select to authenticated using ((select crm.is_staff()));
grant select (lead_id, status, attempts, placed_at, started_at, ended_at, end_reason, outcome,
              state, modality, seen_before, preferred_windows, error)
  on crm.lead_calls to authenticated;
