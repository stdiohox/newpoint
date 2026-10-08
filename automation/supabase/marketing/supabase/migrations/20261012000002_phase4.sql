-- newpoint-marketing: Phase 4 (GBP) and the Phase 3 publishing alert.
-- docs/automation-architecture.md §5.2, §5.9, §7 Phase 4.

-- Phase 3 fix: when a post was claimed for publishing, so ops.heartbeat can alert on
-- one stuck there for more than 30 minutes, once.
alter table marketing.social_posts add column publishing_started_at timestamptz;
alter table marketing.social_posts add column stuck_alerted_at timestamptz;
create index social_posts_publishing on marketing.social_posts (publishing_started_at)
  where approval_status = 'publishing';
-- Posts already stuck before this column existed: start their clock now, so they are reported.
update marketing.social_posts set publishing_started_at = now()
 where approval_status = 'publishing' and publishing_started_at is null;

-- gbp.reply-drafter: the approval it waits on, the exact reply approved, and why a
-- reply stopped where it did (codes written in source, never vendor text).
alter table marketing.gbp_reviews add column approval_token_id text;
alter table marketing.gbp_reviews add column approved_reply_hash text
  check (approved_reply_hash is null or approved_reply_hash ~ '^[0-9a-f]{64}$');
alter table marketing.gbp_reviews add column status_reason text
  check (status_reason is null or status_reason ~ '^[a-z][a-z0-9_]*$');
-- Google's updateTime, kept for reference. An edited review is not re-drafted: §5.2 drafts
-- for new reviews only, and a reply already posted stays as it is.
alter table marketing.gbp_reviews add column google_updated_at timestamptz;
-- Replies Google already shows (written by a person in the GBP UI, or posted here).
alter table marketing.gbp_reviews add column existing_reply boolean not null default false;
