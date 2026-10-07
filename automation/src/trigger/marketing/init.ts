/**
 * Global lifecycle hooks for the newpoint-marketing project. The Trigger.dev
 * CLI loads `init.ts` at the root of a trigger directory automatically.
 *
 * - onStartAttempt: builds the runtime, which runs loadMarketingEnv(). A PHI-zone
 *   variable, a missing variable or a database URL for another Supabase project
 *   fails the attempt before task code runs.
 * - catchError: retry policy by FailureClass. 4xx and validation failures are
 *   not retried; 429, 5xx and timeouts follow the task's retry settings.
 * - onFailure: one structured, PHI-safe failure line.
 *
 * None of these can strip vendor text from what Trigger.dev records: the run's
 * span captures the thrown error before any hook runs. src/lib/task.ts does
 * that, by never letting the original error leave run().
 */
import { tasks } from "@trigger.dev/sdk";
import { toSafeTaskError } from "../../lib/errors.js";
import { createLogger, entityId, type EntityId } from "../../lib/logger.js";
import { marketingRuntime } from "./runtime.js";

const failureLogger = createLogger();

tasks.onStartAttempt(() => {
  marketingRuntime();
  return Promise.resolve();
});

tasks.catchError(({ error, retry }) => {
  const safe = toSafeTaskError(error);
  return safe.safe.retryable ? { error: safe, retry } : { error: safe, skipRetrying: true };
});

tasks.onFailure(({ error, ctx }) => {
  failureLogger.error("task.failed", error, { run: runId(ctx.run.id) });
  return Promise.resolve();
});

/** A run id in an unexpected format is dropped rather than logged raw. */
function runId(value: string): EntityId | null {
  try {
    return entityId(value);
  } catch {
    return null;
  }
}
