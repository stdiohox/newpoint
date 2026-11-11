/**
 * gbp.reply-poster (§5.2): every 15 minutes, posts the replies staff approved in
 * the CRM (crm.decide_review → reply_status 'approved', approved_reply set).
 *
 * Before every PUT: the review text is compared with what staff saw when they
 * approved (a review edited since is not answered), Google is checked live (a
 * reply that appeared meanwhile is never overwritten; our own, left by a crash
 * after the PUT, is recognised), and the approved text is run through the reply
 * rules again, because staff can edit it in the CRM. A refusal is recorded with
 * its reason and staff are told; they can fix it in the CRM. One review's
 * failure never blocks the others; three failed attempts give up and tell staff.
 */
import { createHash } from "node:crypto";
import type { EmailSender } from "../../../adapters/email/resend.js";
import type { BusinessProfile } from "../../../adapters/google/business-profile.js";
import { reviewAlertEmail } from "../../../domain/gbp/review-alert-email.js";
import { replyViolations } from "../../../domain/content-rules/newpoint-rules.js";
import {
  bumpPostAttempt,
  getConfirmedFact,
  getReview,
  listApprovedReviews,
  transitionReview,
  type Queryable,
  type StoredReview,
} from "../../../lib/db-marketing.js";
import { VendorHttpError } from "../../../lib/errors.js";
import type { Logger } from "../../../lib/logger.js";
import { marketingSchedule } from "../../../lib/task.js";
import { alertRecipients, PHONE_FACT } from "./reply-drafter.js";
import { gbpRuntime } from "./runtime.js";
import { gbpQueue } from "./sync.js";

export interface ReplyPosterDeps {
  readonly db: Queryable;
  readonly gbp: BusinessProfile;
  readonly logger: Logger;
  readonly email: EmailSender;
  readonly crmBaseUrl: string;
  readonly now: () => Date;
}

export const POST_ATTEMPTS = 3;

export type PostOutcome = "posted" | "replied_elsewhere" | "rule_at_post" | "review_changed" | "post_failed" | "failed" | "skipped";

/** The same digest crm.decide_review stores: md5 of the review text, '' for none. */
export const reviewHash = (text: string | null): string => createHash("md5").update(text ?? "").digest("hex");

/** Whitespace and Unicode normalised, so Google's own tidying of a reply does not hide that it is ours. */
const same = (a: string, b: string): boolean =>
  a.normalize("NFC").replace(/\s+/g, " ").trim() === b.normalize("NFC").replace(/\s+/g, " ").trim();

async function refuse(deps: ReplyPosterDeps, review: StoredReview, reason: string, outcome: PostOutcome): Promise<PostOutcome> {
  // Staff are told first: a row already 'rejected' when the email fails would never be retried.
  const recipients = await alertRecipients(deps.db);
  if (recipients.length > 0) await deps.email.send(reviewAlertEmail("not_posted", review, recipients, deps.crmBaseUrl));
  if (!(await transitionReview(deps.db, review.id, ["approved"], "rejected", { statusReason: reason }))) return "skipped";
  return outcome;
}

export async function postApprovedReply(deps: ReplyPosterDeps, reviewId: string): Promise<PostOutcome> {
  const review = await getReview(deps.db, reviewId);
  if (!review || review.replyStatus !== "approved" || review.approvedReply === null) return "skipped";

  if (review.approvedReviewHash !== null && review.approvedReviewHash !== reviewHash(review.text)) {
    return refuse(deps, review, "review_changed", "review_changed");
  }

  // Checked live, right before the PUT, not from the last hourly sync.
  const live = await deps.gbp.currentReply(review.id);
  if (live !== null && (same(live, review.approvedReply) || review.postAttempts > 0)) {
    // Ours: an earlier attempt's PUT landed and the mark did not (postAttempts counts before the PUT).
    await transitionReview(deps.db, review.id, ["approved"], "posted", { repliedAt: deps.now() });
    return "posted";
  }
  if (live !== null) return refuse(deps, review, "replied_elsewhere", "replied_elsewhere");

  const phone = await getConfirmedFact(deps.db, PHONE_FACT);
  const broken = replyViolations(review.approvedReply, review, phone)[0];
  if (broken) return refuse(deps, review, `rule_at_post_${broken.rule}`, "rule_at_post");

  const attempt = await bumpPostAttempt(deps.db, review.id);
  if (attempt === 0) return "skipped"; // no longer approved (cancelled in the CRM meanwhile)
  await deps.gbp.replyToReview(review.id, review.approvedReply);
  if (!(await transitionReview(deps.db, review.id, ["approved"], "posted", { repliedAt: deps.now() }))) {
    deps.logger.warn("gbp.reply_poster.posted_but_not_recorded", { attempt });
  }
  return "posted";
}

export async function runGbpReplyPoster(deps: ReplyPosterDeps): Promise<Record<PostOutcome, number>> {
  const counts: Record<PostOutcome, number> = { posted: 0, replied_elsewhere: 0, rule_at_post: 0, review_changed: 0, post_failed: 0, failed: 0, skipped: 0 };
  for (const id of await listApprovedReviews(deps.db)) {
    try {
      counts[await postApprovedReply(deps, id)] += 1;
    } catch (error) {
      // One review must not block the rest. Google rate-limiting ends the run; the next one is in 15 minutes.
      if (error instanceof VendorHttpError && error.failureClass === "rate_limited") throw error;
      const review = await getReview(deps.db, id);
      if (review && review.postAttempts >= POST_ATTEMPTS) {
        counts[await refuse(deps, review, "post_failed", "post_failed")] += 1;
      } else {
        counts.failed += 1;
        deps.logger.warn("gbp.reply_poster.attempt_failed", { attempts: review?.postAttempts ?? 0 });
      }
    }
  }
  const acted = counts.posted + counts.replied_elsewhere + counts.rule_at_post + counts.review_changed + counts.post_failed + counts.failed;
  if (acted > 0) {
    deps.logger.info("gbp.reply_poster.completed", {
      posted: counts.posted,
      replied_elsewhere: counts.replied_elsewhere,
      rule_at_post: counts.rule_at_post,
      review_changed: counts.review_changed,
      post_failed: counts.post_failed,
      failed: counts.failed,
    });
  }
  return counts;
}

export const gbpReplyPoster = marketingSchedule({
  id: "gbp.reply-poster",
  cron: { pattern: "*/15 * * * *", timezone: "America/New_York" },
  queue: gbpQueue,
  maxDuration: 300,
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 30_000, maxTimeoutInMs: 120_000 },
  run: () => runGbpReplyPoster(gbpRuntime()),
});
