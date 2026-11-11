-- 20261111000002_gbp_review_approval.sql: staff approve Google review replies in the CRM.
begin;
select plan(17);

select ok(
  has_function_privilege('authenticated', 'crm.review_queue()', 'EXECUTE')
  and has_function_privilege('authenticated', 'crm.decide_review(text, text, text)', 'EXECUTE'),
  'signed-in users may call the two review functions');
select ok(
  not has_function_privilege('anon', 'crm.review_queue()', 'EXECUTE')
  and not has_function_privilege('anon', 'crm.decide_review(text, text, text)', 'EXECUTE'),
  'anonymous visitors may not');

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000f1', 'desk@example.com'),
  ('00000000-0000-4000-8000-0000000000f2', 'outsider@example.com');
insert into crm.staff (user_id, email, display_name) values
  ('00000000-0000-4000-8000-0000000000f1', 'desk@example.com', 'Front desk');

insert into marketing.gbp_reviews (google_review_id, rating, text, author_display, created_at, reply_draft, reply_status) values
  ('rv-waiting', 2, 'Waited a long time.', 'J. P.', now() - interval '2 days', 'Thank you for taking the time to share this.', 'awaiting_approval'),
  ('rv-skip',    5, 'Great.',              'A. B.', now() - interval '1 day',  'Thank you for the kind words.',                  'drafted'),
  ('rv-new',     4, 'Fine.',               null,    now(),                     null,                                             'none');
insert into marketing.gbp_reviews (google_review_id, rating, text, created_at, reply_status, status_reason, existing_reply) values
  ('rv-failed',  1, 'Terrible.',  now() - interval '3 days', 'rejected', 'reply_failed_validator', false),
  ('rv-crisis',  1, 'I want to end it all.', now() - interval '3 days', 'rejected', 'crisis_review', false),
  ('rv-live',    3, 'Okay.',      now() - interval '4 days', 'drafted',  null, true);

-- A signed-in user who is not staff sees nothing and changes nothing.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000f2', true);
set local role authenticated;
select is((select count(*)::int from crm.review_queue()), 0, 'a non-staff user sees no reviews');
select is(crm.decide_review('rv-waiting', 'approve', 'Thanks.'), false, 'and cannot decide one');
reset role;

-- Staff.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000f1', true);
set local role authenticated;
select is(array(select id from crm.review_queue()), array['rv-skip', 'rv-waiting', 'rv-live', 'rv-failed', 'rv-crisis'], 'staff see every review the pipeline touched, waiting ones first; untouched ones are not listed');
select throws_ok($$select crm.decide_review('rv-waiting', 'approve', '   ')$$, '22023', null, 'approving needs a reply');
select throws_ok($$select crm.decide_review('rv-waiting', 'maybe', 'x')$$, '22023', null, 'only approve or skip');
select is(crm.decide_review('rv-waiting', 'approve', 'Thank you  for sharing this.  We would welcome a call.'), true, 'approve records the edited reply');
select is(crm.decide_review('rv-waiting', 'approve', 'Again.'), false, 'a decided review cannot be decided twice');
select is(crm.decide_review('rv-skip', 'skip', null), true, 'skip closes a review without a reply');
select is(crm.decide_review('rv-waiting', 'skip', null), true, 'an approval can be cancelled while it is still waiting to post');
select is(crm.decide_review('rv-failed', 'approve', 'Thank you for taking the time to share this.'), true, 'staff may write a reply after the automatic draft failed the rules');
select is(crm.decide_review('rv-crisis', 'approve', 'Thank you.'), false, 'never after a crisis flag');
select is(crm.decide_review('rv-live', 'approve', 'Thank you.'), false, 'never when a reply already sits on Google');
reset role;

select is(
  (select approved_reply || '|' || decided_by::text || '|' || (approved_review_hash = md5('Waited a long time.'))::text from marketing.gbp_reviews where google_review_id = 'rv-waiting'),
  'Thank you for sharing this. We would welcome a call.|00000000-0000-4000-8000-0000000000f1|true',
  'the approval holds the whitespace-normalised reply, who approved it, and a digest of the review they saw');
select is((select reply_status::text || '|' || status_reason from marketing.gbp_reviews where google_review_id = 'rv-waiting'),
  'rejected|staff_skipped', 'the cancelled approval is a skip');
select is(
  (select reply_status::text || '|' || status_reason from marketing.gbp_reviews where google_review_id = 'rv-skip'),
  'rejected|staff_skipped', 'a skip is a rejection with its reason');

select * from finish();
rollback;
