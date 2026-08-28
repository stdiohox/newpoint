# Reference disposition

What was taken from [`superpower.md`](superpower.md), [`grove-ai.md`](grove-ai.md), and [`mintlify.md`](mintlify.md), what was changed on the way in, and what was rejected. Nothing is silently dropped.

Reviewed **2026-08-28** against [`../design-synthesis.md`](../design-synthesis.md), [`../design-tokens.md`](../design-tokens.md), and [`../../CLAUDE.md`](../../CLAUDE.md).

---

## Adopted

### 1. Typographic payer wall
**From:** Grove AI "Press / Partner Logo Strip", Mintlify "Partner Logo Tile".
**Status:** adopted with one deliberate deviation. Shipped in `components/sections/InsuranceProof.tsx`.

Taken: no background, no border, no hover state, even baseline, sitting directly on the section ground. Restructured from a 3-column grid to a wrapping flex row, because 7 payers in a 3-column grid left an orphaned final row.

**Deviation: not grayscale.** Both references mute their logo walls so they recede. These stay at full ink strength. Payer names are the primary objection-handler on this page, four of seven peers surface payer information in the first or second position for exactly that reason, and muting them would work against the only job the section has. Grayscale is also a technique for desaturating real brand marks; applied to type it just means picking a gray.

**This resolves the insurer-trademark item** previously open in `OPEN_CLIENT_ITEMS`. Insurer logos generally require the payer's written permission, and a disciplined typographic wall reads as intentional rather than unfinished. The client item is retained only as an optional upgrade, not a gap.

### 2. Filled + outlined CTA pair
**From:** Grove AI "Filled Dark Button" plus "Outlined Button".
**Status:** pattern already existed; now actually used. Shipped in `components/ui/Button.tsx` (unchanged) and `components/sections/Hero.tsx`.

The `primary` and `quiet` variants already implemented this pairing, but the hero used a bare underlined phone link as its secondary action. That is now the `quiet` outlined variant, which gives the canonical pair and a real tap target on mobile.

**Not adopted: the dark fill.** Grove fills its primary with near-black `#1c1c1e` because its green fails as a fill colour. Newpoint's `#234598` passes at 8.8:1 white-on-blue, and `design-tokens.md` marks it as preserved brand equity. Switching the primary CTA to ink would discard the one piece of brand the practice owns in order to match a reference's neutral.

Two CTAs remain distinct in intent (book an appointment, call the practice), so this does not violate the no-duplicate-CTA rule.

### 3. Proof-point strip
**From:** Grove AI "Signature Formula — Proof Point" (small-caps accent label, small icon, large number, one-line caption).
**Status:** adopted in substance, rebuilt in form. Shipped as `PRACTICE_FACTS` in `lib/content.ts`, rendered at the top of `InsuranceProof.tsx`.

Three changes to the formula, all deliberate:

- **No large numbers.** Grove's formula works because its numbers are impressive (10,000,000+ queries, 580%). "2" set at display size reads as *small practice*, not *trustworthy*, and invites the comparison with Rula's "millions of successful sessions" that this practice cannot win. The direction's argument that two providers is a feature lives in the words, not in the numeral.
- **No small-caps eyebrow labels.** The taste discipline caps eyebrows at `ceil(sections / 3)`, which is 2 for a seven-section page. The page currently ships zero. A three-item strip using Grove's label treatment would spend the entire budget plus one in a single component.
- **No "board-certified" as a headline claim.** `research/people-trust.md` records that the claim appears in the practice's ad copy but that **no certifying body is named anywhere**. Elevating it to a proof point would promote an unverified claim. The strip states the post-nominals themselves (PMHNP-BC, FNP-BC), which is a restatement of the credentials rather than a new assertion.

What shipped: a hairline-separated row of three plain factual statements, each a fact line plus a one-line detail, drawn entirely from `research/people-trust.md`.

### 4. Whisper-weight display type
**From:** Superpower "Hero Overlay Headline" (weight 400 at 66px).
**Status:** adopted at 500, not 400. Shipped in `app/globals.css`.

`--text-display-xl` and `--text-display-l` moved from **600 to 500**.

