import type { NextConfig } from 'next';

/**
 * Permanent redirects from the live IONOS/Duda site.
 *
 * Source of truth is the crawl in /research/sitemap.md, which records exactly
 * five indexable URLs in the live sitemap.xml. Two of those paths — `/` and
 * `/services` — exist unchanged in the rebuild and are deliberately NOT listed
 * here: a URL that still resolves keeps its own history and needs no redirect.
 *
 * The rest are mapped below. Anything that 404s after launch is a link nobody
 * crawled in August 2026, and should be added here rather than left to fail.
 *
 * `statusCode: 301` rather than `permanent: true`, which emits 308. Google
 * treats 301 and 308 identically, but 301 is the older and more widely
 * understood status among third-party crawlers, analytics and link checkers,
 * and there is nothing here that needs 308's guarantee of method preservation.
 */
const legacyRedirects = [
  {
    // The live Contact page. The rebuild has no standalone /contact route: the
    // form, the practice phone numbers and the crisis panel all live in the
    // homepage's contact section, which is the closest equivalent destination.
    source: '/contact',
    destination: '/#contact',
    statusCode: 301,
  },
  {
    // Unedited Duda blog template, dated Feb 2017, byline "Duda Owner IONOS".
    // No equivalent content exists and none should. FLAGGED: no clear match,
    // so this goes to the homepage.
    source: '/my-first-blog-postf4fcb77a',
    destination: '/',
    statusCode: 301,
  },
  {
    // Second unedited Duda blog template. FLAGGED: no clear match, homepage.
    source: '/10-reasons-you-should-love-blogging6e3459e9',
    destination: '/',
    statusCode: 301,
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/webp'],
  },
  async redirects() {
    return legacyRedirects;
  },
};

export default nextConfig;
