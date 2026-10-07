-- newpoint-marketing: group roles and schemas.
-- docs/automation-architecture.md §4 "Roles — newpoint-marketing".
--
-- These are NOLOGIN group roles. The login users that runtimes connect as are
-- created per environment, outside git, as members of these roles (see
-- automation/README.md "Supabase: login users"). No password ever lives in a
-- migration.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'marketing_rw') then
    create role marketing_rw nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'metrics_writer') then
    create role metrics_writer nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'n8n_ro') then
    create role n8n_ro nologin;
  end if;
end
$$;

comment on role marketing_rw is 'Trigger.dev newpoint-marketing tasks: read/write marketing + public, read metrics.';
comment on role metrics_writer is 'ops.aggregate-metrics in the PHI project: INSERT on metrics.* only.';
comment on role n8n_ro is 'n8n on Hostinger: read-only on marketing, public, metrics.daily.';

create schema if not exists marketing;
create schema if not exists metrics;

-- Nothing in these schemas is reachable by default. Usage is granted per role.
revoke all on schema marketing from public;
revoke all on schema metrics from public;

grant usage on schema marketing to marketing_rw, n8n_ro;
grant usage on schema metrics to marketing_rw, metrics_writer, n8n_ro;
grant usage on schema public to marketing_rw, n8n_ro;
