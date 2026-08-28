# Site Map & Structure — newpointnp.com

Crawled: 2026-08-27. Source: live site (browser render), `robots.txt`, `sitemap.xml`.

## robots.txt
```
# Sitemap is also available on /sitemap.xml
Sitemap: https://www.newpointnp.com/sitemap.xml
User-agent: *
```
No `Disallow` rules at all — the entire site (including the two orphan blog posts below) is fully crawlable/indexable.

## sitemap.xml (5 URLs, verbatim)
| URL | Priority | Changefreq | Lastmod |
|---|---|---|---|
| https://www.newpointnp.com | 1.0 | monthly | 2026-06-29 |
| https://www.newpointnp.com/contact | 1.0 | monthly | 2026-06-29 |
| https://www.newpointnp.com/services | 1.0 | monthly | 2026-06-29 |
| https://www.newpointnp.com/my-first-blog-postf4fcb77a | 0.8 | monthly | *(none)* |
| https://www.newpointnp.com/10-reasons-you-should-love-blogging6e3459e9 | 0.8 | monthly | *(none)* |

## Rendered page inventory (3 real pages)

| Page | URL | Title |
|---|---|---|
| Home | / | Mental Health Care Providers \| Lawrence Township, NJ \| New Point Healthcare Services LLC |
| Services | /services | Psychiatric Evaluation and Treatment Planning \| New Jersey \| New Point Healthcare LLC |
| Contact | /contact | Mental Health Care Providers \| Lawrence Township, NJ |

## Primary navigation (identical on all 3 pages)
Home → / | Services → /services | Contact → /contact | [Call Us button] → `tel:+16095279438`

## "Footer" / bottom-of-page block (identical on all 3 pages, not a semantic `<footer>`)
"Call Us" heading → 3 phone numbers, 1 fax number, 2 email addresses → "Created with [IONOS Website Builder]" attribution badge linking to ionos.com/websites/website-builder.

## Orphan pages (2)
Both are default Duda/IONOS blog-template placeholder posts. They are **not linked from primary nav, footer, or any page body** — the only way to reach them is `sitemap.xml`, a direct URL, or via internal cross-links between the two posts themselves ("< Older Post"). They are indexable (no `noindex`, no robots.txt block).

1. `/my-first-blog-postf4fcb77a` — "My First Blog Post" (dated Feb 10 2017, byline "Duda Owner IONOS")
2. `/10-reasons-you-should-love-blogging6e3459e9` — "10 Reasons You Should Love Blogging" (undated)

## Depth / hierarchy
The site is flat — a single level. There is no blog index/listing page, no services sub-pages (only one combined services page), and no team member detail pages (bios live inline on the homepage).

```
/ (Home)
├── /services
├── /contact
├── /my-first-blog-postf4fcb77a        (orphan, unlinked)
└── /10-reasons-you-should-love-blogging6e3459e9   (orphan, unlinked)
```

## Crawl notes
- No pagination, no search page, no 404 custom page tested, no login/portal area found.
- No XML sitemap index (single flat `sitemap.xml`), no image sitemap.
- All URLs served over HTTPS on `www.newpointnp.com`; no separate non-www or staging host discovered.
