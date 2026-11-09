-- The lead CRM (20261109000001_crm.sql): privileges, RLS and behaviour per role.
begin;
select plan(39);

-- pgTAP lives in `extensions`; these grants roll back with the test.
grant usage on schema extensions to crm_intake, crm_alerts;

-- ------------------------------------------------------------ structure and privileges

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'crm' and c.relkind in ('r', 'p') and not c.relrowsecurity),
  0, 'RLS is enabled on every crm table');

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'crm' and c.relkind in ('r', 'p')
      and (has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        or has_table_privilege('service_role', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'))),
  0, 'anon and service_role hold no privilege on any crm table');

select is(
  (select count(*)::int
     from (values ('anon'), ('service_role'), ('marketing_rw'), ('metrics_writer'), ('n8n_ro')) r(role_name)
    where has_schema_privilege(r.role_name, 'crm', 'USAGE')),
  0, 'anon, service_role and the marketing roles have no USAGE on crm');

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'crm' and has_function_privilege('anon', p.oid, 'EXECUTE')),
  0, 'anon (and so PUBLIC) can execute no crm function');

select ok(
  not has_function_privilege('authenticated', 'crm.submit_lead(text, text, text, text, text)', 'EXECUTE'),
  'authenticated cannot call crm.submit_lead');
select ok(
  has_function_privilege('crm_intake', 'crm.submit_lead(text, text, text, text, text)', 'EXECUTE'),
  'crm_intake can call crm.submit_lead');
select ok(
  not has_function_privilege('authenticated', 'crm.claim_lead_alerts(integer)', 'EXECUTE'),
  'authenticated cannot claim alerts');
select ok(
  not has_table_privilege('authenticated', 'crm.leads', 'INSERT,DELETE,TRUNCATE'),
  'authenticated cannot insert, delete or truncate leads');
select ok(
  not has_column_privilege('authenticated', 'crm.leads', 'name', 'UPDATE')
  and not has_column_privilege('authenticated', 'crm.leads', 'email', 'UPDATE')
  and not has_column_privilege('authenticated', 'crm.leads', 'phone', 'UPDATE'),
  'authenticated cannot edit what the visitor submitted');
select ok(
  not has_column_privilege('authenticated', 'crm.lead_activity', 'actor_id', 'INSERT'),
  'authenticated cannot choose the author of a note');
select ok(
  not has_table_privilege('authenticated', 'crm.intake_rate', 'SELECT'),
  'authenticated cannot read the rate-limit table');

-- ------------------------------------------------------------ fixtures

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'staff@example.com'),
  ('00000000-0000-4000-8000-0000000000b2', 'outsider@example.com');
insert into crm.staff (user_id, email, display_name)
values ('00000000-0000-4000-8000-0000000000a1', 'staff@example.com', 'Front desk');

-- ------------------------------------------------------------ crm_intake

set local role crm_intake;
select lives_ok(
  $$select crm.submit_lead('Ada Lovelace', ' Ada@Example.com ', '', 'New patient inquiry', repeat('a', 64))$$,
  'crm_intake can submit a lead');
select throws_ok('select 1 from crm.leads', '42501', null, 'crm_intake cannot read leads');
reset role;

select is(
  (select email || '|' || coalesce(phone, 'null') from crm.leads where name = 'Ada Lovelace'),
  'ada@example.com|null', 'email is trimmed and lowercased; an empty phone is stored as null');
select is(
  (select count(*)::int from crm.lead_activity a join crm.leads l on l.id = a.lead_id
    where l.name = 'Ada Lovelace' and a.kind = 'created' and a.actor_id is null),
  1, 'a submitted lead gets a "created" history entry from the system');

set local role crm_intake;
select count(*) from (
  select crm.submit_lead('Visitor ' || i, 'v' || i || '@example.com', null, 'Something else', repeat('a', 64))
    from generate_series(2, 5) i) s;
select throws_ok(
  $$select crm.submit_lead('Sixth', 'six@example.com', null, 'Something else', repeat('a', 64))$$,
  'P0001', 'rate_limited', 'a sixth submission from one IP in an hour is refused');

select count(*) from (
  select crm.submit_lead('Repeat', 'repeat@example.com', null, 'Existing patient', repeat(k, 64))
    from unnest(array['b', 'c', 'd']) k) s;
