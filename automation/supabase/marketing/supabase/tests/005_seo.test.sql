-- Phase 1 objects: the backlog dedupe key and the movers view (§5.3).
begin;
select plan(10);

grant usage on schema extensions to n8n_ro, anon;

select has_view('marketing', 'rank_movers', 'marketing.rank_movers exists');
select ok(
  (select 'security_invoker=true' = any (c.reloptions)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'marketing' and c.relname = 'rank_movers'),
  'rank_movers is security_invoker');

-- Backlog: one open item per (kind, target), case-insensitive.
insert into marketing.content_backlog (kind, target, rationale, source_agent)
values ('faq', 'what is a psychiatric assessment', 'r', 'seo.keyword-research');
select lives_ok(
  $$insert into marketing.content_backlog (kind, target, rationale, source_agent)
    values ('faq', 'What Is A Psychiatric Assessment', 'r', 'seo.keyword-research')
    on conflict (kind, lower(target)) where status in ('proposed', 'accepted') do nothing$$,
  'a duplicate open backlog item is a no-op');
select is(
  (select count(*)::int from marketing.content_backlog where lower(target) = 'what is a psychiatric assessment'),
  1, 'still one open item');
update marketing.content_backlog set status = 'rejected' where lower(target) = 'what is a psychiatric assessment';
select lives_ok(
  $$insert into marketing.content_backlog (kind, target, rationale, source_agent)
    values ('faq', 'what is a psychiatric assessment', 'r', 'seo.keyword-research')$$,
  'a rejected item does not block a new proposal');

-- Movers: anchored on the newest snapshot; >= 3 positions either way.
insert into marketing.keywords (id, term, source) values
  ('00000000-0000-4000-8000-0000000000a1', 'psychiatric assessment lawrenceville nj', 'manual'),
  ('00000000-0000-4000-8000-0000000000a2', 'medication management new jersey', 'manual'),
  ('00000000-0000-4000-8000-0000000000a3', 'telehealth psychiatric care pennsylvania', 'manual');
insert into marketing.keyword_snapshots (keyword_id, date, gsc_position, impressions, clicks)
select k.id, d::date, p.pos, 10, 1
  from (values
          ('00000000-0000-4000-8000-0000000000a1'::uuid, 12.0, 6.0),   -- up 6
          ('00000000-0000-4000-8000-0000000000a2'::uuid,  4.0, 9.0),   -- down 5
          ('00000000-0000-4000-8000-0000000000a3'::uuid,  8.0, 9.0))   -- 1: not a mover
       as k(id, prev, now_pos)
 cross join generate_series('2026-09-17'::date, '2026-09-30'::date, '1 day') d
 cross join lateral (select case when d::date > '2026-09-23' then k.now_pos else k.prev end as pos) p;

select set_eq(
  $$select keyword_id::text, improvement from marketing.rank_movers$$,
  $$values ('00000000-0000-4000-8000-0000000000a1', 6.00), ('00000000-0000-4000-8000-0000000000a2', -5.00)$$,
  'rank_movers reports the two keywords that moved 3+ positions, signed');

-- One low-impression day cannot make a mover: impression-weighted, not a plain average.
insert into marketing.keywords (id, term, source)
values ('00000000-0000-4000-8000-0000000000a4', 'psychiatric nurse practitioner near me', 'manual');
insert into marketing.keyword_snapshots (keyword_id, date, gsc_position, impressions, clicks) values
  ('00000000-0000-4000-8000-0000000000a4', '2026-09-20', 10, 100, 0),
  ('00000000-0000-4000-8000-0000000000a4', '2026-09-28', 10, 100, 0),
  ('00000000-0000-4000-8000-0000000000a4', '2026-09-29', 40, 1, 0);
select is_empty(
  $$select 1 from marketing.rank_movers where keyword_id = '00000000-0000-4000-8000-0000000000a4'$$,
  'a single one-impression day does not make a mover');

set local role n8n_ro;
select isnt_empty('select 1 from marketing.rank_movers', 'n8n_ro can read rank_movers');
reset role;

set local role anon;
select throws_ok('select 1 from marketing.rank_movers', '42501', null, 'anon cannot read rank_movers');
reset role;

select ok(
  not has_table_privilege('n8n_ro', 'marketing.content_backlog', 'INSERT,UPDATE,DELETE'),
  'n8n_ro still cannot write the backlog');

select * from finish();
rollback;
