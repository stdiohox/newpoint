/**
 * social.approval (§5.7): the human in the loop. Nothing publishes without it.
 *
 * Hashes exactly what would be posted, creates a Trigger.dev wait token
 * (72 h), sends n8n the draft, the compliance report and the token's one-time
 * callback URL, and waits. n8n holds no Trigger.dev key: the owner's decision
 * completes the token by POSTing { approved, content_hash } to that URL (§1).
 *
 * Approved with the hash of the content now in the database → approved, and the
 * publisher is scheduled for the post's slot (Facebook, Instagram; GBP waits for
 * Phase 4). Anything else (timeout, rejection, a malformed decision, a hash for
 * different content) ends the post, with the reason recorded.
 */
import { z } from "zod";
import { APPROVAL_TIMEOUT_MS, decisionSchema, triggerApprovalGate, type ApprovalGate } from "../approval-gate.js";
import type { N8nEmitter } from "../../../adapters/n8n/emit.js";
import { createN8nEmitter } from "../../../adapters/n8n/emit.js";
import { getDraftFeedback, getSocialPost, transitionSocialPost, type Queryable } from "../../../lib/db-marketing.js";
import { approvalWebhookEnv } from "../../../lib/env.js";
import { entityId, type Logger } from "../../../lib/logger.js";
import { fromStoredReport } from "./report.js";
import { marketingTask } from "../../../lib/task.js";
import { contentHash, PUBLISHABLE_NOW } from "../../../domain/social/plan.js";
import { marketingRuntime, vendorFetch } from "../runtime.js";
import { triggerNext, type SocialNext } from "./steps.js";

export { APPROVAL_TIMEOUT, decisionSchema, type ApprovalGate } from "../approval-gate.js";

/** social.approval's tokens: one per post and content hash (the key Phase 3 shipped with). */
export const triggerGate: ApprovalGate = triggerApprovalGate("social.approval", "post");

export interface ApprovalDeps {
  readonly db: Queryable;
  readonly logger: Logger;
  readonly emitter: N8nEmitter;
  readonly gate: ApprovalGate;
  readonly next: Pick<SocialNext, "publish">;
  readonly now: () => Date;
}

export async function runSocialApproval(deps: ApprovalDeps, postId: string): Promise<{ readonly status: string }> {
  const post = await getSocialPost(deps.db, postId);
  if (!post || post.body === null || post.scheduledFor === null || post.channel === "linkedin") return { status: "skipped" };
  // Approved already (a retry after a lost hand-off): re-send the publish trigger; it is idempotent.
  if (post.status === "approved" && post.approvedContentHash !== null && PUBLISHABLE_NOW.has(post.channel)) {
    await deps.next.publish(postId, post.scheduledFor, post.approvedContentHash);
    return { status: "resumed" };
  }
  if (post.status !== "in_compliance" && post.status !== "awaiting_approval") return { status: "skipped" };
  const content = { channel: post.channel, body: post.body, media: post.media, scheduledFor: post.scheduledFor };
  const hash = contentHash(content);

  // Same post and content → same token, so a retry waits on the token it already has.
  const token = await deps.gate.create(postId, hash);
  // The token id is recorded only once n8n has the request: a retry that finds it does not ask twice.
  const alreadyAsked = post.status === "awaiting_approval" && post.approvalTokenId === token.tokenId;

  const report = fromStoredReport(post.complianceReport);
  if (!alreadyAsked) await deps.emitter.emit({
    kind: "social.approval_requested",
    post_id: postId,
    channel: post.channel,
    body: post.body,
    media: post.media,
    scheduled_for: post.scheduledFor.toISOString(),
    compliance: { ...report, review_notes: await getDraftFeedback(deps.db, postId) },
    content_hash: hash,
    callback_url: token.url,
    expires_at: new Date(deps.now().getTime() + APPROVAL_TIMEOUT_MS).toISOString(),
  });
  if (!alreadyAsked) {
    await transitionSocialPost(deps.db, postId, ["in_compliance", "awaiting_approval"], "awaiting_approval", {
      approvalTokenId: token.tokenId,
    });
  }

  const result = await deps.gate.wait(token.tokenId);
  const end = async (status: "expired" | "rejected", reason: string) => {
    await transitionSocialPost(deps.db, postId, ["awaiting_approval"], status, { statusReason: reason });
    deps.logger.info("social.approval.ended", { post: entityId(postId), approved: false });
    return { status: reason };
  };
  if (!result.ok) return end("expired", "approval_timed_out");

  const decision = decisionSchema.safeParse(result.output);
  if (!decision.success) return end("rejected", "approval_malformed");
  if (!decision.data.approved) return end("rejected", "owner_rejected");
  // The hash approved must be the hash of what is in the database now.
  const current = await getSocialPost(deps.db, postId);
  const currentHash =
    current?.body != null && current.scheduledFor !== null && current.channel !== "linkedin"
      ? contentHash({ channel: current.channel, body: current.body, media: current.media, scheduledFor: current.scheduledFor })
      : null;
  if (decision.data.content_hash !== hash || currentHash !== hash) return end("rejected", "approved_content_changed");

  if (!(await transitionSocialPost(deps.db, postId, ["awaiting_approval"], "approved", { approvedContentHash: hash, statusReason: null }))) {
    return { status: "skipped" };
  }
  deps.logger.info("social.approval.ended", { post: entityId(postId), approved: true });
  if (PUBLISHABLE_NOW.has(post.channel)) {
    await deps.next.publish(postId, post.scheduledFor, hash);
    return { status: "approved_scheduled" };
  }
  // GBP: approved and kept; gbp.post-publisher posts it at its slot (D10).
  return { status: "approved_awaiting_phase_4" };
}

export const socialApproval = marketingTask({
  id: "social.approval",
  schema: z.object({ postId: z.uuid() }),
  // Compute only: the 72 h wait is checkpointed and does not count.
  maxDuration: 300,
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 30_000, maxTimeoutInMs: 300_000 },
  run: ({ postId }) => {
    const runtime = marketingRuntime();
    const webhook = approvalWebhookEnv(runtime.env);
    return runSocialApproval(
      {
        ...runtime,
        emitter: createN8nEmitter({ ...webhook, fetch: vendorFetch }),
        gate: triggerGate,
        next: triggerNext,
        now: () => new Date(),
      },
      postId,
    );
  },
});
