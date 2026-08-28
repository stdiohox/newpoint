# SEO & Technical Metadata

## Tech stack
- **Platform:** IONOS Website Builder — a white-labeled instance of the **Duda** website-building platform. Confirmed by:
  - Footer/bottom-block attribution: "Created with" → links to `ionos.com/websites/website-builder`, image alt text "IONOS", logo hosted at `dd-cdn.multiscreensite.com/1und1/1und1-logo4.png` (1&1 is IONOS's parent brand)
  - All page assets served from Duda's own CDN infrastructure: `le-cdn.website-editor.net`, `static-cdn.website-editor.net`, `cdn.website-editor.net`, `d1dxoqu0t5mb7j.cloudfront.net`
  - Duda-specific DOM conventions (`dmRespRow`, `dmRespCol`, `data-element-type`, `.dmNewParagraph` class names)
- **This means the rebuild is starting from a drag-and-drop website-builder site, not a custom codebase** — there is no git history, no template files, and no CMS content export available other than what this crawl captured. Everything in `/research` is the only durable record of the current content before it's replaced.
- **Third-party scripts loaded (23 script resources on the homepage alone):**
  - jQuery 2.2.4 (released 2016 — significantly outdated)
  - `skrollr.min.js` (a parallax-scrolling library, largely unmaintained since ~2015)
  - `cdn.pagepulse.info/js/22728.js` — a third-party analytics/tracking script
  - `integration.mywebsite-editor.com/dakota-snippet-service/...` — a Duda platform integration snippet
  - Duda's own runtime/rendering scripts
  - For a 3-page brochure site, this is a heavy script payload (66 total network resources on page load) — likely page-builder platform overhead rather than anything the client can reduce without leaving the platform.

## Per-page metadata

| Page | Title (char count) | Meta description (char count) | Canonical | H1 | OG type | Structured data |
|---|---|---|---|---|---|---|
| Home (`/`) | "Mental Health Care Providers \| Lawrence Township, NJ \| New Point Healthcare Services LLC" (88) | "At New Point Healthcare Services LLC, our mental health care providers specialize in psychiatric evaluations in New Jersey and Pennsylvania. Learn more." (~155) | `https://www.newpointnp.com/` | "Mental Health Support for Managing Stress, Anxiety, and Burnout" | website | `WebSite` (name has a typo — see below) |
| Services (`/services`) | "Psychiatric Evaluation and Treatment Planning \| New Jersey \| New Point Healthcare LLC" (86) | "At New Point Healthcare Services LLC, we provide you with comprehensive psychiatric evaluation and treatment planning in Pennsylvania. Learn more here." (~154) | `https://www.newpointnp.com/services` | "Comprehensive Psychiatric Evaluation and Treatment Planning" | website | none found |
| Contact (`/contact`) | "Mental Health Care Providers \| Lawrence Township, NJ" (52) | "New Point Healthcare Services LLC offers mental health support to manage stress, anxiety, and burnout in New Jersey and Pennsylvania. Learn more here." (~152) | `https://www.newpointnp.com/contact` | "Mental Health Care Providers in Lawrenceville, NJ" | website | none found |
| Blog: My First Blog Post | "My First Blog Post" | none | (unset/default) | "My First Blog Post" | — | — |
| Blog: 10 Reasons... | "10 Reasons You Should Love Blogging" | none | (unset/default) | (same as title) | — | — |

## SEO issues found

1. **Homepage and Services titles both exceed ~60 characters** (88 and 86 respectively) — Google typically truncates display titles beyond ~55–60 characters, so both are likely being cut off in search results today.
2. **Home and Contact titles are near-duplicates** — both lead with "Mental Health Care Providers | Lawrence Township, NJ." This is a classic duplicate-title issue that dilutes which page Google prefers to rank for that query.
3. **Region targeting is inconsistent within a single page.** The Services page `<title>` says "New Jersey" while its own meta description says "Pennsylvania" — the two tags contradict each other about which state the page is about.
4. **Only one `schema.org` block on the entire site**, a generic `WebSite` type on the homepage only — with a typo in the business name (`"New Point healthcare Services LLC"`, lowercase "h"). There is **no `LocalBusiness`, `MedicalBusiness`, `MedicalClinic`, or `Physician` structured data anywhere**, and no `Person` schema for either provider. For a local healthcare practice this is a significant missed opportunity — this schema is what powers rich results and reinforces Google Business Profile / local-pack signals.
5. **Social share image is generic and reused.** The same logo image is used as the `og:image`/`twitter:image` on all three pages — there's no page-specific social preview image, and `twitter:card` is `summary` (small image) rather than `summary_large_image`.
6. **Accessibility/image-SEO: 3 of 4 `<img>` elements on the homepage have no `alt` text** (only the IONOS badge has one, and it's "IONOS" — not describing anything about the client). None of the 5 CSS background-images (which carry the actual visual content, including the hero photo) have any text alternative at all, since background-images are inherently invisible to screen readers and unindexable by Google Images.
7. **2 of 4 `<img>` elements have no explicit `width`/`height` attributes**, a minor layout-shift (CLS) risk.
8. **Orphan indexable pages** — see `sitemap.md`: two unedited template blog posts are live, indexable, and in the sitemap despite being unlinked from navigation.
9. **No `noindex` anywhere checked/needed** — everything on the site, including the orphan posts, is fully indexable per `robots.txt`.

## robots.txt / sitemap.xml
See `sitemap.md` for full verbatim contents. Summary: `robots.txt` allows all crawling and points to `sitemap.xml`; `sitemap.xml` lists exactly 5 URLs (3 real pages + 2 orphan blog posts).

## Performance / mobile snapshot (homepage, via browser Performance API)
- 66 total network resources loaded (20 image requests, 23 script requests, 12 CSS, 6 link, 4 fetch, 1 other)
- `domContentLoaded` ≈ 446ms, `load` ≈ 584ms in this session (not a substitute for a real Lighthouse/PageSpeed Insights run — recommend running PageSpeed Insights and GTmetrix directly against the live URL during the rebuild kickoff, since this crawl's environment doesn't reflect a real-world mobile network/device)
- Correct responsive viewport meta tag is present: `initial-scale=1, minimum-scale=1, maximum-scale=5, viewport-fit=cover` — no obvious "not mobile friendly" flag from the markup itself
- Heavy third-party script count (noted above) is the most likely real-world speed drag, since it's page-builder-platform overhead rather than content-driven

## Currently-targeted keywords (inferred from titles, meta descriptions, and repeated on-page phrases — not from any analytics/Search Console data, which was not available for this audit)
"mental health care providers," "psychiatric evaluation," "psychiatric evaluation and treatment planning," "medication management," "Lawrence Township NJ" / "Lawrenceville NJ," "New Jersey and Pennsylvania," "anxiety," "depression," "stress," "burnout," "PTSD," "bipolar disorder," "telehealth," "mood disorders." No evidence of deliberate long-tail or geo-modified keyword targeting (e.g., no per-town or per-county landing pages, no "near me" phrasing, no county names used anywhere).

## Recommended follow-ups outside the scope of this crawl
- Pull actual Google Search Console + PageSpeed Insights / Core Web Vitals data if the client can grant access — this audit could only observe rendered markup and client-side timing, not real field data.
- Confirm whether a Google Business Profile already exists for this practice (a GBP lookup was not performed as part of this website crawl).
