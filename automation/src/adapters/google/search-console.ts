/**
 * Google Search Console, Search Analytics API (docs/automation-architecture.md
 * §5.3; D8: the only keyword data source in v1).
 *
 * Read-only. The service account is a Restricted user on the property, with
 * the `webmasters.readonly` scope and no IAM roles (automation/README.md).
 *
 * `fetch` is injected: production passes Trigger.dev's `retry.fetch`, limited
 * to 429 and 5xx (§5.9); tests pass a fake. A non-2xx response becomes a
 * VendorHttpError carrying the status only; the body is never read, because
 * Google's error text can echo the request.
 */
import { JWT } from "google-auth-library";
import { z } from "zod";
import { VendorHttpError } from "../../lib/errors.js";
import { fromPublicSource, type PublicText } from "../../lib/phi.js";

const ENDPOINT = "https://searchconsole.googleapis.com/webmasters/v3/sites";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
/** The API's maximum page size. */
export const PAGE_SIZE = 25_000;

export type Dimension = "query" | "date" | "page";

export interface SearchAnalyticsRequest {
  /** YYYY-MM-DD, Pacific time, inclusive (the API's convention). */
  readonly startDate: string;
  readonly endDate: string;
  readonly dimensions: readonly Dimension[];
}

export interface SearchAnalyticsRow {
  /** One value per requested dimension, in order. Public by source (see fromPublicSource). */
  readonly keys: readonly PublicText[];
  readonly clicks: number;
  readonly impressions: number;
  /** Average position, 1-based. */
  readonly position: number;
}

export interface SearchConsole {
  /** All rows for the request, following pagination. */
  searchAnalytics(request: SearchAnalyticsRequest): Promise<SearchAnalyticsRow[]>;
}

const responseSchema = z.object({
  rows: z
    .array(
      z.object({
        keys: z.array(z.string()),
        clicks: z.number().nonnegative(),
        impressions: z.number().nonnegative(),
        position: z.number().min(1),
      }),
    )
    .optional(),
});

export type FetchLike = typeof fetch;

export interface SearchConsoleOptions {
  /** `sc-domain:newpointnp.com` or `https://newpointnp.com/`. */
  readonly siteUrl: string;
  readonly fetch: FetchLike;
  readonly accessToken: () => Promise<string>;
}

export function createSearchConsole(options: SearchConsoleOptions): SearchConsole {
  const url = `${ENDPOINT}/${encodeURIComponent(options.siteUrl)}/searchAnalytics/query`;

  return {
    async searchAnalytics(request) {
      const rows: SearchAnalyticsRow[] = [];
      for (let startRow = 0; ; startRow += PAGE_SIZE) {
        const response = await options.fetch(url, {
          method: "POST",
          headers: {
            authorization: `Bearer ${await options.accessToken()}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            startDate: request.startDate,
            endDate: request.endDate,
            dimensions: request.dimensions,
            rowLimit: PAGE_SIZE,
            startRow,
          }),
        });
        if (!response.ok) throw new VendorHttpError("google", response.status);

        const page = responseSchema.parse(await response.json()).rows ?? [];
        for (const row of page) {
          rows.push({
            keys: row.keys.map((key) => fromPublicSource("google_search_console", key)),
            clicks: row.clicks,
            impressions: row.impressions,
            position: row.position,
          });
        }
        if (page.length < PAGE_SIZE) return rows;
      }
    },
  };
}

/** Access tokens for the gsc-reader service account. google-auth-library caches and refreshes them. */
export function serviceAccountToken(credentials: {
  readonly client_email: string;
  readonly private_key: string;
}): () => Promise<string> {
  const jwt = new JWT({ email: credentials.client_email, key: credentials.private_key, scopes: [SCOPE] });
  return async () => {
    const { token } = await jwt.getAccessToken();
    if (!token) throw new VendorHttpError("google", 401);
    return token;
  };
}
