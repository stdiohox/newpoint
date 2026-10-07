-- The privilege matrix, exercised as each role (§4, §6 layer 3).
begin;
select plan(20);

-- The roles must be able to call pgTAP while they are the current role. Supabase
-- installs pgTAP in `extensions`; this grant is rolled back with the test.
grant usage on schema extensions to marketing_rw, metrics_writer, n8n_ro, anon;

insert into marketing.keywords (id, term, source)
values ('00000000-0000-4000-8000-000000000001', 'psychiatric assessment lawrence township nj', 'manual');

-- n8n_ro: reads, never writes.
set local role n8n_ro;
select isnt_empty('select 1 from marketing.keywords', 'n8n_ro can read marketing.keywords');
select throws_ok(
  $$insert into marketing.keywords (term, source) values ('x', 'manual')$$,
  '42501', null, 'n8n_ro cannot insert into marketing.keywords');
select throws_ok(
  $$update public.practice_facts set confirmed = true$$,
  '42501', null, 'n8n_ro cannot update public.practice_facts');
select throws_ok(
  'select 1 from metrics.agent_health',
  '42501', null, 'n8n_ro cannot read metrics.agent_health');
reset role;

-- metrics_writer: insert-only, idempotent, cannot read back.
set local role metrics_writer;
select lives_ok(
  $$insert into metrics.daily (day, metric, value) values ('2026-10-02', 'inquiries', 12)$$,
  'metrics_writer can insert a daily count');
select lives_ok(
  $$insert into metrics.daily (day, metric, value) values ('2026-10-02', 'inquiries', 12)
    on conflict do nothing$$,
  'a retried push is a no-op (ON CONFLICT DO NOTHING needs only INSERT)');
select throws_ok(
  $$select * from metrics.daily$$,
  '42501', null, 'metrics_writer cannot read metrics.daily');
select throws_ok(
  $$insert into metrics.daily (day, metric, value) values ('2026-10-03', 'inquiries', 2)$$,
  '23514', null, 'metrics_writer cannot store an unsuppressed small count');
select throws_ok(
  $$insert into marketing.keywords (term, source) values ('x', 'manual')$$,
  '42501', null, 'metrics_writer cannot write outside metrics');
select lives_ok(
  $$insert into metrics.agent_health (task_id, reported_on, last_success_on, last_failure_on, failure_class)
    values ('referrals.lead-follow-up', '2026-10-02', '2026-10-02', '2026-10-01', 'vendor_5xx')
    on conflict do nothing$$,
  'metrics_writer can push a day-level agent_health row');
select throws_ok(
  $$insert into metrics.agent_health (task_id, reported_on, failure_class)
    values ('ops.crisis-page', '2026-10-02', 'timeout')$$,
  '23514', null, 'ops.crisis-page is never exported (a row would be a crisis count)');
select throws_ok(
  $$insert into metrics.agent_health (task_id, reported_on) values ('Not A Task', '2026-10-02')$$,
  '23514', null, 'agent_health.task_id must be a task id');
reset role;

-- marketing_rw: full CRUD on marketing, read-only on metrics.
set local role marketing_rw;
select lives_ok(
  $$insert into marketing.keywords (term, source, state) values ('telehealth psychiatry nj', 'manual', 'NJ')$$,
  'marketing_rw can insert a keyword');
select lives_ok(
  $$update marketing.keywords set cluster = 'telehealth' where state = 'NJ'$$,
  'marketing_rw can update a keyword');
select lives_ok(
  $$delete from marketing.keywords where state = 'NJ'$$,
  'marketing_rw can delete a keyword');
select isnt_empty('select 1 from metrics.daily', 'marketing_rw can read metrics.daily');
select isnt_empty('select 1 from metrics.agent_health', 'marketing_rw can read metrics.agent_health');
select throws_ok(
  $$insert into metrics.daily (day, metric, value) values ('2026-10-04', 'inquiries', 9)$$,
  '42501', null, 'marketing_rw cannot write metrics');
reset role;

-- anon (the Supabase Data API role) sees nothing.
set local role anon;
select throws_ok('select 1 from marketing.keywords', '42501', null, 'anon cannot read marketing');
select throws_ok('select 1 from public.providers', '42501', null, 'anon cannot read public.providers');
reset role;

select * from finish();
rollback;
