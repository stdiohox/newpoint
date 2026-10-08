-- newpoint-marketing: 90-day retention for geo_runs details.
--
-- answer_excerpt and competitors_mentioned hold third-party names (practices
-- and named clinicians quoted from AI answers). geo.recommendations reads four
-- weeks; ops.geo-retention clears both after 90 days. The measurement itself
-- (mentioned, cited, cited URLs, engine, run_at) is kept for trend lines.
--
-- details_purged_at tells a purged row from a failed extraction: both leave
-- competitors_mentioned NULL, and only a purged row has this set.
alter table marketing.geo_runs add column details_purged_at timestamptz;

comment on column marketing.geo_runs.details_purged_at is
  'Set when ops.geo-retention cleared answer_excerpt and competitors_mentioned (90 days after run_at).';

-- The purge selects unpurged rows by age.
create index geo_runs_unpurged_run_at on marketing.geo_runs (run_at) where details_purged_at is null;
