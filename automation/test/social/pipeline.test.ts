/**
 * The social engine end to end (§5.7) against the embedded Postgres shaped like
 * newpoint-marketing, AS marketing_rw. The real step functions run in order,
 * driven through a fake `next`; Claude, the approval gate, n8n and Meta are fakes.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ParseResult, PublicClaude } from "../../src/adapters/llm/anthropic-public.js";
import type { N8nEvent, SocialApprovalRequested } from "../../src/adapters/n8n/emit.js";
import type { MetaPublisher } from "../../src/adapters/social/meta.js";
import { createLogger } from "../../src/lib/logger.js";
import { plannerSystem, drafterSystem, reviewerSystem } from "../../src/prompts/social.js";
import { runSocialApproval, type ApprovalGate } from "../../src/trigger/marketing/social/approval.js";
import { runSocialCompliance } from "../../src/trigger/marketing/social/compliance.js";
import { runSocialDrafter } from "../../src/trigger/marketing/social/drafter.js";
import { runSocialPlanner } from "../../src/trigger/marketing/social/planner.js";
import { runSocialPublisher } from "../../src/trigger/marketing/social/publisher.js";
import type { SocialNext } from "../../src/trigger/marketing/social/steps.js";
import { startMarketingDb, type MarketingDb } from "../db/marketing-db.js";

const NOW = new Date("2026-10-12T11:00:00Z"); // a Monday: plans the week of 2026-10-19
const CLEAN = "A psychiatric assessment is a first conversation about what you are experiencing. Learn more at newpointnp.com.";

let db: MarketingDb | undefined;
const client = () => {
  if (!db) throw new Error("database did not start");
  return db.client;
};

beforeAll(async () => {
  db = await startMarketingDb();
});
afterAll(async () => {
  await db?.stop();
});

beforeEach(async () => {
  await client().query("reset role");
  await client().query("truncate marketing.social_posts, marketing.keywords cascade; delete from public.practice_facts");
  await client().query(
    `insert into public.practice_facts (key, value, confirmed, source) values
       ('social.media_library', '[{"url":"https://newpointnp.com/media/waiting-room.jpg","description":"A calm, empty waiting room"}]', true, 'test'),
       ('delivery_line', '"In person or telehealth services across New Jersey and Pennsylvania"', true, 'lib/content.ts'),
       ('street_address', '"unconfirmed"', false, 'research')`,
  );
  await client().query(`insert into marketing.keywords (term, cluster, source) values ('telehealth psychiatric care nj', 'telehealth psychiatric care', 'manual')`);
  await client().query("set role marketing_rw");
});

interface Script {
  plan?: unknown;
  /** One body per drafting round; the last repeats. */
  drafts?: readonly string[];
  /** One verdict per review; the last repeats. */
  reviews?: readonly ("pass" | "issues")[];
  /** What the owner does, given the event. */
  decide?: (event: SocialApprovalRequested) => unknown;
}

