/**
 * ops.heartbeat (docs/automation-architecture.md §5.9), marketing project.
 *
 * Every 15 minutes. Today it carries one check, a Phase 3 fix: a social or GBP
 * post that has sat in `publishing` for more than 30 minutes. That state means
 * the platform call failed or the worker died mid-call; nothing re-posts it
 * automatically (a publish is not idempotent), so a person must check the Page
 * or listing. Each stuck post is alerted once, to Koret ops through n8n.
 *
 * The stale-agent digest from metrics.agent_health (§5.9) joins this task when
 * the PHI project starts pushing health rows (Phase 5).
 */
import { createN8nEmitter, type N8nEmitter } from "../../../adapters/n8n/emit.js";
import { listStuckPublishing, markStuckAlerted, type Queryable } from "../../../lib/db-marketing.js";
import { webhookEnv } from "../../../lib/env.js";
import { entityId, type Logger } from "../../../lib/logger.js";
import { marketingSchedule } from "../../../lib/task.js";
import { marketingRuntime, vendorFetch } from "../runtime.js";
import { opsQueue } from "./geo-retention.js";

export const STUCK_AFTER_MINUTES = 30;

export interface HeartbeatDeps {
  readonly db: Queryable;
  readonly logger: Logger;
  readonly alerts: N8nEmitter;
  readonly now: () => Date;
}

type StuckPost = Awaited<ReturnType<typeof listStuckPublishing>>[number];

export async function runHeartbeat(deps: HeartbeatDeps): Promise<{ readonly stuckAlerted: number }> {
  const stuck = await listStuckPublishing(deps.db, STUCK_AFTER_MINUTES);
  let alerted = 0;
  let failed = false;
  for (const post of stuck) {
    try {
      await alertOnce(deps, post);
      alerted += 1;
    } catch {
      // One failing alert does not hold back the others; the run still fails below, so the
      // next attempt alerts what is left (alerted posts are marked and are not repeated).
      failed = true;
    }
  }
  if (failed) throw new Error("ops.heartbeat: an alert could not be sent");
  return { stuckAlerted: alerted };
}

async function alertOnce(deps: HeartbeatDeps, post: StuckPost): Promise<void> {
  await deps.alerts.emit({
    kind: "ops.alert",
    code: "post_stuck_publishing",
    post_id: post.id,
    channel: post.channel,
    since: post.since.toISOString(),
    minutes: Math.floor((deps.now().getTime() - post.since.getTime()) / 60_000),
  });
  // After the alert went out: a failed emit is retried by the next run, never lost.
  await markStuckAlerted(deps.db, post.id);
  deps.logger.warn("ops.heartbeat.stuck_publishing", { post: entityId(post.id) });
}

export const heartbeat = marketingSchedule({
  id: "ops.heartbeat",
  cron: { pattern: "*/15 * * * *", timezone: "America/New_York" },
  queue: opsQueue,
  maxDuration: 120,
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 30_000, maxTimeoutInMs: 120_000 },
  run: () => {
    const runtime = marketingRuntime();
    const alerts = createN8nEmitter({ ...webhookEnv(runtime.env, "ops_alert"), fetch: vendorFetch });
    return runHeartbeat({ ...runtime, alerts, now: () => new Date() });
  },
});
