/**
 * Phase 4 against the embedded Postgres shaped like newpoint-marketing, AS marketing_rw
 * (a member of crm_alerts, as trigger_marketing is in production): gbp.sync →
 * gbp.reply-drafter (drafts, emails staff once, never posts) → a staff decision in
 * the CRM (crm.decide_review) → gbp.reply-poster, and gbp.nap-audit's two locks.
 * Google and Claude are fakes; email is recorded.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Email, EmailSender } from "../../src/adapters/email/resend.js";
import type { BusinessProfile, GbpLocation, GbpReview } from "../../src/adapters/google/business-profile.js";
import type { ParseResult, PublicClaude } from "../../src/adapters/llm/anthropic-public.js";
import { createLogger } from "../../src/lib/logger.js";
import type { PublicText } from "../../src/lib/phi.js";
import { runGbpNapAudit } from "../../src/trigger/marketing/gbp/nap-audit.js";
import { runGbpReplyDrafter } from "../../src/trigger/marketing/gbp/reply-drafter.js";
import { runGbpReplyPoster } from "../../src/trigger/marketing/gbp/reply-poster.js";
import { runGbpSync } from "../../src/trigger/marketing/gbp/sync.js";
import { startMarketingDb, type MarketingDb } from "../db/marketing-db.js";

const NOW = new Date("2026-10-19T15:00:00Z");
const CRM = "https://www.newpointnp.com/crm";
const STAFF = "00000000-0000-4000-8000-0000000000b1";
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
  await db.client.query(`insert into auth.users (id, email) values ($1, 'desk@example.com')`, [STAFF]);
  await db.client.query(`insert into crm.staff (user_id, email, display_name) values ($1, 'desk@example.com', 'Front desk')`, [STAFF]);
  await db.client.query("grant crm_alerts to marketing_rw");
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
  const live = new Map<string, string>();
  let failReplies = 0;
  const gbp: BusinessProfile = {
    listReviews: () => Promise.resolve(reviews),
    currentReply: (reviewId) => Promise.resolve(live.get(reviewId) ?? null),
    replyToReview: (reviewId, comment) => {
      if (failReplies > 0) {
        failReplies -= 1;
        return Promise.reject(new Error("socket hang up"));
      }
      replies.push({ reviewId, comment });
      live.set(reviewId, comment);
      return Promise.resolve();
    },
    createPost: () => Promise.reject(new Error("must not be called")),
    getLocation: () => (location ? Promise.resolve(location) : Promise.reject(new Error("must not be called"))),
  };
  return { gbp, replies, live, failNextReplies: (n: number) => (failReplies = n) };
}

function recordingSender(): EmailSender & { sent: Email[] } {
  const sent: Email[] = [];
  return {
    sent,
    send(email) {
      sent.push(email);
      return Promise.resolve();
    },
  };
}

function fakeClaude(drafts: readonly string[] = [GOOD]) {
  const prompts: string[] = [];
  let call = 0;
  const claude: PublicClaude = {
    parse(request) {
      prompts.push(request.user);
      const reply = drafts[Math.min(call, drafts.length - 1)] ?? GOOD;
      call += 1;
      return Promise.resolve({ ok: true, value: { reply } } as ParseResult<never>);
    },
  };
  return { claude, prompts };
}

const drafterDeps = (gbp: BusinessProfile, claude: PublicClaude, email: EmailSender) => ({ db: client(), claude, gbp, logger, email, crmBaseUrl: CRM, now: () => NOW });
const posterDeps = (gbp: BusinessProfile, email: EmailSender) => ({ db: client(), gbp, logger, email, crmBaseUrl: CRM, now: () => NOW });

const reviewRow = async (id: string) =>
  (
    await client().query<{ reply_status: string; status_reason: string | null; reply_draft: string | null; replied_at: Date | null; alerted_at: Date | null }>(
      "select reply_status::text, status_reason, reply_draft, replied_at, alerted_at from marketing.gbp_reviews where google_review_id = $1",
      [id],
    )
  ).rows[0];

/** What staff do in the CRM, as the signed-in staff member. */
async function decide(id: string, decision: "approve" | "skip", reply?: string): Promise<boolean> {
  await client().query("reset role");
  await client().query("begin");
  await client().query("select set_config('request.jwt.claim.sub', $1, true)", [STAFF]);
  await client().query("set local role authenticated");
  const { rows } = await client().query<{ ok: boolean }>("select crm.decide_review($1, $2, $3) as ok", [id, decision, reply ?? null]);
  await client().query("commit");
  await client().query("set role marketing_rw");
  return rows[0]?.ok ?? false;
}

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
  it("drafts, emails staff once with the review beside a link to the CRM, and never posts", async () => {
    const { gbp, replies } = fakeGbp([googleReview("r1")]);
    const { claude } = fakeClaude();
    const email = recordingSender();
    await runGbpSync({ db: client(), gbp, logger, draftReply: () => Promise.resolve() });

    expect(await runGbpReplyDrafter(drafterDeps(gbp, claude, email), "r1")).toEqual({ status: "awaiting_approval" });
    expect(replies).toEqual([]);
    expect(email.sent).toHaveLength(1);
    const sent = email.sent[0];
    expect(sent?.to).toEqual(["desk@example.com"]);
    expect(sent?.subject).toBe("New 2-star Google review: approve or skip the reply");
    expect(sent?.text).toContain("Waited forty minutes");
    expect(sent?.text).toContain(`${CRM}/reviews`);
    expect(sent?.idempotencyKey).toBe("review-draft/r1");
    expect((await reviewRow("r1"))?.reply_status).toBe("awaiting_approval");

    // A retry (or the next sync handing it over again) changes nothing and sends nothing.
    expect(await runGbpReplyDrafter(drafterDeps(gbp, claude, email), "r1")).toEqual({ status: "awaiting_approval" });
    expect(email.sent).toHaveLength(1);
  });

  it("redrafts once with the validator's feedback, then hands a failing review to a person", async () => {
    const { gbp } = fakeGbp([googleReview("r2")]);
    const { claude, prompts } = fakeClaude(["Thank you for your visit, Jordan.", "Thanks for your feedback about the wait."]);
    const email = recordingSender();
    await runGbpSync({ db: client(), gbp, logger, draftReply: () => Promise.resolve() });

    expect(await runGbpReplyDrafter(drafterDeps(gbp, claude, email), "r2")).toEqual({ status: "rejected" });
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toMatch(/Do not say or imply the reviewer is or was a patient/);
    expect(await reviewRow("r2")).toMatchObject({ reply_status: "rejected", status_reason: "reply_failed_validator" });
    expect(email.sent.map((e) => e.subject)).toEqual(["New 2-star Google review: no automatic reply"]);
    expect(await runGbpReplyDrafter(drafterDeps(gbp, claude, email), "r2")).toEqual({ status: "rejected" });
    expect(email.sent).toHaveLength(1);
  });

  it("never drafts for a review that mentions a crisis; the clinical lead hears instead", async () => {
    const { gbp } = fakeGbp([googleReview("rc", { text: p("After the way I was treated I just want to end it all.") })]);
    const { claude, prompts } = fakeClaude();
    const email = recordingSender();
    await runGbpSync({ db: client(), gbp, logger, draftReply: () => Promise.resolve() });
    expect(await runGbpReplyDrafter(drafterDeps(gbp, claude, email), "rc")).toEqual({ status: "crisis" });
    expect(prompts).toEqual([]);
    expect(await reviewRow("rc")).toMatchObject({ reply_status: "rejected", status_reason: "crisis_review" });
    expect(email.sent.map((e) => e.subject)).toEqual(["Google review mentions a crisis (2-star review)"]);
    expect(await decide("rc", "approve", GOOD)).toBe(false);
  });

  it("leaves a review that already has a reply on Google alone", async () => {
    const { gbp } = fakeGbp([googleReview("r3", { hasReply: true })]);
    const { claude, prompts } = fakeClaude();
    const email = recordingSender();
    await runGbpSync({ db: client(), gbp, logger, draftReply: () => Promise.resolve() });
    expect(await runGbpReplyDrafter(drafterDeps(gbp, claude, email), "r3")).toEqual({ status: "skipped" });
    expect(prompts).toEqual([]);
    expect(email.sent).toEqual([]);
  });
});

