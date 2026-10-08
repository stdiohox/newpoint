/**
 * Pure logic for the social engine (docs/automation-architecture.md §5.7).
 */
import { createHash } from "node:crypto";
import { z } from "zod";
import { blockingRulesTouched } from "../content-rules/newpoint-rules.js";

export type Channel = "facebook" | "instagram" | "gbp";

/** D10: Facebook and Instagram publish now; GBP posts are planned and drafted, published from Phase 4. */
export const PUBLISHABLE_NOW: ReadonlySet<Channel> = new Set(["facebook", "instagram"]);

/** Hard limits, below each platform's own maximum so nothing is ever truncated by it. */
export const CHANNEL_LIMITS: Readonly<Record<Channel, { readonly maxChars: number; readonly needsImage: boolean }>> = {
  facebook: { maxChars: 1_500, needsImage: false },
  instagram: { maxChars: 2_000, needsImage: true },
  gbp: { maxChars: 1_400, needsImage: false },
};

export const MAX_POSTS_PER_WEEK = 6;
/** Posts go out at 10:00 New York time; the hour is fixed so slots dedupe. */
export const POST_HOUR_ET = 10;

export const planSchema = z.object({
  posts: z.array(
    z.object({
      channel: z.enum(["facebook", "instagram", "gbp"]),
      /** 0 = Monday of the week being planned. */
      day: z.number().int(),
      topic: z.string(),
    }),
  ),
});
export type Plan = z.output<typeof planSchema>;

export interface PlannedPost {
  readonly channel: Channel;
  readonly topic: string;
  readonly scheduledFor: Date;
}

/** 10:00 America/New_York on a calendar date, as a UTC instant (handles DST). */
export function slotAt(dateUtc: Date): Date {
  const y = dateUtc.getUTCFullYear();
  const m = dateUtc.getUTCMonth();
  const d = dateUtc.getUTCDate();
  for (const offset of [4, 5]) {
    const candidate = new Date(Date.UTC(y, m, d, POST_HOUR_ET + offset));
    const hour = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }).format(candidate);
    if (Number(hour) === POST_HOUR_ET) return candidate;
  }
  throw new Error("slotAt: no 10:00 ET instant found");
}

/**
 * The model's plan, checked. Structural problems refuse the whole plan (§5:
 * never a default); a topic that touches a blocking content rule, a channel
 * not offered, or a second post in the same channel and day is dropped and counted.
 */
export function acceptPlan(
  plan: Plan | null,
  weekStart: Date,
  channels: readonly Channel[],
): { readonly posts: PlannedPost[]; readonly dropped: number; readonly ok: boolean } {
  if (plan === null) return { posts: [], dropped: 0, ok: false };
  const valid = plan.posts.every((p) => p.day >= 0 && p.day <= 6 && p.topic.trim().length > 0 && p.topic.length <= 160);
  if (!valid || plan.posts.length > MAX_POSTS_PER_WEEK) return { posts: [], dropped: 0, ok: false };

  const seen = new Set<string>();
  const posts: PlannedPost[] = [];
  let dropped = 0;
  for (const p of plan.posts) {
    const key = `${p.channel}:${String(p.day)}`;
    if (!channels.includes(p.channel) || seen.has(key) || blockingRulesTouched(p.topic).length > 0) {
      dropped += 1;
      continue;
    }
    seen.add(key);
    posts.push({
      channel: p.channel,
      topic: p.topic.trim().replace(/\s+/g, " "),
      scheduledFor: slotAt(new Date(weekStart.getTime() + p.day * 86_400_000)),
    });
  }
  return { posts, dropped, ok: true };
}

/** Monday 00:00 UTC of the week after `now`. */
export function nextWeekStart(now: Date): Date {
  const day = now.getUTCDay();
  const daysToMonday = ((8 - day) % 7) || 7;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToMonday));
}

export interface PostMedia {
  readonly url: string;
  readonly alt: string;
}

export interface PostContent {
  readonly channel: Channel;
  readonly body: string;
  readonly media: readonly PostMedia[];
  readonly scheduledFor: Date;
}

/**
 * What the owner approves and what the publisher posts must be the same bytes.
 * Canonical JSON (fixed key order) over everything that reaches the platform.
 */
export function contentHash(post: PostContent): string {
  const canonical = JSON.stringify([
    post.channel,
    post.body,
    post.media.map((m) => [m.url, m.alt]),
    post.scheduledFor.toISOString(),
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}

/** The text every rule is checked against: the body and every alt text. */
export const postText = (post: Pick<PostContent, "body" | "media">): string =>
  [post.body, ...post.media.map((m) => m.alt)].join("\n");
