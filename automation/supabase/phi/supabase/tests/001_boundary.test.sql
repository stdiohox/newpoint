-- The PHI project's boundary (docs/automation-architecture.md §4, §6 layer 3).
begin;
select plan(12);

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('phi', 'ops') and c.relkind in ('r', 'p') and not c.relrowsecurity),
  0, 'RLS is on for every table in phi and ops');

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace, lateral aclexplode(c.relacl) a
    where n.nspname in ('phi', 'ops') and a.grantee = 0),
  0, 'PUBLIC holds no grant on any phi or ops relation');

select is(
  (select count(*)::int
     from pg_class c join pg_namespace n on n.oid = c.relnamespace,
          (values ('anon'), ('authenticated'), ('service_role')) r(role_name)
    where n.nspname in ('phi', 'ops') and c.relkind in ('r', 'p', 'v')
      and has_table_privilege(r.role_name, c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')),
  0, 'the Supabase API roles hold nothing in phi or ops');

select is(
  (select count(*)::int from (values ('anon'), ('authenticated'), ('service_role')) r(role_name), (values ('phi'), ('ops')) s(n)
    where has_schema_privilege(r.role_name, s.n, 'USAGE')),
  0, 'the Supabase API roles have no USAGE on phi or ops');

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('phi', 'ops') and p.prosecdef),
  0, 'no SECURITY DEFINER function in phi or ops');

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('phi', 'ops') and c.relkind = 'v' and not coalesce('security_invoker=true' = any (c.reloptions), false)),
  0, 'every view is security_invoker');

select is(
  (select count(*)::int
     from pg_class c join pg_namespace n on n.oid = c.relnamespace,
          (values ('phi_tasks'), ('phi_edge'), ('staff_console')) r(role_name)
    where n.nspname in ('phi', 'ops') and c.relkind in ('r', 'p')
      and has_table_privilege(r.role_name, c.oid, 'DELETE,TRUNCATE')),
  0, 'no runtime role can DELETE or TRUNCATE anything (retention clears values instead)');

select is(
  (select count(*)::int from (values ('phi_tasks'), ('phi_edge'), ('staff_console')) r(role_name)
    where has_table_privilege(r.role_name, 'phi.audit_log', 'SELECT,UPDATE')),
  0, 'the audit log is append-only: no runtime role reads it back or edits it');

select ok(
  has_table_privilege('phi_tasks', 'phi.audit_log', 'INSERT') and has_table_privilege('staff_console', 'phi.audit_log', 'INSERT'),
  'every runtime role can append to the audit log');

select is(
  (select count(*)::int from (values ('phi_tasks'), ('phi_edge'), ('staff_console')) r(role_name)
    where has_table_privilege(r.role_name, 'phi.consents', 'UPDATE')),
  0, 'consents are append-only for every runtime role');

select is(
  (select count(*)::int from pg_roles where rolname in ('phi_tasks', 'phi_edge', 'staff_console') and (rolcanlogin or rolbypassrls or rolsuper)),
  0, 'group roles cannot log in and cannot bypass RLS');

select ok(
  not has_table_privilege('phi_edge', 'phi.crisis_events', 'SELECT') and not has_table_privilege('phi_edge', 'phi.appointments', 'SELECT'),
  'Edge Functions see only the inbound tables');

select * from finish();
rollback;
