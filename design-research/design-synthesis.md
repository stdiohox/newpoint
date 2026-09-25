# Design Synthesis and Committed Direction

**Date:** 2026-08-28
**Inputs:** 10 sites studied (7 behavioral-health peers, 3 craft benchmarks), reconciled against [`research/`](../research/).
**Skills applied:** `design-taste-frontend` (brief inference, anti-default discipline, redesign protocol, pre-flight rules), `apple-design` (motion, spring values, type tracking, materials), `high-end-visual-design` (spatial rhythm, component depth, motion choreography), `minimalist-ui` (restraint, hairline discipline, accent rationing), `animation-vocabulary` (precise motion naming), `brandkit` (palette discipline, symbol logic, anti-generic rules).

> **Design read:** Redesign (overhaul visuals, preserve brand equity and content) of a two-provider outpatient psychiatric practice site, for anxious first-time patients and referrers in NJ and PA, with a warm clinical-authority language, leaning toward a single-family type system, semantic token ramps, and restrained functional motion.
>
> **Dials:** `DESIGN_VARIANCE: 6` · `MOTION_INTENSITY: 4` · `VISUAL_DENSITY: 3`
> Reasoned, not baseline. Variance is held at 6 rather than 8 because regulated clinical trust punishes visual cleverness. Motion is 4 rather than 6 because this audience is anxious and motion should confirm, never perform. Density is 3 because the practice has genuinely less to say than a venture-backed marketplace, and pretending otherwise is what produces filler.

---

## Part 1: What the peer set agrees on

Seven behavioral-health sites, and the convergence is striking. These are not stylistic coincidences; they are the category solving the same conversion problems.

### 1. Payer proof lands within one scroll of the hero
| Site | Where insurance appears |
|---|---|
| Grow Therapy | **Inside the hero headline** ("Mental health made easy, covered by insurance") |
| Rula | **Inside the hero headline**, then "In-network with 120+ plans nationwide" immediately below |
| Brightside | Section 2, named "We accept insurance" |
| Talkiatry | Hero value-prop row ("Use your insurance"), plus a copay estimator at position 3 |
| Two Chairs | Nav item only (the outlier, and arguably its weakest decision) |
| Meru Health | Deferred to a "Health plans" section far down (B2B2C model, different funnel) |

**Four of the seven put payer information in the first or second position.** Cost and coverage is the first objection in this category, and the peers that convert hardest answer it before they explain anything else.

### 2. Warm off-white ground, near-universally
`#F6F4EC` (Two Chairs) · `#F8F6F2` (Talkiatry) · `#F7F5EF` (Rula) · `#F4F1EA` (Meru) · `#F9F7F2` (Cerebral)

Five peers, five nearly identical warm creams. Nobody in this category uses cool white or cool grey. The warmth is doing real work: it de-clinicalizes the page for people who are nervous about clinical settings.

**But this is also the trap.** A palette five competitors share is not a differentiator, it is camouflage. See Part 3.

### 3. Serif display over sans body
Feijoa (Two Chairs) · Domine (Talkiatry) · Recife Display (Rula) · Season VF (Grow). Four of seven. Only Meru (Roobert) and Brightside run sans-only.

Same conclusion as the cream: it is the category convention, which means adopting it is a decision to blend in.

### 4. Named, photographed providers as a trust component
Rula ships six named provider cards at **position four**. Two Chairs ships clinician cards with license status attached to the name ("Matthew Stephan, Fully licensed"). Both understand that patients choose a person, not a platform.

### 5. Needs phrased in the patient's words, beside clinical terms
Grow's "Work on relationships and connection" and "Process trauma and move forward" sit alongside, not instead of, the diagnosis vocabulary. Rula splits its FAQ explicitly into **Getting started** and **Understanding costs**, the two questions people actually arrive with.

### 6. A closing human beat
Meru ends on "If you've made it this far, take a deep breath" instead of a hard CTA. It is the warmest single line across all ten sites, and it costs nothing to do.

---

## Part 2: What the craft benchmarks do better

The peers are competent. Linear, Vercel, and Stripe are *built*. Six concrete gaps:

