/**
 * gbp.sync (§5.2): hourly. Reviews from the listing → marketing.gbp_reviews; each
 * review still waiting for a reply draft is handed to gbp.reply-drafter. Reviews
 * are public data and are never joined to the PHI zone.
 *
 * Performance metrics are listed among §5.2's inputs but §4 has no table for them
 * and §5.2's only output is gbp_reviews, so they are not fetched here.
 */
import { idempotencyKeys, queue, tasks } from "@trigger.dev/sdk";
import { createBusinessProfile, gbpAccessToken, type BusinessProfile, type GbpReview } from "../../../adapters/google/business-profile.js";
import { listReviewsAwaitingDraft, upsertReviews, type Queryable } from "../../../lib/db-marketing.js";
import { gbpEnv } from "../../../lib/env.js";
import type { Logger } from "../../../lib/logger.js";
import { marketingSchedule } from "../../../lib/task.js";
import { marketingRuntime, vendorFetch } from "../runtime.js";
import type { gbpReplyDrafter } from "./reply-drafter.js";

export const gbpQueue = queue({ name: "gbp", concurrencyLimit: 1 });

export interface GbpSyncDeps {
  readonly db: Queryable;
  readonly gbp: BusinessProfile;
  readonly logger: Logger;
  readonly draftReply: (reviewId: string) => Promise<void>;
}

export async function runGbpSync(deps: GbpSyncDeps): Promise<{ readonly reviews: number; readonly handedToDrafter: number }> {
  const reviews = await deps.gbp.listReviews();
  // A review with no star rating cannot be stored (rating is 1-5) and is not answered.
  // Overlapping pages can repeat a review; one row per id, the latest edit wins.
  const latest = new Map<string, GbpReview>();
  for (const r of reviews) {
    const seen = latest.get(r.reviewId);
    if (!seen || r.updatedAt > seen.updatedAt) latest.set(r.reviewId, r);
  }
  const rated = [...latest.values()].flatMap((r) => (r.rating === null ? [] : [{ ...r, rating: r.rating }]));
  await upsertReviews(deps.db, rated);
  const waiting = await listReviewsAwaitingDraft(deps.db);
  for (const id of waiting) await deps.draftReply(id);
  deps.logger.info("gbp.sync.completed", { reviews: rated.length, handed_to_drafter: waiting.length });
  return { reviews: rated.length, handedToDrafter: waiting.length };
}

export function businessProfileFrom(env: Parameters<typeof gbpEnv>[0]): BusinessProfile {
  const gbp = gbpEnv(env);
  return createBusinessProfile({ env: gbp, fetch: vendorFetch, accessToken: gbpAccessToken(gbp) });
}

export const gbpSync = marketingSchedule({
  id: "gbp.sync",
  cron: { pattern: "7 * * * *", timezone: "America/New_York" },
  queue: gbpQueue,
  maxDuration: 300,
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 60_000, maxTimeoutInMs: 600_000 },
  run: () => {
    const runtime = marketingRuntime();
    return runGbpSync({
      ...runtime,
      gbp: businessProfileFrom(runtime.env),
      draftReply: async (reviewId) => {
        await tasks.trigger<typeof gbpReplyDrafter>(
          "gbp.reply-drafter",
          { reviewId },
          {
            idempotencyKey: await idempotencyKeys.create(`gbp.reply-drafter:${reviewId}`, { scope: "global" }),
            // Under the sync interval: a drafter run that failed outright is re-tried by the next
            // sync; one still in progress is not doubled (the drafter is idempotent by status).
            idempotencyKeyTTL: "55m",
          },
        );
      },
    });
  },
});
