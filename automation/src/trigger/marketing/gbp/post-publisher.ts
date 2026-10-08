/**
 * gbp.post-publisher (§5.2): GBP posts the owner approved through the Phase 3
 * pipeline (social_posts, channel gbp), at their weekly slot from the social
 * planner. Checked every 15 minutes, so a post goes out within 15 minutes of its slot.
 *
 * Same guard as social.publisher: the hash must equal the approved hash, the
 * rules are re-run, and the post is claimed (approved → publishing) before the
 * API call, so it can never go out twice. GBP's own rule on top: no phone number
 * in a post's text (the listing carries the number; Google rejects posts with one).
 */
import type { BusinessProfile } from "../../../adapters/google/business-profile.js";
import { getSocialPost, listApprovedGbpPostsDue, transitionSocialPost, type Queryable } from "../../../lib/db-marketing.js";
import { entityId, type Logger } from "../../../lib/logger.js";
import { marketingSchedule } from "../../../lib/task.js";
import { postViolations } from "../../../domain/content-rules/newpoint-rules.js";
import { contentHash } from "../../../domain/social/plan.js";
import { marketingRuntime } from "../runtime.js";
import { businessProfileFrom, gbpQueue } from "./sync.js";

/** Every GBP post links to the site; no other URL is ever sent. */
export const GBP_CTA_URL = "https://newpointnp.com/";
const PHONE = /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;

export interface GbpPostPublisherDeps {
  readonly db: Queryable;
  readonly gbp: () => BusinessProfile;
  readonly logger: Logger;
  readonly now: () => Date;
}

export async function publishGbpPost(deps: GbpPostPublisherDeps, postId: string): Promise<string> {
  const post = await getSocialPost(deps.db, postId);
  if (!post || post.channel !== "gbp" || post.status !== "approved" || post.body === null || post.scheduledFor === null) return "skipped";
  const refuse = async (reason: string) => {
    await transitionSocialPost(deps.db, postId, ["approved"], "rejected", { statusReason: reason });
    deps.logger.warn("gbp.post_publisher.refused", { post: entityId(postId) });
    return reason;
  };
  const hash = contentHash({ channel: "gbp", body: post.body, media: post.media, scheduledFor: post.scheduledFor });
  if (post.approvedContentHash === null || hash !== post.approvedContentHash) return refuse("content_changed_after_approval");
  if (postViolations(post.body, post.media.map((m) => m.alt)).length > 0) return refuse("content_rule_at_publish");
  if (PHONE.test(post.body)) return refuse("gbp_no_phone_in_post");

  // Built before the claim: a config or token error must not park a post in publishing.
  const gbp = deps.gbp();
  if (!(await transitionSocialPost(deps.db, postId, ["approved"], "publishing", { statusReason: null }))) return "skipped";
  let ref: string;
  try {
    ref = await gbp.createPost({ summary: post.body, ctaUrl: GBP_CTA_URL, imageUrl: post.media[0]?.url ?? null });
  } catch (error) {
    // Left in publishing: ops.heartbeat alerts after 30 minutes; a person checks the listing.
    await transitionSocialPost(deps.db, postId, ["publishing"], "publishing", { statusReason: "publish_failed_check_listing" });
    deps.logger.error("gbp.post_publisher.failed", error, { post: entityId(postId) });
    return "failed";
  }
  await transitionSocialPost(deps.db, postId, ["publishing"], "published", { publishedRef: ref, publishedAt: deps.now() });
  return "published";
}

export async function runGbpPostPublisher(deps: GbpPostPublisherDeps): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const id of await listApprovedGbpPostsDue(deps.db, deps.now())) {
    const status = await publishGbpPost(deps, id);
    counts[status] = (counts[status] ?? 0) + 1;
  }
  deps.logger.info("gbp.post_publisher.completed", { published: counts["published"] ?? 0, failed: counts["failed"] ?? 0 });
  return counts;
}

export const gbpPostPublisher = marketingSchedule({
  id: "gbp.post-publisher",
  cron: { pattern: "*/15 * * * *", timezone: "America/New_York" },
  queue: gbpQueue,
  maxDuration: 300,
  // A publish is not idempotent; each post is claimed, and the run itself is not retried.
  retry: { maxAttempts: 1 },
  run: () => {
    const runtime = marketingRuntime();
    return runGbpPostPublisher({ ...runtime, gbp: () => businessProfileFrom(runtime.env), now: () => new Date() });
  },
});
