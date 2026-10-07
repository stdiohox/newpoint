-- newpoint-marketing: metrics schema — the ONLY PHI-derived data outside
-- newpoint-phi. docs/automation-architecture.md §1 crossings, §4.
--
-- Both tables are append-only for the writer: metrics_writer has INSERT and
-- nothing else, so a push is `INSERT ... ON CONFLICT DO NOTHING` and a retry
-- is a no-op.

-- Mirrors FAILURE_CLASSES in src/lib/errors.ts (a test asserts they match).
create type metrics.failure_class as enum
  ('vendor_4xx', 'vendor_5xx', 'rate_limited', 'validation', 'timeout', 'unknown');

-- Deliberately has no crisis metric: crisis counts are never exported (§1).
create type metrics.metric_name as enum
  ('inquiries', 'bookings_completed', 'review_requests_sent', 'follow_up_conversions');

create table metrics.daily (
  day     date not null,
  metric  metrics.metric_name not null,
  -- Small-cell suppression: counts below 5 are stored as NULL, shown as "<5".
  value   integer check (value is null or value >= 5),
  primary key (day, metric)
);

comment on column metrics.daily.value is 'NULL means suppressed (< 5). Never store 0-4.';

-- One row per task per day, already reduced to an enum: never error text.
--
-- DAYS, NOT TIMESTAMPS. For an event-driven PHI task (an inbound SMS, a booking
-- request) the exact time of its last run is the time of a patient interaction,
-- and would date events that metrics.daily suppresses below 5.
--
-- ops.crisis-page is refused outright: any row for it says a crisis page was
-- attempted, which is a crisis count, and crisis counts are never exported.
create table metrics.agent_health (
  task_id          text not null
                     check (task_id ~ '^[a-z][a-z0-9-]*(\.[a-z0-9-]+)*$')
                     check (task_id <> 'ops.crisis-page'),
  reported_on      date not null,
  last_success_on  date,
  last_failure_on  date,
  failure_class    metrics.failure_class,
  primary key (task_id, reported_on)
);
