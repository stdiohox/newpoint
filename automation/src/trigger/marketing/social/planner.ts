/**
 * social.planner (§5.7): weekly, Monday 07:00 ET. Plans the FOLLOWING week:
 * topics × channels from the keyword clusters, the confirmed practice facts,
 * the services and the awareness calendar → social_posts (status planned),
 * then hands each new post to the drafter.
 *
 * D10: Facebook, GBP and (when the media library and the Instagram account
 * exist) Instagram. GBP posts follow the same approval and are published by
 * gbp.post-publisher at their slot.
 */
import type { PublicClaude } from "../../../adapters/llm/anthropic-public.js";
import {
  getMediaLibrary,
  insertPlannedPosts,
  listClusters,
  listConfirmedFacts,
  listPlannedPostIds,
  type Queryable,
} from "../../../lib/db-marketing.js";
import type { Logger } from "../../../lib/logger.js";
import { publicText, type PublicText } from "../../../lib/phi.js";
import { marketingSchedule } from "../../../lib/task.js";
import { observancesForWeek } from "../../../domain/social/calendar.js";
import { acceptPlan, nextWeekStart, planSchema, type Channel } from "../../../domain/social/plan.js";
import { plannerSystem, plannerUser } from "../../../prompts/social.js";
import { marketingRuntime } from "../runtime.js";
import { triggerNext, type SocialNext } from "./steps.js";

export interface PlannerDeps {
  readonly db: Queryable;
  readonly claude: PublicClaude;
  readonly logger: Logger;
  readonly next: Pick<SocialNext, "draft">;
  /** Whether an Instagram account is configured (META_IG_USER_ID). */
  readonly instagram: boolean;
}

const CHANNEL_TEXT: Readonly<Record<Channel, PublicText>> = {
  facebook: publicText("facebook"),
  instagram: publicText("instagram"),
  gbp: publicText("gbp"),
};

export async function runSocialPlanner(deps: PlannerDeps, now: Date) {
  const weekStart = nextWeekStart(now);
  const library = await getMediaLibrary(deps.db);
  // Instagram cannot post without an image, so it is offered only with both an account and a library.
  const channels: Channel[] = ["facebook", "gbp", ...(deps.instagram && library.length > 0 ? (["instagram"] as const) : [])];

  const answer = await deps.claude.parse({
    route: "drafting",
    system: plannerSystem,
    user: plannerUser({
      channels: channels.map((c) => CHANNEL_TEXT[c]),
      observances: observancesForWeek(weekStart).map((o) => o.name),
      clusters: await listClusters(deps.db),
      facts: await listConfirmedFacts(deps.db),
    }),
    schema: planSchema,
    maxTokens: 4_000,
  });
  const accepted = acceptPlan(answer.ok ? answer.value : null, weekStart, channels);
  if (!accepted.ok) deps.logger.warn("social.planner.no_plan", { refused: !answer.ok });

  const ids = await insertPlannedPosts(deps.db, accepted.posts);
  // Every post of the week still planned, not only the new ones: a retry after a
  // failed hand-off re-sends it (the drafter trigger is idempotent per post and round).
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);
  for (const id of await listPlannedPostIds(deps.db, weekStart, weekEnd)) await deps.next.draft(id, 0);

  const output = { planned: ids.length, dropped: accepted.dropped, planAccepted: accepted.ok };
  deps.logger.info("social.planner.completed", { planned: output.planned, dropped: output.dropped });
  return output;
}

export const socialPlanner = marketingSchedule({
  id: "social.planner",
  cron: { pattern: "0 7 * * 1", timezone: "America/New_York" },
  maxDuration: 600,
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 60_000, maxTimeoutInMs: 600_000 },
  run: (payload) => {
    const runtime = marketingRuntime();
    return runSocialPlanner(
      { ...runtime, next: triggerNext, instagram: runtime.env.META_IG_USER_ID !== undefined },
      payload.timestamp,
    );
  },
});
