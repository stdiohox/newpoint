/** Shared by both zones' runtimes (no zone-specific imports). */
import { retry } from "@trigger.dev/sdk";

/**
 * Vendor HTTP: retry 429 and 5xx with backoff, nothing else (§5.9).
 * A 4xx is a bug or a revoked credential, and retrying it only repeats it.
 * Connection errors and timeouts are not retried here; they fail the attempt as
 * `unknown`/`timeout`, which the task-level retry picks up (init.ts catchError).
 *
 * Headers are flattened to a plain object first: retry.fetch rebuilds them as
 * `{ ...init.headers, "x-retry-count": n }`, and spreading a `Headers` instance
 * (what the Anthropic SDK passes) yields `{}`, which would drop the API key.
 */
const BACKOFF = { strategy: "backoff", maxAttempts: 4, factor: 2, minTimeoutInMs: 2_000, maxTimeoutInMs: 60_000 } as const;

export const vendorFetch: typeof fetch = (input, init) =>
  retry.fetch(input, {
    ...init,
    headers: Object.fromEntries(new Headers(init?.headers).entries()),
    retry: {
      byStatus: { "429": BACKOFF, "500-599": BACKOFF },
      timeout: { maxAttempts: 1 },
      connectionError: { maxAttempts: 1 },
    },
  });

/**
 * For calls that are not safe to repeat (Twilio sends, calls and pages): no retry inside
 * the call, and a hard 10 s timeout. A 5xx or a timeout here is ambiguous (Twilio may have
 * accepted it), so the caller decides, never a blind retry.
 */
export const noRetryFetch: typeof fetch = (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000) });
