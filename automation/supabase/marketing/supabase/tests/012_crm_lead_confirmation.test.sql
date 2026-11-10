-- 20261110000001_crm_lead_confirmation.sql: confirmation claim / mark / release.
begin;
select plan(12);

grant usage on schema extensions to crm_intake, crm_alerts;

select ok(
  has_function_privilege('crm_alerts', 'crm.claim_lead_confirmations(integer)', 'EXECUTE')
  and has_function_privilege('crm_alerts', 'crm.mark_leads_confirmed(uuid[])', 'EXECUTE')
  and has_function_privilege('crm_alerts', 'crm.release_lead_confirmations(uuid[])', 'EXECUTE'),
  'crm_alerts can claim, mark and release confirmations');
select ok(
  not has_function_privilege('anon', 'crm.claim_lead_confirmations(integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'crm.claim_lead_confirmations(integer)', 'EXECUTE')
  and not has_function_privilege('crm_intake', 'crm.claim_lead_confirmations(integer)', 'EXECUTE'),
  'nobody else can');

set local role crm_intake;
select count(*) from (select crm.submit_lead('Ada Obi', 'ada@example.com', null, 'Existing patient', repeat('2', 64))) s;
select count(*) from (select crm.submit_lead('Old Lead', 'old@example.com', null, 'Existing patient', repeat('3', 64))) s;
reset role;
update crm.leads set created_at = now() - interval '3 days' where name = 'Old Lead';

set local role crm_alerts;
create temp table c as select * from crm.claim_lead_confirmations(10);
reset role;

select is((select count(*)::int from c), 1, 'only leads from the last 2 days are claimed');
select is((select name || '|' || email || '|' || reason from c), 'Ada Obi|ada@example.com|Existing patient', 'the claim returns name, email and reason');

set local role crm_alerts;
select is((select count(*)::int from crm.claim_lead_confirmations(10)), 0, 'a fresh claim is not claimed twice');
select is(crm.release_lead_confirmations(array(select id from c)), 1, 'a claim can be released');
reset role;
select is(
  (select confirm_attempts::int || '|' || (confirm_claimed_at is null)::text from crm.leads where name = 'Ada Obi'),
  '0|true', 'releasing returns the attempt');

set local role crm_alerts;
select count(*) from (select crm.claim_lead_confirmations(10)) s;
select is(crm.mark_leads_confirmed(array(select id from c)), 1, 'a sent confirmation is marked');
select is((select count(*)::int from crm.claim_lead_confirmations(10)), 0, 'and never claimed again');
reset role;

set local role crm_alerts;
select is(crm.release_lead_confirmations(array(select id from c)), 0, 'a confirmed lead cannot be released');
reset role;

update crm.leads set confirm_attempts = 5, confirmed_at = null, confirm_claimed_at = null where name = 'Ada Obi';
set local role crm_alerts;
select is(crm.release_lead_confirmations(array(select id from c)), 0, 'an unclaimed lead is not released');
select is(crm.stuck_lead_confirmations(), 1, 'a recent lead out of attempts is counted as stuck');
reset role;

select * from finish();
rollback;
