/**
 * Global lifecycle hooks for the newpoint-phi project.
 *
 * - onStartAttempt: refuses PRODUCTION while the crisis script (D15) or the consent
 *   wording (D20) is an unapproved placeholder; then builds the runtime, which runs
 *   loadPhiEnv() (no public-zone credential may be present).
 * - catchError: the same FailureClass retry policy as the public zone.
 * - onSuccess / onFailure: ops.agent_health, enum only (§5.9), which
 *   ops.aggregate-metrics pushes to newpoint-marketing.
 */
import { tasks } from "@trigger.dev/sdk";
import { toSafeError, toSafeTaskError, type FailureClass } from "../../lib/errors.js";
import { createLogger } from "../../lib/logger.js";
import { assertApprovedForEnvironment, phiRuntime, resetPhiRuntime } from "./runtime.js";

const failureLogger = createLogger();

tasks.onStartAttempt(({ ctx }) => {
  assertApprovedForEnvironment(ctx.environment.type);
  phiRuntime();
  return Promise.resolve();
});

tasks.onWait(async () => {
  await resetPhiRuntime();
});

tasks.catchError(({ error, retry }) => {
  const safe = toSafeTaskError(error);
  return safe.safe.retryable ? { error: safe, retry } : { error: safe, skipRetrying: true };
});

tasks.onSuccess(async ({ ctx }) => {
  await recordHealth(ctx.task.id, null);
});

tasks.onFailure(async ({ error, ctx }) => {
  failureLogger.error("task.failed", error);
  await recordHealth(ctx.task.id, toSafeError(error).failureClass);
});

export async function recordHealth(taskId: string, failure: FailureClass | null): Promise<void> {
  const { db } = phiRuntime();
  await db.tx(taskId, (q) =>
    q.query(
      failure === null
        ? `insert into ops.agent_health (task_id, last_success_at) values ($1, now())
           on conflict (task_id) do update set last_success_at = excluded.last_success_at`
        : `insert into ops.agent_health (task_id, last_failure_at, failure_class) values ($1, now(), $2)
           on conflict (task_id) do update set last_failure_at = excluded.last_failure_at, failure_class = excluded.failure_class`,
      failure === null ? [taskId] : [taskId, failure],
    ),
  );
}
