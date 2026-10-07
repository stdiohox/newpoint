-- Structure of the marketing project: schemas, tables, enums, constraints.
begin;
select plan(13);

select has_schema('marketing');
select has_schema('metrics');

select tables_are('marketing', array[
  'keywords', 'keyword_snapshots', 'content_backlog', 'gbp_reviews',
  'gbp_posts', 'social_posts', 'geo_prompts', 'geo_runs'
]);
select tables_are('metrics', array['daily', 'agent_health']);
select has_table('public', 'providers', 'public.providers exists');
select has_table('public', 'practice_facts', 'public.practice_facts exists');

select enum_has_labels('metrics', 'failure_class',
  array['vendor_4xx', 'vendor_5xx', 'rate_limited', 'validation', 'timeout', 'unknown']);

-- Exact label list: there is no crisis metric, so crisis counts cannot be exported.
select enum_has_labels('metrics', 'metric_name',
  array['inquiries', 'bookings_completed', 'review_requests_sent', 'follow_up_conversions']);

select col_is_pk('metrics', 'daily', array['day', 'metric']);

-- Small-cell suppression is enforced by the database, not by the writer.
select throws_ok(
  $$insert into metrics.daily (day, metric, value) values ('2026-10-01', 'inquiries', 3)$$,
  '23514', null, 'metrics.daily rejects a count below 5');
select lives_ok(
  $$insert into metrics.daily (day, metric, value) values ('2026-10-01', 'bookings_completed', null)$$,
  'metrics.daily accepts NULL (suppressed)');
select lives_ok(
  $$insert into metrics.daily (day, metric, value) values ('2026-10-01', 'review_requests_sent', 5)$$,
  'metrics.daily accepts 5');

select throws_ok(
  $$insert into public.providers (slug, name, display_name, role, states_licensed)
    values ('x', 'X', 'X', 'Role', array['NY'])$$,
  '23514', null, 'providers.states_licensed only allows NJ and PA');

select * from finish();
rollback;
