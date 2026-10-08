-- newpoint-marketing: Phase 3, the social engine.
-- docs/automation-architecture.md §5.7, §7 Phase 3.

-- social.planner proposes one post per channel per slot. A retried or re-run
-- week adds nothing twice.
create unique index social_posts_channel_slot_key on marketing.social_posts (channel, scheduled_for);

-- Why a post stopped where it did: an expired approval, a rejection, a
-- publisher refusal (hash mismatch, a content rule, a channel not yet live).
-- Codes written in source, never vendor error text.
alter table marketing.social_posts add column status_reason text
  check (status_reason is null or status_reason ~ '^[a-z][a-z0-9_]*$');

comment on column marketing.social_posts.media is
  'Array of {url, alt}: an image from the practice''s confirmed media library (public.practice_facts social.media_library) and its alt text.';
