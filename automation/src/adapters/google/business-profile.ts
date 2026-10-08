/**
 * Google Business Profile (docs/automation-architecture.md §5.2), public zone.
 *
 * Endpoints, all with the business.manage scope:
 *   - reviews and replies, and local posts: My Business API v4
 *     (accounts/{account}/locations/{location}/…);
 *   - listing fields for the NAP audit: Business Information API v1.
 * Confirm both against Google's current documentation when API access is
 * granted; Google has moved GBP endpoints between APIs before.
 *
 * GBP has no service accounts: an OAuth client and the refresh token of a person
 * who manages the listing. A non-2xx response becomes a VendorHttpError with the
 * status only; the body is never read. Reviews are public, so their text and the
 * reviewer's public display name come back as PublicText.
 */
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { VendorHttpError } from "../../lib/errors.js";
import type { GbpEnv } from "../../lib/env.js";
import { fromPublicSource, type PublicText } from "../../lib/phi.js";
import type { FetchLike } from "./search-console.js";

const V4 = "https://mybusiness.googleapis.com/v4";
const INFO = "https://mybusinessbusinessinformation.googleapis.com/v1";
/** 50 reviews a page; a practice this size never needs more than a few. */
const MAX_REVIEW_PAGES = 20;

const STARS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 } as const;

const reviewsSchema = z.object({
  reviews: z
    .array(
      z.object({
        reviewId: z.string().min(1),
        reviewer: z.object({ displayName: z.string().optional(), isAnonymous: z.boolean().optional() }).optional(),
        starRating: z.string(),
        comment: z.string().optional(),
        createTime: z.string(),
        updateTime: z.string(),
        reviewReply: z.object({ comment: z.string() }).optional(),
      }),
    )
    .optional(),
  nextPageToken: z.string().optional(),
});

export interface GbpReview {
  readonly reviewId: string;
  /** null when Google sends no star rating. */
  readonly rating: number | null;
  readonly text: PublicText | null;
  readonly reviewer: PublicText | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  /** A reply already shows on Google (posted here, or by a person in the GBP UI). */
  readonly hasReply: boolean;
}

export interface GbpLocation {
  readonly title: PublicText | null;
  readonly primaryPhone: PublicText | null;
  readonly address: PublicText | null;
  readonly websiteUri: PublicText | null;
}

export interface BusinessProfile {
  listReviews(): Promise<GbpReview[]>;
  /** The reply Google shows on this review right now, or null (read live before posting one). */
  currentReply(reviewId: string): Promise<string | null>;
  /** PUT: replaces any existing reply, so a retry cannot post twice. */
  replyToReview(reviewId: string, comment: string): Promise<void>;
  createPost(post: { readonly summary: string; readonly ctaUrl: string; readonly imageUrl: string | null }): Promise<string>;
  getLocation(): Promise<GbpLocation>;
}

export interface BusinessProfileOptions {
  readonly env: GbpEnv;
  readonly fetch: FetchLike;
  readonly accessToken: () => Promise<string>;
}

const pub = (text: string | undefined): PublicText | null =>
  text === undefined || text.trim() === "" ? null : fromPublicSource("google_business_profile", text);

export function createBusinessProfile(options: BusinessProfileOptions): BusinessProfile {
  const { env } = options;
  const location = `accounts/${env.accountId}/locations/${env.locationId}`;

  async function call(method: "GET" | "POST" | "PUT", url: string, body?: unknown): Promise<unknown> {
    const response = await options.fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${await options.accessToken()}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw new VendorHttpError("google", response.status);
    return response.json();
  }

  return {
    async listReviews() {
      const reviews: GbpReview[] = [];
      let pageToken: string | undefined;
      for (let page = 0; page < MAX_REVIEW_PAGES; page += 1) {
        const query = new URLSearchParams({ pageSize: "50", ...(pageToken ? { pageToken } : {}) });
        const parsed = reviewsSchema.parse(await call("GET", `${V4}/${location}/reviews?${query.toString()}`));
        for (const r of parsed.reviews ?? []) {
          reviews.push({
            reviewId: r.reviewId,
            rating: r.starRating in STARS ? STARS[r.starRating as keyof typeof STARS] : null,
            text: pub(r.comment),
            reviewer: r.reviewer?.isAnonymous === true ? null : pub(r.reviewer?.displayName),
            createdAt: new Date(r.createTime),
            updatedAt: new Date(r.updateTime),
            hasReply: r.reviewReply !== undefined,
          });
        }
        pageToken = parsed.nextPageToken;
        if (!pageToken) break;
      }
      return reviews;
    },

    async currentReply(reviewId) {
      const review = z
        .object({ reviewReply: z.object({ comment: z.string() }).optional() })
        .parse(await call("GET", `${V4}/${location}/reviews/${encodeURIComponent(reviewId)}`));
      return review.reviewReply?.comment ?? null;
    },

    async replyToReview(reviewId, comment) {
      await call("PUT", `${V4}/${location}/reviews/${encodeURIComponent(reviewId)}/reply`, { comment });
    },

    async createPost({ summary, ctaUrl, imageUrl }) {
      const created = z.object({ name: z.string().min(1) }).parse(
        await call("POST", `${V4}/${location}/localPosts`, {
          languageCode: "en-US",
          topicType: "STANDARD",
          summary,
          callToAction: { actionType: "LEARN_MORE", url: ctaUrl },
          ...(imageUrl === null ? {} : { media: [{ mediaFormat: "PHOTO", sourceUrl: imageUrl }] }),
        }),
      );
      return created.name;
    },

    async getLocation() {
      const parsed = z
        .object({
          title: z.string().optional(),
          phoneNumbers: z.object({ primaryPhone: z.string().optional() }).optional(),
          storefrontAddress: z
            .object({
              addressLines: z.array(z.string()).optional(),
              locality: z.string().optional(),
              administrativeArea: z.string().optional(),
              postalCode: z.string().optional(),
            })
            .optional(),
          websiteUri: z.string().optional(),
        })
        .parse(await call("GET", `${INFO}/locations/${env.locationId}?readMask=title,phoneNumbers,storefrontAddress,websiteUri`));
      const a = parsed.storefrontAddress;
      const address =
        a === undefined
          ? undefined
          : [...(a.addressLines ?? []), a.locality, a.administrativeArea, a.postalCode].filter((x) => x !== undefined && x !== "").join(", ");
      return {
        title: pub(parsed.title),
        primaryPhone: pub(parsed.phoneNumbers?.primaryPhone),
        address: pub(address),
        websiteUri: pub(parsed.websiteUri),
      };
    },
  };
}

/** Access tokens from the listing manager's refresh token (google-auth-library refreshes them). */
export function gbpAccessToken(env: GbpEnv): () => Promise<string> {
  const client = new OAuth2Client({ clientId: env.clientId, clientSecret: env.clientSecret });
  client.setCredentials({ refresh_token: env.refreshToken });
  return async () => {
    const { token } = await client.getAccessToken();
    if (!token) throw new VendorHttpError("google", 401);
    return token;
  };
}
