-- 20261111000001_crm_follow_up.sql: staff roles, stale-lead nudges, weekly summary.
begin;
select plan(16);

grant usage on schema extensions to crm_intake, crm_alerts;

select ok(
  has_function_privilege('crm_alerts', 'crm.stale_leads()', 'EXECUTE')
  and has_function_privilege('crm_alerts', 'crm.mark_leads_nudged(uuid[], smallint)', 'EXECUTE')
  and has_function_privilege('crm_alerts', 'crm.nudge_recipients(smallint)', 'EXECUTE')
  and has_function_privilege('crm_alerts', 'crm.weekly_summary()', 'EXECUTE'),
  'crm_alerts can run the follow-up functions');
select ok(
  not has_function_privilege('authenticated', 'crm.weekly_summary()', 'EXECUTE')
  and not has_function_privilege('anon', 'crm.stale_leads()', 'EXECUTE')
  and not has_function_privilege('crm_intake', 'crm.nudge_recipients(smallint)', 'EXECUTE'),
  'nobody else can');

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000d1', 'desk@example.com'),
  ('00000000-0000-4000-8000-0000000000d2', 'doc@example.com');
insert into crm.staff (user_id, email, display_name) values
  ('00000000-0000-4000-8000-0000000000d1', 'desk@example.com', 'Front desk');
insert into crm.staff (user_id, email, display_name, role) values
  ('00000000-0000-4000-8000-0000000000d2', 'doc@example.com', 'Doctor', 'provider');

select is((select role from crm.staff where email = 'desk@example.com'), 'front_desk', 'role defaults to front_desk');
select throws_ok(
  $$update crm.staff set role = 'owner' where email = 'doc@example.com'$$,
  '23514', null, 'an unknown role is refused');

set local role crm_alerts;
select is(array(select email from crm.nudge_recipients(1::smallint)), array['desk@example.com'], '24 h nudge goes to the front desk');
select is(array(select email from crm.nudge_recipients(2::smallint)), array['desk@example.com', 'doc@example.com'], '72 h nudge goes to everyone with alerts');
reset role;
update crm.staff set alerts = false where email = 'desk@example.com';
set local role crm_alerts;
select is(array(select email from crm.nudge_recipients(1::smallint)), array['doc@example.com'], 'with no front desk on alerts, the 24 h nudge falls back to everyone');
reset role;
update crm.staff set alerts = true where email = 'desk@example.com';

set local role crm_intake;
select count(*) from (select crm.submit_lead('Day Old', 'day@example.com', null, 'New patient inquiry', repeat('a', 64))) s;
select count(*) from (select crm.submit_lead('Three Days', 'three@example.com', null, 'Existing patient', repeat('b', 64))) s;
select count(*) from (select crm.submit_lead('Fresh', 'fresh@example.com', null, 'Something else', repeat('c', 64))) s;
select count(*) from (select crm.submit_lead('Handled', 'handled@example.com', null, 'New patient inquiry', repeat('d', 64))) s;
select count(*) from (select crm.submit_lead('Existing Soon', 'soon@example.com', null, 'Existing patient', repeat('e', 64))) s;
reset role;
update crm.leads set created_at = now() - interval '5 hours' where name = 'Existing Soon';
update crm.leads set created_at = now() - interval '30 hours' where name = 'Day Old';
update crm.leads set created_at = now() - interval '80 hours' where name = 'Three Days';
update crm.leads set created_at = now() - interval '80 hours' where name = 'Handled';
update crm.leads set status = 'contacted' where name = 'Handled';
update crm.leads set updated_at = '2026-01-01' where name = 'Day Old';

set local role crm_alerts;
create temp table st as select * from crm.stale_leads();
reset role;
select is(
  array(select l.name || ':' || s.level::text from st s join crm.leads l on l.id = s.id order by l.created_at),
  array['Three Days:2', 'Day Old:1', 'Existing Soon:1'],
  'stale = still new past the first threshold (level 1) or the second (level 2); an existing patient after 4 h; contacted and fresh leads are not');
set local role crm_alerts;
select is(crm.mark_leads_nudged(array(select id from st where level = 1), 1::smallint), 2, 'a first nudge is marked');
select is(crm.mark_leads_nudged(array(select id from st where level = 2), 2::smallint), 1, 'a second nudge is marked');
select is((select count(*)::int from crm.stale_leads()), 0, 'and neither is nudged again');
reset role;
select is(
  (select (first_nudge_at is not null)::text || '|' || (second_nudge_at is not null)::text from crm.leads where name = 'Three Days'),
  'true|true', 'a second mark covers the first');
select is((select updated_at from crm.leads where name = 'Day Old'), '2026-01-01'::timestamptz, 'nudge bookkeeping does not touch updated_at');

-- Weekly summary, anchored to this Monday 00:00 ET so the test passes on any day:
-- Fresh and Handled land in last week, the other two in the week before.
update crm.leads set created_at = (date_trunc('week', now() at time zone 'America/New_York') at time zone 'America/New_York') - interval '3 days' where name in ('Fresh', 'Handled');
update crm.leads set created_at = (date_trunc('week', now() at time zone 'America/New_York') at time zone 'America/New_York') - interval '10 days' where name = 'Day Old';
update crm.leads set created_at = (date_trunc('week', now() at time zone 'America/New_York') at time zone 'America/New_York') - interval '8 days' where name in ('Three Days', 'Existing Soon');
update crm.lead_activity set at = (date_trunc('week', now() at time zone 'America/New_York') at time zone 'America/New_York') - interval '3 days' where kind = 'status';
set local role crm_alerts;
select is(
  (select s - 'from' - 'to' - 'oldest_new_hours' from crm.weekly_summary() s),
  '{"open": {"new": 4, "contacted": 1}, "moved": {"contacted": 1}, "new_in": 2, "by_reason": {"Something else": 1, "New patient inquiry": 1}, "untouched_new": 4, "stalled_contacted": 0}'::jsonb,
  'the weekly summary counts last week''s intake and movement, and what is open now');
select ok((select (s->>'oldest_new_hours')::int >= 240 from crm.weekly_summary() s), 'the oldest New lead is measured in hours');
select ok((select (s->>'from')::timestamptz = (s->>'to')::timestamptz - interval '7 days' from crm.weekly_summary() s)
          or (select extract(hour from ((s->>'from')::timestamptz at time zone 'America/New_York')) = 0 from crm.weekly_summary() s),
          'the window starts at Monday 00:00 Eastern');
reset role;

select * from finish();
rollback;
