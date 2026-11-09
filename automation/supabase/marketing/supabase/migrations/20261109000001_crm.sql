-- newpoint-marketing: the lead CRM (owner decision, 2026-11-09). docs/lead-crm.md.
--
-- Its own schema, `crm`, so nothing here widens the marketing access model:
-- marketing_rw, metrics_writer and n8n_ro get nothing in `crm`, and the
-- marketing tests (001-009) keep covering exactly the schemas they did.
--
-- Fields are the site form's and nothing more: name, email, optional phone and
-- the four fixed reasons (CLAUDE.md "Compliance": no health information).
--
-- Who can do what:
--   crm_intake     (site, /api/leads)  EXECUTE crm.submit_lead only. Cannot read a lead.
--   crm_alerts     (Trigger.dev task)  EXECUTE the three alert functions only:
--                                      lead id, reason and time; never name/email/phone.
--   authenticated  (Supabase Auth, the /crm pages) every row gated by crm.is_staff():
--                  read leads, change status and owner, add notes. No insert or
--                  delete of leads, no edits to what the visitor submitted.
--   anon, service_role, PUBLIC: nothing.
--
-- crm_intake and crm_alerts are NOLOGIN groups. Logins are created per
-- environment outside git, as with the marketing roles (automation/README.md).

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'crm_intake') then
    create role crm_intake nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'crm_alerts') then
    create role crm_alerts nologin;
  end if;
end
$$;

comment on role crm_intake is 'Newpoint site /api/leads: EXECUTE crm.submit_lead only.';
comment on role crm_alerts is 'Trigger.dev crm.new-lead-alert: EXECUTE the crm alert functions only.';

create schema if not exists crm;
revoke all on schema crm from public;
grant usage on schema crm to authenticated, crm_intake, crm_alerts;

-- Nothing created in crm is reachable by default, functions included
-- (Postgres grants EXECUTE on new functions to PUBLIC unless told otherwise).
alter default privileges in schema crm revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema crm revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges in schema crm revoke all on functions from public, anon, authenticated, service_role;

create type crm.lead_status as enum ('new', 'contacted', 'scheduled', 'won', 'not_a_fit');

-- ---------------------------------------------------------------- tables

create table crm.staff (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  email                text not null unique check (email = lower(email)),
  display_name         text not null check (char_length(display_name) between 1 and 80),
  alerts               boolean not null default true,
  active               boolean not null default true,
  must_change_password boolean not null default true,
  created_at           timestamptz not null default now()
);

comment on table crm.staff is
  'Who may sign in to /crm. A Supabase Auth user with no active row here sees nothing.';

create table crm.leads (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  name             text not null check (char_length(name) between 1 and 120),
  email            text not null check (
                     char_length(email) between 3 and 254
                     and email = lower(email)
                     and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone            text check (phone is null or phone ~ '^[0-9 ().+-]{7,32}$'),
  -- Must match CONTACT.reasons in lib/content.ts (test/crm/reasons-drift.test.ts).
  reason           text not null check (reason in (
                     'New patient inquiry',
                     'Existing patient',
                     'Insurance or billing question',
                     'Something else')),
  status           crm.lead_status not null default 'new',
  owner_id         uuid references crm.staff (user_id) on delete set null,
  -- Alert bookkeeping (crm.claim_lead_alerts). At least once: a claim that is
  -- never marked sent is claimable again after 10 minutes, up to 5 attempts.
  alert_claimed_at timestamptz,
  alerted_at       timestamptz,
  alert_attempts   smallint not null default 0
);

create index leads_created_at on crm.leads (created_at desc);
create index leads_status_created_at on crm.leads (status, created_at desc);
create index leads_unalerted on crm.leads (created_at) where alerted_at is null;
create index leads_email_created_at on crm.leads (email, created_at);
create index leads_owner on crm.leads (owner_id);

create table crm.lead_activity (
  id          bigint generated always as identity primary key,
  lead_id     uuid not null references crm.leads (id) on delete cascade,
  at          timestamptz not null default now(),
  -- NULL = the system (the website form). Defaults to the signed-in user, and
  -- authenticated has no column grant on it, so a note cannot be misattributed.
  actor_id    uuid default auth.uid() references crm.staff (user_id) on delete set null,
  kind        text not null check (kind in ('created', 'status', 'owner', 'note')),
  from_status crm.lead_status,
  to_status   crm.lead_status,
  owner_to    uuid,
  body        text check (body is null or char_length(body) between 1 and 2000),
  check ((kind = 'note') = (body is not null))
);

create index lead_activity_lead_at on crm.lead_activity (lead_id, at desc);

-- Rate-limit windows for crm.submit_lead. Only that function touches it.
create table crm.intake_rate (
  bucket       text not null,
  window_start timestamptz not null,
  hits         integer not null default 0,
  primary key (bucket, window_start)
);

-- ---------------------------------------------------------------- staff check

create function crm.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from crm.staff s
     where s.user_id = (select auth.uid()) and s.active
  );
$$;

-- ---------------------------------------------------------------- history triggers

create function crm.lead_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into crm.lead_activity (lead_id, actor_id, kind, to_status)
  values (new.id, null, 'created', new.status);
  return null;
end;
$$;

create trigger lead_created after insert on crm.leads
  for each row execute function crm.lead_created();

create function crm.lead_touched()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger lead_touched before update on crm.leads
  for each row execute function crm.lead_touched();

