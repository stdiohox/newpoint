/**
 * ops.geo-retention: 90-day retention for geo_runs details (marketing project).
 *
 * Monthly. Clears answer_excerpt and competitors_mentioned on runs older than
 * 90 days and stamps details_purged_at. Those two columns hold third-party
 * names quoted from AI answers; geo.recommendations only reads four weeks, so
 * nothing downstream needs them past that. The measurement columns stay.
 */
import { queue } from "@trigger.dev/sdk";
import { purgeGeoRunDetails, type Queryable } from "../../../lib/db-marketing.js";
import type { Logger } from "../../../lib/logger.js";
import { marketingSchedule } from "../../../lib/task.js";
import { marketingRuntime } from "../runtime.js";

export const RETENTION_DAYS = 90;

export const opsQueue = queue({ name: "ops", concurrencyLimit: 1 });

export interface GeoRetentionDeps {
  readonly db: Queryable;
  readonly logger: Logger;
}

export async function runGeoRetention(deps: GeoRetentionDeps, now: Date): Promise<{ readonly purged: number }> {
  const purged = await purgeGeoRunDetails(deps.db, new Date(now.getTime() - RETENTION_DAYS * 86_400_000), now);
  deps.logger.info("ops.geo_retention.completed", { purged });
  return { purged };
}

export const geoRetention = marketingSchedule({
  id: "ops.geo-retention",
  // Monthly, the 1st at 03:00 ET: quiet hours, and clear of the GEO and SEO schedules.
  cron: { pattern: "0 3 1 * *", timezone: "America/New_York" },
  queue: opsQueue,
  maxDuration: 300,
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 60_000, maxTimeoutInMs: 600_000 },
  run: (payload) => runGeoRetention(marketingRuntime(), payload.timestamp),
});
