-- Phase 3: one post per channel per slot; reasons are codes, not text.
begin;
select plan(4);

grant usage on schema extensions to marketing_rw;
set local role marketing_rw;

select lives_ok(
  $$insert into marketing.social_posts (channel, topic, scheduled_for) values ('facebook', 'a', '2026-10-19 14:00+00')$$,
  'marketing_rw can plan a post');
select throws_ok(
  $$insert into marketing.social_posts (channel, topic, scheduled_for) values ('facebook', 'b', '2026-10-19 14:00+00')$$,
  '23505', null, 'a channel has one post per slot');
select lives_ok(
  $$update marketing.social_posts set status_reason = 'owner_rejected' where topic = 'a'$$,
  'a status reason is a code');
select throws_ok(
  $$update marketing.social_posts set status_reason = 'Rejected: the vendor said +1 609 555 0123' where topic = 'a'$$,
  '23514', null, 'a status reason is never free text');

reset role;
select * from finish();
rollback;
