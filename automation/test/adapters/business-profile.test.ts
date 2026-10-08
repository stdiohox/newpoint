import { describe, expect, it } from "vitest";
import { createBusinessProfile } from "../../src/adapters/google/business-profile.js";
import type { FetchLike } from "../../src/adapters/google/search-console.js";
import { VendorHttpError } from "../../src/lib/errors.js";

const env = { clientId: "x.apps.googleusercontent.com", clientSecret: "secret-xx", refreshToken: "r".repeat(30), accountId: "111111", locationId: "222222" };
const urlOf = (input: string | URL | Request): string => (typeof input === "string" ? input : input instanceof URL ? input.href : input.url);

function fakeGoogle(replies: readonly Response[]) {
  const calls: { url: string; method: string; auth: string | null; body: unknown }[] = [];
  const queue = [...replies];
  const fetch: FetchLike = (input, init) => {
    calls.push({
      url: urlOf(input),
      method: init?.method ?? "GET",
      auth: new Headers(init?.headers).get("authorization"),
      body: typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined,
    });
    const next = queue.shift();
    if (!next) throw new Error("unexpected request");
    return Promise.resolve(next);
  };
  return { gbp: createBusinessProfile({ env, fetch, accessToken: () => Promise.resolve("ya29.token") }), calls };
}

const review = (id: string, extra: Record<string, unknown> = {}) => ({
  reviewId: id,
  reviewer: { displayName: "Jordan Pike" },
  starRating: "TWO",
  comment: "Long wait.",
  createTime: "2026-10-01T12:00:00Z",
  updateTime: "2026-10-01T12:00:00Z",
  ...extra,
});

describe("Business Profile adapter", () => {
  it("lists reviews across pages and maps ratings, anonymity and existing replies", async () => {
    const { gbp, calls } = fakeGoogle([
      Response.json({ reviews: [review("a")], nextPageToken: "p2" }),
      Response.json({
        reviews: [
          review("b", { reviewer: { isAnonymous: true }, starRating: "FIVE", comment: undefined, reviewReply: { comment: "Thanks" } }),
          review("c", { starRating: "STAR_RATING_UNSPECIFIED" }),
        ],
      }),
    ]);
    const reviews = await gbp.listReviews();
    expect(reviews.map((r) => [r.reviewId, r.rating, r.text, r.reviewer, r.hasReply])).toEqual([
      ["a", 2, "Long wait.", "Jordan Pike", false],
      ["b", 5, null, null, true],
      ["c", null, "Long wait.", "Jordan Pike", false],
    ]);
    expect(calls[0]?.url).toBe("https://mybusiness.googleapis.com/v4/accounts/111111/locations/222222/reviews?pageSize=50");
    expect(calls[1]?.url).toContain("pageToken=p2");
    expect(calls[0]?.auth).toBe("Bearer ya29.token");
  });

  it("replies with a PUT, so a retry replaces rather than duplicates", async () => {
    const { gbp, calls } = fakeGoogle([Response.json({ comment: "Thank you.", updateTime: "x" })]);
    await gbp.replyToReview("abc-123", "Thank you.");
    expect(calls[0]).toMatchObject({
      method: "PUT",
      url: "https://mybusiness.googleapis.com/v4/accounts/111111/locations/222222/reviews/abc-123/reply",
      body: { comment: "Thank you." },
    });
  });

  it("creates a standard post with a Learn more link to the site", async () => {
    const { gbp, calls } = fakeGoogle([Response.json({ name: "accounts/111111/locations/222222/localPosts/9" })]);
    const name = await gbp.createPost({ summary: "Telehealth explained.", ctaUrl: "https://newpointnp.com/", imageUrl: "https://newpointnp.com/a.jpg" });
    expect(name).toBe("accounts/111111/locations/222222/localPosts/9");
    expect(calls[0]?.body).toEqual({
      languageCode: "en-US",
      topicType: "STANDARD",
      summary: "Telehealth explained.",
      callToAction: { actionType: "LEARN_MORE", url: "https://newpointnp.com/" },
      media: [{ mediaFormat: "PHOTO", sourceUrl: "https://newpointnp.com/a.jpg" }],
    });
  });

  it("reads the listing's NAP fields", async () => {
    const { gbp, calls } = fakeGoogle([
      Response.json({
        title: "New Point Healthcare",
        phoneNumbers: { primaryPhone: "(609) 527-9438" },
        storefrontAddress: { addressLines: ["6 Colonial Lake Dr", "Suite D"], locality: "Lawrence Township", administrativeArea: "NJ", postalCode: "08648" },
        websiteUri: "https://www.newpointnp.com/",
      }),
    ]);
    expect(await gbp.getLocation()).toEqual({
      title: "New Point Healthcare",
      primaryPhone: "(609) 527-9438",
      address: "6 Colonial Lake Dr, Suite D, Lawrence Township, NJ, 08648",
      websiteUri: "https://www.newpointnp.com/",
    });
    expect(calls[0]?.url).toBe(
      "https://mybusinessbusinessinformation.googleapis.com/v1/locations/222222?readMask=title,phoneNumbers,storefrontAddress,websiteUri",
    );
  });

  it("maps an HTTP error to its status without reading the body", async () => {
    const body = new ReadableStream({
      pull() {
        throw new Error("the error body must not be read");
      },
    });
    const { gbp } = fakeGoogle([new Response(body, { status: 403 })]);
    const error = await gbp.replyToReview("a", "x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(VendorHttpError);
    expect(error).toMatchObject({ vendor: "google", status: 403 });
  });
});
