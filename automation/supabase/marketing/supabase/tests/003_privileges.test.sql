-- Privilege matrix for the marketing project (§4 "Roles — newpoint-marketing").
begin;
select plan(22);

create temp table app_tables on commit drop as
select c.oid as relid, n.nspname as schema_name, c.relname as table_name
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where c.relkind in ('r', 'p')
   and n.nspname in ('marketing', 'metrics', 'public');

select is((select count(*)::int from app_tables), 12, 'twelve application tables');

-- Supabase API roles and PUBLIC hold nothing.
select is(
  (select count(*)::int from app_tables
    where has_table_privilege('anon', relid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')),
  0, 'anon has no privilege on any application table');
select is(
  (select count(*)::int from app_tables
    where has_table_privilege('authenticated', relid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')),
  0, 'authenticated has no privilege on any application table');
select is(
  (select count(*)::int from app_tables
    where has_table_privilege('service_role', relid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')),
  0, 'service_role has no privilege on any application table');
select is(
  (select count(*)::int
     from app_tables t join pg_class c on c.oid = t.relid,
          lateral aclexplode(c.relacl) a
    where a.grantee = 0),
  0, 'PUBLIC has no privilege on any application table');
select is(
  (select count(*)::int
     from (values ('anon'), ('authenticated'), ('service_role')) r(role_name),
          (values ('marketing'), ('metrics')) s(schema_name)
    where has_schema_privilege(r.role_name, s.schema_name, 'USAGE')),
  0, 'Supabase API roles have no USAGE on marketing or metrics');

-- n8n_ro: read everything except metrics.agent_health, write nothing.
select is(
  (select count(*)::int from app_tables
    where not (schema_name = 'metrics' and table_name = 'agent_health')
      and has_table_privilege('n8n_ro', relid, 'SELECT')),
  11, 'n8n_ro can SELECT marketing, public reference data and metrics.daily');
select ok(
  not has_table_privilege('n8n_ro', 'metrics.agent_health', 'SELECT'),
  'n8n_ro cannot read metrics.agent_health');
select is(
  (select count(*)::int from app_tables
    where has_table_privilege('n8n_ro', relid, 'INSERT,UPDATE,DELETE,TRUNCATE')),
  0, 'n8n_ro cannot write any application table');

-- metrics_writer: INSERT on metrics.*, nothing else anywhere.
select is(
  (select count(*)::int from app_tables
    where schema_name = 'metrics' and has_table_privilege('metrics_writer', relid, 'INSERT')),
  2, 'metrics_writer can INSERT into both metrics tables');
select is(
  (select count(*)::int from app_tables
    where has_table_privilege('metrics_writer', relid, 'SELECT,UPDATE,DELETE,TRUNCATE')),
  0, 'metrics_writer cannot SELECT, UPDATE or DELETE anything');
select is(
  (select count(*)::int from app_tables
    where schema_name <> 'metrics'
      and has_table_privilege('metrics_writer', relid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),
  0, 'metrics_writer has no privilege outside metrics');

-- marketing_rw: read/write marketing + public, read-only on metrics.
select is(
  (select count(*)::int from app_tables
    where schema_name <> 'metrics'
      and has_table_privilege('marketing_rw', relid, 'SELECT')
      and has_table_privilege('marketing_rw', relid, 'INSERT')
      and has_table_privilege('marketing_rw', relid, 'UPDATE')
      and has_table_privilege('marketing_rw', relid, 'DELETE')),
  10, 'marketing_rw can read and write every marketing and public table');
select is(
  (select count(*)::int from app_tables
    where schema_name = 'metrics'
      and has_table_privilege('marketing_rw', relid, 'SELECT')
      and not has_table_privilege('marketing_rw', relid, 'INSERT,UPDATE,DELETE,TRUNCATE')),
  2, 'marketing_rw is read-only on metrics');

-- Group roles cannot log in and cannot bypass RLS.
select is(
  (select count(*)::int from pg_roles
    where rolname in ('marketing_rw', 'metrics_writer', 'n8n_ro') and rolcanlogin),
  0, 'group roles are NOLOGIN');
select is(
  (select count(*)::int from pg_roles
    where rolname in ('marketing_rw', 'metrics_writer', 'n8n_ro') and (rolbypassrls or rolsuper)),
  0, 'group roles cannot bypass RLS');

-- Future tables, as a later migration would create them (as the migration role).
create table public.zz_future (id int primary key);
create table marketing.zz_future (id int primary key);
create table metrics.zz_future (id int primary key);

select is(
  (select count(*)::int
     from (values ('anon'), ('authenticated'), ('service_role')) r(role_name),
          (values ('public.zz_future'), ('marketing.zz_future'), ('metrics.zz_future')) t(table_name)
    where has_table_privilege(r.role_name, t.table_name, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')),
  0, 'a future table grants nothing to the Supabase API roles');
select ok(
  has_table_privilege('marketing_rw', 'public.zz_future', 'SELECT,INSERT,UPDATE,DELETE')
    and has_table_privilege('marketing_rw', 'marketing.zz_future', 'SELECT,INSERT,UPDATE,DELETE'),
  'marketing_rw gets read/write on future public and marketing tables');
select ok(
  has_table_privilege('n8n_ro', 'public.zz_future', 'SELECT')
    and has_table_privilege('n8n_ro', 'marketing.zz_future', 'SELECT')
    and not has_table_privilege('n8n_ro', 'marketing.zz_future', 'INSERT,UPDATE,DELETE,TRUNCATE'),
  'n8n_ro gets read-only on future public and marketing tables');
select ok(
  not has_table_privilege('n8n_ro', 'metrics.zz_future', 'SELECT'),
  'n8n_ro gets nothing on a future metrics table (only metrics.daily is granted)');
select ok(
  has_table_privilege('metrics_writer', 'metrics.zz_future', 'INSERT')
    and not has_table_privilege('metrics_writer', 'metrics.zz_future', 'SELECT,UPDATE,DELETE,TRUNCATE'),
  'metrics_writer gets insert-only on a future metrics table');
select ok(
  has_table_privilege('marketing_rw', 'metrics.zz_future', 'SELECT')
    and not has_table_privilege('marketing_rw', 'metrics.zz_future', 'INSERT,UPDATE,DELETE,TRUNCATE'),
  'marketing_rw gets read-only on a future metrics table');

select * from finish();
rollback;
