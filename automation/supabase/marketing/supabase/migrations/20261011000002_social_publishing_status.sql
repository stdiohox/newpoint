-- newpoint-marketing: social.publisher claims a post before calling Meta.
--
-- A publish is not idempotent. social.publisher moves a post approved →
-- publishing (only one run can win that) BEFORE the Meta call, and
-- publishing → published after it. A post left in `publishing` means the call
-- failed or the worker died mid-call: a person checks the Page before anything
-- is re-run, so a post can never go out twice.
--
-- Its own migration: a new enum value cannot be used in the transaction that adds it.
alter type marketing.social_status add value if not exists 'publishing' before 'published';
