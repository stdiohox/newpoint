# Design Synthesis v2 — proposal

**Status: PROPOSAL. Nothing implemented.** v1 ([`design-synthesis.md`](design-synthesis.md), [`design-tokens.md`](design-tokens.md)) remains intact and is still what ships today.

**Date:** 2026-08-28
**Inputs:** [`references/superpower.md`](references/superpower.md), [`references/grove-ai.md`](references/grove-ai.md), [`references/mintlify.md`](references/mintlify.md), reconciled against [`../research/`](../research/) and v1.
**Skills applied:** `design-taste-frontend` (design read, dials, anti-default discipline, serif discipline, pre-flight rules), `apple-design` (optical type sizing and tracking, translucent materials for the floating nav, spring motion), `high-end-visual-design` (spatial rhythm, nested enclosure, macro whitespace), `minimalist-ui` (hairline discipline, accent rationing, flat surfaces), `brandkit` (single-accent commitment, symbol logic), `animation-vocabulary` (naming motion precisely).

> **Design read:** Full visual rebuild of a two-provider outpatient psychiatric practice site, for anxious first-time patients and referrers in NJ and PA, with an editorial-clinical language, leaning toward a serif display over a single sans, one dark expressive moment, and a strictly rationed brand blue.
>
> **Dials:** `DESIGN_VARIANCE: 7` (was 6) · `MOTION_INTENSITY: 5` (was 4) · `VISUAL_DENSITY: 3` (unchanged)
> Variance rises because the brief explicitly releases the v1 constraint and all three references are more compositionally committed than v1 was. Motion rises one step to cover a hero entrance and a nav material transition, nothing more. Density stays at 3: the practice still has less to say than a funded startup, and that has not changed.

---

## Part 1: The law all three references share

Strip the surface differences and the three agree on five things. This is the spine of the proposal.

1. **Monochrome plus exactly one chromatic accent.** Superpower's coral, Grove's forest green, Mintlify's mint. All three state the rule explicitly and all three forbid a second accent.
2. **One expressive moment per page, everything else austere.** Superpower's cinematic hero, Mintlify's cloud band, Grove's single photograph. Downstream, all three revert to flat white surfaces.
3. **Elevation is whispered or absent.** Nobody exceeds 2px offset at 5% opacity. Grove replaces drop shadows with hairline halos and inset highlights entirely.
4. **Tight negative tracking that scales with size.** All three tighten as type grows. Superpower is the most aggressive at -0.025em.
5. **1200px container, 75 to 80px section gaps.** Identical across all three.

v1 already satisfies 1, 3, and 5. It satisfies 2 (the ink provider section). Point 4 is present but under-exploited.

---

## Part 2: Where they diverge — the six real decisions

| Axis | Superpower | Grove AI | Mintlify |
|---|---|---|---|
| **Display type** | One sans, whisper weight 400 at 66px | **Serif** display, sans body | One sans (Inter), no display face |
| **Geometry** | Pills, 15px cards | Pills, 20/24px cards, forbids 14-18px | **Square**: 4px buttons, 16px cards |
| **Hero** | Full-bleed dark photography | Editorial split, floating photo card | Colored illustrated band, product bridges out |
| **Nav** | **Floating dark pill** over imagery | Flat sticky white | Flat sticky white |
| **Accent as fill** | Yes, the CTA is the accent | **Never** | **Never** |
| **Card surface** | White on white with hairline | Single mist gray, never white on white | White with hairline border |

Six axes, and the references split 2:1 or 1:1:1 on every one. There is no average here. Each needs a decision.

---

## Part 3: The proposed direction

### "First Light"

All three references reach for the same metaphor without coordinating: Superpower's sunrise coral, Grove's *clinical journal in morning light*, Mintlify's cloud garden. It is also, precisely, what the practice's own name means. So the page should perform it. **It opens in the dark and resolves into light.**

