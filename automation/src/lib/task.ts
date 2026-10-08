/**
 * The only way to define a task in the marketing project (eslint.config.mjs
 * forbids `task`, `schemaTask` and `schedules` from the SDK in the public zone).
 *
 * Why: Trigger.dev records whatever leaves `run()` on the run's span before any
 * lifecycle hook can touch it (@trigger.dev/core tracer.js), and vendor errors
 * repeat their inputs (§4, §6 layer 5). Wrapping `run` here means the original
 * error never leaves it; only a SafeTaskError does.
 */
import { schedules, schemaTask, type queue } from "@trigger.dev/sdk";
import type { z } from "zod";
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

export interface MarketingTaskOptions<TId extends string, TSchema extends z.ZodType, TOutput> {
  readonly id: TId;
  /** IDs only (§0.4): a payload never carries content, only what to load. */
  readonly schema: TSchema;
  readonly queue?: ReturnType<typeof queue>;
  readonly retry?: { maxAttempts: number; factor?: number; minTimeoutInMs?: number; maxTimeoutInMs?: number };
  readonly maxDuration?: number;
  readonly run: (payload: z.output<TSchema>) => Promise<TOutput>;
}

/** An event-driven marketing task: schema-validated payload, and the same error stripping as marketingSchedule. */
export function marketingTask<TId extends string, TSchema extends z.ZodType, TOutput>(
  options: MarketingTaskOptions<TId, TSchema, TOutput>,
) {
  const { run, ...rest } = options;
  // schemaTask has already parsed the payload with this schema; Trigger's inferSchemaOut
  // just does not resolve to zod's output type through the generic.
  return schemaTask({ ...rest, run: (payload) => runSafely(() => run(payload as z.output<TSchema>)) });
}
