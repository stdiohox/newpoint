# Vercel (craft benchmark)

- **URL:** https://vercel.com (200, canonical)
- **Title:** "Agentic Infrastructure - Vercel"
- **Meta description:** "The autonomous stack for every app and agent."
- **Studied for:** design-token architecture, type, and restraint. Not a healthcare reference.

## Layout system
Strict container discipline with a visible commitment to a shared grid. Sections are separated by hairlines and spacing rather than by background color changes, which keeps the page feeling like one continuous surface.

## Hero pattern
Headline "Agentic Infrastructure" with the supporting line "Build agents on infrastructure that thinks like them". Short, declarative, no decorative asset competing with the message.

## Section flow (top to bottom)
1. Nav split into "Agent Stack" and "Core Platform" with Tools / Learn / Build / Explore groupings
2. Hero: "Agentic Infrastructure"
3. "Build agents on infrastructure that thinks like them"
4. "Ship apps that scale from zero to millions instantly"
5. "Host platforms that serve every customer"
6. "Recently shipped"
7. "Built by you, or your agents"
8. Footer: Security / Tools / Frameworks / SDKs / Build / Learn / Explore / Company / Legal & Trust / Social

## Typography
**Geist** (self-hosted, hash-named woff2 files) plus `--font-mono` for code and data. Like Linear, a single-family system carrying the whole page through weight and scale.

## Color and token architecture
This is the most instructive part of the site. Vercel does not hardcode colors; it exposes a **semantic token scale**:

- `--ds-background-100` (surface ramp)
- `--ds-gray-alpha-200` (alpha-based hover states)
- `--ds-gray-1000` (text ramp)
- `--themed-bg`, `--themed-fg`, `--themed-border`, `--themed-hover-bg`

Two lessons worth transplanting directly:

1. **Numbered ramps, not names.** `gray-100` through `gray-1000` scales predictably and survives a theme swap. Naming a token `--color-light-blue` guarantees pain later.
2. **Alpha-based hover states.** `--ds-gray-alpha-200` means a hover tint composites over whatever surface it lands on, so one token works on white, on cream, and on dark. This is why Vercel's hover states never look wrong on any background.

Only `#FAFAFA` appeared as a literal hex in the document. Everything else is tokenized, which is exactly the discipline the Newpoint build should adopt.

## Motion and interaction
Restrained and fast. Hover states are the primary motion. Transitions are short and ease-out. No scroll narrative, no parallax.

## Imagery
Real product surfaces and precise geometric abstraction. No stock photography.

## Conversion mechanics
Single dominant CTA intent. "Recently shipped" functions as a liveness signal, the same role Linear's changelog plays.

## Tone of voice
Terse, technical, confident. Sentences rarely exceed twelve words.

## Steal for Newpoint
- **Semantic numbered token ramps** rather than named colors: this is the single most valuable takeaway from the craft benchmarks for the build
- **Alpha-based hover and border tokens** so states composite correctly over cream, white, and ink
- Single typeface family, weight-driven hierarchy
- Sections separated by hairlines and space rather than by alternating background colors

## Do not transplant
- Dark-first palette and technical voice
- Nav complexity: Vercel's grouped mega-nav is built for a large product surface, not a two-provider practice
