/**
 * Structured logger that cannot log PHI (docs/automation-architecture.md §6
 * layer 5).
 *
 * - The event name must be a string LITERAL written in source.
 * - Field values must be `LogValue`: `PublicText`, a number, a boolean, null, or
 *   an opaque `EntityId`. A plain `string` does not type-check, and neither does
 *   `Phi<T>` — so a name, phone number or message body cannot be logged by
 *   accident.
 * - Errors are logged through `toSafeError`: failure class, our code, HTTP
 *   status. Never the vendor's message.
 */
import { toSafeError, type SafeError } from "./errors.js";
import type { LiteralOnly, PhiFree, PublicText } from "./phi.js";

declare const entityIdBrand: unique symbol;
/** An opaque row or run identifier. Safe to log; carries no PHI. */
export type EntityId = string & { readonly [entityIdBrand]: true };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/**
 * Trigger.dev run ids: `run_` + 25 chars (legacy cuid) or 26 chars (run-ops
 * base32hex), lowercase alphanumeric. See @trigger.dev/core friendlyId.js.
 */
const TRIGGER_RUN_ID = /^run_[a-z0-9]{25,26}$/;

/** Accepts only UUIDs and Trigger.dev run ids; anything else throws. */
export function entityId(value: string): EntityId {
  if (!UUID.test(value) && !TRIGGER_RUN_ID.test(value)) {
    throw new TypeError("entityId: not a UUID or Trigger.dev run id");
  }
  return value as EntityId;
}

export type LogValue = PublicText | EntityId | number | boolean | null;
export type LogFields = Readonly<Record<string, LogValue>>;
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogRecord {
  readonly level: LogLevel;
  readonly event: string;
  readonly at: string;
  readonly fields: LogFields;
  readonly error?: SafeError;
}

export type LogSink = (record: LogRecord) => void;

/**
 * Fields as written at a call site: literal keys only (a computed key such as
 * `{ [phone]: true }` widens to an index signature and is rejected), and no
 * `Phi<number>` / `Phi<boolean>`, which would otherwise pass as `number` /
 * `boolean`.
 */
type SafeFields<F extends LogFields> = string extends keyof F ? never : PhiFree<F>;

/** Event names are plain string literals in source: not `string`, not a template over runtime data. */
export interface Logger {
  debug<const E extends string, const F extends LogFields = LogFields>(
    event: E & LiteralOnly<E>,
    fields?: F & SafeFields<F>,
  ): void;
  info<const E extends string, const F extends LogFields = LogFields>(
    event: E & LiteralOnly<E>,
    fields?: F & SafeFields<F>,
  ): void;
  warn<const E extends string, const F extends LogFields = LogFields>(
    event: E & LiteralOnly<E>,
    fields?: F & SafeFields<F>,
  ): void;
  error<const E extends string, const F extends LogFields = LogFields>(
    event: E & LiteralOnly<E>,
    error: unknown,
    fields?: F & SafeFields<F>,
  ): void;
}

/** Default sink: one JSON line per record on stdout (Trigger.dev captures it). */
export const jsonLineSink: LogSink = (record) => {
  process.stdout.write(`${JSON.stringify(record)}\n`);
};

export function createLogger(sink: LogSink = jsonLineSink, now: () => Date = () => new Date()): Logger {
  const emit = (level: LogLevel, event: string, fields: LogFields = {}, error?: SafeError): void => {
    sink({
      level,
      event,
      at: now().toISOString(),
      fields,
      ...(error === undefined ? {} : { error }),
    });
  };
  return {
    debug: (event, fields) => {
      emit("debug", event, fields);
    },
    info: (event, fields) => {
      emit("info", event, fields);
    },
    warn: (event, fields) => {
      emit("warn", event, fields);
    },
    error: (event, error, fields) => {
      emit("error", event, fields, toSafeError(error));
    },
  };
}
