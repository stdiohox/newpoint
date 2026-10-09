/**
 * What every edge handler needs, injected. The database is `phi_edge` (inbound rows only);
 * `enqueue` triggers a newpoint-phi Trigger.dev task by id with an idempotency key, so a
 * retried webhook never starts a second run.
 */
import type { PhiDb } from "../../src/lib/db-phi.js";

export type TaskId =
  | "messaging.inbound-sms"
  | "messaging.send-sms"
  | "referrals.lead-follow-up"
  | "booking.request"
  | "booking.process-call-report"
  | "ops.crisis-page"
  | "referrals.intake";

export type Enqueue = (taskId: TaskId, payload: Record<string, unknown>, idempotencyKey: string) => Promise<void>;

export interface EdgeDeps {
  readonly db: PhiDb;
  readonly enqueue: Enqueue;
  readonly now: () => Date;
}

export const XML = { "content-type": "text/xml; charset=utf-8", "cache-control": "no-store" } as const;

/**
 * Reads at most `limit` bytes of the body, counting as it streams, so a chunked request
 * with no content-length cannot make the handler buffer an unbounded body. null when larger.
 */
export async function boundedText(request: Request, limit: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declared) || declared > limit) return null;
  if (request.body === null) return "";
  const reader: ReadableStreamDefaultReader<Uint8Array> = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Like boundedText, for binary bodies (the referral upload). null when larger than `limit`. */
export async function boundedBytes(request: Request, limit: number): Promise<Uint8Array | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declared) || declared > limit) return null;
  if (request.body === null) return new Uint8Array();
  const reader: ReadableStreamDefaultReader<Uint8Array> = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new Uint8Array(Buffer.concat(chunks));
}
