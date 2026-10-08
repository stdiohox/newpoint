/**
 * The human-in-the-loop gate shared by social.approval and gbp.reply-drafter
 * (docs/automation-architecture.md §1, §5.2, §5.7).
 *
 * A Trigger.dev wait token per (thing, content, attempt): the same content gives the
 * same token on a retry, so a retried run waits on the token it already has. n8n
 * gets the token's one-time URL and holds no Trigger.dev key; the owner's decision,
 * submitted on a confirm page (a form POST, never a one-click link), completes it.
 */
import { wait } from "@trigger.dev/sdk";
import { z } from "zod";

export const APPROVAL_TIMEOUT = "72h";
export const APPROVAL_TIMEOUT_MS = 72 * 3_600_000;

/** What n8n POSTs to the callback URL. Anything else is not a decision. */
export const decisionSchema = z.object({
  approved: z.boolean(),
  content_hash: z.string().regex(/^[0-9a-f]{64}$/),
});

export interface ApprovalGate {
  /** `attempt` 2 and up are reminders: a new token for the same content. */
  create(id: string, contentHash: string, attempt?: number): Promise<{ readonly tokenId: string; readonly url: string }>;
  /** Suspends until the token completes or times out. */
  wait(tokenId: string): Promise<{ readonly ok: true; readonly output: unknown } | { readonly ok: false }>;
}

/** `prefix` scopes the idempotency key; `tag` names the token's tag (`<tag>_<id>`). */
export function triggerApprovalGate(prefix: string, tag: string): ApprovalGate {
  return {
    async create(id, hash, attempt) {
      const token = await wait.createToken({
        timeout: APPROVAL_TIMEOUT,
        idempotencyKey: [prefix, id, hash, ...(attempt === undefined ? [] : [String(attempt)])].join(":"),
        tags: [`${tag}_${id}`.slice(0, 120)],
      });
      return { tokenId: token.id, url: token.url };
    },
    async wait(tokenId) {
      const result = await wait.forToken<unknown>(tokenId);
      return result.ok ? { ok: true, output: result.output } : { ok: false };
    },
  };
}
