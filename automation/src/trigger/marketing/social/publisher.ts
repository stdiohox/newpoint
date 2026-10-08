/**
 * social.publisher (§5.7): at the post's scheduled slot.
 *
 * Before anything goes out it re-runs the content rules and checks that the
 * hash of the post now equals the hash the owner approved; either failing
 * refuses the post. D10: Facebook and Instagram publish now; a GBP post stays
 * approved for gbp.post-publisher. Publishing credentials live only in this project.
 *
 * A publish is not idempotent: a retry after Meta created the post would post
 * it twice. So the post is claimed (approved → publishing) before the call,
 * vendor calls retry only on 429 (the request was refused, not made), and the
 * task runs once. A failure leaves the post in publishing with a reason: a
 * person checks the Page, then re-runs or closes it.
 */
import { retry } from "@trigger.dev/sdk";
import { z } from "zod";
import { createMetaPublisher, type MetaPublisher } from "../../../adapters/social/meta.js";
import { getSocialPost, transitionSocialPost, type Queryable } from "../../../lib/db-marketing.js";
import { metaEnv } from "../../../lib/env.js";
import { entityId, type Logger } from "../../../lib/logger.js";
import { marketingTask } from "../../../lib/task.js";
import { postViolations } from "../../../domain/content-rules/newpoint-rules.js";
import { contentHash, PUBLISHABLE_NOW } from "../../../domain/social/plan.js";
import { marketingRuntime } from "../runtime.js";

export interface PublisherDeps {
  readonly db: Queryable;
  readonly logger: Logger;
  readonly meta: () => MetaPublisher;
  readonly now: () => Date;
}

export async function runSocialPublisher(deps: PublisherDeps, postId: string): Promise<{ readonly status: string }> {
  const post = await getSocialPost(deps.db, postId);
  if (!post || post.status !== "approved" || post.body === null || post.scheduledFor === null) return { status: "skipped" };
  if (post.channel === "linkedin" || !PUBLISHABLE_NOW.has(post.channel)) {
    // GBP (gbp.post-publisher publishes it) and LinkedIn (not in D10): not published here.
    return { status: "not_publishable_yet" };
  }
  const refuse = async (reason: string) => {
    await transitionSocialPost(deps.db, postId, ["approved"], "rejected", { statusReason: reason });
    deps.logger.warn("social.publisher.refused", { post: entityId(postId) });
    return { status: reason };
  };

  const hash = contentHash({ channel: post.channel, body: post.body, media: post.media, scheduledFor: post.scheduledFor });
  if (post.approvedContentHash === null || hash !== post.approvedContentHash) return refuse("content_changed_after_approval");
  if (postViolations(post.body, post.media.map((m) => m.alt)).length > 0) {
    return refuse("content_rule_at_publish");
  }
  const image = post.media[0]?.url ?? null;
  if (post.channel === "instagram" && image === null) return refuse("instagram_needs_image");

  const meta = deps.meta();
  // Claim before the external call: only one run moves approved → publishing, and a
  // post left in publishing is never re-posted automatically.
  if (!(await transitionSocialPost(deps.db, postId, ["approved"], "publishing", { statusReason: null }))) {
    return { status: "skipped" };
  }
  let ref: string;
  try {
    ref =
      post.channel === "instagram" && image !== null
        ? await meta.publishInstagram({ message: post.body, imageUrl: image })
        : await meta.publishFacebook({ message: post.body, imageUrl: image });
  } catch (error) {
    await transitionSocialPost(deps.db, postId, ["publishing"], "publishing", { statusReason: "publish_failed_check_page" });
    throw error;
  }

  await transitionSocialPost(deps.db, postId, ["publishing"], "published", { publishedRef: ref, publishedAt: deps.now() });
  deps.logger.info("social.publisher.published", { post: entityId(postId) });
  return { status: "published" };
}

/** 429 only: the request was refused, so retrying cannot post twice. */
const publishFetch: typeof fetch = (input, init) =>
  retry.fetch(input, {
    ...init,
    headers: Object.fromEntries(new Headers(init?.headers).entries()),
    retry: {
      byStatus: { "429": { strategy: "backoff", maxAttempts: 4, factor: 2, minTimeoutInMs: 5_000, maxTimeoutInMs: 60_000 } },
      timeout: { maxAttempts: 1 },
      connectionError: { maxAttempts: 1 },
    },
  });

export const socialPublisher = marketingTask({
  id: "social.publisher",
  schema: z.object({ postId: z.uuid() }),
  maxDuration: 300,
  retry: { maxAttempts: 1 },
  run: ({ postId }) => {
    const runtime = marketingRuntime();
    return runSocialPublisher(
      {
        ...runtime,
        meta: () => createMetaPublisher({ env: metaEnv(runtime.env), fetch: publishFetch }),
        now: () => new Date(),
      },
      postId,
    );
  },
});
