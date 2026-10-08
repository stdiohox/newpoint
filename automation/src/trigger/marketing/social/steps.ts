/**
 * The social engine's pipeline (docs/automation-architecture.md §5.7):
 * prompt chaining, then evaluator-optimizer, then human-in-the-loop.
 *
 *   social.planner ─▶ social.drafter ─▶ social.compliance ─┬─▶ social.approval ─▶ social.publisher
 *                          ▲                                │       (wait.forToken, 72 h)
 *                          └──── feedback, at most 3 rounds ┘
 *
 * Every step loads the post by id and moves it only from the status it
 * expects (transitionSocialPost), so a retried or duplicated step does nothing.
 * Steps hand on with tasks.trigger and an idempotency key, imported by type
 * only so the task files do not import each other.
 */
import { idempotencyKeys, tasks } from "@trigger.dev/sdk";
import type { socialApproval } from "./approval.js";
import type { socialCompliance } from "./compliance.js";
import type { socialDrafter } from "./drafter.js";
import type { socialPublisher } from "./publisher.js";

export interface SocialNext {
  draft: (postId: string, round: number) => Promise<void>;
  review: (postId: string, round: number) => Promise<void>;
  approve: (postId: string) => Promise<void>;
  /** At the post's scheduled slot (now, if the slot has passed). */
  publish: (postId: string, at: Date, contentHash: string) => Promise<void>;
}

const key = (parts: readonly string[]) => idempotencyKeys.create(parts.join(":"), { scope: "global" });

export const triggerNext: SocialNext = {
  async draft(postId, round) {
    await tasks.trigger<typeof socialDrafter>("social.drafter", { postId }, { idempotencyKey: await key(["social.drafter", postId, String(round)]) });
  },
  async review(postId, round) {
    await tasks.trigger<typeof socialCompliance>(
      "social.compliance",
      { postId, round },
      { idempotencyKey: await key(["social.compliance", postId, String(round)]) },
    );
  },
  async approve(postId) {
    await tasks.trigger<typeof socialApproval>("social.approval", { postId }, { idempotencyKey: await key(["social.approval", postId]) });
  },
  async publish(postId, at, contentHash) {
    await tasks.trigger<typeof socialPublisher>(
      "social.publisher",
      { postId },
      // A slot already past publishes now; an explicit past delay is never relied on.
      { ...(at.getTime() > Date.now() ? { delay: at } : {}), idempotencyKey: await key(["social.publisher", postId, contentHash]) },
    );
  },
};
