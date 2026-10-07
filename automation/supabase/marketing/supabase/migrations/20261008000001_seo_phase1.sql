-- newpoint-marketing: Phase 1, local SEO keywords.
-- docs/automation-architecture.md §5.3, §7 Phase 1.

-- seo.keyword-research proposes backlog items on every run. One open item per
-- (kind, target), so a monthly re-run or a retried attempt adds nothing twice.
-- Rejected and done items do not block a later proposal.
create unique index content_backlog_open_key
  on marketing.content_backlog (kind, lower(target))
  where status in ('proposed', 'accepted');

-- "Movers in the weekly report" (§5.3). n8n builds the report and holds no
-- Trigger.dev key (§2), so it cannot read a run's output; it reads this view
-- with its read-only marketing credential instead. The view is derived from
-- the snapshots seo.rank-tracker writes: the latest 7 days of data against the
-- 7 before them, anchored on the newest snapshot rather than on today, because
-- Search Console data arrives late. Each week's position is impression-weighted,
-- as Search Console averages it, so one low-impression day cannot fake a move.
-- A mover changed by 3 positions or more, on the rounded values shown.
-- `improvement` is positive when the page moved up (a smaller position).
create view marketing.rank_movers
  with (security_invoker = true)
as
with anchor as (
  select max(date) as latest from marketing.keyword_snapshots
),
weeks as (
  select s.keyword_id,
         round(sum(s.gsc_position * s.impressions) filter (where s.date > a.latest - 7)
               / nullif(sum(s.impressions) filter (where s.date > a.latest - 7), 0), 2) as position_now,
         round(sum(s.gsc_position * s.impressions) filter (where s.date <= a.latest - 7)
               / nullif(sum(s.impressions) filter (where s.date <= a.latest - 7), 0), 2) as position_prev
    from marketing.keyword_snapshots s
   cross join anchor a
   where s.date > a.latest - 14
     and s.gsc_position is not null
   group by s.keyword_id
)
select k.id                                as keyword_id,
       k.term,
       k.cluster,
       k.state,
       w.position_now,
       w.position_prev,
       w.position_prev - w.position_now    as improvement
  from weeks w
  join marketing.keywords k on k.id = w.keyword_id
 where w.position_now is not null
   and w.position_prev is not null
   and abs(w.position_prev - w.position_now) >= 3;

comment on view marketing.rank_movers is
  'Week-over-week Search Console position movers (|change| >= 3), read by the n8n weekly report.';

-- Default privileges from 20261007000005 cover new tables and views for
-- marketing_rw and n8n_ro; stated here as well so the grant is visible where
-- the view is created.
grant select on marketing.rank_movers to marketing_rw, n8n_ro;