function harness(script: Script) {
  const prompts: { system: string; user: string }[] = [];
  let draftCall = 0;
  let reviewCall = 0;
  const claude: PublicClaude = {
    parse(request) {
      prompts.push({ system: request.system, user: request.user });
      const answer = (value: unknown) => Promise.resolve({ ok: true, value } as ParseResult<never>);
      if (request.system === plannerSystem) {
        return answer(
          script.plan ?? {
            posts: [
              { channel: "facebook", day: 0, topic: "What happens at a psychiatric assessment" },
              { channel: "instagram", day: 1, topic: "Telehealth from home" },
              { channel: "gbp", day: 2, topic: "How telehealth visits work" },
            ],
          },
        );
      }
      if (request.system === drafterSystem) {
        const drafts = script.drafts ?? [CLEAN];
        const body = drafts[Math.min(draftCall, drafts.length - 1)] ?? CLEAN;
        draftCall += 1;
        const needsImage = request.user.includes("requires an image");
        return answer({ body, image_index: needsImage ? 0 : null, alt_text: needsImage ? "An empty waiting room with two chairs" : null });
      }
      if (request.system === reviewerSystem) {
        const reviews = script.reviews ?? ["pass"];
        const verdict = reviews[Math.min(reviewCall, reviews.length - 1)];
        reviewCall += 1;
        return answer(
          verdict === "pass"
            ? { pass: true, issues: [] }
            : { pass: false, issues: [{ quote: "a first conversation", problem: "Sounds casual.", fix: "Say it plainly." }] },
        );
      }
      throw new Error("unexpected prompt");
    },
  };

  const events: SocialApprovalRequested[] = [];
  const published: { channel: string; message: string; imageUrl: string | null }[] = [];
  const meta: MetaPublisher = {
    publishFacebook: (post) => {
      published.push({ channel: "facebook", ...post });
      return Promise.resolve(`fb_${String(published.length)}`);
    },
    publishInstagram: (post) => {
      published.push({ channel: "instagram", ...post });
      return Promise.resolve(`ig_${String(published.length)}`);
    },
  };
  const gate: ApprovalGate = {
    create: (postId, hash) => Promise.resolve({ tokenId: `waitpoint_${postId}`, url: `https://api.trigger.dev/callback/${hash}` }),
    wait: (tokenId) => {
      const event = events.find((e) => `waitpoint_${e.post_id}` === tokenId);
      if (!event) throw new Error("no event for token");
      const decision = (script.decide ?? ((e: SocialApprovalRequested) => ({ approved: true, content_hash: e.content_hash })))(event);
      return Promise.resolve(decision === undefined ? { ok: false as const } : { ok: true as const, output: decision });
    },
  };

  const queue: (() => Promise<unknown>)[] = [];
  const logger = createLogger(() => undefined);
  const next: SocialNext = {
    draft: (postId) => {
      queue.push(() => runSocialDrafter({ db: client(), claude, logger, next }, postId));
      return Promise.resolve();
    },
    review: (postId, round) => {
      queue.push(() => runSocialCompliance({ db: client(), claude, logger, next }, postId, round));
      return Promise.resolve();
    },
    approve: (postId) => {
      queue.push(() =>
        runSocialApproval(
          { db: client(), logger, next, gate, now: () => NOW, emitter: { emit: (e: N8nEvent) => {
            if (e.kind === "social.approval_requested") events.push(e);
            return Promise.resolve();
          } } },
          postId,
        ),
      );
      return Promise.resolve();
    },
    publish: (postId) => {
      queue.push(() => runSocialPublisher({ db: client(), logger, meta: () => meta, now: () => NOW }, postId));
      return Promise.resolve();
    },
  };

  return {
    prompts,
    events,
    published,
    meta,
    next,
    plan: () => runSocialPlanner({ db: client(), claude, logger, next, instagram: true }, NOW),
    async drain() {
      for (let step = queue.shift(); step; step = queue.shift()) await step();
    },
    publisher: (postId: string) => runSocialPublisher({ db: client(), logger, meta: () => meta, now: () => NOW }, postId),
  };
}

type Row = { id: string; channel: string; approval_status: string; status_reason: string | null; rounds: number; published_ref: string | null };
const posts = async () =>
  (await client().query<Row>("select id, channel::text, approval_status::text, status_reason, rounds, published_ref from marketing.social_posts order by scheduled_for")).rows;

