# Linear (craft benchmark)

- **URL:** https://linear.app (200, canonical)
- **Title:** "Linear – The system for product development"
- **Meta description:** "Purpose-built for planning and building products with AI agents."
- **Studied for:** polish, motion, type, and restraint only. Not a healthcare reference.

## Layout system
Tight, disciplined container with a strong sense of a single unifying grid. The defining trait is **consistency of rhythm**: every section uses the same horizontal rails, so the page reads as one object rather than a stack of blocks. Density is moderate; whitespace is used for hierarchy, not decoration.

## Hero pattern
Headline "The product development system for teams and agents", rendered three times in the DOM as separate responsive variants. Centered, restrained, no product screenshot fighting for attention above the fold. Copy does the work; the interface demo comes after.

## Section flow (top to bottom)
1. Hero: "The product development system for teams and agents"
2. "Faster app launch"
3. Positioning paragraph: "A new species of product tool. Purpose-built for modern teams with AI workflows at its core…"
4. Capability blocks: "Intake and integrations" / "Planning and monitoring" / "AI and automations" / "Build, review, and ship"
5. Changelog
6. "Built for the future. Available today."
7. Footer: Product / Features / Company / Resources / Connect / Legal

Seven sections. Notably lean for a company of its size, and the same discipline Two Chairs shows in the peer set.

## Typography
**Inter Variable**, self-hosted as a single `InterVariable.woff2`. One family, one file, the entire type system built from weight and optical size rather than from multiple families.

This is the lesson: Linear is not distinctive because of an exotic typeface. It is distinctive because the scale, tracking, and weight relationships are ruthlessly consistent. **Tracking tightens as size increases** (the negative-tracking-on-display principle), and body sits near zero.

## Color
| Hex | Role |
|---|---|
| `#08090A` | Near-black page ground (not pure black) |
| `#191D20` | Elevated surface |
| `#2E2E32` / `#3E3E44` | Borders and dividers |
| `#62666D` / `#9C9DA1` | Muted text scale |
| `#D0D6E0` / `#E2E4E7` / `#E4E5E9` | Light text and hairlines |
| `#F79CE0` | Pink accent |
| `#55CDFF` | Cyan accent |
| `#8FA4FF` | Periwinkle accent |
| `#FFC47C` | Amber accent |
| `#89D196` | Green accent |
| `#27A644` / `#F34E52` | Semantic success / error |

The structure worth stealing: **a long, tightly-spaced neutral ramp doing 95% of the work, with saturated accents reserved for semantic meaning and small moments.** The accents never carry a section background. `#08090A` rather than `#000000` is the detail that gives the dark UI depth.

## Motion and interaction
Motion is fast, short, and almost entirely functional. Hover states resolve in well under 200ms. Transitions are ease-out dominant. There is no scroll hijacking, no pinned narrative, no parallax. Where motion appears it is: **scroll reveal** (subtle, small translate distance), **hover effect**, and **crossfade** between UI states.

The character is "instant, then settle". Nothing announces itself. This is the correct model for a health practice: motion that confirms rather than performs.

## Imagery
Real product UI, rendered at high fidelity, never faked with div mockups. Where abstract visuals appear they are precise and geometric rather than decorative.

## Conversion mechanics
Single CTA intent held throughout. No cost anxiety, no urgency, no social-proof desperation. The changelog on the homepage is itself a trust signal: it proves the product is alive.

## Tone of voice
Confident, spare, technical without jargon. Sentences are short and declarative. No filler verbs.

## Steal for Newpoint
- One typeface, exhaustively exploited through weight and scale, instead of three families
- Long neutral ramp carrying the design, accents rationed for meaning
- Off-black instead of pure black
- Motion that is fast, short, ease-out, and functional
- Seven sections, not twelve
- Tracking that tightens as type scales up

## Do not transplant
- Dark-first palette. A prescribing psychiatric practice serving anxious first-time patients should be light-ground.
- Technical register. Linear's voice would read as cold in this category.
