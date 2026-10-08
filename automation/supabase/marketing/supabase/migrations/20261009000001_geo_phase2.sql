-- newpoint-marketing: Phase 2, AI search visibility (GEO).
-- docs/automation-architecture.md §5.6, §7 Phase 2.

-- §5.6 lists "citation targets (directories)" among geo.recommendations'
-- backlog output. Added in its own migration: a new enum value cannot be used
-- in the transaction that adds it.
alter type marketing.backlog_kind add value if not exists 'citation';

-- §7: Phase 1's keyword clusters seed the prompts. The cluster a prompt came
-- from is kept, so recommendations can point back at the keyword map.
-- Human-written prompts have none.
alter table marketing.geo_prompts add column cluster text;

-- Competitor extraction can fail (a refusal, a malformed answer). NULL records
-- "not known"; an empty array would claim "no competitors appeared", which is
-- the default-value fallback §5 forbids.
alter table marketing.geo_runs alter column competitors_mentioned drop not null;
alter table marketing.geo_runs alter column competitors_mentioned drop default;

-- When a probe last measured nothing (refused, cut off, answered by a fallback
-- model). geo.probe schedules by the latest attempt of either kind, so a prompt
-- that keeps failing waits its turn instead of sorting first every week.
alter table marketing.geo_prompts add column last_failed_at timestamptz;

-- geo.probe skips a prompt it already probed this week with the same engine,
-- which makes a retried run resume instead of paying for every probe twice.
create index geo_runs_prompt_engine_run_at on marketing.geo_runs (prompt_id, engine, run_at desc);
-- Superseded: the new index leads with prompt_id too.
drop index marketing.geo_runs_prompt_run_at;
