/**
 * The practice's public site, read for its schema.org coverage
 * (docs/automation-architecture.md §5.6, geo.recommendations input).
 *
 * Read-only and bounded: sitemap.xml (one level of sitemap index) for the page
 * list, same site only and capped; then each page's `application/ld+json`
 * blocks. Redirects are followed by hand and only within the site; every
 * request has a timeout and a body cap. A page that cannot be read, or whose
 * JSON-LD does not parse, is reported as unreadable rather than skipped, so a
 * gap is never mistaken for coverage.
 */
import { VendorHttpError } from "../../lib/errors.js";
import type { FetchLike } from "../google/search-console.js";

export const MAX_PAGES = 60;
export const MAX_CHILD_SITEMAPS = 5;
export const MAX_BODY_BYTES = 2_000_000;
export const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;

export interface PageSchema {
  readonly url: string;
  /** Parsed JSON-LD blocks; null when the page could not be read or a block did not parse. */
  readonly blocks: readonly unknown[] | null;
}

export interface SiteSchemaReader {
  read(): Promise<PageSchema[]>;
}

const siteHost = (host: string): string => host.toLowerCase().replace(/^www\./, "");

/** https only, and the site's own host with or without "www.". */
export function onSite(url: string, siteUrl: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && siteHost(parsed.host) === siteHost(new URL(siteUrl).host);
  } catch {
    return false;
  }
}

const LOC = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;

export function sitemapLocs(xml: string, siteUrl: string): string[] {
  const urls = [...xml.matchAll(LOC)].flatMap((match) => {
    const url = match[1] ?? "";
    return onSite(url, siteUrl) ? [new URL(url).href] : [];
  });
  return [...new Set(urls)];
}

export const isSitemapIndex = (xml: string): boolean => /<sitemapindex[\s>]/i.test(xml);

/** Kept for callers that only need the page list of a plain sitemap. */
export function sitemapUrls(xml: string, siteUrl: string): string[] {
  return sitemapLocs(xml, siteUrl).slice(0, MAX_PAGES);
}

/**
 * The ld+json blocks of a page, found by scanning (linear in the page size; a
 * regex over unclosed tags is quadratic). null when a block does not parse or
 * a tag is never closed.
 */
export function jsonLdBlocks(html: string): unknown[] | null {
  const lower = html.toLowerCase();
  const blocks: unknown[] = [];
  for (let at = lower.indexOf("<script"); at !== -1; at = lower.indexOf("<script", at)) {
    const tagEnd = lower.indexOf(">", at);
    if (tagEnd === -1) return null;
    const close = lower.indexOf("</script", tagEnd);
    if (close === -1) return null;
    if (/type\s*=\s*["']?application\/ld\+json/.test(lower.slice(at, tagEnd))) {
      try {
        blocks.push(JSON.parse(html.slice(tagEnd + 1, close)));
      } catch {
        return null;
      }
    }
    at = close + "</script".length;
  }
  return blocks;
}

export function createSiteSchemaReader(options: { readonly siteUrl: string; readonly fetch: FetchLike }): SiteSchemaReader {
  /** GET with redirects followed only on-site; the body is read only when within the cap. */
  async function get(url: string): Promise<{ status: number; body: string | null }> {
    let current = url;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const response = await options.fetch(current, {
        method: "GET",
        redirect: "manual",
        headers: { accept: "text/html,application/xml" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        const next = location === null ? null : new URL(location, current).href;
        if (next === null || !onSite(next, options.siteUrl)) return { status: response.status, body: null };
        current = next;
        continue;
      }
      if (!response.ok) return { status: response.status, body: null };
      const declared = Number(response.headers.get("content-length") ?? "0");
      if (declared > MAX_BODY_BYTES) return { status: response.status, body: null };
      const body = await response.text();
      return { status: response.status, body: body.length > MAX_BODY_BYTES ? null : body };
    }
    return { status: 310, body: null };
  }

  async function pageList(): Promise<string[]> {
    const root = await get(new URL("sitemap.xml", options.siteUrl).href);
    if (root.status >= 500) throw new VendorHttpError("newpoint_site", root.status);
    if (root.body === null) return [];
    if (!isSitemapIndex(root.body)) return sitemapLocs(root.body, options.siteUrl);

    const pages: string[] = [];
    for (const child of sitemapLocs(root.body, options.siteUrl).slice(0, MAX_CHILD_SITEMAPS)) {
      const sitemap = await get(child);
      if (sitemap.status >= 500) throw new VendorHttpError("newpoint_site", sitemap.status);
      if (sitemap.body !== null && !isSitemapIndex(sitemap.body)) pages.push(...sitemapLocs(sitemap.body, options.siteUrl));
    }
    return [...new Set(pages)];
  }

  return {
    async read() {
      let urls = (await pageList()).slice(0, MAX_PAGES);
      if (urls.length === 0) urls = [new URL(options.siteUrl).href];

      const pages: PageSchema[] = [];
      for (const url of urls) {
        try {
          const page = await get(url);
          pages.push({ url, blocks: page.body === null ? null : jsonLdBlocks(page.body) });
        } catch {
          // A timeout or dropped connection on one page makes that page unknown, not the run a failure.
          pages.push({ url, blocks: null });
        }
      }
      return pages;
    },
  };
}
