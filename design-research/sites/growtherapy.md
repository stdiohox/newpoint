# Grow Therapy

- **URL:** https://growtherapy.com (200, apex domain is canonical, no `www`)
- **Title:** "Therapy Near You & Online Therapy that takes your Insurance - Grow Therapy"
- **Meta description:** "Online therapy that takes your insurance so you can get the mental health care you need without the added stress. Easy to schedule. In-person available."
- **Platform:** Next.js
- **Peer relevance:** MEDIUM-HIGH. Marketplace model rather than a practice, but the local-SEO architecture is directly instructive for a two-state NJ/PA practice.

## Layout system
Next.js app with a conventional centered container. The page is very long (813KB of markup, the second largest in the peer set) because it carries a full state-by-state and city-by-city link architecture in the footer.

## Hero pattern
Headline "Mental health made easy, covered by insurance". Insurance is inside the headline itself, not deferred to a section below. Immediately beneath sits **"Available this week"**, which converts scheduling speed into a scarcity-adjacent trust signal. The provider search is the hero's functional core.

## Section flow (top to bottom)
1. Hero: "Mental health made easy, covered by insurance"
2. "Available this week" (availability proof)
3. "Get help for anxiety or depression" (condition entry points)
4. "The right therapist for you is already on Grow"
5. Stats band: **+90%**, "Sessions cost $21 on average with insurance", "Available women providers"
6. Needs-based filtering: Strengthen sense of self / Work on relationships and connection / Process trauma and move forward / Support for couples and partners / Unpack family and parenting issues
7. FAQ: "Why filter by Louisiana rather than in a city?", "Will providers take my insurance?", "Are there therapists who focus on specific issues?", "What happens during the first therapy session?"
8. Massive geographic footer (all 50 states, then cities)

**Most reusable structure:** the concrete-number stats band. "$21 on average with insurance" is the single most persuasive line in the entire peer set because it is specific, verifiable, and answers the question people actually have.

## Typography
- `--font-manrope` and `--font-atak` both resolve to **Manrope**
- `--font-season-vf` resolves to **Season VF**, a variable serif used for display

Sans body with a variable serif display layer. Same serif-display-over-sans pattern as Two Chairs, Talkiatry, and Rula.

## Color
| Hex | Role |
|---|---|
| `#0066FF` | Saturated primary blue |
| `#736F67` | Warm grey (note: warm, not cool) |
| `#67555E` | Muted mauve-brown |

Grow is the **only peer still using a saturated blue as its primary**. Everyone else has moved to purple, sage, slate, or green. The warm grey neutral rather than a cool slate is the detail that keeps the blue from reading corporate.

## Components
Provider search with insurance dropdown as the hero's functional element. Condition pills. Needs-based filter cards written as first-person goals rather than diagnoses. FAQ accordion. Very deep geographic link architecture (state pages, then city pages).

## Motion and interaction
No custom easing tokens surfaced in the document. Motion appears conventional: hover states and reveals.

## Imagery
Provider photography, real and varied, integrated into search result cards.

## Conversion mechanics
"Find a provider" is the dominant CTA intent, with "Get your estimate" as the cost-objection secondary. Insurance appears in the title tag, the meta description, the headline, the stats band, and the FAQ: five separate placements. Trust runs on numbers (+90%, $21) and availability ("Available this week").

## Tone of voice
Practical, cost-aware, non-clinical. Needs are phrased as the patient would phrase them ("Work on relationships and connection") rather than as diagnoses. This is the best copy register in the peer set for a first-time mental health seeker.

## Steal
- Insurance inside the hero headline, not in a section below it
- Specific dollar figures instead of vague affordability claims
- Needs phrased in the patient's own words alongside, not instead of, clinical condition names
- State-level and city-level page architecture for local SEO

## Avoid
- 813KB homepage
- Footer link dumps of all 50 states, which is marketplace-scale architecture and would be absurd for a two-state practice
- Location FAQ ("Why filter by Louisiana rather than in a city?") that exposes the product's own limitation to the visitor