Superpower's literal 400 does not transfer. It works there because NB International Pro is a geometric grotesque with even strokes, because the type is white on dark photography where thin strokes gain apparent contrast, and because the brand register is cinematic. Newpoint's hero is dark ink on warm white at up to 72px, where thin strokes lose presence rather than gain elegance, and Cabinet Grotesk's character sits in sturdy forms that flatten toward generic at 400. Thin dark-on-light stems also read weaker for low-vision users even though the computed ratio is unchanged at 16.3:1.

The transferable insight is the principle rather than the number: display weight should be lighter than instinct suggests. 600 was slightly blunt for Cabinet Grotesk at that size. 500 keeps the authority and pairs better with the `-0.03em` tracking already in place.

---

## Validated, no change needed

### 5. One saturated moment, otherwise monochrome
**From:** Mintlify ("let the hero be the only colorful moment").
**Status:** confirmed already aligned. No code changed.

Audit of shipped section grounds: `np-neutral-50` (page), `np-neutral-100` x3, `np-surface` x2, `np-ink` x1. Exactly one dark colour-block moment, on the provider section. The single accent `--color-np-amber-500` appears in exactly two places, both small non-text surfaces (provider credentials, step numerals), and never as a section ground. `np-blue-50` appears once as a functional tint on condition chips, not as a section ground.

Newpoint's saturated moment sits at section 3 rather than the hero, because the providers are the differentiator. Same discipline, different placement.

### 6. Near-invisible shadows
**From:** Mintlify ("2px offset at 3-5% opacity; if a component needs more separation use a 1px border").
**Status:** one token had drifted; corrected in `app/globals.css`.

- `--shadow-np-card: 0 2px 8px rgb(19 28 46 / 0.05)` already matched: 2px offset, 5% opacity. Blur is 8px against Mintlify's 4px, which is softer but the same family. Left as is.
- `--shadow-np-lift` had drifted to `0 12px 32px -8px / 0.10`, a 12px offset at 10%, well outside the discipline and outside `design-tokens.md`'s own "ultra-diffuse" language. **Tightened to `0 4px 16px -4px / 0.06`.** It is currently unused by any component, so this is a correction to the token before anything consumes it.

---

## Rejected

### Superpower: orange accent and full-bleed dark hero photography
Wrong register. The orange (`#fc5f2b`) and cinematic dark photography read energetic and urgent, which is the opposite of what an anxious first-time psychiatric patient needs. It also directly conflicts with the preserved `#234598` blue and the warm-neutral ground. Superpower is selling optimisation to the already-well; this practice is treating people in distress.

Separately, the full-bleed hero photography has no asset to run on: no practice or office photography exists, and `research/assets/manifest.md` records that the current site's stock imagery is exactly the failure being corrected.

### Mintlify: mint green and square 4px / 16px radii
The green conflicts with a locked single-accent system that already has `--color-np-amber-500` and a preserved brand blue. Mintlify's own rule is "do not use a second accent colour", which argues against importing theirs.

The radius system conflicts head-on: Mintlify commits to 4px buttons and explicitly forbids pill buttons and 9999px radii, while the shipped scale is pill buttons, 14px cards, 10px inputs, 20px media. Both are internally coherent; neither is better. Rebuilding every shipped component to swap one coherent geometry for another returns nothing.

### Grove AI: serif signature-word treatment
Genuinely attractive, and the closest of the three to this project's register. Rejected on cost, not on merit.

Cabinet Grotesk and Switzer are already self-hosted, variable, licensed, and verified in the build as two `woff2` files with no CDN request. Adding Libre Caslon Text means a third family, a third font load, a new licence to check, and a re-tuning of the whole display scale. The single-family-exploited-through-weight discipline taken from Linear and Vercel is the stronger commitment here.

**Logged as a future option.** If the practice ever commissions a real brand system, a serif signature word on the practice name is worth revisiting. It is not worth it as a late change to a shipped scale.

### Mintlify: cloud illustration and documentation-mockup-as-hero
No equivalent asset exists, and none can honestly be manufactured. Mintlify's hero works because the product *is* the visual. This practice's product is two clinicians and a conversation. Fabricating an illustration or a fake product mockup would also breach the taste discipline's ban on div-based fake screenshots and `CLAUDE.md`'s rule against inventing what is not there.

---

## Provenance note

The Mintlify document arrived in two parts: the first paste was truncated by a message size limit mid-sentence in the Don'ts section, and the complete document was supplied immediately after. [`mintlify.md`](mintlify.md) holds the complete version. Superpower and Grove AI arrived complete in a single paste.
