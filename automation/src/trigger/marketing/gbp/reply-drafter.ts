/**
 * gbp.reply-drafter (§5.2): per new review. **Never auto-posts.**
 *
 *   draft (Sonnet 5.5, no tools, review fenced as untrusted)
 *     → replyViolations (§5.2 validator; one redraft with its feedback, then a person)
 *     → confirm-page approval in n8n, the raw review beside the draft (72 h)
 *     → a reminder with a new token if that runs out (72 h more), then expired
 *     → approved: re-validated, then posted (a PUT, so a retry cannot post twice)
 *
 * Every step moves the review only from the status it expects, and a retry
 * resumes where the last attempt stopped without asking the owner twice.
 */
import { createHash } from "node:crypto";
import { z } from "zod";
import type { PublicClaude } from "../../../adapters/llm/anthropic-public.js";
import type { BusinessProfile } from "../../../adapters/google/business-profile.js";
import { createN8nEmitter, type N8nEmitter } from "../../../adapters/n8n/emit.js";
import { getConfirmedFact, getReview, transitionReview, type Queryable, type StoredReview } from "../../../lib/db-marketing.js";
import { webhookEnv } from "../../../lib/env.js";
import type { Logger } from "../../../lib/logger.js";
import { publicText, type PublicText } from "../../../lib/phi.js";
import { marketingTask } from "../../../lib/task.js";
import { replyViolations, type ReplyRule } from "../../../domain/content-rules/newpoint-rules.js";
import { replySchema, replySystem, replyUser } from "../../../prompts/gbp.js";
import { APPROVAL_TIMEOUT_MS, decisionSchema, triggerApprovalGate, type ApprovalGate } from "../approval-gate.js";
import { marketingRuntime, vendorFetch } from "../runtime.js";
import { businessProfileFrom, gbpQueue } from "./sync.js";

export const DRAFT_ATTEMPTS = 2;
/** The first request, then one reminder (§5.2: "then a reminder is sent"). */
export const APPROVAL_ATTEMPTS = 2;

export interface ReplyDrafterDeps {
  readonly db: Queryable;
  readonly claude: PublicClaude;
  readonly gbp: BusinessProfile;
  readonly logger: Logger;
  readonly emitter: N8nEmitter;
  readonly gate: ApprovalGate;
  readonly now: () => Date;
}

/** Feedback for a redraft, written in source per rule (never model or review text). */
const FIX: Readonly<Record<ReplyRule, PublicText>> = {
  implies_patient: publicText(
    'Do not say or imply the reviewer is or was a patient. Never use "your"; use "you" only in "thank you" or "we invite you to call". No visit, wait, experience or feeling.',
  ),
  provider_name: publicText("Name no provider and use no title."),
  clinical_term: publicText('Use no clinical or health word at all, not even "mental health".'),
  names_reviewer: publicText("Do not name the reviewer."),
  repeats_review: publicText("Do not repeat or quote any words from the review."),
  other_phone: publicText("Give no phone number other than the practice line."),
  post_rule: publicText("No claims, prices, offers, hours, addresses, links or titles."),
};

export const replyHash = (reviewId: string, reply: string): string =>
  createHash("sha256").update(JSON.stringify([reviewId, reply])).digest("hex");

const PHONE_FACT = "phone";

async function draft(deps: ReplyDrafterDeps, review: StoredReview): Promise<"drafted" | "rejected"> {
  const phone = await getConfirmedFact(deps.db, PHONE_FACT);
  let feedback: PublicText[] = [];
  for (let attempt = 1; attempt <= DRAFT_ATTEMPTS; attempt += 1) {
    const answer = await deps.claude.parse({
      route: "drafting",
      system: replySystem,
      user: replyUser({ rating: review.rating, review: review.text, practicePhone: phone, feedback }),
      schema: replySchema,
      maxTokens: 1_000,
    });
    // A refusal or a truncated answer gets the second attempt too.
    if (!answer.ok) continue;
    const reply = answer.value.reply.trim().replace(/\s+/g, " ");
    const violations = reply.length === 0 || reply.length > 1_000 ? [] : replyViolations(reply, review, phone);
    if (reply.length > 0 && reply.length <= 1_000 && violations.length === 0) {
      await transitionReview(deps.db, review.id, ["none"], "drafted", { replyDraft: reply, statusReason: null });
      return "drafted";
    }
    feedback = [...new Set(violations.map((v) => v.rule))].map((rule) => FIX[rule]);
  }
  // A person writes this one in the GBP UI; nothing is posted.
  await transitionReview(deps.db, review.id, ["none"], "rejected", { statusReason: "reply_failed_validator" });
  return "rejected";
}

