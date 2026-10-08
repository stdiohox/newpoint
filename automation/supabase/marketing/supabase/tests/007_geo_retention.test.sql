-- 90-day retention for geo_runs details.
begin;
select plan(3);

grant usage on schema extensions to marketing_rw;

select has_column('marketing', 'geo_runs', 'details_purged_at', 'geo_runs records when its details were purged');
select col_is_null('marketing', 'geo_runs', 'answer_excerpt', 'answer_excerpt can be cleared');

set local role marketing_rw;
select lives_ok(
  $$update marketing.geo_runs set answer_excerpt = null, competitors_mentioned = null, details_purged_at = now()
     where run_at < now() - interval '90 days' and details_purged_at is null$$,
  'marketing_rw can run the purge');
reset role;

select * from finish();
rollback;
