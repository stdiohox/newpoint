-- newpoint-marketing: privileges and row-level security, in one place so the
-- whole access model can be read at once. docs/automation-architecture.md §4, §6.
--
-- Supabase grants ALL on new `public` tables to anon, authenticated and
-- service_role by default. None of them has any business here: runtimes connect
-- as members of marketing_rw / metrics_writer / n8n_ro, never through the Data
-- API. So every table is revoked from all three, and from PUBLIC.

revoke all on all tables in schema marketing from public, anon, authenticated, service_role;
revoke all on all tables in schema metrics   from public, anon, authenticated, service_role;
revoke all on public.providers, public.practice_facts
  from public, anon, authenticated, service_role;

-- marketing_rw: read/write marketing + public reference data; read metrics.
grant select, insert, update, delete on all tables in schema marketing to marketing_rw;
grant select, insert, update, delete on public.providers, public.practice_facts to marketing_rw;
grant select on all tables in schema metrics to marketing_rw;

-- metrics_writer: INSERT on metrics only. No SELECT, so it cannot read back.
grant insert on all tables in schema metrics to metrics_writer;

-- n8n_ro: read-only on marketing, public reference data and metrics.daily.
-- Not metrics.agent_health: the heartbeat digest reaches n8n as a payload (§5.9).
grant select on all tables in schema marketing to n8n_ro;
grant select on metrics.daily to n8n_ro;
grant select on public.providers, public.practice_facts to n8n_ro;

-- Future tables. Supabase's default privileges grant ALL on every new `public`
-- table to anon, authenticated and service_role, which would put the next table
-- on the Data API. These apply to objects created by the migration role, which
-- is the role that runs this file, and give the runtime roles the same access
-- to new tables that §4 gives them to the existing ones. A new table still needs
-- RLS and policies; 002_rls.test.sql fails until it has them.
alter default privileges in schema public, marketing, metrics
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema public, marketing, metrics
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges in schema public, marketing, metrics
  revoke all on functions from public, anon, authenticated, service_role;

alter default privileges in schema public, marketing
  grant select, insert, update, delete on tables to marketing_rw;
alter default privileges in schema public, marketing
  grant select on tables to n8n_ro;
alter default privileges in schema metrics grant select on tables to marketing_rw;
alter default privileges in schema metrics grant insert on tables to metrics_writer;

-- RLS on every table. Policies mirror the grants; grants decide WHAT a role may
-- do, RLS guarantees no role sees rows without an explicit policy.
do $$
declare
  t regclass;
begin
  foreach t in array array[
    'public.providers', 'public.practice_facts',
    'marketing.keywords', 'marketing.keyword_snapshots', 'marketing.content_backlog',
    'marketing.gbp_reviews', 'marketing.gbp_posts', 'marketing.social_posts',
    'marketing.geo_prompts', 'marketing.geo_runs'
  ]::regclass[]
  loop
    execute format('alter table %s enable row level security', t);
    execute format(
      'create policy marketing_rw_all on %s for all to marketing_rw using (true) with check (true)', t);
    execute format('create policy n8n_ro_read on %s for select to n8n_ro using (true)', t);
  end loop;

  foreach t in array array['metrics.daily', 'metrics.agent_health']::regclass[]
  loop
    execute format('alter table %s enable row level security', t);
    execute format('create policy marketing_rw_read on %s for select to marketing_rw using (true)', t);
    execute format('create policy metrics_writer_insert on %s for insert to metrics_writer with check (true)', t);
  end loop;
end
$$;

create policy n8n_ro_read on metrics.daily for select to n8n_ro using (true);