The proposal is one deep, atmospheric ink field at the top, carrying the headline, the single blue accent, and nothing else that competes. Everything below it is austere, near-white, hairline-ruled, and set like a medical publication: a high-contrast editorial serif for display, a precise grotesque for everything a reader actually has to read, and `#234598` rationed so hard that it registers as a signal rather than decoration. The two providers are still the product and still sit high on the page, but they move **out of the dark and into the light**, because that is where their photographs actually work. The register I am aiming at is a well-set clinical journal that opens on a night sky: authority without coldness, restraint without timidity, and one blue that means something every time it appears.

---

## Part 4: The six decisions

### 4.1 Typography — editorial serif display over a single sans

**Proposal: retire Cabinet Grotesk. Adopt Newsreader (display) + keep Switzer (body and UI).**

Still two families, not three. The serif takes over the job Cabinet Grotesk currently does; Switzer is untouched.

Grove's serif move is the strongest single idea in the three documents, and it is not the same move the behavioral-health peer set makes. v1 rejected serif because four of seven peers use one, which would be camouflage. That reasoning holds for *their* serifs: Feijoa, Season VF, and Recife Display are soft humanist faces used for **warmth**. Grove uses a high-contrast transitional face for **authority** — medical publication, not wellness brand. Those are opposite jobs done by opposite serifs, and the second one is unoccupied in this category.

For a prescribing psychiatric practice whose central trust problem is *are these people real clinicians*, published-authority is the more useful register than warmth. Warmth is already carried by the copy voice, the portraits, and the crisis section's tone.

**Why Newsreader specifically:** variable, with a genuine optical-size axis so it holds at both 72px and 20px; screen-first rather than a print revival; free under the SIL OFL and self-hostable exactly as the current two are. It is not Grove's own Libre Caslon, so this is a shared idea rather than a clone. It is not `Fraunces` or `Instrument_Serif`, both of which the taste discipline bans as the reflex AI serifs.

Superpower's whisper-weight contributes the scale discipline: display sits at **400**, not 600 or 700. A high-contrast serif at 400 and 72px has presence that Cabinet Grotesk at 400 would not, because the stroke contrast does the work the weight was doing. This is the one place Superpower's literal 400 transfers, and it transfers because the typeface changed.

**Grove's signature-word device is adopted:** one word in the hero headline set in `#234598`. Not the practice name, which would be self-regarding, but the word carrying the promise.

### 4.2 Hero — dark atmospheric field, editorial split composition

**Proposal: Grove's two-column structure, in Superpower's register, with a decorative generated field.**

Left column: serif headline with one blue word, subhead in Switzer, the canonical filled-plus-outlined CTA pair. Right column: the two provider portraits, deliberately modest, named, with credentials set as a typographic element.

The dark field is a **decorative generated atmosphere** — deep ink with a soft blue cast, subtle grain, no representational content. It is explicitly not a facility photograph, not a person, not a logo. Permitted under the brief's demo terms and honest under CLAUDE.md because it depicts nothing.

**This solves the portrait constraint rather than fighting it.** The photographs are square, capped near 560px, and have no headroom. v1 treated this as a limitation to be minimized. The better answer is to make modesty the composition: two small, precise, evenly-framed portraits read as *these two specific people, exactly*, when the surrounding space is confident. Scale was never what made them convincing; consistency and context are.

### 4.3 Navigation — floating pill, desktop only

**Proposal: Superpower's floating dark pill on desktop, conventional bar on mobile.**

It is the most distinctive of the three nav treatments and the only one that would stop this reading as a generic clinical template. It pairs naturally with a dark hero: the pill sits on the field rather than fighting it, and per the Apple materials guidance it becomes a translucent layer with content scrolling beneath rather than an opaque strip consuming a fixed band.

Constrained: 72px equivalent height, single line, never sticking to the viewport edge. Below `lg` it collapses to a standard sticky bar, because a floating capsule on a small screen is fiddly and this audience should not have to fight the navigation.

### 4.4 Shadow and radius — Grove's discipline, stated plainly

**Radius: an 8 / 20 / pill system. Three steps, nothing between them.**

