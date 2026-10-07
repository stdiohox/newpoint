/**
 * seo.rank-tracker (docs/automation-architecture.md §5.3, §7 Phase 1).
 *
 * Weekly, Monday 06:00 ET. Search Console position per tracked keyword per day
 * → marketing.keyword_snapshots. The weekly report's movers are the
 * marketing.rank_movers view over those snapshots, which n8n reads with its
 * read-only credential (it holds no Trigger.dev key, §2).
 */
import { listTrackedKeywords, upsertSnapshots, countMovers } from "../../../lib/db-marketing.js";
import { marketingSchedule } from "../../../lib/task.js";
import { matchSnapshots, trackingWindow } from "../../../domain/seo/rank-snapshots.js";
import { marketingRuntime } from "../runtime.js";
import { seoQueue, type SeoDeps } from "./keyword-research.js";

export interface RankTrackerOutput {
  readonly keywords: number;
  readonly snapshotsWritten: number;
  readonly movers: number;
}

export async function runRankTracker(deps: Omit<SeoDeps, "claude">, now: Date): Promise<RankTrackerOutput> {
  const keywords = await listTrackedKeywords(deps.db);
  if (keywords.length === 0) {
    deps.logger.warn("seo.rank_tracker.no_keywords");
    return { keywords: 0, snapshotsWritten: 0, movers: 0 };
  }

  const rows = await deps.searchConsole.searchAnalytics({ ...trackingWindow(now), dimensions: ["query", "date"] });
  const daily = rows.flatMap((row) => {
    const [query, date] = row.keys;
    if (query === undefined || date === undefined) return [];
    return [{ query, date, position: row.position, impressions: row.impressions, clicks: row.clicks }];
  });

  const snapshotsWritten = await upsertSnapshots(deps.db, matchSnapshots(keywords, daily));
  const movers = await countMovers(deps.db);
  deps.logger.info("seo.rank_tracker.completed", { keywords: keywords.length, snapshots_written: snapshotsWritten, movers });
  return { keywords: keywords.length, snapshotsWritten, movers };
}

export const rankTracker = marketingSchedule({
  id: "seo.rank-tracker",
  cron: { pattern: "0 6 * * 1", timezone: "America/New_York" },
  queue: seoQueue,
  maxDuration: 600,
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 60_000, maxTimeoutInMs: 600_000 },
  run: (payload) => runRankTracker(marketingRuntime(), payload.timestamp),
});
