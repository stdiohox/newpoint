-- newpoint-marketing: Phase 4 enum values, on their own because a new enum value
-- cannot be used in the transaction that adds it.
-- docs/automation-architecture.md §5.2, §7 Phase 4.

-- A reply draft nobody decided on: the first 72 h wait and the reminder's both ran out.
alter type marketing.review_reply_status add value if not exists 'expired';

-- gbp.nap-audit's mismatch report (§5.2: "Mismatch report → content_backlog").
alter type marketing.backlog_kind add value if not exists 'nap';