| Element | Value |
|---|---|
| Buttons, tags, pills | `999px` |
| Cards, panels, media, portraits | `20px` |
| Inputs, selects, small chips | `8px` |
| Dividers, hairlines | `0` |

Superpower and Grove both commit to pills; Mintlify's 4px square is the outlier and adopting it would mean rebuilding every interactive element to land somewhere no more correct. Grove explicitly forbids radii **between 14 and 18px**, which is precisely where v1's 14px cards sit. Moving to 20px resolves that and unifies cards with media, so portraits and panels finally share a shape.

**Shadow: hairline halo and inset highlight. Drop shadows are retired.**

Grove's elevation language is the most sophisticated of the three and the least likely to age badly. A component that needs separation gets a 1px ring, not a blur. A filled button gets a 1px inset white highlight, which is what makes Grove's dark buttons read as objects rather than rectangles.

### 4.5 Blue — one accent, five jobs, nothing else

`#234598` is the fixed anchor. Under the shared monochrome-plus-one law it gets a strict job list:

**Permitted:**
1. Primary CTA fill (Superpower's rule — legitimate here because white on `#234598` measures **8.8:1**, whereas Grove's green fails as a fill, which is *why* Grove forbids it)
2. The signature word in the hero headline (Grove)
3. Small-caps section labels (Grove and Mintlify)
4. Links and active states (Mintlify)
5. Focus rings

**Forbidden:** large background surfaces, body text, decorative washes, gradients, any second chromatic accent.

**Consequence: amber `#E9A93C` is retired.** This is the direct cost of adopting the shared law, and it should be stated rather than fudged. Its two current jobs, provider credentials and step numerals, move to blue. All three references are explicit that a second accent dilutes the first, and Newpoint's first accent is the one thing in this system that is not a preference.

The hero's dark field carries a blue *cast* but is desaturated far enough to read as near-black. Grove does exactly this with its green-tinted `#1c2b27`. The pure accent must stay legible as accent.

### 4.6 Section order — unchanged, treatments rebuilt

The order came from peer analysis in v1 Part 4, not from these three references, and nothing in them contradicts it. Payer proof is still the first objection; the providers are still the differentiator. **Changing the order for novelty would discard evidence.** What changes is how each section is built.

| # | Section | v1 treatment | v2 proposal |
|---|---|---|---|
| 1 | Hero | Light asymmetric split | **Dark atmospheric field**, editorial split, serif headline with one blue word |
| 2 | Insurance and facts | Light band, fact row, payer wall | Keep, add Grove small-caps labels; payer wall unchanged, it already works |
| 3 | Providers | Ink section, two cards | **Light section**, two cards, portraits at 20px radius |
| 4 | What we treat | White cards on light ground | **Single mist-tinted band**, Grove's one-tinted-section-per-page rule |
| 5 | Getting started | Numbered sequence on tinted ground | Numbered sequence on near-white, hairline ruled |
| 6 | FAQ | Two-group accordion | Keep accordion, restyle to hairline-only |
| 7 | Contact and crisis | Form beside crisis panel | Keep, crisis panel gets the hairline-halo treatment |

Seven sections, seven distinct layout families, no two consecutive alike. Eyebrow budget is `ceil(7/3)` = **2**; small-caps labels are eyebrows, so at most two sections get one.

---

## Part 5: The provider section moves into the light — and why that is the strongest idea here

This is the change I would defend hardest, and it came from the assets rather than from the references.

The processed portraits have their background **baked in at `#FBFAF8`** — verified: the corner pixels of both files read exactly `(251, 250, 248)`. They are light-ground assets. v1 places them on an ink section, so each portrait is a light square floating on dark. It works, but it is fighting the material.

Moving the providers onto a near-white ground makes the portrait backgrounds disappear into the page, which is the whole point of having matted them. And it frees the page's single expressive dark moment to move to the hero, where all three references put theirs.

So one change buys three things: the portraits sit natively, the dark moment lands where the references say it belongs, and the page gets a genuine light-to-dark-to-light rhythm rather than a light page with a dark interruption in the middle.

---

