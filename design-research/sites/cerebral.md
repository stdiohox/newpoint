# Cerebral

- **URL:** https://www.cerebral.com redirects to **https://cerebral.com/** (canonical is the apex domain, no `www`). Noted per brief.
- **Title:** "Online Mental Health Care That Caters to You | Cerebral | Online Therapy | Virtual Counseling | Telehealth Therapy"
- **Meta description:** "Cerebral experts offer online mental healthcare and online therapy for anxiety, depression, insomnia, and more. Learn about the care you can get today."
- **Platform:** Next.js (client-rendered shell)

## ⚠️ Needs manual screenshot review

**The homepage did not server-render.** The fetched document is 63KB and contains **zero `<h1>`/`<h2>`/`<h3>` elements, zero `<a>` labels, and zero `<button>` labels** in markup. All content is injected client-side after hydration.

What follows is what could be recovered from the linked stylesheet and document head only. **Section flow, hero pattern, component inventory, imagery, conversion mechanics, and tone of voice could not be captured and are not guessed at.** Anyone continuing this research should open the site in a browser and screenshot it.

This is itself a finding worth recording: a client-only render on a marketing homepage is an SEO liability. Cerebral's title tag is also visibly keyword-stuffed (five separate keyphrases separated by pipes), which reads as compensation for weak crawlable content.

## Typography (from stylesheet)
- **Mozaichum** (custom brand face, with a declared fallback)
- **Inter** (with "Inter Fallback")

A custom display face over Inter for UI. Font files are hash-named (`3a6ba036.woff2` and similar), self-hosted through the Next.js build.

## Color (from stylesheet, partial)
| Hex | Role |
|---|---|
| `#5A4B84` | Muted purple, primary brand |
| `#8B77C4` | Lighter purple |
| `#D2D4F2` | Pale periwinkle tint |
| `#DBDEFF` / `#C5C9FF` | Soft blue-violet tints |
| `#F9F7F2` | Warm off-white ground |
| `#1C1E21` | Near-black text |
| `#9CA3AF`, `#E5E7EB`, `#D1D3D7` | Neutral greys |

Sits in the same **muted purple over warm off-white** territory as Rula. The warm ground (`#F9F7F2`) rather than a cool white is consistent across nearly the whole peer set.

## Radius (from stylesheet)
`4px`, `0.25rem`, `0.375rem`, `0.5rem`, `0.75rem`, plus one distinctive `100% 100% 16px 16px` (an arch or dome shape, likely a decorative image mask). The arch mask is the only genuinely characterful shape token found anywhere in the peer set.

## Motion (from stylesheet)
`cubic-bezier(.4,0,.2,1)` (material standard) and `cubic-bezier(.4,0,.6,1)`. Conventional, no spring or scroll-driven work detectable in CSS.

## Steal
- The arch / dome image mask (`border-radius: 100% 100% 16px 16px`) as a warm, non-generic way to shape portraiture
- Warm off-white ground rather than cool white

## Avoid
- Client-only rendering of marketing content, which is exactly the mistake Newpoint's brief exists to prevent
- Keyword-stuffed title tag with five pipe-separated phrases
