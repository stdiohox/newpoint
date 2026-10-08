-- Phase 4: reply approval columns, the expired status, nap backlog items,
-- and the publishing timestamp the heartbeat reads.
begin;
select plan(6);

grant usage on schema extensions to marketing_rw;

select ok('expired' = any (enum_range(null::marketing.review_reply_status)::text[]), 'review_reply_status has expired');
select ok('nap' = any (enum_range(null::marketing.backlog_kind)::text[]), 'backlog_kind has nap');
select has_column('marketing', 'social_posts', 'publishing_started_at', 'social_posts records the publishing claim time');

set local role marketing_rw;
insert into marketing.gbp_reviews (google_review_id, rating, created_at) values ('r1', 3, now());
select lives_ok(
  $$update marketing.gbp_reviews set reply_status = 'awaiting_approval', approval_token_id = 'waitpoint_x' where google_review_id = 'r1'$$,
  'marketing_rw can move a reply into approval');
select throws_ok(
  $$update marketing.gbp_reviews set status_reason = 'Google said: reviewer Jordan Pike' where google_review_id = 'r1'$$,
  '23514', null, 'a reply status reason is a code, never text');
select throws_ok(
  $$update marketing.gbp_reviews set approved_reply_hash = 'not-a-hash' where google_review_id = 'r1'$$,
  '23514', null, 'an approved reply hash is a sha-256');
reset role;

select * from finish();
rollback;
