# Talkiatry

- **URL:** https://www.talkiatry.com (200, canonical, no redirect)
- **Title:** "Talkiatry: The Online Psychiatrist Covered by Insurance"
- **Meta description:** none present (notable gap on a site this size)
- **Platform:** Webflow
- **Peer relevance:** HIGHEST. This is psychiatry plus medication management plus insurance, the closest match to Newpoint's actual service line.

## Layout system
Standard Webflow container, roughly 1200px max width, centered, with generous gutters. Section rhythm is regular rather than dramatic: consistent vertical padding, no oversized editorial breaks. Whitespace is moderate, not gallery-grade. The page reads as a well-organized brochure rather than a designed statement.

## Hero pattern
Left-aligned copy block, supporting image right. Headline "Find the right psychiatrist for you, fast" leads on speed, not on clinical depth. Single dominant CTA. The hero does the positioning work in one line and hands off immediately to the value props.

## Section flow (top to bottom)
1. Hero: "Find the right psychiatrist for you, fast"
2. "Psychiatry, simplified" containing three value props: **100% online / Use your insurance / Appointments in days**
3. Copay estimator: "Get a quick copay estimate" (interactive, repeated twice in markup)
4. "You're in expert hands" (credentials and clinical trust)
5. "Find someone who specializes in you"
6. "Support tailored to your needs"
7. Conditions grid: ADHD, Anxiety, Bipolar disorder, Children's mental health, Depression, OCD, Postpartum, Mood disorders, Insomnia, SUD, PTSD
8. Footer with very deep SEO navigation

**Most reusable structure:** the three-value-prop row directly under the hero, each prop answering a specific objection (is it convenient / can I afford it / how long will I wait). This is the cleanest execution of that pattern in the peer set.

## Typography
- Display and headings: **Domine** (serif, with Georgia fallback)
- Body and UI: **Inter**, with **Avenir** also present
- Feel: the serif headline over sans body gives a settled, medical-editorial tone. Not distinctive, but reads as trustworthy rather than startup-y.

## Color
| Hex | Role |
|---|---|
| `#487083` | Primary slate blue, the anchor brand color |
| `#84A8B9` | Lighter slate, supporting |
| `#B4C5CA` | Pale blue-grey, backgrounds and dividers |
| `#FFCC33` | Yellow accent, primary CTA and highlight |
| `#FFE38F` | Soft yellow, tints and washes |
| `#F8F6F2` | Warm off-white page ground |
| `#282B2C` | Near-black text |
| `#4B4A4A` | Body grey |

The slate-blue plus yellow pairing is the single most differentiated color decision in the peer set. Yellow reads warm and optimistic without being childish, and it survives against the muted blue.

## Components
Deep mega-menu navigation organized by Conditions / Medications / Age and Life Stage / Quizzes and Self-Assessments / Resources. Buttons are moderately rounded (0.25 to 0.625rem). Conditions render as a repeated card grid. The copay estimator is the standout component: an interactive cost calculator placed high on the page.

## Motion and interaction
Restrained. Webflow easing curves present: `cubic-bezier(.165,.84,.44,1)` (strong ease-out), `cubic-bezier(.4,0,.2,1)` (material standard), `cubic-bezier(.645,.045,.355,1)`. Motion is scroll reveal and hover state only, no scroll-driven or pinned sequences. Character: quick out, soft settle. Appropriate but unremarkable.

## Imagery
Photography of real-feeling people, warm-lit, not clinical. No stock-smiling excess. Providers appear as real headshots rather than illustration.

## Conversion mechanics
The copay estimator is the conversion engine and it is placed unusually high. Insurance is named in the title tag, the hero, and the value props. Trust signals are credential-based ("You're in expert hands") rather than testimonial-based. Booking is the single CTA intent throughout.

## Tone of voice
Direct, reassuring, low-jargon. Short declarative sentences. Leads with access and cost, not with clinical authority. "Psychiatry, simplified" is the whole positioning in two words.

## Steal
- Three-objection value-prop row directly beneath the hero
- Cost transparency placed high instead of buried
- Slate blue plus warm accent, an escape from both corporate blue and category cream

## Avoid
- Missing meta description
- Nav depth that would be absurd for a two-provider practice
- Conditions grid repeated verbatim in markup (bloat)
