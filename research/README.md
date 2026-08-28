# /research — Newpoint Healthcare Services website audit

Full crawl and content extraction of https://www.newpointnp.com/, captured 2026-08-27, as the source-of-truth baseline for the rebuild.

**Start here:** `audit-summary.md` — the narrative summary of what's missing/weak and what's still needed from the client.

## Contents
- `audit-summary.md` — gaps, opportunities, and the "what we need from the client" list
- `sitemap.md` — full site structure, nav, robots.txt/sitemap.xml, orphan pages
- `business-nap.md` — legal name (and its inconsistencies), phones, fax, emails, address, service area, hours, insurance, licensing
- `services-analysis.md` — every service/treatment/condition mentioned on the site, plus gap analysis
- `people-trust.md` — provider bios, credentials, photography/testimonial/trust-signal audit
- `seo-technical.md` — per-page metadata, structured data, tech stack, performance snapshot, SEO issues
- `newpoint-data.json` — everything above consolidated into one machine-readable file for the build
- `content/` — verbatim page-by-page copy (5 pages: Home, Services, Contact, and 2 orphan template blog posts)
- `assets/manifest.md` — every image URL in use, brand colors (hex), fonts, and why original image files could not be downloaded (signed CDN URLs — see that file for detail)

## Known limitations of this crawl
- No original image/logo files could be saved (CDN uses signed, expiring URLs that block both direct fetch and canvas re-export) — see `assets/manifest.md`.
- No analytics, Search Console, or Google Business Profile data is included — this audit is limited to what's publicly observable on the live site itself.
