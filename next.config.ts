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
 *
 * Next carries query strings through a redirect automatically, so a campaign
 * link like /contact-us?utm_source=x arrives at /contact?utm_source=x with the
 * parameters intact and readable by analytics.
 */
const legacyRedirects = [
  // NOTE: there is deliberately NO rule for `/contact`. It was previously
  // redirected to `/#contact`; `app/contact/page.tsx` now serves that path
  // directly, and a redirect here would shadow the route and never let it
  // render. The legacy URL therefore keeps working by resolving, not by
  // redirecting, which is strictly better for the equity it already holds.
  {
    // UNVERIFIED, by construction. These three are not in research/sitemap.md —
    // that crawl only captured what was still live and linked in August 2026,
    // not everything ever indexed. They are the paths a stale link or a typed
    // URL most plausibly uses, and a 301 nobody hits costs nothing.
    // To replace guesswork with evidence: export the legacy property's
    // Search Console "Performance > Pages" and "Links", or pull the Wayback
    // Machine URL list for newpointnp.com, and redirect what actually exists.
    // `/contact` itself is deliberately absent above, so there is no loop.
    source: '/contact-us',
    destination: '/contact',
    statusCode: 301,
  },
  {
    source: '/contactus',
    destination: '/contact',
    statusCode: 301,
  },
  {
    source: '/get-in-touch',
    destination: '/contact',
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
