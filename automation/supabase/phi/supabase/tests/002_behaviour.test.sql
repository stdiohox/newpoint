-- PHI tables as each role sees them (§4, §6).
begin;
select plan(11);

grant usage on schema extensions to phi_tasks, staff_console;

set local role phi_tasks;
set local newpoint.actor = 'task:messaging.send-sms';
insert into phi.contacts (id, first_name, phone_e164) values ('00000000-0000-4000-8000-0000000000c1', 'Test', '+16095550100');
insert into phi.consents (contact_id, kind, granted_at, source, evidence)
values ('00000000-0000-4000-8000-0000000000c1', 'sms_transactional', now() - interval '1 day', 'web_form', '{"wording_version": 0}');
insert into phi.consents (contact_id, kind, revoked_at, source, evidence)
values ('00000000-0000-4000-8000-0000000000c1', 'sms_transactional', now(), 'sms_keyword', '{"keyword": "STOP"}');
select is(
  (select active from phi.consent_state where contact_id = '00000000-0000-4000-8000-0000000000c1' and kind = 'sms_transactional'),
  false, 'the latest consent event decides: a STOP after a grant means no consent');
insert into phi.crisis_events (id, contact_id, channel, detected_by)
values ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000c1', 'sms', 'keyword');
select throws_ok(
  $$update phi.crisis_events set sequences_resumed_at = now() where id = '00000000-0000-4000-8000-0000000000e1'$$,
  '42501', null, 'a task credential cannot resume sequences (a clinician decision; the check constraint backs it)');
reset role;

select is(
  (select count(*)::int from phi.audit_log where entity = 'contacts' and actor = 'task:messaging.send-sms'),
  1, 'a task write is audited with the task as actor');

-- The console with no verified claim sees nothing.
set local role staff_console;
select is((select count(*)::int from phi.contacts), 0, 'no claim, no rows');
reset role;

-- An admin reads the queue but cannot acknowledge a crisis.
set local role staff_console;
set local request.jwt.claims = '{"sub": "admin-1", "staff_role": "staff_admin"}';
select is((select count(*)::int from phi.contacts), 1, 'staff_admin reads contacts');
update phi.crisis_events set staff_ack_at = now(), staff_ack_by = 'admin-1' where id = '00000000-0000-4000-8000-0000000000e1';
select is(
  (select staff_ack_at from phi.crisis_events where id = '00000000-0000-4000-8000-0000000000e1'),
  null, 'staff_admin cannot acknowledge a crisis (RLS matches no row)');
select throws_ok(
  $$insert into phi.review_exclusions (contact_id, set_by) values ('00000000-0000-4000-8000-0000000000c1', 'admin-1')$$,
  '42501', null, 'staff_admin cannot exclude a patient from reviews');
reset role;

-- A clinician acknowledges, then resumes.
set local role staff_console;
set local request.jwt.claims = '{"sub": "clin-1", "staff_role": "staff_clinician"}';
update phi.crisis_events set staff_ack_at = now(), staff_ack_by = 'clin-1' where id = '00000000-0000-4000-8000-0000000000e1';
select is(
  (select staff_ack_by from phi.crisis_events where id = '00000000-0000-4000-8000-0000000000e1'),
  'clin-1', 'staff_clinician acknowledges a crisis');
select lives_ok(
  $$insert into phi.review_exclusions (contact_id, set_by) values ('00000000-0000-4000-8000-0000000000c1', 'clin-1')$$,
  'staff_clinician excludes a patient from reviews, no reason required');
select throws_ok(
  $$update phi.contacts set first_name = 'Changed'$$,
  '42501', null, 'the console cannot edit contact details, only age status');
reset role;

-- One review request per contact per 12 months, enforced in SQL.
insert into phi.appointments (id, contact_id, provider_id, adapter, external_ref, starts_at, status)
values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000c1', 'funmilayo-whitaker', 'manual-queue', 'x1', now() - interval '60 days', 'completed'),
       ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000c1', 'funmilayo-whitaker', 'manual-queue', 'x2', now() - interval '1 day', 'completed');
insert into phi.review_requests (appointment_id, contact_id, scheduled_for, sent_at, status)
values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000c1', now() - interval '59 days', now() - interval '59 days', 'sent');
select throws_ok(
  $$insert into phi.review_requests (appointment_id, contact_id, scheduled_for, sent_at, status)
    values ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000c1', now(), now(), 'sent')$$,
  '23514', null, 'a second review request inside 12 months is refused');

select * from finish();
rollback;