describe("social engine", () => {
  it("plans, drafts, clears compliance, asks the owner, and publishes Facebook and Instagram; GBP waits for Phase 4", async () => {
    const h = harness({});
    expect(await h.plan()).toEqual({ planned: 3, dropped: 0, planAccepted: true });
    await h.drain();

    expect((await posts()).map((p) => [p.channel, p.approval_status, p.published_ref])).toEqual([
      ["facebook", "published", "fb_1"],
      ["instagram", "published", "ig_2"],
      ["gbp", "approved", null],
    ]);
    expect(h.published.find((p) => p.channel === "instagram")?.imageUrl).toBe("https://newpointnp.com/media/waiting-room.jpg");

    // The planner saw confirmed facts only, and the observance-free week.
    const planner = h.prompts[0]?.user ?? "";
    expect(planner).toContain("delivery_line");
    expect(planner).not.toContain("street_address");
    expect(planner).toContain("telehealth psychiatric care");

    // n8n got the draft, the report and a one-time callback URL; no Trigger key anywhere.
    expect(h.events).toHaveLength(3);
    const fb = h.events.find((e) => e.channel === "facebook");
    expect(fb).toMatchObject({ body: CLEAN, compliance: { passed: true, rounds: 1, rules: [] } });
    expect(fb?.callback_url).toBe(`https://api.trigger.dev/callback/${fb?.content_hash ?? ""}`);
    expect(JSON.stringify(h.events)).not.toMatch(/tr_(dev|prod)_|TRIGGER_SECRET/);
  });

  it("is idempotent: planning the same week again adds nothing, and a published post never publishes twice", async () => {
    const h = harness({});
    await h.plan();
    await h.drain();
    expect(await h.plan()).toMatchObject({ planned: 0 });
    const fb = (await posts()).find((p) => p.channel === "facebook");
    expect(await h.publisher(fb?.id ?? "")).toEqual({ status: "skipped" });
    expect(h.published).toHaveLength(2);
  });

  it("sends a rule-breaking draft back with the rule's fix, and publishes the corrected one", async () => {
    const h = harness({
      plan: { posts: [{ channel: "facebook", day: 0, topic: "Meeting your provider" }] },
      drafts: ["Meet our psychiatrist, Dr. Whitaker.", CLEAN],
    });
    await h.plan();
    await h.drain();
    const [post] = await posts();
    expect(post).toMatchObject({ approval_status: "published", rounds: 2 });
    const redraft = h.prompts.filter((p) => p.system === drafterSystem)[1]?.user ?? "";
    expect(redraft).toContain('Never "physician", "psychiatrist", "doctor" or "MD"');
    // Rules failed in round 1, so the model review ran only on the clean round-2 draft.
    expect(h.prompts.filter((p) => p.system === reviewerSystem)).toHaveLength(1);
  });

  it("after three failed rounds goes to the owner with the report, never to a default pass", async () => {
    const h = harness({
      plan: { posts: [{ channel: "facebook", day: 0, topic: "Meeting your provider" }] },
      reviews: ["issues"],
      decide: () => ({ approved: false, content_hash: "0".repeat(64) }),
    });
    await h.plan();
    await h.drain();
    expect(h.events[0]?.compliance).toMatchObject({ passed: false, rounds: 3 });
    expect(h.events[0]?.compliance.review_notes[0]).toContain("Say it plainly.");
    expect((await posts())[0]).toMatchObject({ approval_status: "rejected", status_reason: "owner_rejected", rounds: 3 });
    expect(h.published).toEqual([]);
  });

  it.each([
    ["the approval times out", () => undefined, "expired", "approval_timed_out"],
    ["the decision is malformed", () => ({ yes: true }), "rejected", "approval_malformed"],
    ["the approval names other content", () => ({ approved: true, content_hash: "f".repeat(64) }), "rejected", "approved_content_changed"],
  ])("publishes nothing when %s", async (_label, decide, status, reason) => {
    const h = harness({ plan: { posts: [{ channel: "facebook", day: 0, topic: "Telehealth" }] }, decide });
    await h.plan();
    await h.drain();
    expect((await posts())[0]).toMatchObject({ approval_status: status, status_reason: reason });
    expect(h.published).toEqual([]);
  });

  it("refuses at publish time when the post changed after approval, or breaks a rule", async () => {
    const h = harness({ plan: { posts: [{ channel: "facebook", day: 0, topic: "Telehealth" }, { channel: "instagram", day: 1, topic: "Telehealth" }] } });
    const queued: string[] = [];
    // Hold publishing back so the posts can be tampered with between approval and the slot.
    const realPublish = h.next.publish;
    h.next.publish = (postId) => Promise.resolve(void queued.push(postId));
    await h.plan();
    await h.drain();
    h.next.publish = realPublish;
    const [fb, ig] = await posts();

    await client().query("reset role");
    await client().query("update marketing.social_posts set body = body || ' Edited.' where id = $1", [fb?.id]);
    // A rule break that also carries a matching approved hash: only the rule check can catch it.
    await client().query(
      `update marketing.social_posts set body = 'Our psychiatrist is in.' where id = $1`,
      [ig?.id],
    );
    const { contentHash } = await import("../../src/domain/social/plan.js");
    const igRow = (await client().query<{ media: { url: string; alt: string }[]; scheduled_for: Date }>("select media, scheduled_for from marketing.social_posts where id = $1", [ig?.id])).rows[0];
    const forged = contentHash({ channel: "instagram", body: "Our psychiatrist is in.", media: igRow?.media ?? [], scheduledFor: igRow?.scheduled_for ?? NOW });
    await client().query("update marketing.social_posts set approved_content_hash = $2 where id = $1", [ig?.id, forged]);
    await client().query("set role marketing_rw");

    expect(await h.publisher(fb?.id ?? "")).toEqual({ status: "content_changed_after_approval" });
    expect(await h.publisher(ig?.id ?? "")).toEqual({ status: "content_rule_at_publish" });
    expect(h.published).toEqual([]);
    expect(queued).toHaveLength(2);
  });

  it("claims a post before calling Meta, so a failed or repeated publish never posts twice", async () => {
    const h = harness({ plan: { posts: [{ channel: "facebook", day: 0, topic: "Telehealth" }] } });
    const held: string[] = [];
    h.next.publish = (postId) => Promise.resolve(void held.push(postId));
    await h.plan();
    await h.drain();
    const postId = held[0] ?? "";

    const failing = { ...h.meta, publishFacebook: () => Promise.reject(new Error("socket hang up")) };
    const logger = createLogger(() => undefined);
    await expect(runSocialPublisher({ db: client(), logger, meta: () => failing, now: () => NOW }, postId)).rejects.toThrow();
    expect((await posts())[0]).toMatchObject({ approval_status: "publishing", status_reason: "publish_failed_check_page" });

    // A re-run (retry, duplicate trigger, a person clicking replay) does not post.
    expect(await h.publisher(postId)).toEqual({ status: "skipped" });
    expect(h.published).toEqual([]);
  });

  it("rejects outright after three rounds that still break a code rule: no owner is asked", async () => {
    const h = harness({ plan: { posts: [{ channel: "facebook", day: 0, topic: "Meet the team" }] }, drafts: ["Our psychiatrist is in."] });
    await h.plan();
    await h.drain();
    expect((await posts())[0]).toMatchObject({ approval_status: "rejected", status_reason: "rules_failed_after_3_rounds", rounds: 3 });
    expect(h.events).toEqual([]);
  });

  it("resumes a lost hand-off on retry instead of stranding the post", async () => {
    const h = harness({ plan: { posts: [{ channel: "facebook", day: 0, topic: "Telehealth" }] } });
    const lost: string[] = [];
    // Compliance records its verdict, then the approval trigger is lost.
    h.next.approve = (postId) => Promise.resolve(void lost.push(postId));
    await h.plan();
    await h.drain();
    const postId = lost[0] ?? "";
    expect((await posts())[0]).toMatchObject({ approval_status: "in_compliance", rounds: 1 });

    // The compliance retry (same round) re-sends the hand-off without a second review.
    const reviews = h.prompts.filter((p) => p.system === reviewerSystem).length;
    const resent: string[] = [];
    const logger = createLogger(() => undefined);
    const fakeClaude = { parse: () => Promise.reject(new Error("must not review again")) };
    const result = await runSocialCompliance(
      { db: client(), claude: fakeClaude, logger, next: { ...h.next, approve: (id) => Promise.resolve(void resent.push(id)) } },
      postId,
      0,
    );
    expect(result).toEqual({ status: "resumed" });
    expect(resent).toEqual([postId]);
    expect(h.prompts.filter((p) => p.system === reviewerSystem)).toHaveLength(reviews);
  });

  it("does not email the owner twice when approval is retried, and re-sends a lost publish trigger", async () => {
    const h = harness({ plan: { posts: [{ channel: "facebook", day: 0, topic: "Telehealth" }] } });
    const publishes: string[] = [];
    h.next.publish = (postId) => Promise.resolve(void publishes.push(postId));
    await h.plan();
    await h.drain();
    const postId = publishes[0] ?? "";
    expect(h.events).toHaveLength(1);
    expect((await posts())[0]?.approval_status).toBe("approved");

    // A retry of the approval run after approval (the publish trigger was lost).
    await h.next.approve(postId);
    await h.drain();
    expect(h.events).toHaveLength(1);
    expect(publishes).toEqual([postId, postId]);
  });

  it("re-hands posts still planned when the planner is retried", async () => {
    const h = harness({});
    const drafted: string[] = [];
    h.next.draft = (postId) => Promise.resolve(void drafted.push(postId));
    await h.plan();
    expect(drafted).toHaveLength(3);
    await h.plan();
    expect(drafted).toHaveLength(6);
    expect(new Set(drafted).size).toBe(3);
  });

  it("rejects a draft that does not fit its channel instead of trimming it", async () => {
    const h = harness({ plan: { posts: [{ channel: "gbp", day: 0, topic: "Telehealth" }] }, drafts: ["x".repeat(1_401)] });
    await h.plan();
    await h.drain();
    expect((await posts())[0]).toMatchObject({ approval_status: "rejected", status_reason: "draft_does_not_fit" });
    expect(h.events).toEqual([]);
  });

  it("offers Instagram only with both an account and a media library", async () => {
    await client().query("reset role");
    await client().query("delete from public.practice_facts where key = 'social.media_library'");
    await client().query("set role marketing_rw");
    const h = harness({});
    await h.plan();
    expect(h.prompts[0]?.user).toContain("Channels offered: facebook; gbp");
    expect((await posts()).map((p) => p.channel)).toEqual(["facebook", "gbp"]);
  });
});
