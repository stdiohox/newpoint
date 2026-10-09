/**
 * Fixed-window rate limits for edge/intake (§5.5), per IP and per phone number. Keys are
 * HMAC-SHA256 of the value under a secret, so the table holds neither IPs nor numbers.
 */
import { createHmac } from "node:crypto";
import type { Queryable } from "../../src/lib/db-phi.js";

export function rateKey(secret: string, kind: "ip" | "phone", value: string): string {
  return `${kind}:${createHmac("sha256", secret).update(`${kind}:${value}`).digest("base64url")}`;
}

/** Counts this hit and says whether it is within `limit` for the window containing `now`. */
export async function allow(q: Queryable, key: string, windowMs: number, limit: number, now: Date): Promise<boolean> {
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const { rows } = await q.query<{ hits: number }>(
    `insert into ops.intake_rate (key, window_start) values ($1, $2)
     on conflict (key, window_start) do update set hits = ops.intake_rate.hits + 1
     returning hits`,
    [key, windowStart],
  );
  return (rows[0]?.hits ?? Number.POSITIVE_INFINITY) <= limit;
}