select throws_ok(
  $$select crm.submit_lead('Repeat', 'REPEAT@example.com', null, 'Existing patient', repeat('e', 64))$$,
  'P0001', 'rate_limited', 'a fourth submission for one email in a day is refused');

select throws_ok(
  $$select crm.submit_lead('X', 'x@example.com', null, 'I feel anxious', repeat('f', 64))$$,
  '23514', null, 'a reason outside the four fixed ones is refused');
select throws_ok(
  $$select crm.submit_lead('X', 'x@example.com', null, 'Something else', '1.2.3.4')$$,
  '22023', null, 'a raw IP (not an HMAC) is refused as the client key');
select throws_ok(
  $$select crm.submit_lead('X', 'not-an-email', null, 'Something else', repeat('f', 64))$$,
  '23514', null, 'a malformed email is refused');
select throws_ok(
  $$select crm.submit_lead('X', 'x@example.com', 'call me maybe', 'Something else', repeat('f', 64))$$,
  '23514', null, 'a phone with letters is refused');
reset role;

-- ------------------------------------------------------------ authenticated, not staff

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000b2';
select is((select count(*)::int from crm.leads), 0, 'a signed-in non-staff user sees no leads');
with u as (update crm.leads set status = 'contacted' returning 1)
select is((select count(*)::int from u), 0, 'a signed-in non-staff user updates nothing');
select is((select count(*)::int from crm.staff), 0, 'a signed-in non-staff user sees no staff list');
reset role;

-- ------------------------------------------------------------ staff

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000a1';
select is((select count(*)::int from crm.leads), 8, 'staff see every lead');
select lives_ok(
  $$update crm.leads set status = 'contacted', owner_id = '00000000-0000-4000-8000-0000000000a1'
     where name = 'Ada Lovelace'$$,
  'staff can change status and owner');
select throws_ok(
  $$update crm.leads set name = 'Changed' where name = 'Ada Lovelace'$$,
  '42501', null, 'staff cannot change a lead''s name');
select lives_ok(
  $$insert into crm.lead_activity (lead_id, kind, body)
    select id, 'note', 'Left a voicemail.' from crm.leads where name = 'Ada Lovelace'$$,
  'staff can add a note');
select throws_ok(
  $$insert into crm.lead_activity (lead_id, kind)
    select id, 'status' from crm.leads where name = 'Ada Lovelace'$$,
  '42501', null, 'staff cannot forge a status history entry');
select throws_ok(
  $$delete from crm.leads$$, '42501', null, 'staff cannot delete leads');
select lives_ok('select crm.password_changed()', 'staff can clear their own first-sign-in flag');
reset role;

select is(
  (select count(*)::int from crm.lead_activity a join crm.leads l on l.id = a.lead_id
    where l.name = 'Ada Lovelace' and a.kind = 'status' and a.from_status = 'new'
      and a.to_status = 'contacted' and a.actor_id = '00000000-0000-4000-8000-0000000000a1'),
  1, 'the status change is recorded against the signed-in user');
select is(
  (select count(*)::int from crm.lead_activity a join crm.leads l on l.id = a.lead_id
    where l.name = 'Ada Lovelace' and a.kind = 'note' and a.actor_id = '00000000-0000-4000-8000-0000000000a1'),
  1, 'the note is attributed to the signed-in user');
select ok(
  not (select must_change_password from crm.staff where email = 'staff@example.com'),
  'the first-sign-in flag is cleared');

-- ------------------------------------------------------------ crm_alerts

set local role crm_alerts;
create temp table claimed as select * from crm.claim_lead_alerts(100);
select is((select count(*)::int from claimed), 8, 'crm_alerts claims every unsent alert');
select is((select count(*)::int from crm.claim_lead_alerts(100)), 0, 'a claimed alert is not claimed twice');
select throws_ok('select 1 from crm.leads', '42501', null, 'crm_alerts cannot read leads');
select is(
  (select array_agg(email) from crm.alert_recipients()), array['staff@example.com'],
  'alert recipients are active staff with alerts on');
select is(
  crm.mark_leads_alerted(array(select id from claimed)), 8, 'sent alerts are marked');
reset role;

select * from finish();
rollback;