| # | Craft benchmark does | Peers do | Why it matters here |
|---|---|---|---|
| 1 | **One typeface, exhaustively used.** Linear ships a single `InterVariable.woff2`; Vercel ships Geist. Hierarchy comes from weight, scale, and tracking. | Rula ships four families (Jokker, Recife Display, DM Sans, Licorice). Talkiatry ships three. | Newpoint's current site already runs **three** unrelated families (Source Sans Pro, Inter, Lato) per [`research/assets/manifest.md`](../research/assets/manifest.md). Consolidation is the highest-value, lowest-risk fix available. |
| 2 | **Semantic numbered token ramps.** Vercel exposes `--ds-gray-100` … `--ds-gray-1000`, plus alpha tokens (`--ds-gray-alpha-200`) so hover tints composite correctly over any surface. | Peers hardcode hex. Rula exposes exactly one token (`--accordion-item-bg`). Brightside leaks the entire WordPress default palette into the document. | Determines whether the build stays coherent past month three. |
| 3 | **Every trust claim carries a number or a name.** Stripe: "URBN consolidates $5 billion", "$1.9T in 2025". Grow is the only peer matching this with "$21 on average". | Most peers use unfalsifiable adjectives. | A two-provider practice cannot claim scale, so specificity is the only credibility available. |
| 4 | **Section-layout variation.** Stripe never runs two consecutive sections in the same layout family. | Meru runs twelve sections, many structurally identical. Brightside repeats a four-feature quad. | Prevents a short page from feeling like a template. |
| 5 | **Motion that is fast, short, and functional.** Sub-200ms hover resolution, ease-out dominant, zero scroll hijacking. | Peers default to Webflow and Framer easing without deciding anything. | An anxious audience reads slow, showy motion as friction. |
| 6 | **Off-black, never pure black.** Linear grounds on `#08090A`; Two Chairs is the only peer that gets this right with a warmed `#191717`. | Newpoint's current site uses `#000000` body text on `#EEEEEE`. | Pure black on grey is the single clearest "builder template" tell on the existing site. |

---

## Part 3: The committed direction

### "The Consulting Room"

Newpoint is not a marketplace, and it should stop trying to look like one. Every peer in this set is venture-backed inventory: their design problem is making thousands of interchangeable clinicians feel navigable, which is why they lead with search, filters, and scale claims. Newpoint's entire asset is the opposite and is currently invisible on its own website. There are exactly **two** providers, both doctorate-prepared, both dual board-certified as family and psychiatric-mental-health nurse practitioners. That is a genuinely uncommon credential pair, and it is the one thing no marketplace can offer: you know in advance precisely who you will be sitting across from. So the direction commits to that. **The two providers are the product**, surfaced early, photographed as people rather than staff, with their credentials stated plainly and early. Around them the page is quiet, light, and generously spaced, using one confident typeface, one accent, and motion that only ever confirms an action. And critically, it **keeps the practice's existing blue.** Five of seven peers have fled to cream, sage, lilac, and forest green; blue is now the differentiated position in this category, it is the color the practice already owns, and it carries clinical credibility that a prescribing psychiatric practice specifically needs. The execution around the blue is what changes: deeper ink, warmer neutrals, tier-one type and token discipline.

### The specifics behind that paragraph

**1. Preserve the blue, deepen the execution.**
The redesign protocol is explicit that a brand which is already blue stays blue. Per [`research/assets/manifest.md`](../research/assets/manifest.md), Newpoint owns `#234598` (primary) and `#1F9DD6` (accent), confirmed in the live site's own CSS custom properties. `#234598` is kept exactly as the primary action color: it has strong contrast on light grounds and it is real brand equity. The cold cyan `#1F9DD6` is retired, because it is the element making the current site read as generic medical clip-art. Warmth is reintroduced through the neutrals and a single warm accent instead.

**2. Warm white, not category cream.**
The ground is `#FBFAF8`, a clean warm white. This is a deliberate half-step away from the `#F6F4EC` cream that five peers share. It keeps the de-clinicalizing warmth while refusing the camouflage.

**3. One deep ink section, once per page.**
The provider section renders on ink navy `#131C2E`. This is the page's single color-block moment, used deliberately for the thing that matters most, and it is the reason the direction reads premium rather than merely clean. It is allowed exactly once. Every other section sits on the light ground.

