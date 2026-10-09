/**
 * The PHI zone's only write to newpoint-marketing (docs/automation-architecture.md §1
 * crossings, §4 metrics): suppressed daily counts and the agent-health enum, through the
 * insert-only `metrics_writer` login. It cannot read anything back, and its rows hold no
 * patient identifier, no time of day and never a crisis count.
 */
import pg from "pg";
import type { FailureClass } from "../../lib/errors.js";

export type MetricName = "inquiries" | "bookings_completed" | "review_requests_sent" | "follow_up_conversions";

export interface HealthRow {
  readonly taskId: string;
  readonly lastSuccessOn: string | null;
  readonly lastFailureOn: string | null;
  readonly failureClass: FailureClass | null;
}

export interface MetricsWriter {
  /** `value` null means suppressed (< 5). */
  daily(day: string, rows: readonly { readonly metric: MetricName; readonly value: number | null }[]): Promise<void>;
  health(reportedOn: string, rows: readonly HealthRow[]): Promise<void>;
}

/** Task ids whose very existence in a row would say a crisis happened: never exported (§4). */
export const NEVER_EXPORTED = /^ops\.crisis/;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function createMetricsWriter(q: Pick<pg.ClientBase, "query">): MetricsWriter {
  return {
    async daily(day, rows) {
      if (!DAY.test(day)) throw new TypeError("metrics: day must be YYYY-MM-DD");
      for (const row of rows) {
        if (row.value !== null && row.value < 5) throw new TypeError("metrics: unsuppressed small count");
        // Insert-only: a retry is a no-op, a corrected value is never overwritten from here.
        await q.query(`insert into metrics.daily (day, metric, value) values ($1, $2, $3) on conflict do nothing`, [day, row.metric, row.value]);
      }
    },
    async health(reportedOn, rows) {
      if (!DAY.test(reportedOn)) throw new TypeError("metrics: day must be YYYY-MM-DD");
      for (const row of rows) {
        if (NEVER_EXPORTED.test(row.taskId)) continue;
        await q.query(
          `insert into metrics.agent_health (task_id, reported_on, last_success_on, last_failure_on, failure_class)
           values ($1, $2, $3, $4, $5) on conflict do nothing`,
          [row.taskId, reportedOn, row.lastSuccessOn, row.lastFailureOn, row.failureClass],
        );
      }
    },
  };
}
