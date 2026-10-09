/**
 * reviews.metrics and ops.aggregate-metrics (docs/automation-architecture.md §5.4, §5.9).
 * Daily, America/New_York, for the practice-local day a week ago (LAG_DAYS).
 *
 * The only PHI-derived data that leaves newpoint-phi: counts, suppressed below 5 (stored as
 * null, shown "<5"), and the agent-health enum as DATES. Crisis counts are never exported,
 * and no ops.crisis-* task appears in health rows. Written through the insert-only
 * metrics_writer login; it can read nothing back.
 */
import pg from "pg";
import type { HealthRow, MetricName, MetricsWriter } from "../../../adapters/metrics/writer.js";
import { createMetricsWriter } from "../../../adapters/metrics/writer.js";
import type { PhiDb, Queryable } from "../../../lib/db-phi.js";
import { createPhiPool } from "../../../lib/db-phi.js";
import { ConfigError, type FailureClass } from "../../../lib/errors.js";
import { phiSchedule } from "../../../lib/task.js";
import { suppress } from "../../../domain/eligibility/review-eligibility.js";
import { phiRuntime } from "../runtime.js";

const ET_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" });
export const etDay = (at: Date): string => ET_DAY.format(at);
export const yesterdayEt = (now: Date): string => etDay(new Date(now.getTime() - 86_400_000));
/**
 * The day pushed is a week old, not yesterday: staff record outcomes and bookings days
 * later, and the push is insert-only (a first value is never restated). A week-old day is
 * close to final.
 */
export const LAG_DAYS = 7;
export const reportDay = (now: Date): string => etDay(new Date(now.getTime() - LAG_DAYS * 86_400_000));

/**
 * Health dates for event-driven tasks are bucketed to the Monday of their week: a day-level
 * "last ran" for referrals.no-show or messaging.inbound-sms would date patient events that
 * metrics.daily suppresses below 5. Scheduled tasks run regardless of patients and keep the day.
 */
export const SCHEDULED_TASKS: ReadonlySet<string> = new Set([
  "booking.sync",
  "booking.reminders",
  "ops.reconcile",
  "ops.retention-sweep",
  "reviews.metrics",
  "ops.aggregate-metrics",
]);
export function weekOf(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  const back = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - back * 86_400_000).toISOString().slice(0, 10);
}

/** [start, end) of a New York calendar day, in SQL. */
const DAY_BOUNDS = `($1::date)::timestamp at time zone 'America/New_York'`;
const NEXT_DAY = `(($1::date) + 1)::timestamp at time zone 'America/New_York'`;

async function count(q: Queryable, sql: string, day: string): Promise<number> {
  const { rows } = await q.query<{ n: number }>(sql, [day]);
  return rows[0]?.n ?? 0;
}

export async function reviewCounts(db: PhiDb, actor: string, day: string): Promise<{ metric: MetricName; value: number | null }[]> {
  return db.tx(actor, async (q) => [
    {
      metric: "review_requests_sent" as const,
      value: suppress(await count(q, `select count(*)::int as n from phi.review_requests where sent_at >= ${DAY_BOUNDS} and sent_at < ${NEXT_DAY}`, day)),
    },
  ]);
}

export async function dailyCounts(db: PhiDb, actor: string, day: string): Promise<{ metric: MetricName; value: number | null }[]> {
  return db.tx(actor, async (q) => [
    { metric: "inquiries" as const, value: suppress(await count(q, `select count(*)::int as n from phi.inquiries where created_at >= ${DAY_BOUNDS} and created_at < ${NEXT_DAY}`, day)) },
    {
      metric: "bookings_completed" as const,
      value: suppress(await count(q, `select count(*)::int as n from phi.appointments where status = 'completed' and starts_at >= ${DAY_BOUNDS} and starts_at < ${NEXT_DAY}`, day)),
    },
    {
      // Inquiries from that day that got at least one lead follow-up text and are now booked.
      metric: "follow_up_conversions" as const,
      value: suppress(
        await count(
          q,
          `select count(*)::int as n from phi.inquiries i
            where i.created_at >= ${DAY_BOUNDS} and i.created_at < ${NEXT_DAY} and i.status = 'booked'
              and exists (select 1 from phi.follow_ups f where f.kind = 'lead' and f.source_id = i.id and f.status = 'sent')`,
          day,
        ),
      ),
    },
  ]);
}

export async function healthRows(db: PhiDb, actor: string): Promise<HealthRow[]> {
  const { rows } = await db.tx(actor, (q) =>
    q.query<{ task_id: string; last_success_at: Date | null; last_failure_at: Date | null; failure_class: FailureClass | null }>(
      `select task_id, last_success_at, last_failure_at, failure_class::text as failure_class from ops.agent_health`,
    ),
  );
  return rows.map((r) => {
    const date = (at: Date | null): string | null => (at === null ? null : SCHEDULED_TASKS.has(r.task_id) ? etDay(at) : weekOf(etDay(at)));
    return { taskId: r.task_id, lastSuccessOn: date(r.last_success_at), lastFailureOn: date(r.last_failure_at), failureClass: r.failure_class };
  });
}

/** A short-lived connection as metrics_writer; refuses to run unconfigured. */
async function withWriter<T>(fn: (writer: MetricsWriter) => Promise<T>): Promise<T> {
  const env = phiRuntime().env;
  if (env.PHI_METRICS_WRITER_DATABASE_URL === undefined || env.PHI_METRICS_WRITER_CA_CERT === undefined) {
    throw new ConfigError("metrics_writer_unconfigured", ["PHI_METRICS_WRITER_DATABASE_URL"]);
  }
  const pool: pg.Pool = createPhiPool(env.PHI_METRICS_WRITER_DATABASE_URL, env.PHI_METRICS_WRITER_CA_CERT);
  try {
    const client = await pool.connect();
    try {
      return await fn(createMetricsWriter(client));
    } finally {
      client.release();
    }
  } finally {
    // One-shot: never let a failing shutdown mask the push's own result.
    await pool.end().catch(() => undefined);
  }
}

export const reviewsMetrics = phiSchedule({
  id: "reviews.metrics",
  cron: { pattern: "0 2 * * *", timezone: "America/New_York" },
  retry: { maxAttempts: 3 },
  maxDuration: 120,
  run: async () => {
    const day = reportDay(new Date());
    const rows = await reviewCounts(phiRuntime().db, "reviews.metrics", day);
    await withWriter((w) => w.daily(day, rows));
    return { day, metrics: rows.length };
  },
});

export const aggregateMetrics = phiSchedule({
  id: "ops.aggregate-metrics",
  cron: { pattern: "0 2 * * *", timezone: "America/New_York" },
  retry: { maxAttempts: 3 },
  maxDuration: 120,
  run: async () => {
    const now = new Date();
    const day = reportDay(now);
    const db = phiRuntime().db;
    const rows = await dailyCounts(db, "ops.aggregate-metrics", day);
    const health = await healthRows(db, "ops.aggregate-metrics");
    await withWriter(async (w) => {
      await w.daily(day, rows);
      await w.health(etDay(now), health);
    });
    return { day, metrics: rows.length, health: health.length };
  },
});
