-- newpoint-marketing: lead follow-up (docs/lead-crm.md, "Follow-up nudges").
--
-- 1. Staff get a role: front_desk (default) or provider. A lead still 'new'
--    past the FIRST threshold is nudged to the front desk; past the SECOND, to
--    everyone with alerts on (the providers included). Thresholds by reason:
--    "Existing patient" 4 h / 24 h (a message from a current psychiatric
--    patient may be about medication or a decline); everything else 24 h / 72 h.
--    If nobody at the front desk has alerts on, the first nudge goes to everyone.
-- 2. Two timestamps on the lead record which nudge went out, so each goes once.
--    Changing the status away from 'new' ends the nudges; moving it back does
--    not restart them. Leads already past the first threshold when this is
--    applied count as nudged, so the first run cannot send a backlog.
-- 3. A weekly summary of counts only (no names, no contact details) for the
--    previous Monday–Sunday in Eastern time, computed here so DST is handled.
--
-- Everything is crm_alerts only, SECURITY DEFINER, search_path ''.

alter table crm.staff
  add column role text not null default 'front_desk'
    check (role in ('front_desk', 'provider'));

alter table crm.leads
  add column first_nudge_at  timestamptz,
  add column second_nudge_at timestamptz;

update crm.leads set first_nudge_at = created_at, second_nudge_at = created_at
 where status = 'new' and created_at < now() - interval '24 hours';

-- Leads still 'new' past a threshold whose nudge has not gone out, oldest
-- first, at most 50 (the rest next hour). A lead that crosses the second
-- threshold never having been nudged gets the second nudge only (level 2);
-- marking level 2 marks level 1 as well.
create function crm.stale_leads()
returns table (id uuid, reason text, created_at timestamptz, level smallint)
language sql
stable
security definer
set search_path = ''
as $$
  with t as (
    select l.id, l.reason, l.created_at, l.first_nudge_at, l.second_nudge_at,
           case when l.reason = 'Existing patient' then interval '4 hours'  else interval '24 hours' end as first_after,
           case when l.reason = 'Existing patient' then interval '24 hours' else interval '72 hours' end as second_after
      from crm.leads l
     where l.status = 'new')
  select t.id, t.reason, t.created_at,
         (case when t.created_at < now() - t.second_after and t.second_nudge_at is null
               then 2 else 1 end)::smallint as level
    from t
   where (t.created_at < now() - t.second_after and t.second_nudge_at is null)
      or (t.created_at < now() - t.first_after and t.first_nudge_at is null)
   order by t.created_at
   limit 50;
$$;

create function crm.mark_leads_nudged(p_ids uuid[], p_level smallint)
returns integer
language sql
security definer
set search_path = ''
as $$
  with marked as (
    update crm.leads l
       set first_nudge_at = coalesce(l.first_nudge_at, now()),
           second_nudge_at = case when p_level >= 2 then coalesce(l.second_nudge_at, now())
                                  else l.second_nudge_at end
     where l.id = any (p_ids)
    returning 1)
  select count(*)::int from marked;
$$;

-- Level 1: the front desk; if nobody there has alerts on, everyone who does.
-- Level 2: everyone with alerts on.
create function crm.nudge_recipients(p_level smallint)
returns table (email text)
language sql
stable
security definer
set search_path = ''
as $$
  with front_desk as (
    select s.email from crm.staff s
     where s.active and s.alerts and s.role = 'front_desk')
  select f.email from front_desk f where p_level = 1
  union
  select s.email from crm.staff s
   where s.active and s.alerts
     and (p_level >= 2 or not exists (select 1 from front_desk))
  order by 1;
$$;

-- Counts for the previous Monday–Sunday (Eastern). Keys: from, to (ISO),
-- new_in, by_reason {reason: n}, moved {status: leads that reached it},
-- open {status: n} for new/contacted/scheduled, untouched_new (still 'new'
-- after 24 h, right now), stalled_contacted (contacted, unchanged for 7 days,
-- not yet scheduled), oldest_new_hours (null when nothing is 'new').
-- The week arithmetic is done on the Eastern wall clock BEFORE converting
-- back, so a DST week still starts at Monday 00:00 ET.
create function crm.weekly_summary()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with bounds as (
    select (date_trunc('week', now() at time zone 'America/New_York') - interval '7 days') at time zone 'America/New_York' as from_at,
           date_trunc('week', now() at time zone 'America/New_York') at time zone 'America/New_York' as to_at)
  select jsonb_build_object(
    'from', to_char(b.from_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'to',   to_char(b.to_at   at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'new_in', (select count(*) from crm.leads l where l.created_at >= b.from_at and l.created_at < b.to_at),
    'by_reason', (select coalesce(jsonb_object_agg(r.reason, r.n), '{}'::jsonb)
                    from (select l.reason, count(*) as n from crm.leads l
                           where l.created_at >= b.from_at and l.created_at < b.to_at
                           group by l.reason) r),
    'moved', (select coalesce(jsonb_object_agg(m.to_status, m.n), '{}'::jsonb)
                from (select a.to_status::text as to_status, count(distinct a.lead_id) as n
                        from crm.lead_activity a
                       where a.kind = 'status' and a.to_status is not null
                         and a.at >= b.from_at and a.at < b.to_at
                       group by a.to_status) m),
    'open', (select coalesce(jsonb_object_agg(o.status, o.n), '{}'::jsonb)
               from (select l.status::text as status, count(*) as n from crm.leads l
                      where l.status in ('new', 'contacted', 'scheduled')
                      group by l.status) o),
    'untouched_new', (select count(*) from crm.leads l
                       where l.status = 'new' and l.created_at < now() - interval '24 hours'),
    'stalled_contacted', (select count(*) from crm.leads l
                           where l.status = 'contacted' and l.updated_at < now() - interval '7 days'),
    'oldest_new_hours', (select floor(extract(epoch from (now() - min(l.created_at))) / 3600)::int
                           from crm.leads l where l.status = 'new'))
  from bounds b;
$$;

revoke all on function crm.stale_leads() from public, anon, authenticated, service_role;
revoke all on function crm.mark_leads_nudged(uuid[], smallint) from public, anon, authenticated, service_role;
revoke all on function crm.nudge_recipients(smallint) from public, anon, authenticated, service_role;
revoke all on function crm.weekly_summary() from public, anon, authenticated, service_role;
grant execute on function crm.stale_leads() to crm_alerts;
grant execute on function crm.mark_leads_nudged(uuid[], smallint) to crm_alerts;
grant execute on function crm.nudge_recipients(smallint) to crm_alerts;
grant execute on function crm.weekly_summary() to crm_alerts;
