-- 20261109000002_crm_hardening.sql: alert release, stuck count, history integrity.
begin;
select plan(9);

grant usage on schema extensions to crm_intake, crm_alerts;

select ok(
  has_function_privilege('crm_alerts', 'crm.release_lead_alerts(uuid[])', 'EXECUTE')
  and has_function_privilege('crm_alerts', 'crm.stuck_lead_alerts()', 'EXECUTE'),
  'crm_alerts can release claims and count stuck alerts');
select ok(
  not has_function_privilege('anon', 'crm.release_lead_alerts(uuid[])', 'EXECUTE')
  and not has_function_privilege('authenticated', 'crm.stuck_lead_alerts()', 'EXECUTE'),
  'nobody else can');
select ok(
  has_function_privilege('crm_intake', 'crm.submit_lead(text, text, text, text, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'crm.submit_lead(text, text, text, text, text)', 'EXECUTE'),
  'submit_lead keeps its grants after being replaced');

insert into auth.users (id, email) values ('00000000-0000-4000-8000-0000000000c3', 'desk@example.com');
insert into crm.staff (user_id, email, display_name)
values ('00000000-0000-4000-8000-0000000000c3', 'desk@example.com', 'Front desk');

set local role crm_intake;
select count(*) from (select crm.submit_lead('Mary', 'mary@example.com', null, 'Existing patient', repeat('1', 64))) s;
reset role;

update crm.leads set updated_at = '2026-01-01' where name = 'Mary';

set local role crm_alerts;
create temp table c as select * from crm.claim_lead_alerts(10);
select is(crm.release_lead_alerts(array(select id from c)), 1, 'a claim can be released');
reset role;

select is(
  (select alert_attempts::int || '|' || (alert_claimed_at is null)::text from crm.leads where name = 'Mary'),
  '0|true', 'releasing returns the attempt and clears the claim');
select is(
  (select updated_at from crm.leads where name = 'Mary'), '2026-01-01'::timestamptz,
  'alert bookkeeping does not touch updated_at');

update crm.leads set alert_attempts = 5 where name = 'Mary';
set local role crm_alerts;
select is(crm.stuck_lead_alerts(), 1, 'a lead out of attempts is counted as stuck');
reset role;

insert into crm.lead_activity (lead_id, actor_id, kind, body)
select id, '00000000-0000-4000-8000-0000000000c3', 'note', 'Called back.' from crm.leads where name = 'Mary';
select throws_ok(
  $$delete from crm.staff where email = 'desk@example.com'$$,
  '23503', null, 'a staff member with history cannot be deleted (deactivate instead)');
select throws_ok(
  $$delete from auth.users where email = 'desk@example.com'$$,
  '23503', null, 'nor can their sign-in account');

select * from finish();
rollback;
