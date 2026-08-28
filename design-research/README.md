# /design-research — reference mining and committed design direction

Design research for the Newpoint rebuild, captured **2026-08-28**. Ten reference sites were studied for patterns; no code was copied and no site was cloned.

**Start here:** [`design-synthesis.md`](design-synthesis.md). It carries the actual decision. The per-site files are evidence.

## Contents

| File | What it holds |
|---|---|
| [`design-synthesis.md`](design-synthesis.md) | **The deliverable.** Cross-cut peer patterns, what the craft benchmarks do better, the one committed direction ("The Consulting Room"), recommended homepage section order, steal/avoid lists, and reconciliation with the `/research` audit |
| [`design-tokens.md`](design-tokens.md) | Proposed palette with verified contrast ratios, type pairing and scale, spacing, radius, shadow, and motion tokens |
| [`sites/`](sites/) | One file per reference site, ten total |

## Sites studied

### Behavioral-health peers
| Site | File | Relevance | Capture |
|---|---|---|---|
| Talkiatry | [`sites/talkiatry.md`](sites/talkiatry.md) | Highest. Psychiatry, medication, insurance | Full |
| Brightside | [`sites/brightside.md`](sites/brightside.md) | High. Prescribing practice | Partial, see note |
| Cerebral | [`sites/cerebral.md`](sites/cerebral.md) | Medium | **Blocked, see note** |
| Grow Therapy | [`sites/growtherapy.md`](sites/growtherapy.md) | Medium-high. Local SEO architecture | Full |
| Two Chairs | [`sites/twochairs.md`](sites/twochairs.md) | High on craft. Best-designed peer | Full |
| Rula | [`sites/rula.md`](sites/rula.md) | High. Provider-card treatment | Full |
| Meru Health | [`sites/meruhealth.md`](sites/meruhealth.md) | Medium. Program-based, B2B2C | Full |

### Craft benchmarks (polish, motion, type only, not healthcare)
| Site | File | Studied for |
|---|---|---|
| Linear | [`sites/linear.md`](sites/linear.md) | Single-family type systems, restraint, functional motion |
| Vercel | [`sites/vercel.md`](sites/vercel.md) | Semantic token ramps, alpha hover states |
| Stripe | [`sites/stripe.md`](sites/stripe.md) | Trust architecture, type scale, section variation |

## Capture notes and limitations

- **Cerebral could not be captured.** `https://www.cerebral.com` redirects to the apex `https://cerebral.com/`, and that page server-renders **zero headings, links, or buttons**: all content is injected client-side. Section flow, hero pattern, components, imagery, conversion mechanics, and tone of voice are **not recorded** for this site rather than guessed at. **Needs manual screenshot review.**
- **Brightside's palette is partially unreliable.** Its markup is dominated by the WordPress default Gutenberg preset palette, which ships with every install and is not evidence of brand intent. Plausibly brand-owned values are listed separately and flagged. Its type families could not be resolved from markup. **Needs manual screenshot review.**
- **Grow Therapy and Rula** surfaced no custom easing tokens, so their motion character is inferred as conventional rather than documented.
- Two peers (`growtherapy.com`, `cerebral.com`) are canonical on the apex domain with no `www`. Both noted in their files.
- All ten homepages returned HTTP 200. Palettes, type families, radius, and easing were mined from inline markup and, where inline extraction was thin, from linked stylesheets fetched directly.

## Method

Skills applied throughout, per the mandate in [`CLAUDE.md`](../CLAUDE.md): `design-taste-frontend`, `apple-design`, `high-end-visual-design`, `minimalist-ui`, `animation-vocabulary`, `brandkit`.

`find-animation-opportunities` was **not** applied. It is a read-only scanner for motion gaps in an existing codebase, and no application code exists in this repo yet. It becomes relevant once the Next.js build has real components; noting it here so it is not forgotten at that point.

## Status

The direction in `design-synthesis.md` is committed and **no longer blocked**. Both provider portraits were supplied on 2026-08-28 and are committed under [`assets/providers/`](assets/providers/) with a full technical report.

They carry one real constraint. Both are phone selfies, square, EXIF-stripped and re-compressed, with mismatched backgrounds and no headroom above the head. That caps the pair at roughly 560px displayed and rules out the arch mask. **Section 3 is therefore revised from a hero-scale portrait moment to card scale**, documented in Part 4 of the synthesis and section 7.1 of the tokens. The arch-mask and hero-scale treatment are marked **deferred, not discarded**: a single-session reshoot at 2000px or more with headroom is the upgrade path that restores both.

Remaining open questions are listed in Part 8 of the synthesis.