describe("gbp.reply-poster", () => {
  async function waiting(id: string) {
    const { gbp, replies, live, failNextReplies } = fakeGbp([googleReview(id)]);
    const email = recordingSender();
    await runGbpSync({ db: client(), gbp, logger, draftReply: () => Promise.resolve() });
    await runGbpReplyDrafter(drafterDeps(gbp, fakeClaude().claude, email), id);
    return { gbp, replies, live, email, failNextReplies };
  }

  it("posts exactly the text staff approved, once, and nothing before a decision", async () => {
    const { gbp, replies, email } = await waiting("r4");
    expect(await runGbpReplyPoster(posterDeps(gbp, email))).toMatchObject({ posted: 0 });
    expect(replies).toEqual([]);

    const edited = "Thank you for taking the time to share this. We would welcome a conversation: please call the practice at (609) 527-9438.";
    expect(await decide("r4", "approve", edited)).toBe(true);
    expect(await runGbpReplyPoster(posterDeps(gbp, email))).toMatchObject({ posted: 1 });
    expect(replies).toEqual([{ reviewId: "r4", comment: edited }]);
    expect(await reviewRow("r4")).toMatchObject({ reply_status: "posted", replied_at: NOW });
    expect(await runGbpReplyPoster(posterDeps(gbp, email))).toMatchObject({ posted: 0 });
    expect(replies).toHaveLength(1);
  });

  it("a skip posts nothing", async () => {
    const { gbp, replies, email } = await waiting("r5");
    expect(await decide("r5", "skip")).toBe(true);
    expect(await runGbpReplyPoster(posterDeps(gbp, email))).toMatchObject({ posted: 0 });
    expect(replies).toEqual([]);
    expect(await reviewRow("r5")).toMatchObject({ reply_status: "rejected", status_reason: "staff_skipped" });
  });

  it("refuses an edited reply that breaks a rule, and tells staff", async () => {
    const { gbp, replies, email } = await waiting("r6");
    expect(await decide("r6", "approve", "Thank you for your visit, Jordan. We hope the wait was not too long.")).toBe(true);
    expect(await runGbpReplyPoster(posterDeps(gbp, email))).toMatchObject({ rule_at_post: 1, posted: 0 });
    expect(replies).toEqual([]);
    expect(await reviewRow("r6")).toMatchObject({ reply_status: "rejected", status_reason: "rule_at_post_implies_patient" });
    expect(email.sent.at(-1)?.subject).toBe("Google review reply not posted (2-star review)");
  });

  it("after a refusal, staff can write the reply in the CRM and it goes through the same checks", async () => {
    const { gbp, replies, email } = await waiting("r9");
    expect(await decide("r9", "approve", "Thank you for your visit.")).toBe(true);
    expect(await runGbpReplyPoster(posterDeps(gbp, email))).toMatchObject({ rule_at_post: 1 });
    expect((await reviewRow("r9"))?.status_reason).toBe("rule_at_post_implies_patient");
    expect(await decide("r9", "approve", GOOD)).toBe(true);
    expect(await runGbpReplyPoster(posterDeps(gbp, email))).toMatchObject({ posted: 1 });
    expect(replies.map((r) => r.comment)).toEqual([GOOD]);
  });

  it("gives up after three failed calls to Google, tells staff, and never blocks the next review", async () => {
    const first = await waiting("r10");
    expect(await decide("r10", "approve", GOOD)).toBe(true);
    first.failNextReplies(3);
    expect(await runGbpReplyPoster(posterDeps(first.gbp, first.email))).toMatchObject({ failed: 1 });
    expect(await runGbpReplyPoster(posterDeps(first.gbp, first.email))).toMatchObject({ failed: 1 });
    // The third failed call reaches the cap: attempts are counted before each call.
    expect(await runGbpReplyPoster(posterDeps(first.gbp, first.email))).toMatchObject({ post_failed: 1, failed: 0 });
    expect(await runGbpReplyPoster(posterDeps(first.gbp, first.email))).toMatchObject({ post_failed: 0, failed: 0, posted: 0 });
    expect(await reviewRow("r10")).toMatchObject({ reply_status: "rejected", status_reason: "post_failed" });
    expect(first.email.sent.at(-1)?.subject).toMatch(/not posted/);
  });

  it("does not answer a review whose text changed after staff approved", async () => {
    const { gbp, replies, email } = await waiting("r11");
    expect(await decide("r11", "approve", GOOD)).toBe(true);
    await client().query("update marketing.gbp_reviews set text = 'Edited after approval.' where google_review_id = 'r11'");
    expect(await runGbpReplyPoster(posterDeps(gbp, email))).toMatchObject({ review_changed: 1 });
    expect(replies).toEqual([]);
    expect((await reviewRow("r11"))?.status_reason).toBe("review_changed");
  });

  it("never overwrites a reply someone posted in Google meanwhile; recognises its own after a crash", async () => {
    const { gbp, replies, live, email } = await waiting("r7");
    expect(await decide("r7", "approve", GOOD)).toBe(true);
    live.set("r7", "Handled by hand in Google.");
    expect(await runGbpReplyPoster(posterDeps(gbp, email))).toMatchObject({ replied_elsewhere: 1 });
    expect(replies).toEqual([]);
    expect(await reviewRow("r7")).toMatchObject({ reply_status: "rejected", status_reason: "replied_elsewhere" });

    const own = await waiting("r8");
    expect(await decide("r8", "approve", GOOD)).toBe(true);
    own.live.set("r8", `${GOOD}  `); // Google tidied the whitespace
    expect(await runGbpReplyPoster(posterDeps(own.gbp, own.email))).toMatchObject({ posted: 1 });
    expect(own.replies).toEqual([]);
    expect((await reviewRow("r8"))?.reply_status).toBe("posted");
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