-- Status and owner changes are recorded here, not by the client, so the history
-- cannot be skipped. The actor is the signed-in user.
create function crm.lead_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into crm.lead_activity (lead_id, actor_id, kind, from_status, to_status)
    values (new.id, (select auth.uid()), 'status', old.status, new.status);
  end if;
  if new.owner_id is distinct from old.owner_id then
    insert into crm.lead_activity (lead_id, actor_id, kind, owner_to)
    values (new.id, (select auth.uid()), 'owner', new.owner_id);
  end if;
  return null;
end;
$$;

create trigger lead_changed after update of status, owner_id on crm.leads
  for each row execute function crm.lead_changed();

-- ---------------------------------------------------------------- intake

-- The site's only way in. p_client_key is an HMAC of the visitor's IP made by
-- the site (the raw IP never reaches the database). Limits: 5 per IP per hour,
-- 3 per email per day, 300 in total per day. Over a limit raises 'rate_limited'
-- (SQLSTATE P0001); the raise rolls the counter back with everything else.
create function crm.submit_lead(
  p_name text,
  p_email text,
  p_phone text,
  p_reason text,
  p_client_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
  v_hits integer;
  v_id uuid;
begin
  if p_client_key is null or p_client_key !~ '^[0-9a-f]{64}$' then
    raise exception 'bad client key' using errcode = '22023';
  end if;

  delete from crm.intake_rate where window_start < now() - interval '2 days';

  insert into crm.intake_rate as r (bucket, window_start, hits)
  values ('ip:' || p_client_key, date_trunc('hour', now()), 1)
  on conflict (bucket, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;
  if v_hits > 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into crm.intake_rate as r (bucket, window_start, hits)
  values ('global', date_trunc('day', now()), 1)
  on conflict (bucket, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;
  if v_hits > 300 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  if (select count(*) from crm.leads l
       where l.email = v_email and l.created_at > now() - interval '1 day') >= 3 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into crm.leads (name, email, phone, reason)
  values (btrim(p_name), v_email, nullif(btrim(coalesce(p_phone, '')), ''), p_reason)
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------- alerts

-- Claims up to p_limit unsent alerts. Returns no name, email or phone.
create function crm.claim_lead_alerts(p_limit integer default 20)
returns table (id uuid, reason text, created_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  update crm.leads l
     set alert_claimed_at = now(),
         alert_attempts = l.alert_attempts + 1
   where l.id in (
           select c.id from crm.leads c
            where c.alerted_at is null
              and c.alert_attempts < 5
              and (c.alert_claimed_at is null or c.alert_claimed_at < now() - interval '10 minutes')
            order by c.created_at
            limit greatest(1, least(p_limit, 100))
            for update skip locked)
  returning l.id, l.reason, l.created_at;
$$;

create function crm.mark_leads_alerted(p_ids uuid[])
returns integer
language sql
security definer
set search_path = ''
as $$
  with done as (
    update crm.leads l set alerted_at = now()
     where l.id = any (p_ids) and l.alerted_at is null
    returning 1)
  select count(*)::int from done;
$$;

create function crm.alert_recipients()
returns table (email text, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.email, s.display_name from crm.staff s
   where s.active and s.alerts
   order by s.created_at;
$$;

-- ---------------------------------------------------------------- staff self-service

-- Clears the first-sign-in flag for the signed-in user only.
create function crm.password_changed()
returns void
language sql
security definer
set search_path = ''
as $$
  update crm.staff set must_change_password = false
   where user_id = (select auth.uid());
$$;

-- ---------------------------------------------------------------- privileges

revoke all on all tables in schema crm from public, anon, authenticated, service_role;
revoke all on all functions in schema crm from public, anon, authenticated, service_role;

grant execute on function crm.submit_lead(text, text, text, text, text) to crm_intake;
grant execute on function crm.claim_lead_alerts(integer) to crm_alerts;
grant execute on function crm.mark_leads_alerted(uuid[]) to crm_alerts;
grant execute on function crm.alert_recipients() to crm_alerts;
grant execute on function crm.is_staff() to authenticated;
grant execute on function crm.password_changed() to authenticated;

grant select (user_id, email, display_name, alerts, active, must_change_password, created_at)
  on crm.staff to authenticated;
grant select (id, created_at, updated_at, name, email, phone, reason, status, owner_id)
  on crm.leads to authenticated;
grant update (status, owner_id) on crm.leads to authenticated;
grant select on crm.lead_activity to authenticated;
grant insert (lead_id, kind, body) on crm.lead_activity to authenticated;

-- ---------------------------------------------------------------- row-level security

alter table crm.staff enable row level security;
alter table crm.leads enable row level security;
alter table crm.lead_activity enable row level security;
alter table crm.intake_rate enable row level security;

create policy staff_read on crm.staff
  for select to authenticated using ((select crm.is_staff()));

create policy leads_read on crm.leads
  for select to authenticated using ((select crm.is_staff()));
create policy leads_update on crm.leads
  for update to authenticated
  using ((select crm.is_staff()))
  with check ((select crm.is_staff()));

create policy activity_read on crm.lead_activity
  for select to authenticated using ((select crm.is_staff()));
create policy activity_note on crm.lead_activity
  for insert to authenticated
  with check (
    (select crm.is_staff())
    and kind = 'note'
    and actor_id = (select auth.uid())
    and from_status is null and to_status is null and owner_to is null);

-- crm.intake_rate: RLS on, no policy, no grant. Only crm.submit_lead (the
-- table owner, via SECURITY DEFINER) reads or writes it.
