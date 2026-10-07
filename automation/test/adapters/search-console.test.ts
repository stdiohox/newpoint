import { describe, expect, it } from "vitest";
import { createSearchConsole, PAGE_SIZE, type FetchLike } from "../../src/adapters/google/search-console.js";
import { VendorHttpError } from "../../src/lib/errors.js";

const urlOf = (input: string | URL | Request): string =>
  typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
const bodyOf = (init: RequestInit | undefined): string => (typeof init?.body === "string" ? init.body : "");


interface Call {
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body: { startRow: number; rowLimit: number; dimensions: string[]; startDate: string; endDate: string };
}

function fakeFetch(responses: readonly Response[]): { fetch: FetchLike; calls: Call[] } {
  const calls: Call[] = [];
  const queue = [...responses];
  const fetch: FetchLike = (input, init) => {
    calls.push({
      url: urlOf(input),
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: JSON.parse(bodyOf(init)) as Call["body"],
    });
    const next = queue.shift();
    if (!next) throw new Error("unexpected request");
    return Promise.resolve(next);
  };
  return { fetch, calls };
}

const row = (query: string, impressions = 10) => ({ keys: [query], clicks: 1, impressions, ctr: 0.1, position: 3.2 });

describe("Search Console adapter", () => {
  it("posts the query with a bearer token to the property's endpoint", async () => {
    const { fetch, calls } = fakeFetch([Response.json({ rows: [row("psychiatric assessment nj")] })]);
    const gsc = createSearchConsole({ siteUrl: "sc-domain:newpointnp.com", fetch, accessToken: () => Promise.resolve("tok") });

    const rows = await gsc.searchAnalytics({ startDate: "2026-09-01", endDate: "2026-09-28", dimensions: ["query"] });

    expect(rows).toEqual([{ keys: ["psychiatric assessment nj"], clicks: 1, impressions: 10, position: 3.2 }]);
    expect(calls[0]?.url).toBe(
      "https://searchconsole.googleapis.com/webmasters/v3/sites/sc-domain%3Anewpointnp.com/searchAnalytics/query",
    );
    expect(calls[0]?.headers["authorization"]).toBe("Bearer tok");
    expect(calls[0]?.body).toEqual({
      startDate: "2026-09-01",
      endDate: "2026-09-28",
      dimensions: ["query"],
      rowLimit: PAGE_SIZE,
      startRow: 0,
    });
  });

  it("follows pagination until a short page", async () => {
    const full = { rows: Array.from({ length: PAGE_SIZE }, (_, i) => row(`q${String(i)}`)) };
    const { fetch, calls } = fakeFetch([Response.json(full), Response.json({ rows: [row("last")] })]);
    const gsc = createSearchConsole({ siteUrl: "https://newpointnp.com/", fetch, accessToken: () => Promise.resolve("t") });

    const rows = await gsc.searchAnalytics({ startDate: "a", endDate: "b", dimensions: ["query", "date"] });

    expect(rows).toHaveLength(PAGE_SIZE + 1);
    expect(calls.map((call) => call.body.startRow)).toEqual([0, PAGE_SIZE]);
  });

  it("treats a response with no rows as empty", async () => {
    const { fetch } = fakeFetch([Response.json({ responseAggregationType: "byProperty" })]);
    const gsc = createSearchConsole({ siteUrl: "sc-domain:x.com", fetch, accessToken: () => Promise.resolve("t") });
    expect(await gsc.searchAnalytics({ startDate: "a", endDate: "b", dimensions: ["query"] })).toEqual([]);
  });

  it.each([
    [403, "vendor_4xx"],
    [429, "rate_limited"],
    [503, "vendor_5xx"],
  ])("maps HTTP %i to a VendorHttpError (%s) without reading the body", async (status, failureClass) => {
    const body = new ReadableStream({
      pull() {
        throw new Error("the error body must not be read");
      },
    });
    const { fetch } = fakeFetch([new Response(body, { status })]);
    const gsc = createSearchConsole({ siteUrl: "sc-domain:x.com", fetch, accessToken: () => Promise.resolve("t") });

    const error = await gsc.searchAnalytics({ startDate: "a", endDate: "b", dimensions: ["query"] }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(VendorHttpError);
    expect(error).toMatchObject({ status, vendor: "google", failureClass });
  });

  it("rejects a malformed success body", async () => {
    const { fetch } = fakeFetch([Response.json({ rows: [{ keys: ["x"], clicks: -1, impressions: 1, position: 0 }] })]);
    const gsc = createSearchConsole({ siteUrl: "sc-domain:x.com", fetch, accessToken: () => Promise.resolve("t") });
    await expect(gsc.searchAnalytics({ startDate: "a", endDate: "b", dimensions: ["query"] })).rejects.toThrow();
  });
});
