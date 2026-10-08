import { describe, expect, it } from "vitest";
import { createSiteSchemaReader, jsonLdBlocks, MAX_BODY_BYTES, MAX_PAGES, sitemapUrls } from "../../src/adapters/site/schema-coverage.js";
import type { FetchLike } from "../../src/adapters/google/search-console.js";
import { VendorHttpError } from "../../src/lib/errors.js";

const SITE = "https://newpointnp.com/";
const urlOf = (input: string | URL | Request): string =>
  typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

function fakeSite(pages: Record<string, Response | Error>): { fetch: FetchLike; requested: string[]; inits: RequestInit[] } {
  const requested: string[] = [];
  const inits: RequestInit[] = [];
  const fetch: FetchLike = (input, init) => {
    const url = urlOf(input);
    requested.push(url);
    inits.push(init ?? {});
    const page = pages[url];
    if (page instanceof Error) return Promise.reject(page);
    return Promise.resolve(page ?? new Response("", { status: 404 }));
  };
  return { fetch, requested, inits };
}

const redirect = (location: string) => new Response(null, { status: 301, headers: { location } });

const ld = (value: unknown) => `<script type="application/ld+json">${JSON.stringify(value)}</script>`;

describe("sitemapUrls", () => {
  it("keeps https URLs on the site's own host, deduplicated and capped", () => {
    const xml = [
      "<loc>https://newpointnp.com/</loc>",
      "<loc> https://newpointnp.com/faq </loc>",
      "<loc>https://newpointnp.com/faq</loc>",
      "<loc>http://newpointnp.com/insecure</loc>",
      "<loc>https://evil.example/</loc>",
      "<loc>not a url</loc>",
    ].join("");
    expect(sitemapUrls(xml, SITE)).toEqual(["https://newpointnp.com/", "https://newpointnp.com/faq"]);
    const many = Array.from({ length: 100 }, (_, i) => `<loc>https://newpointnp.com/p${String(i)}</loc>`).join("");
    expect(sitemapUrls(many, SITE)).toHaveLength(MAX_PAGES);
  });
});

describe("jsonLdBlocks", () => {
  it("parses every ld+json block and refuses a page with a malformed one", () => {
    expect(jsonLdBlocks(`<head>${ld({ "@type": "WebSite" })}<script type='application/ld+json'>{"@type":"FAQPage"}</script></head>`)).toEqual([
      { "@type": "WebSite" },
      { "@type": "FAQPage" },
    ]);
    expect(jsonLdBlocks('<script type="application/ld+json">{oops</script>')).toBeNull();
    expect(jsonLdBlocks("<p>no markup</p>")).toEqual([]);
    expect(jsonLdBlocks('<script type="application/ld+json">{"@type":"X"}')).toBeNull();
    expect(jsonLdBlocks('<script src="/app.js"></script>' + ld({ "@type": "Y" }))).toEqual([{ "@type": "Y" }]);
  });

  it("scans a page of many unclosed script tags in linear time", () => {
    const hostile = '<script type="application/ld+json">'.repeat(50_000);
    const started = performance.now();
    expect(jsonLdBlocks(hostile)).toBeNull();
    expect(performance.now() - started).toBeLessThan(1_000);
  });
});

describe("site schema reader", () => {
  it("reads every sitemap page and marks unreadable ones", async () => {
    const { fetch } = fakeSite({
      "https://newpointnp.com/sitemap.xml": new Response("<loc>https://newpointnp.com/</loc><loc>https://newpointnp.com/faq</loc>"),
      "https://newpointnp.com/": new Response(ld({ "@type": "MedicalClinic" })),
    });
    expect(await createSiteSchemaReader({ siteUrl: SITE, fetch }).read()).toEqual([
      { url: "https://newpointnp.com/", blocks: [{ "@type": "MedicalClinic" }] },
      { url: "https://newpointnp.com/faq", blocks: null },
    ]);
  });

  it("falls back to the home page when there is no sitemap", async () => {
    const { fetch, requested } = fakeSite({ "https://newpointnp.com/": new Response(ld({ "@type": "WebSite" })) });
    expect(await createSiteSchemaReader({ siteUrl: SITE, fetch }).read()).toEqual([
      { url: "https://newpointnp.com/", blocks: [{ "@type": "WebSite" }] },
    ]);
    expect(requested).toEqual(["https://newpointnp.com/sitemap.xml", "https://newpointnp.com/"]);
  });

  it("follows redirects within the site only, and accepts the www host", async () => {
    const { fetch, inits } = fakeSite({
      "https://newpointnp.com/sitemap.xml": new Response(
        "<loc>https://www.newpointnp.com/a</loc><loc>https://newpointnp.com/b</loc><loc>https://newpointnp.com/c</loc>",
      ),
      "https://www.newpointnp.com/a": redirect("/a-moved"),
      "https://www.newpointnp.com/a-moved": new Response(ld({ "@type": "WebPage" })),
      "https://newpointnp.com/b": redirect("https://evil.example/b"),
      "https://newpointnp.com/c": new Error("socket hang up"),
    });
    expect(await createSiteSchemaReader({ siteUrl: SITE, fetch }).read()).toEqual([
      { url: "https://www.newpointnp.com/a", blocks: [{ "@type": "WebPage" }] },
      { url: "https://newpointnp.com/b", blocks: null },
      { url: "https://newpointnp.com/c", blocks: null },
    ]);
    expect(inits.every((init) => init.redirect === "manual" && init.signal instanceof AbortSignal)).toBe(true);
  });

  it("reads one level of sitemap index", async () => {
    const { fetch } = fakeSite({
      "https://newpointnp.com/sitemap.xml": new Response("<sitemapindex><sitemap><loc>https://newpointnp.com/pages.xml</loc></sitemap></sitemapindex>"),
      "https://newpointnp.com/pages.xml": new Response("<urlset><loc>https://newpointnp.com/</loc></urlset>"),
      "https://newpointnp.com/": new Response(ld({ "@type": "MedicalClinic" })),
    });
    expect(await createSiteSchemaReader({ siteUrl: SITE, fetch }).read()).toEqual([
      { url: "https://newpointnp.com/", blocks: [{ "@type": "MedicalClinic" }] },
    ]);
  });

  it("does not read a body over the cap", async () => {
    const { fetch } = fakeSite({
      "https://newpointnp.com/": new Response("x", { headers: { "content-length": String(MAX_BODY_BYTES + 1) } }),
    });
    expect(await createSiteSchemaReader({ siteUrl: SITE, fetch }).read()).toEqual([{ url: "https://newpointnp.com/", blocks: null }]);
  });

  it("fails on a server error for the sitemap rather than reporting an empty site", async () => {
    const { fetch } = fakeSite({ "https://newpointnp.com/sitemap.xml": new Response("", { status: 503 }) });
    await expect(createSiteSchemaReader({ siteUrl: SITE, fetch }).read()).rejects.toBeInstanceOf(VendorHttpError);
  });
});
