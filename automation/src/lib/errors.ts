/**
 * Typed errors and the FailureClass enum (docs/automation-architecture.md §4, §6
 * layer 5).
 *
 * Vendor errors repeat the inputs that caused them ("invalid To number
 * +1609…", a zod issue quoting the bad value). So nothing that leaves a task —
 * a log line, `ops.agent_health`, `metrics.agent_health`, a Trigger run output —
 * carries an error *message*. It carries a `FailureClass` and, at most, an HTTP
 * status and a code we wrote ourselves.
 */
import { ZodError } from "zod";

/** Mirrors the `metrics.failure_class` enum in the marketing migrations. */
export const FAILURE_CLASSES = [
  "vendor_4xx",
  "vendor_5xx",
  "rate_limited",
  "validation",
  "timeout",
  "unknown",
] as const;
export type FailureClass = (typeof FAILURE_CLASSES)[number];

/** Codes are ours, written in source. They never contain input data. */
export type ErrorCode = Lowercase<string>;

export abstract class AppError extends Error {
  abstract readonly failureClass: FailureClass;
  readonly code: ErrorCode;

  protected constructor(code: ErrorCode, options?: { cause?: unknown }) {
    // The message is the code: safe by construction. The cause is kept for
    // in-process debugging only and is never serialised (see toSafeError).
    super(code, options);
    this.code = code;
    this.name = new.target.name;
  }

  /** Whether a retry can plausibly succeed. */
  get retryable(): boolean {
    return isRetryable(this.failureClass);
  }
}

/** Vendors named in docs/automation-architecture.md §2. A closed set, so no runtime text rides along. */
export type Vendor =
  | "supabase"
  | "trigger"
  | "anthropic"
  | "google"
  | "meta"
  | "linkedin"
  | "n8n"
  | "twilio"
  | "vapi";

export class VendorHttpError extends AppError {
  readonly failureClass: FailureClass;
  readonly status: number;
  readonly vendor: Vendor;

  constructor(vendor: Vendor, status: number, options?: { cause?: unknown }) {
    super("vendor_http_error", options);
    this.vendor = vendor;
    this.status = status;
    this.failureClass = classifyHttpStatus(status);
  }
}

/** Concrete subclasses are constructible with a code; AppError's constructor is protected. */
abstract class CodedError extends AppError {
  public constructor(code: ErrorCode, options?: { cause?: unknown }) {
    super(code, options);
  }
}

export class ValidationError extends CodedError {
  readonly failureClass = "validation" as const;
}

export class TimeoutError extends CodedError {
  readonly failureClass = "timeout" as const;
}

/** Configuration problems: missing or forbidden env vars. Never retryable. */
export class ConfigError extends AppError {
  readonly failureClass = "validation" as const;
  /** Variable NAMES only — values are never read into an error. */
  readonly variables: readonly string[];

  constructor(code: ErrorCode, variables: readonly string[]) {
    super(code);
    this.variables = variables;
  }
}

export function classifyHttpStatus(status: number): FailureClass {
  if (status === 429) return "rate_limited";
  if (status === 408) return "timeout";
  if (status >= 500 && status <= 599) return "vendor_5xx";
  if (status >= 400 && status <= 499) return "vendor_4xx";
  return "unknown";
}

/**
 * 4xx and validation failures repeat on retry, so they are not retried.
 * `unknown` is: it is mostly transport failures with no status (a dropped
 * socket, a pooler restart, a fetch that never got a response), and every task
 * is idempotent, so a retry of a genuine bug costs a repeat, not damage.
 */
export function isRetryable(failureClass: FailureClass): boolean {
  return failureClass !== "vendor_4xx" && failureClass !== "validation";
}

/**
 * What a task throws in place of the original error (src/lib/task.ts).
 *
 * Trigger.dev records whatever leaves `run()` on the run's span, message and
 * stack included, before any lifecycle hook sees it. So the original error,
 * whose message may echo vendor input, must never leave `run()`. This one's
 * message is built from SafeError fields only.
 */
export class SafeTaskError extends Error {
  readonly safe: SafeError;

  constructor(safe: SafeError) {
    super(
      [safe.failureClass, safe.code, safe.vendor, safe.status === undefined ? undefined : `http_${String(safe.status)}`]
        .filter((part) => part !== undefined)
        .join(" "),
    );
    this.name = "SafeTaskError";
    this.safe = safe;
  }
}

export function toSafeTaskError(error: unknown): SafeTaskError {
  return error instanceof SafeTaskError ? error : new SafeTaskError(toSafeError(error));
}

/** Maps anything thrown to a FailureClass without reading its message. */
export function classifyError(error: unknown): FailureClass {
  if (error instanceof SafeTaskError) return error.safe.failureClass;
  if (error instanceof AppError) return error.failureClass;
  if (error instanceof ZodError) return "validation";
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
    return "timeout";
  }
  const status = statusOf(error);
  return status === undefined ? "unknown" : classifyHttpStatus(status);
}

/** The only shape of an error that may be logged, stored or returned. */
export interface SafeError {
  readonly failureClass: FailureClass;
  readonly retryable: boolean;
  readonly name: string;
  readonly code?: ErrorCode;
  readonly status?: number;
  readonly vendor?: Vendor;
}

export function toSafeError(error: unknown): SafeError {
  if (error instanceof SafeTaskError) return error.safe;
  const failureClass = classifyError(error);
  const status = error instanceof VendorHttpError ? error.status : statusOf(error);
  return {
    failureClass,
    retryable: isRetryable(failureClass),
    // Constructor names are ours or a library's — never input data.
    name: error instanceof Error ? error.constructor.name : typeof error,
    ...(error instanceof AppError ? { code: error.code } : {}),
    ...(status === undefined ? {} : { status }),
    ...(error instanceof VendorHttpError ? { vendor: error.vendor } : {}),
  };
}

/** Reads a numeric `status` / `statusCode` off SDK errors (Anthropic, Twilio, fetch). */
function statusOf(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  for (const key of ["status", "statusCode"] as const) {
    const value: unknown = (error as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isInteger(value)) return value;
  }
  return undefined;
}
