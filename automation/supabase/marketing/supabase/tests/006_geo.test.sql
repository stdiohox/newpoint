-- Phase 2 schema changes (§5.6).
begin;
select plan(6);

-- pgTAP lives in `extensions`; rolled back with the test.
grant usage on schema extensions to marketing_rw;

select ok('citation' = any (enum_range(null::marketing.backlog_kind)::text[]), 'backlog_kind has citation');
select has_column('marketing', 'geo_prompts', 'cluster', 'geo_prompts records the cluster a prompt came from');
select col_is_null('marketing', 'geo_runs', 'competitors_mentioned', 'competitors_mentioned may be NULL (extraction failed)');
select col_hasnt_default('marketing', 'geo_runs', 'competitors_mentioned', 'competitors_mentioned has no default of "none"');

insert into marketing.geo_prompts (id, prompt, state, cluster)
values ('00000000-0000-4000-8000-0000000000b1', 'Who offers psychiatric assessment in New Jersey?', 'NJ', 'psychiatric assessment');

set local role marketing_rw;
select lives_ok(
  $$insert into marketing.geo_runs (prompt_id, engine, newpoint_mentioned, newpoint_cited, cited_urls, competitors_mentioned)
    values ('00000000-0000-4000-8000-0000000000b1', 'claude-sonnet-5-5+web_search', false, false, '{}', null)$$,
  'marketing_rw can record a run whose competitors are unknown');
select lives_ok(
  $$insert into marketing.content_backlog (kind, target, rationale, source_agent)
    values ('citation', 'psychologytoday.com', 'r', 'geo.recommendations')$$,
  'marketing_rw can propose a citation target');
reset role;

select * from finish();
rollback;