**4. Sans display, not the category serif.**
Four peers reach for a serif display. Newpoint uses **Cabinet Grotesk** for display and **Switzer** for body and UI: two families, both free for commercial use, both self-hostable. Sans display here is the differentiating choice, and it avoids the serif-as-default reflex. Hierarchy comes from weight and scale, Linear-style, with tracking tightening as size increases.

**5. One accent, rationed.**
A warm amber `#E9A93C`, borrowed in spirit from Talkiatry's slate-plus-yellow, which is the most differentiated color decision in the peer set. It appears only on small non-text surfaces: active indicators, rule markers, icon fills. It never carries a section background and never carries text on a light ground.

> **Superseded 2026-09-25.** Amber is retired; the rationed accent is now the brand blue `--np-blue-600` `#234598`. The principle — one accent, strictly rationed — is unchanged and still holds. Only the colour did.

**6. Motion at intensity 4, and no higher.**
Scroll reveal at short travel distance, hover effects, press feedback, accordion collapse. That is the complete inventory. No parallax, no pinned sections, no marquee, no scroll hijack. Springs are critically damped by default, with bounce reserved for nothing on this site, because there is no momentum-driven interaction anywhere in the brief.

**7. What is deliberately omitted: testimonials.**
The audit records that the current site's testimonial section literally reads "Coming soon," and that there are no real patient testimonials with documented consent. Every peer runs a testimonial module. Newpoint should ship **without one** rather than fabricate or placeholder it, and spend that page position on credentials and payer proof instead, which are verifiable. Patient testimonials also carry HIPAA consent complexity that the v1 scope should not absorb.

---

## Part 4: Recommended homepage section order

Seven sections. Linear ships seven. Two Chairs ships six. Meru ships twelve and is worse for it. A two-provider practice that ships twelve sections is padding, and padding is visible.

| # | Section | Justification against the peers |
|---|---|---|
| 1 | **Hero.** Headline naming psychiatric care and the two-state service area. One CTA. Insurance named in the supporting line. | Grow and Rula both put insurance in the hero itself and they are the two most conversion-engineered peers. Max 4 text elements, headline under 2 lines. |
| 2 | **Insurance and payer proof.** Named insurers as real SVG logos (Aetna, Optum, Cigna Evernorth, United Healthcare, Medicare, NJ Medicaid, Horizon BCBS NJ, all confirmed in [`research/business-nap.md`](../research/business-nap.md)). Sliding scale noted. | Four of seven peers put this in position 1 or 2. It is the first objection. Logo wall sits under the hero, never inside it, and carries logos only with no category labels. |
| 3 | **Meet your providers.** The ink-navy anchor section, built as **two provider cards at card scale**. Both providers, portraits at `--r-media`, full credentials, states licensed. See the constraint note below. | Rula places providers at 4, Two Chairs at 3. Newpoint moves them **up** because for a two-person practice this is the differentiator, not a directory listing. This is the section a marketplace structurally cannot copy. Rula's named-provider cards are now the closer structural reference than a full-bleed portrait moment. |
| 4 | **What we treat and how care works.** Psychiatric evaluation, medication management, telehealth. Conditions named in clinical terms alongside patient-language framing. | Talkiatry's conditions grid and Grow's needs-based language, combined. Carries the SEO weight for condition and service queries. |
| 5 | **Getting started.** What the first visit involves (the audit confirms it is a comprehensive psychiatric evaluation), how to book, what to expect. | Two Chairs and Meru both place process mid-page after trust is established. Addresses the audit's finding that no intake process is documented anywhere on the current site. |
| 6 | **FAQ**, split into **Getting started** and **Insurance and costs**. | Rula's exact split. These are the two real objections, and the audit lists both as unanswered on the current site. |
| 7 | **Contact and crisis guidance.** HIPAA-safe form. 988 and 911 guidance. Closing human beat before the footer. | The audit flags the total absence of crisis guidance as a gap on a behavioral-health site. Meru's "take a deep breath" close is the model for the tone. |

**Layout families across those seven:** asymmetric split hero, logo band, dark two-card provider section, two-column condition grid, numbered process sequence, accordion, contained form. Seven sections, seven distinct families. No two consecutive sections share a layout.

### Section 3 constraint: card scale, not hero scale (provisional)

Section 3 was originally specified as a hero-scale focal moment with full-bleed arch-masked portraiture. **The supplied photographs cannot carry that treatment**, so the section is revised to card scale. This is a constraint on the assets, not a retreat from the strategy: the providers remain the page's differentiator and stay at position 3 on the ink ground.

