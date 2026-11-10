-- newpoint-marketing: lead CRM hardening after review (docs/lead-crm.md).
--
-- 1. Alerts are never lost silently. A claim that was not sent (send failed, or
--    nobody has alerts on) is RELEASED without spending an attempt, the claim
--    timeout drops to 5 minutes (the sweep runs every 10), and leads that did
--    exhaust their attempts are countable (crm.stuck_lead_alerts) so the task
--    logs an error for them.
-- 2. The per-email limit is serialised per address (transaction advisory lock,
--    safe on the transaction pooler); the global cap is a flood brake at 1,000
--    a day rather than 300, so a burst of junk cannot shut out real enquiries
--    for a whole day; the stale-window cleanup runs on ~2% of submissions.
-- 3. Alert bookkeeping no longer bumps updated_at.
-- 4. History is never orphaned: a staff member with history cannot be deleted
--    (deactivate instead, as the doc says), and actor_id is indexed.

-- ------------------------------------------------------------------ alerts

create or replace function crm.claim_lead_alerts(p_limit integer default 20)
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
              and (c.alert_claimed_at is null or c.alert_claimed_at < now() - interval '5 minutes')
            order by c.created_at
            limit greatest(1, least(p_limit, 100))
            for update skip locked)
  returning l.id, l.reason, l.created_at;
$$;

-- Gives back a claim that was not sent, without spending the attempt.
create function crm.release_lead_alerts(p_ids uuid[])
returns integer
language sql
security definer
set search_path = ''
as $$
  with released as (
    update crm.leads l
       set alert_claimed_at = null,
           alert_attempts = greatest(l.alert_attempts - 1, 0)
     where l.id = any (p_ids) and l.alerted_at is null
    returning 1)
  select count(*)::int from released;
$$;

-- Leads whose alert gave up after 5 attempts. The task logs an error while > 0.
create function crm.stuck_lead_alerts()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from crm.leads l
   where l.alerted_at is null and l.alert_attempts >= 5;
$$;

revoke all on function crm.release_lead_alerts(uuid[]) from public, anon, authenticated, service_role;
revoke all on function crm.stuck_lead_alerts() from public, anon, authenticated, service_role;
grant execute on function crm.release_lead_alerts(uuid[]) to crm_alerts;
grant execute on function crm.stuck_lead_alerts() to crm_alerts;

drop index crm.leads_unalerted;
create index leads_unalerted on crm.leads (created_at)
  where alerted_at is null and alert_attempts < 5;

-- ------------------------------------------------------------------ intake

create or replace function crm.submit_lead(
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

  if random() < 0.02 then
    delete from crm.intake_rate where window_start < now() - interval '2 days';
  end if;

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
  if v_hits > 1000 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  -- One submission per address at a time, so concurrent requests cannot all
  -- read a count under the limit. Released at commit.
  perform pg_advisory_xact_lock(hashtextextended('crm.submit_lead:' || coalesce(v_email, ''), 0));
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

-- create or replace keeps the existing grants; restated so this file reads alone.
revoke all on function crm.submit_lead(text, text, text, text, text) from public, anon, authenticated, service_role;
grant execute on function crm.submit_lead(text, text, text, text, text) to crm_intake;

-- ------------------------------------------------------------------ updated_at

drop trigger lead_touched on crm.leads;
create trigger lead_touched before update on crm.leads
  for each row
  when ((old.status, old.owner_id) is distinct from (new.status, new.owner_id))
  execute function crm.lead_touched();

-- ------------------------------------------------------------------ history integrity

alter table crm.staff drop constraint staff_user_id_fkey;
alter table crm.staff add constraint staff_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete restrict;

alter table crm.lead_activity drop constraint lead_activity_actor_id_fkey;
alter table crm.lead_activity add constraint lead_activity_actor_id_fkey
  foreign key (actor_id) references crm.staff (user_id) on delete restrict;

create index lead_activity_actor on crm.lead_activity (actor_id) where actor_id is not null;
