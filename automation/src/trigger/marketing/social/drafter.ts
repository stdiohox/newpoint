/**
 * social.drafter (§5.7): one draft per planned post, or a redraft that fixes
 * the last compliance round's feedback. Body plus, where an image is used, an
 * image from the confirmed media library and its alt text.
 *
 * A draft that does not fit the channel (too long, no image where one is
 * required, an image index that does not exist) is rejected for a person to
 * look at. Nothing is trimmed or filled in automatically.
 */
import { z } from "zod";
import type { PublicClaude } from "../../../adapters/llm/anthropic-public.js";
import { getDraftFeedback, getMediaLibrary, getSocialPost, transitionSocialPost, type Queryable } from "../../../lib/db-marketing.js";
import { entityId, type Logger } from "../../../lib/logger.js";
import { marketingTask } from "../../../lib/task.js";
import { CHANNEL_LIMITS, type Channel } from "../../../domain/social/plan.js";
import { draftSchema, drafterSystem, drafterUser } from "../../../prompts/social.js";
import { publicText } from "../../../lib/phi.js";
import { marketingRuntime } from "../runtime.js";
import { triggerNext, type SocialNext } from "./steps.js";

export interface DrafterDeps {
  readonly db: Queryable;
  readonly claude: PublicClaude;
  readonly logger: Logger;
  readonly next: Pick<SocialNext, "review">;
}

const CHANNEL_TEXT = { facebook: publicText("facebook"), instagram: publicText("instagram"), gbp: publicText("gbp") } as const;

export async function runSocialDrafter(deps: DrafterDeps, postId: string): Promise<{ readonly status: string }> {
  const post = await getSocialPost(deps.db, postId);
  if (!post || (post.status !== "planned" && post.status !== "drafted") || post.channel === "linkedin") return { status: "skipped" };
  const channel: Channel = post.channel;
  const limits = CHANNEL_LIMITS[channel];
  const library = await getMediaLibrary(deps.db);

  const answer = await deps.claude.parse({
    route: "drafting",
    system: drafterSystem,
    user: drafterUser({
      channel: CHANNEL_TEXT[channel],
      maxChars: limits.maxChars,
      needsImage: limits.needsImage,
      topic: post.topic,
      images: library.map((item) => item.description),
      feedback: post.status === "drafted" ? await getDraftFeedback(deps.db, postId) : [],
    }),
    schema: draftSchema,
    maxTokens: 4_000,
  });

  const draft = answer.ok ? answer.value : null;
  const image = draft?.image_index === null || draft === null ? undefined : library[draft.image_index];
  const fits =
    draft !== null &&
    draft.body.trim().length > 0 &&
    draft.body.length <= limits.maxChars &&
    (draft.image_index === null || image !== undefined) &&
    (!limits.needsImage || image !== undefined) &&
    (image === undefined || (draft.alt_text !== null && draft.alt_text.trim().length > 0 && draft.alt_text.length <= 500));

  if (!draft || !fits) {
    await transitionSocialPost(deps.db, postId, ["planned", "drafted"], "rejected", { statusReason: answer.ok ? "draft_does_not_fit" : "draft_not_written" });
    deps.logger.warn("social.drafter.rejected", { post: entityId(postId), written: answer.ok });
    return { status: "rejected" };
  }

  const moved = await transitionSocialPost(deps.db, postId, ["planned", "drafted"], "drafted", {
    body: draft.body.trim(),
    media: image === undefined ? [] : [{ url: image.url, alt: (draft.alt_text ?? "").trim() }],
    statusReason: null,
  });
  if (moved) await deps.next.review(postId, post.rounds);
  return { status: moved ? "drafted" : "skipped" };
}

export const socialDrafter = marketingTask({
  id: "social.drafter",
  schema: z.object({ postId: z.uuid() }),
  maxDuration: 300,
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 30_000, maxTimeoutInMs: 300_000 },
  run: ({ postId }) => runSocialDrafter({ ...marketingRuntime(), next: triggerNext }, postId),
});
