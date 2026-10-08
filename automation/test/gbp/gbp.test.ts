/**
 * Phase 4 end to end against the embedded Postgres shaped like newpoint-marketing,
 * AS marketing_rw: gbp.sync → gbp.reply-drafter (confirm-page approval, reminder,
 * never auto-posts), gbp.post-publisher, gbp.nap-audit's two locks, and the
 * ops.heartbeat stuck-publishing alert. Google, Claude, n8n and the gate are fakes.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { BusinessProfile, GbpLocation, GbpReview } from "../../src/adapters/google/business-profile.js";
import type { ParseResult, PublicClaude } from "../../src/adapters/llm/anthropic-public.js";
import type { GbpReplyApprovalRequested, N8nEvent } from "../../src/adapters/n8n/emit.js";
import { createLogger } from "../../src/lib/logger.js";
import type { PublicText } from "../../src/lib/phi.js";
import { contentHash } from "../../src/domain/social/plan.js";
import type { ApprovalGate } from "../../src/trigger/marketing/approval-gate.js";
import { runGbpNapAudit } from "../../src/trigger/marketing/gbp/nap-audit.js";
import { runGbpPostPublisher } from "../../src/trigger/marketing/gbp/post-publisher.js";
import { runGbpReplyDrafter } from "../../src/trigger/marketing/gbp/reply-drafter.js";
import { runGbpSync } from "../../src/trigger/marketing/gbp/sync.js";
import { runHeartbeat } from "../../src/trigger/marketing/ops/heartbeat.js";
import { startMarketingDb, type MarketingDb } from "../db/marketing-db.js";

const NOW = new Date("2026-10-19T15:00:00Z");
const p = (text: string) => text as PublicText;
const logger = createLogger(() => undefined);
const GOOD = "Thank you for taking the time to share this. We would welcome the chance to talk: please call the practice at (609) 527-9438.";

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
  await client().query("truncate marketing.gbp_reviews, marketing.social_posts, marketing.content_backlog; delete from public.practice_facts");
  await client().query(`insert into public.practice_facts (key, value, confirmed, source) values ('phone', '"(609) 527-9438"', true, 'lib/content.ts')`);
  await client().query("set role marketing_rw");
});

const googleReview = (id: string, extra: Partial<GbpReview> = {}): GbpReview => ({
  reviewId: id,
  rating: 2,
  text: p("Waited forty minutes past my appointment and nobody told me why."),
  reviewer: p("Jordan Pike"),
  createdAt: new Date("2026-10-18T12:00:00Z"),
  updatedAt: new Date("2026-10-18T12:00:00Z"),
  hasReply: false,
  ...extra,
});

function fakeGbp(reviews: GbpReview[], location?: GbpLocation) {
  const replies: { reviewId: string; comment: string }[] = [];
  const posts: { summary: string; ctaUrl: string; imageUrl: string | null }[] = [];
  let failPosts = false;
  const live = new Map<string, string>();
  const gbp: BusinessProfile = {
    listReviews: () => Promise.resolve(reviews),
    currentReply: (reviewId) => Promise.resolve(live.get(reviewId) ?? null),
    replyToReview: (reviewId, comment) => {
      replies.push({ reviewId, comment });
      live.set(reviewId, comment);
      return Promise.resolve();
    },
    createPost: (post) => {
      if (failPosts) return Promise.reject(new Error("socket hang up"));
      posts.push(post);
      return Promise.resolve(`localPosts/${String(posts.length)}`);
    },
    getLocation: () => (location ? Promise.resolve(location) : Promise.reject(new Error("must not be called"))),
  };
  return { gbp, replies, posts, live, failNextPosts: () => (failPosts = true) };
}

function replyHarness(opts: { drafts?: readonly string[]; decide?: (e: GbpReplyApprovalRequested, attempt: number) => unknown } = {}) {
  const prompts: string[] = [];
  let draftCall = 0;
  const claude: PublicClaude = {
    parse(request) {
      prompts.push(request.user);
      const drafts = opts.drafts ?? [GOOD];
      const reply = drafts[Math.min(draftCall, drafts.length - 1)] ?? GOOD;
      draftCall += 1;
      return Promise.resolve({ ok: true, value: { reply } } as ParseResult<never>);
    },
  };
  const events: GbpReplyApprovalRequested[] = [];
  const gate: ApprovalGate = {
    create: (id, hash, attempt) => Promise.resolve({ tokenId: `wp_${id}_${String(attempt ?? 1)}`, url: `https://api.trigger.dev/cb/${hash}/${String(attempt ?? 1)}` }),
    wait: (tokenId) => {
      const attempt = Number(tokenId.split("_").pop());
      const event = events.filter((e) => tokenId.startsWith(`wp_${e.review_id}_`)).at(-1);
      const decision = event && (opts.decide ?? ((e) => ({ approved: true, content_hash: e.content_hash })))(event, attempt);
      return Promise.resolve(decision === undefined ? { ok: false as const } : { ok: true as const, output: decision });
    },
  };
  return {
    prompts,
    events,
    deps: (gbp: BusinessProfile) => ({
      db: client(),
      claude,
      gbp,
      logger,
      gate,
      now: () => NOW,
      emitter: {
        emit: (e: N8nEvent) => {
          if (e.kind === "gbp.reply_approval_requested") events.push(e);
          return Promise.resolve();
        },
      },
    }),
  };
}

const reviewRow = async (id: string) =>
  (
    await client().query<{ reply_status: string; status_reason: string | null; reply_draft: string | null; replied_at: Date | null }>(
      "select reply_status::text, status_reason, reply_draft, replied_at from marketing.gbp_reviews where google_review_id = $1",
      [id],
    )
  ).rows[0];

describe("gbp.sync", () => {
  it("stores rated reviews and hands only unanswered ones to the drafter, again on a retry", async () => {
    const { gbp } = fakeGbp([googleReview("r1"), googleReview("r2", { hasReply: true }), googleReview("r3", { rating: null })]);
    const handed: string[] = [];
    const deps = { db: client(), gbp, logger, draftReply: (id: string) => Promise.resolve(void handed.push(id)) };
    expect(await runGbpSync(deps)).toEqual({ reviews: 2, handedToDrafter: 1 });
    await runGbpSync(deps);
    expect(handed).toEqual(["r1", "r1"]);
  });
});

describe("gbp.reply-drafter", () => {
  async function seed(id = "r1", extra: Partial<GbpReview> = {}) {
    const { gbp } = fakeGbp([googleReview(id, extra)]);
    await runGbpSync({ db: client(), gbp, logger, draftReply: () => Promise.resolve() });
  }

  it("resumes on the reminder after a crash: never re-sends the first request or re-records its token", async () => {
    await seed();
    const h = replyHarness({ decide: (e, attempt) => (attempt === 1 ? undefined : { approved: true, content_hash: e.content_hash }) });
    const { gbp, replies } = fakeGbp([]);
    // First run: the first request times out, the reminder goes out, and the worker dies waiting on it.
    let waits = 0;
    const base = h.deps(gbp);
    const dying = { ...base, gate: { ...base.gate, wait: (id: string) => (++waits === 2 ? Promise.reject(new Error("worker died")) : base.gate.wait(id)) } };
    await expect(runGbpReplyDrafter(dying, "r1")).rejects.toThrow();
    expect(h.events.map((e) => e.reminder)).toEqual([false, true]);

    // The retry waits on the reminder's token; nothing is sent again.
    expect(await runGbpReplyDrafter(h.deps(gbp), "r1")).toEqual({ status: "posted" });
    expect(h.events.map((e) => e.reminder)).toEqual([false, true]);
    expect(replies).toHaveLength(1);
  });

  it("marks our own reply posted when it is already live after a crash, instead of calling it someone else's", async () => {
    await seed();
    const h = replyHarness();
    const { gbp, replies, live } = fakeGbp([]);
    await client().query("reset role");
    await client().query(
      `update marketing.gbp_reviews set reply_status = 'approved', reply_draft = $2, approved_reply_hash = $3 where google_review_id = $1`,
      ["r1", GOOD, (await import("../../src/trigger/marketing/gbp/reply-drafter.js")).replyHash("r1", GOOD)],
    );
    await client().query("set role marketing_rw");
    live.set("r1", GOOD);
    expect(await runGbpReplyDrafter(h.deps(gbp), "r1")).toEqual({ status: "posted" });
    expect(replies).toEqual([]);
  });

  it("drafts, asks on a confirm page with the raw review beside the draft, and posts only after approval", async () => {
    await seed();
    const h = replyHarness();
    const { gbp, replies } = fakeGbp([]);
    expect(await runGbpReplyDrafter(h.deps(gbp), "r1")).toEqual({ status: "posted" });

    expect(h.events).toHaveLength(1);
    expect(h.events[0]).toMatchObject({
      review_text: "Waited forty minutes past my appointment and nobody told me why.",
      reviewer: "Jordan Pike",
      rating: 2,
      draft: GOOD,
      reminder: false,
    });
    expect(h.prompts[0]).toContain("<review>");
    expect(replies).toEqual([{ reviewId: "r1", comment: GOOD }]);
    expect(await reviewRow("r1")).toMatchObject({ reply_status: "posted" });
  });

  it("sends one reminder when the first 72 h run out, then posts on approval", async () => {
    await seed();
    const h = replyHarness({ decide: (e, attempt) => (attempt === 1 ? undefined : { approved: true, content_hash: e.content_hash }) });
    const { gbp, replies } = fakeGbp([]);
    expect(await runGbpReplyDrafter(h.deps(gbp), "r1")).toEqual({ status: "posted" });
    expect(h.events.map((e) => e.reminder)).toEqual([false, true]);
    expect(replies).toHaveLength(1);
  });

  it("never auto-posts: two timeouts expire the reply, a rejection rejects it", async () => {
    await seed("r1");
    await seed("r2");
    const timeouts = replyHarness({ decide: () => undefined });
    const { gbp, replies } = fakeGbp([]);
    expect(await runGbpReplyDrafter(timeouts.deps(gbp), "r1")).toEqual({ status: "approval_timed_out_twice" });
    const rejecting = replyHarness({ decide: (e) => ({ approved: false, content_hash: e.content_hash }) });
    expect(await runGbpReplyDrafter(rejecting.deps(gbp), "r2")).toEqual({ status: "owner_rejected" });
    expect(replies).toEqual([]);
    expect(await reviewRow("r1")).toMatchObject({ reply_status: "expired" });
  });

  it("redrafts once with the validator's feedback, then hands a failing review to a person", async () => {
    await seed("r1");
    await seed("r2");
    const fixes = replyHarness({ drafts: ["We are sorry your visit ran late, Jordan.", GOOD] });
    const { gbp } = fakeGbp([]);
    expect(await runGbpReplyDrafter(fixes.deps(gbp), "r1")).toEqual({ status: "posted" });
    expect(fixes.prompts[1]).toContain("Do not say or imply the reviewer is or was a patient");
    expect(fixes.prompts[1]).toContain("Do not name the reviewer.");

    const never = replyHarness({ drafts: ["We hope your treatment is going well."] });
    expect(await runGbpReplyDrafter(never.deps(gbp), "r2")).toEqual({ status: "rejected" });
    expect(await reviewRow("r2")).toMatchObject({ reply_status: "rejected", status_reason: "reply_failed_validator" });
    expect(never.events).toEqual([]);
  });

  it("does not ask twice when retried, and never overwrites a reply posted in the GBP UI meanwhile", async () => {
    await seed();
    const h = replyHarness();
    const { gbp, replies, live } = fakeGbp([]);
    // The worker dies while waiting, after the owner was asked.
    const crashing = { ...h.deps(gbp), gate: { ...h.deps(gbp).gate, wait: () => Promise.reject(new Error("worker died")) } };
    await expect(runGbpReplyDrafter(crashing, "r1")).rejects.toThrow();
    expect(h.events).toHaveLength(1);

    // Meanwhile a person replied in the GBP UI; sync records it, and Google shows it.
    await runGbpSync({ db: client(), gbp: fakeGbp([googleReview("r1", { hasReply: true })]).gbp, logger, draftReply: () => Promise.resolve() });
    live.set("r1", "A reply the owner wrote by hand.");

    // The retry resumes the wait on the same token without asking again, the owner approves, and
    // the live check before posting refuses to overwrite the person's reply.
    expect(await runGbpReplyDrafter(h.deps(gbp), "r1")).toEqual({ status: "replied_elsewhere" });
    expect(h.events).toHaveLength(1);
    expect(replies).toEqual([]);
    expect(await reviewRow("r1")).toMatchObject({ reply_status: "rejected", status_reason: "replied_elsewhere" });
  });
});

describe("gbp.post-publisher", () => {
  async function approvedGbpPost(body: string, slot = new Date("2026-10-19T14:00:00Z")) {
    await client().query("reset role");
    const hash = contentHash({ channel: "gbp", body, media: [], scheduledFor: slot });
    const { rows } = await client().query<{ id: string }>(
      `insert into marketing.social_posts (channel, topic, body, scheduled_for, approval_status, approved_content_hash)
       values ('gbp', 't', $1, $2, 'approved', $3) returning id`,
      [body, slot.toISOString(), hash],
    );
    await client().query("set role marketing_rw");
    return rows[0]?.id ?? "";
  }
  const status = async (id: string) =>
    (await client().query<{ approval_status: string; status_reason: string | null; published_ref: string | null }>(
      "select approval_status::text, status_reason, published_ref from marketing.social_posts where id = $1",
      [id],
    )).rows[0];

  it("publishes the Phase 3 GBP posts whose slot has come, once", async () => {
    const due = await approvedGbpPost("How a telehealth visit works. Learn more at newpointnp.com.");
    const later = await approvedGbpPost("Next week's post.", new Date("2026-10-26T14:00:00Z"));
    const { gbp, posts } = fakeGbp([]);
    const deps = { db: client(), gbp: () => gbp, logger, now: () => NOW };
    expect(await runGbpPostPublisher(deps)).toEqual({ published: 1 });
    expect(await runGbpPostPublisher(deps)).toEqual({});
    expect(posts).toEqual([{ summary: "How a telehealth visit works. Learn more at newpointnp.com.", ctaUrl: "https://newpointnp.com/", imageUrl: null }]);
    expect(await status(due)).toMatchObject({ approval_status: "published", published_ref: "localPosts/1" });
    expect(await status(later)).toMatchObject({ approval_status: "approved" });
  });

  it("refuses a phone number in a GBP post, and leaves a failed call in publishing for the heartbeat", async () => {
    const phone = await approvedGbpPost("Call (609) 527-9438 to learn more.");
    const failing = await approvedGbpPost("Telehealth across New Jersey and Pennsylvania.", new Date("2026-10-19T14:15:00Z"));
    const { gbp, failNextPosts } = fakeGbp([]);
    failNextPosts();
    expect(await runGbpPostPublisher({ db: client(), gbp: () => gbp, logger, now: () => NOW })).toEqual({ gbp_no_phone_in_post: 1, failed: 1 });
    expect(await status(phone)).toMatchObject({ approval_status: "rejected", status_reason: "gbp_no_phone_in_post" });
    expect(await status(failing)).toMatchObject({ approval_status: "publishing", status_reason: "publish_failed_check_listing" });

    // ops.heartbeat: nothing at once, one alert after 30 minutes, never a second.
    const alerts: N8nEvent[] = [];
    const heartbeat = { db: client(), logger, now: () => NOW, alerts: { emit: (e: N8nEvent) => Promise.resolve(void alerts.push(e)) } };
    expect(await runHeartbeat(heartbeat)).toEqual({ stuckAlerted: 0 });
    await client().query("reset role");
    await client().query("update marketing.social_posts set publishing_started_at = now() - interval '31 minutes' where id = $1", [failing]);
    await client().query("set role marketing_rw");
    expect(await runHeartbeat(heartbeat)).toEqual({ stuckAlerted: 1 });
    expect(await runHeartbeat(heartbeat)).toEqual({ stuckAlerted: 0 });
    expect(alerts[0]).toMatchObject({ kind: "ops.alert", code: "post_stuck_publishing", post_id: failing, channel: "gbp" });
  });
});

describe("gbp.nap-audit", () => {
  const listing: GbpLocation = {
    title: p("New Point Healthcare"),
    primaryPhone: p("(609) 527-9438"),
    address: p("6 Colonial Lake Dr, Suite D, Lawrence Township, NJ, 08648"),
    websiteUri: p("https://www.newpointnp.com/"),
  };

  it("is blocked by the flag, and by unconfirmed D11 facts, calling nothing", async () => {
    const { gbp } = fakeGbp([]);
    expect(await runGbpNapAudit({ db: client(), gbp: () => gbp, logger, enabled: false })).toEqual({ status: "blocked_d11", mismatches: 0 });
    expect(await runGbpNapAudit({ db: client(), gbp: () => gbp, logger, enabled: true })).toEqual({
      status: "blocked_d11_facts_unconfirmed",
      mismatches: 0,
    });
  });

  it("once unblocked, reports each mismatch for a person and proposes no address of its own", async () => {
    await client().query("reset role");
    await client().query(
      `insert into public.practice_facts (key, value, confirmed, source) values
         ('legal_name', '"Newpoint Healthcare Services, LLC"', true, 'LLC documents'),
         ('street_address', '"6 Colonial Lake Dr, Suite D, Lawrence Township, NJ, 08648"', true, 'client')`,
    );
    await client().query("set role marketing_rw");
    const { gbp } = fakeGbp([], listing);
    expect(await runGbpNapAudit({ db: client(), gbp: () => gbp, logger, enabled: true })).toEqual({ status: "audited", mismatches: 1 });
    const { rows } = await client().query<{ kind: string; target: string; rationale: string }>(
      "select kind::text, target, rationale from marketing.content_backlog",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "nap", target: "gbp listing name" });
    expect(rows[0]?.rationale).toContain("never enter an address the client has not confirmed");
  });
});
