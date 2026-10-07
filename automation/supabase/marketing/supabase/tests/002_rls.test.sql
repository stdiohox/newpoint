-- Row-level security and the "no privileged objects" rules (§6 layer 3).
begin;
select plan(5);

select is(
  (select count(*)::int
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('marketing', 'metrics', 'public')
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity),
  0,
  'RLS is enabled on every table in marketing, metrics and public');

select is(
  (select count(*)::int
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('marketing', 'metrics', 'public')
      and c.relkind = 'v'
      and not coalesce('security_invoker=true' = any (c.reloptions), false)),
  0,
  'every view is security_invoker');

-- Functions installed by extensions (pg_depend deptype ''e'') are not ours.
select is(
  (select count(*)::int
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('marketing', 'metrics', 'public')
      and p.prosecdef
      and not exists (select 1 from pg_depend d
                       where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')),
  0,
  'no SECURITY DEFINER functions in marketing, metrics or public');

select is(
  (select count(*)::int
     from pg_policy pol
     join pg_class c on c.oid = pol.polrelid
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('marketing', 'metrics', 'public')
      and 0 = any (pol.polroles)),
  0,
  'no policy applies to PUBLIC');

select is(
  (select count(*)::int
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('marketing', 'metrics', 'public')
      and c.relkind in ('r', 'p')
      and not exists (select 1 from pg_policy pol where pol.polrelid = c.oid)),
  0,
  'every table has at least one policy (RLS with none denies every row)');

select * from finish();
rollback;