## Part 6: Constraints this proposal has to respect

1. **The page ground cannot drift far from `#FBFAF8`** without re-matting both portraits. All three references use pure white; adopting it would put a visible off-white rectangle behind each provider. The pipeline is documented and reproducible in [`assets/providers/processed/README.md`](assets/providers/processed/README.md), so re-matting is cheap, but it is a real dependency and not a free choice. **This proposal keeps `#FBFAF8`** and treats the warm ground as settled.
2. **Portraits stay capped at 560px displayed.** Nothing here lifts that.
3. **The arch mask stays deferred.** 20px radius is the shape until portraits with headroom exist.
4. **No fabricated logo, facility, or person.** The atmospheric field is abstract and depicts nothing. The OG card is likewise abstract.
5. **Compliance unchanged.** Contact form stays name, email, phone, constrained reason. 988 and 911 present. No invented NPI, licence, address, or certifying body.

---

## Part 7: My honest read

### What I would defend

**Moving the providers into the light and the dark moment to the hero.** Asset-driven, not taste-driven. The portraits were matted onto warm white and the page should honour that. It also aligns the page with what all three references actually do with their one expressive moment.

**Retiring amber.** Not a preference. It is the unavoidable consequence of adopting the monochrome-plus-one law that all three state explicitly, and Newpoint's one accent is a fact rather than a choice. Keeping a second accent while claiming to have blended these three would be incoherent.

**The 8 / 20 / pill radius system.** Grove's forbidden 14-18px band is a genuinely good rule and v1 sits inside it. Unifying cards and media at 20px means portraits and panels finally share a shape, which v1 never achieved.

**Hairline halos over drop shadows.** The most durable idea in the three documents. Costs nothing and ages better.

### Genuine toss-ups

**The floating pill nav.** Distinctive, and the only thing here that would stop this looking like every other clinical site. It could also read startup-y for a psychiatric practice where conventional might be reassuring. I lean yes because the rest of the system is so restrained that one confident gesture is affordable. If you want the safer page, take Grove and Mintlify's flat sticky bar and lose very little.

**The dark hero, for this specific audience.** Superpower does it for a health brand and it reads premium. But Superpower sells optimisation to the already-well; this practice treats people in distress, and dark can read heavy as easily as it reads serious. The mitigation is that it resolves into light immediately and never returns to dark. I believe it is right. I would not be shocked to be wrong.

**Keeping the section order.** I argue evidence over novelty, and I stand by that. But it does mean v2 is a re-skin at the structural level, and if you wanted a genuinely different page shape, this proposal does not deliver one. That is a deliberate call you should get to overrule.

### What I am unsure about

**The serif. This is the highest-risk decision in the document.** My case is that high-contrast editorial authority is unoccupied in this category while soft humanist warmth is crowded. The counter-case is real: a transitional serif at display size can read formal, institutional, even legalistic, and an anxious person looking for a psychiatrist may not want a page that feels like a journal. Two Chairs, the best-designed peer, chose a *soft* serif for exactly that reason.

I cannot resolve this from documents. It needs to be seen at size, in blue-on-ink, next to the real portraits. **The fallback is one line: keep Cabinet Grotesk and drop the serif entirely.** Everything else in this proposal survives that reversal intact, which is deliberate — I have not made any other decision depend on it.

**Whether "First Light" survives contact with the copy.** The metaphor is doing real work structurally. It could also turn precious if the copy starts reaching for it. The direction should show in the composition, never in the words.

---

## Part 8: What I need from you before building

1. **Serif or no serif.** The single highest-risk call. I propose Newsreader; the fallback is keeping Cabinet Grotesk.
2. **Dark hero: yes or no.** Everything else works either way.
3. **Floating pill nav or flat sticky.**
4. **Confirm amber is retired.** It follows from the shared law, but it is a visible change to something already shipped.
5. **Confirm the section order stays.** I argue it should; you may want a different page shape.

Concrete token values for all of the above are in [`design-tokens-v2.md`](design-tokens-v2.md), with contrast calculated rather than estimated.