async function post(deps: ReplyDrafterDeps, review: StoredReview): Promise<string> {
  if (review.replyDraft === null || review.approvedReplyHash !== replyHash(review.id, review.replyDraft)) {
    await transitionReview(deps.db, review.id, ["approved"], "rejected", { statusReason: "approved_content_changed" });
    return "approved_content_changed";
  }
  // Checked live, right before the PUT, not from the last hourly sync. Our own reply already
  // there (a crash after the PUT) is posted; anyone else's is never overwritten.
  const live = await deps.gbp.currentReply(review.id);
  if (live !== null && live.trim() === review.replyDraft.trim()) {
    await transitionReview(deps.db, review.id, ["approved"], "posted", { repliedAt: deps.now() });
    return "posted";
  }
  if (live !== null) {
    await transitionReview(deps.db, review.id, ["approved"], "rejected", { statusReason: "replied_elsewhere" });
    return "replied_elsewhere";
  }
  const phone = await getConfirmedFact(deps.db, PHONE_FACT);
  if (replyViolations(review.replyDraft, review, phone).length > 0) {
    await transitionReview(deps.db, review.id, ["approved"], "rejected", { statusReason: "rule_at_post" });
    return "rule_at_post";
  }
  await deps.gbp.replyToReview(review.id, review.replyDraft);
  await transitionReview(deps.db, review.id, ["approved"], "posted", { repliedAt: deps.now() });
  return "posted";
}

export async function runGbpReplyDrafter(deps: ReplyDrafterDeps, reviewId: string): Promise<{ readonly status: string }> {
  let review = await getReview(deps.db, reviewId);
  if (!review) return { status: "skipped" };
  // An approved reply goes to post(), whose live check decides; otherwise a reply already on
  // Google (written by a person) means this review is not drafted or asked about.
  if (review.replyStatus === "approved") return { status: await post(deps, review) };
  // A reply already on Google (written by a person) stops a review that has not reached the
  // owner yet. One already waiting on the owner carries on: post() checks Google live before
  // anything is sent, so it can only end as posted (our own) or replied_elsewhere.
  if (review.existingReply && (review.replyStatus === "none" || review.replyStatus === "drafted")) return { status: "skipped" };

  if (review.replyStatus === "none") {
    if ((await draft(deps, review)) === "rejected") return { status: "rejected" };
    review = await getReview(deps.db, reviewId);
  }
  if (!review || (review.replyStatus !== "drafted" && review.replyStatus !== "awaiting_approval") || review.replyDraft === null) {
    return { status: "skipped" };
  }

  const draftText = review.replyDraft;
  const hash = replyHash(reviewId, draftText);
  // Resume at the attempt already under way: once the reminder's token is the one recorded, a
  // retry must not re-send the first request (its link is dead) or record the first token again.
  let first = 1;
  if (review.replyStatus === "awaiting_approval" && review.approvalTokenId !== null) {
    const firstToken = await deps.gate.create(reviewId, hash, 1);
    if (firstToken.tokenId !== review.approvalTokenId) first = 2;
  }
  let decision: unknown;
  for (let attempt = first; attempt <= APPROVAL_ATTEMPTS && decision === undefined; attempt += 1) {
    const token = await deps.gate.create(reviewId, hash, attempt);
    const current: StoredReview | null = await getReview(deps.db, reviewId);
    const alreadyAsked = current?.replyStatus === "awaiting_approval" && current.approvalTokenId === token.tokenId;
    if (!alreadyAsked) {
      await deps.emitter.emit({
        kind: "gbp.reply_approval_requested",
        review_id: reviewId,
        rating: review.rating,
        review_text: review.text,
        reviewer: review.reviewer,
        draft: draftText,
        content_hash: hash,
        callback_url: token.url,
        expires_at: new Date(deps.now().getTime() + APPROVAL_TIMEOUT_MS).toISOString(),
        reminder: attempt > 1,
      });
      await transitionReview(deps.db, reviewId, ["drafted", "awaiting_approval"], "awaiting_approval", { approvalTokenId: token.tokenId });
    }
    const result = await deps.gate.wait(token.tokenId);
    if (result.ok) decision = result.output;
  }

  const end = async (status: "expired" | "rejected", reason: string) => {
    await transitionReview(deps.db, reviewId, ["awaiting_approval"], status, { statusReason: reason });
    return { status: reason };
  };
  if (decision === undefined) return end("expired", "approval_timed_out_twice");
  const parsed = decisionSchema.safeParse(decision);
  if (!parsed.success) return end("rejected", "approval_malformed");
  if (!parsed.data.approved) return end("rejected", "owner_rejected");
  const latest = await getReview(deps.db, reviewId);
  if (parsed.data.content_hash !== hash || latest?.replyDraft == null || replyHash(reviewId, latest.replyDraft) !== hash) {
    return end("rejected", "approved_content_changed");
  }
  if (!(await transitionReview(deps.db, reviewId, ["awaiting_approval"], "approved", { approvedReplyHash: hash, statusReason: null }))) {
    return { status: "skipped" };
  }
  const approved = await getReview(deps.db, reviewId);
  return { status: approved ? await post(deps, approved) : "skipped" };
}

export const gbpReplyDrafter = marketingTask({
  id: "gbp.reply-drafter",
  // Google's opaque review id: an id, not content.
  schema: z.object({ reviewId: z.string().regex(/^[\w-]{1,200}$/) }),
  queue: gbpQueue,
  // Compute only; the approval waits are checkpointed.
  maxDuration: 300,
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 30_000, maxTimeoutInMs: 300_000 },
  run: ({ reviewId }) => {
    const runtime = marketingRuntime();
    return runGbpReplyDrafter(
      {
        ...runtime,
        gbp: businessProfileFrom(runtime.env),
        emitter: createN8nEmitter({ ...webhookEnv(runtime.env, "gbp_reply_approval"), fetch: vendorFetch }),
        gate: triggerApprovalGate("gbp.reply-drafter", "review"),
        now: () => new Date(),
      },
      reviewId,
    );
  },
});