What the photos are, per [`assets/providers/README.md`](assets/providers/README.md):

- **1346 x 1343** (Funmilayo Whitaker) and **1137 x 1138** (Anastasia Ofoegbu). Both square, both EXIF-stripped and re-compressed with the signature of transfer through a messaging app.
- The smaller file caps the pair at roughly **560px displayed at 2x**.
- **Neither has headroom.** Both crop into the hair at the top edge.

What changes:

| | Original | Revised |
|---|---|---|
| Scale | Hero-scale focal moment, full-bleed portraiture | **Two provider cards**, generously sized, on the ink ground |
| Photo shape | Arch mask, `border-radius: 100% 100% 20px 20px` | **`--r-media`**, 20px rounded rectangle |
| Render size | Unbounded, large | **Capped at 560px displayed.** No upscaling |
| Aspect | Flexible | **Square 1:1**, one shared crop template |

The arch mask fails for a specific and unfixable reason: the dome needs clear space above the head to read as an arch, and cropping can only remove that space, never add it.

Card scale is also the honest treatment for what these images are. Phone selfies rendered at hero scale would advertise their own compression, flat lighting, and mismatched backgrounds. At card scale, with backgrounds normalized and colour temperature matched across the pair, they read as competent and human. The section still does its job, which is to make two specific named clinicians the first real thing a visitor meets.

> **Deferred, not discarded.** If better originals or a reshoot arrive at 2000px or more on the longest edge, framed with headroom, then the arch mask and the hero-scale treatment should both be revisited as the upgrade path. That remains the stronger design and the reason to ask for the shoot. Tracked in Part 8.

---

## Part 5: Steal this

