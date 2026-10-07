/**
 * The only way to define a task in the marketing project (eslint.config.mjs
 * forbids `task`, `schemaTask` and `schedules` from the SDK in the public zone).
 *
 * Why: Trigger.dev records whatever leaves `run()` on the run's span before any
 * lifecycle hook can touch it (@trigger.dev/core tracer.js), and vendor errors
 * repeat their inputs (§4, §6 layer 5). Wrapping `run` here means the original
 * error never leaves it; only a SafeTaskError does.
 */
import { schedules } from "@trigger.dev/sdk";
import { toSafeTaskError } from "./errors.js";

type ScheduleOptions = Parameters<typeof schedules.task>[0];
/** `{ timestamp, lastTimestamp, timezone, scheduleId, upcoming, … }` */
export type ScheduledTaskPayload = Parameters<ScheduleOptions["run"]>[0];

export interface MarketingScheduleOptions<TOutput> extends Omit<ScheduleOptions, "run"> {
  run: (payload: ScheduledTaskPayload) => Promise<TOutput>;
}

export async function runSafely<TOutput>(fn: () => Promise<TOutput>): Promise<TOutput> {
  try {
    return await fn();
  } catch (error) {
    throw toSafeTaskError(error);
  }
}

export function marketingSchedule<TOutput>(options: MarketingScheduleOptions<TOutput>) {
  const { run, ...rest } = options;
  return schedules.task({ ...rest, run: (payload) => runSafely(() => run(payload)) });
}
