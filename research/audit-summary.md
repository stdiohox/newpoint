# Newpoint Healthcare Services — Website Audit Summary

**Audit date:** 2026-08-27
**Source:** Full crawl of https://www.newpointnp.com/ (3 real pages + 2 orphan template pages, robots.txt, sitemap.xml)
**Purpose:** Source-of-truth baseline for the site rebuild. See `/research/content/`, `sitemap.md`, `business-nap.md`, `services-analysis.md`, `people-trust.md`, `seo-technical.md`, `assets/manifest.md`, and `newpoint-data.json` for the underlying detail behind every claim below.

## What this business actually is
This is a small, two-provider outpatient psychiatric/mental-health nurse-practitioner practice (psychiatric evaluation, medication management, telehealth) serving New Jersey and Pennsylvania — **not** a traditional Medicare-certified home-health agency, despite the "Healthcare Services" name. That distinction matters for the rebuild's content strategy and for which competitor set to benchmark against (see `services-analysis.md`).

## Top-line: the site is small, dated, and thin
Three real pages (Home, Services, Contact), no blog with real content, no team photos, no address, and it's built on a drag-and-drop website builder (IONOS Website Builder / Duda) rather than a custom codebase. It reads as a "we exist" placeholder rather than a site actively doing marketing or conversion work.

## Critical fixes (blockers for local SEO / credibility)

1. **No physical address anywhere on the site.** Only "Lawrence Township, NJ" / "Lawrenceville, NJ" is given — no street, suite, or ZIP. This blocks setting up (or verifying) a Google Business Profile and building local citations. **Need from client:** the real practice address, or explicit confirmation this is a telehealth/service-area-only business with no public office.
2. **The business name is written four different ways on its own site** — "NEWPOINT HEALTHCARE SERVICES, LLC" (logo), "New Point Healthcare Services LLC" (body copy), "New Point Healthcare LLC" (Services page title), "New Point healthcare Services LLC" (schema.org, lowercase typo). NAP consistency (identical name everywhere) is foundational to local SEO — this needs to be resolved to one canonical name, ideally the exact legal name from the LLC's formation documents, before any GBP/citation work starts.
3. **No structured data for the business.** The only schema.org markup on the whole site is a generic `WebSite` block on the homepage (and it has a typo in the name). There's no `MedicalBusiness`/`LocalBusiness`/`Physician` schema — a real, achievable win for local search visibility in the rebuild.
4. **No license numbers, NPI numbers, or verifiable credentials beyond post-nominal letters.** For a prescribing psychiatric practice, this is a trust gap worth closing.
5. **No provider photos, office photos, or real testimonials.** The "Testimonial" section literally says "Coming soon." Every image on the current site is generic stock/decorative (see `assets/manifest.md` for filenames like `Picture1`, `ujuuu` that give this away) — nothing shows the actual providers.

## High-value fixes (SEO/content)

- Two default website-builder blog posts ("My First Blog Post," "10 Reasons You Should Love Blogging," both unedited Duda/IONOS template content from as far back as 2017) are live, indexable, and sitting in `sitemap.xml` — unlinked from navigation but fully crawlable. Delete these or replace with real content.
- Home and Contact page titles are near-duplicates of each other; Home and Services titles both run 85+ characters and are likely truncated in Google results.
- The Services page title says "New Jersey" while its own meta description says "Pennsylvania" — contradicts itself about region.
- No FAQ page, no new-patient/getting-started page, no dedicated insurance/billing page (insurance info is buried at the bottom of the Services page), no named therapy modalities (CBT/DBT/etc.), no stated age range served, no crisis/emergency guidance (e.g., 988/911) — all common, expected sections on a behavioral-health site that are currently absent.
- Service area is stated only at the state level ("New Jersey and Pennsylvania") — no county or town-level pages/mentions exist, which limits how the rebuild can target geo-specific search terms without new information from the client.
- 3 of 4 `<img>` tags have no `alt` text, and none of the 5 background images (which carry the actual visual content, including the hero photo) have any text alternative — an accessibility and image-SEO gap.

## Technical notes for the rebuild team

- Current platform is IONOS Website Builder (white-labeled Duda) — there's no exportable CMS content or git history; this `/research` folder is the only durable record of current content.
- Homepage loads 66 network resources including 23 scripts (jQuery 2.2.4 from 2016, an unmaintained parallax library, third-party tracking from `pagepulse.info`) — heavy for a 3-page brochure site, though this is largely page-builder platform overhead rather than something fixable within the current platform.
- Original brand assets (logo file, photography) could not be downloaded or saved into this repo — the CDN serves images behind signed, expiring URLs that block both direct fetch and canvas-based re-export. The logo was viewed directly and is described precisely in `assets/manifest.md`; brand colors and fonts were extracted precisely from computed CSS and are safe to reuse. **The original logo file and any real photography need to come directly from the client**, or be exported from inside the IONOS/Duda editor, which isn't subject to the same CDN restriction.

## What we still need from the client before/during the rebuild

1. Confirmed legal business name (exact spelling/spacing) and confirmation of "Newpoint" vs. "New Point"
2. Physical practice address (or confirmation there isn't a public-facing one)
3. State license numbers / NPI numbers for both providers (or confirmation they'd rather not publish them)
4. Professional headshots of both providers (and office photos, if applicable)
5. The original logo file (vector/AI preferred) and any existing brand guide
6. Real patient testimonials with documented consent (HIPAA consideration), or confirmation to leave this section out until some exist
7. County/town-level service area breakdown, if they want geo-targeted content beyond "New Jersey and Pennsylvania"
8. Hours of operation
9. Confirmation on age range served (adults only vs. across the lifespan) and whether substance-use/addiction treatment is an active service line (one provider's bio suggests real experience here that isn't reflected as a service)
10. Decision on whether to keep a blog, and if so, real topics/content to replace the two placeholder posts
