/**
 * Cloudflare Turnstile server-side check (§5.5). Cloudflare receives the widget token and
 * the client IP only: never a form field.
 */
import { z } from "zod";
import type { FetchLike } from "../../src/lib/http.js";

const verdict = z.object({ success: z.boolean() });

export type Turnstile = (token: string, remoteIp: string | null) => Promise<boolean>;

export function createTurnstile(secret: string, fetch: FetchLike): Turnstile {
  return async (token, remoteIp) => {
    if (token.length === 0 || token.length > 2048) return false;
    const body = new URLSearchParams({ secret, response: token, ...(remoteIp === null ? {} : { remoteip: remoteIp }) });
    try {
      const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
      if (!response.ok) return false;
      const parsed = verdict.safeParse(await response.json());
      return parsed.success && parsed.data.success;
    } catch {
      // Fail closed: no verdict, no submission.
      return false;
    }
  };
}
