/**
 * gbp.reply-drafter (§5.2): per new review. **Never posts.**
 *
 *   crisis check first: a review that mentions self-harm is never drafted or
 *     answered publicly; the clinical lead hears by email and decides off Google
 *   draft (Sonnet 5.5, no tools, review fenced as untrusted)
 *     → replyViolations (§5.2 validator; one redraft with its feedback, then a person)
 *     → one email to staff; the review and the draft wait in the CRM (/crm/reviews)
 *       until someone approves, edits or skips it (crm.decide_review)
 *     → gbp.reply-poster posts approved replies.
 *
 * Every step moves the review only from the status it expects, so a retry
 * resumes where the last attempt stopped and never emails staff twice.
 */
import { z } from "zod";
import type { EmailSender } from "../../../adapters/email/resend.js";
import type { PublicClaude } from "../../../adapters/llm/anthropic-public.js";
import type { BusinessProfile } from "../../../adapters/google/business-profile.js";
import { mentionsCrisis } from "../../../domain/gbp/crisis-mention.js";
import { reviewAlertEmail, type ReviewAlertKind } from "../../../domain/gbp/review-alert-email.js";
import { getConfirmedFact, getReview, markReviewAlerted, transitionReview, type Queryable, type StoredReview } from "../../../lib/db-marketing.js";
import type { Logger } from "../../../lib/logger.js";
import { publicText, type PublicText } from "../../../lib/phi.js";
import { marketingTask } from "../../../lib/task.js";
import { replyViolations, type ReplyRule } from "../../../domain/content-rules/newpoint-rules.js";
import { replySchema, replySystem, replyUser } from "../../../prompts/gbp.js";
import { gbpRuntime } from "./runtime.js";
import { gbpQueue } from "./sync.js";

export const DRAFT_ATTEMPTS = 2;

export interface ReplyDrafterDeps {
  readonly db: Queryable;
  readonly claude: PublicClaude;
  readonly gbp: BusinessProfile;
  readonly logger: Logger;
  readonly email: EmailSender;
  readonly crmBaseUrl: string;
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

export const PHONE_FACT = "phone";

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

/** Staff alert recipients: everyone with alerts on (the same list as the lead alert). */
export async function alertRecipients(db: Queryable): Promise<string[]> {
  return (await db.query<{ email: string }>("select email from crm.alert_recipients()")).rows.map((row) => row.email);
}

/** One email per review, recorded on the row, so a retry never sends it twice. */
async function alertStaff(deps: ReplyDrafterDeps, review: StoredReview, kind: ReviewAlertKind): Promise<boolean> {
  if (review.alertedAt !== null) return false;
  const recipients = await alertRecipients(deps.db);
  if (recipients.length === 0) {
    deps.logger.error("gbp.review_alert.no_recipients", null, { kind: kind === "draft" ? 1 : 0 });
    return false;
  }
  await deps.email.send(reviewAlertEmail(kind, review, recipients, deps.crmBaseUrl));
  // Recorded whatever the status is now (staff may have decided meanwhile), so a retry never re-sends.
  await markReviewAlerted(deps.db, review.id, deps.now());
  if (kind === "draft") await transitionReview(deps.db, review.id, ["drafted"], "awaiting_approval");
  return true;
}

export async function runGbpReplyDrafter(deps: ReplyDrafterDeps, reviewId: string): Promise<{ readonly status: string }> {
  let review = await getReview(deps.db, reviewId);
  if (!review) return { status: "skipped" };
  // A reply already on Google (written by a person) means this review is not drafted or asked about.
  if (review.existingReply && (review.replyStatus === "none" || review.replyStatus === "drafted")) return { status: "skipped" };

  if (review.replyStatus === "none") {
    if (mentionsCrisis(review.text ?? "")) {
      await transitionReview(deps.db, review.id, ["none"], "rejected", { statusReason: "crisis_review" });
    } else {
      await draft(deps, review);
    }
    review = await getReview(deps.db, reviewId);
    if (!review) return { status: "skipped" };
  }
  if (review.replyStatus === "drafted") {
    await alertStaff(deps, review, "draft");
    return { status: "awaiting_approval" };
  }
  if (review.replyStatus === "rejected" && review.statusReason === "crisis_review") {
    await alertStaff(deps, review, "crisis");
    return { status: "crisis" };
  }
  if (review.replyStatus === "rejected" && review.statusReason === "reply_failed_validator") {
    await alertStaff(deps, review, "manual");
    return { status: "rejected" };
  }
  return { status: review.replyStatus };
}

export const gbpReplyDrafter = marketingTask({
  id: "gbp.reply-drafter",
  // Google's opaque review id: an id, not content.
  schema: z.object({ reviewId: z.string().regex(/^[\w-]{1,200}$/) }),
  queue: gbpQueue,
  maxDuration: 300,
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 30_000, maxTimeoutInMs: 300_000 },
  run: ({ reviewId }) => runGbpReplyDrafter(gbpRuntime(), reviewId),
});