1. **Payer proof in position two**, with a hard number where one exists (Rula's "120+ plans", Grow's "$21 average")
2. **Named provider cards with credentials attached to the name** (Two Chairs, Rula)
3. **Warm near-black instead of pure black.** Two Chairs' `#191717` is the reference
4. **Patient-language needs beside clinical condition names** (Grow)
5. **FAQ split into Getting started and Costs** (Rula)
6. **Evidence before product explanation** (Two Chairs puts "Scientifically proven to help" above any feature)
7. **A closing human beat instead of a hard CTA** (Meru)
8. **Six or seven sections, not twelve** (Two Chairs, Linear)
9. **One typeface family exploited through weight** (Linear, Vercel)
10. **Semantic numbered token ramps with alpha hover tokens** (Vercel)
11. **Every trust claim carries a number or a name** (Stripe)
12. **No two consecutive sections share a layout family** (Stripe)
13. **Motion that resolves fast and ease-out dominant** (Linear)
14. **Cost transparency placed high rather than buried** (Talkiatry's copay estimator)
15. **The arch image mask** (`border-radius: 100% 100% 16px 16px`, Cerebral) as a warm, non-generic portrait treatment. **Deferred:** not viable with the current photographs, which have no headroom. Revisit if better originals arrive. See Part 4.

## Part 6: Avoid this

1. **The category cream `#F6F4EC` and the sage-clay palette.** Five peers share it. Adopting it is camouflage.
2. **Serif display as the reflex choice.** Four peers do it; it is convention, not distinction.
3. **Marketplace framing.** "Find your therapist" is the wrong verb for a two-provider practice. Newpoint does not have inventory to search.
4. **Scale claims Newpoint cannot make.** "Millions of successful sessions" (Rula) and "#1 tool" (Meru) are unavailable and, for a prescribing practice, a regulatory risk.
5. **Twelve-section homepages** (Meru, Rula) and 700KB+ payloads (Meru 711KB, Grow 813KB).
6. **Client-only rendering of marketing content** (Cerebral renders zero headings server-side). This is precisely what the project brief exists to prevent.
7. **Missing meta descriptions** (Talkiatry, Two Chairs both ship without one).
8. **Keyword-stuffed titles** (Cerebral's five pipe-separated phrases).
9. **Two competing CTA intents on one page** (Meru's "Get started" against "Request a demo").
10. **Fabricated or placeholder testimonials.** The current site's "Coming soon" is worse than having no section at all.
11. **Leaving framework default palettes in the document** (Brightside leaks the entire WordPress preset palette, making its real brand color unreadable).
12. **State and city footer link dumps.** Marketplace-scale local SEO architecture would be absurd for two providers in two states.
13. **Pure black text on grey**, which is the current Newpoint site's most visible template tell.
14. **Three unrelated type families**, which is the current Newpoint site's second most visible tell.

---

## Part 7: Reconciliation with the audit

| Audit finding ([`research/`](../research/)) | Design consequence |
|---|---|
| **Two providers, both DNP / FNP-BC / PMHNP-BC** | Providers become section 3 on an ink anchor, as two cards. Credentials are set as a typographic element, not shrunk into caption text. The dual FNP plus PMHNP certification is stated plainly because it is genuinely differentiating. With portraiture constrained, **the credential typography now carries more of the section's weight**, so it should be set larger and more deliberately than originally planned. |
| **No provider photos existed at audit time** | **Resolved, with constraints.** Both portraits were supplied on 2026-08-28 and are committed under [`assets/providers/`](assets/providers/). They are phone selfies, square, EXIF-stripped, and re-compressed, with mismatched backgrounds and colour temperature and no headroom. They are usable at card scale after background normalization and a matched grade. They are **not** usable at hero scale or under the arch mask. A single-session reshoot of both providers remains the recommended fix and the trigger for the deferred upgrade path. Stock photography is still not an option, per the failure the audit documents on the current site (`Picture1`, `ujuuu`). |
| **No license or NPI numbers published** | Design a credential line that reads complete with post-nominals alone, so it does not look broken while the numbers are absent. Reserve an optional slot beneath, marked as a client placeholder. |
| **No street address, and no confirmation whether one exists** | **No map, no address block, no local-business footer card.** The layout must not contain an address-shaped hole. Frame geography as service area ("New Jersey and Pennsylvania") instead. `MedicalBusiness` schema ships with `areaServed` rather than `address`. Revisit only when the client confirms. |
| **Business name spelled four ways** | The canonical form fixed in [`CLAUDE.md`](../CLAUDE.md), "Newpoint Healthcare Services, LLC", is used identically in copy, metadata, schema, and footer. NAP consistency is a ranking factor. |
| **No real testimonials, section says "Coming soon"** | Testimonial section deliberately omitted from v1. Position reallocated to payer proof and credentials. |
| **HIPAA-aware v1 intake** | Contact form is name, email, phone, and a constrained reason-for-contact select. No free-text clinical prompt, no file upload, no date of birth. Form styling must still pass WCAG AA on labels, placeholders, focus rings, and error text. |
| **No crisis guidance anywhere** | 988 and 911 guidance ships in section 7 and in the footer. Styled as clearly readable and calm, never as an alarm banner. |
| **Existing brand: `#234598`, `#1F9DD6`, medical-cross logo** | `#234598` preserved as primary. `#1F9DD6` retired. The logo is **not** redesigned: per the redesign protocol, brand marks never change without explicit approval. The original vector file remains an open client request. |
| **Insurance list confirmed (7 payers)** | Section 2 ships with real insurer SVG logos, not text wordmarks. |
| **Two orphan template blog posts live and indexable** | Not carried into the rebuild. No blog in v1 unless the client supplies real topics. |
| **3 of 4 images lack alt text** | Every image ships with real alt text. Portraits describe the person and role. |

---

## Part 8: Open questions for the client

These block specific design decisions, not the whole direction:

1. **Provider headshots, at reshoot quality.** No longer blocking: both portraits were supplied on 2026-08-28 and section 3 can be built at card scale. But a single session covering both providers (same room, same light, same lens distance, headroom, 2000px or more on the longest edge) is the **deferred upgrade path** that restores the arch mask and the hero-scale treatment. Still the highest-value asset request in the project, now an upgrade rather than a blocker.
2. **Original logo file** (vector preferred). Blocks final nav and footer treatment.
3. **Physical address, or confirmation there is none.** Determines whether a location module and `address` schema ever exist.
4. **Confirmation of "Newpoint" vs "New Point"** from the LLC formation documents. Blocks final wordmark lockup.
5. **Hours of operation.** The Services page implies expanded and weekend availability; without specifics the "Getting started" section cannot state it.
6. **Age range served**, and whether substance-use treatment is an active service line. Determines the conditions taxonomy in section 4.
