# Rula

- **URL:** https://www.rula.com (200, canonical)
- **Title:** "Connect with mental health experts who specialize in you"
- **Meta description:** "Affordable online therapy where you are, on your schedule. Easily find a therapist covered by your insurance."
- **Platform:** Next.js
- **Peer relevance:** HIGH. Includes medication management, insurance-led, and its provider-card treatment is directly instructive.

## Layout system
Next.js, conventional centered container, long page (586KB). Section rhythm is regular. Density is higher than Two Chairs but lower than Meru.

## Hero pattern
Headline "Find your therapist, covered by insurance". Marketplace framing ("find") plus the insurance qualifier in the same line, matching Grow's approach. Directly beneath: **"In-network with 120+ plans nationwide"**, a specific number doing the payer-proof job.

## Section flow (top to bottom)
1. Hero: "Find your therapist, covered by insurance"
2. **"In-network with 120+ plans nationwide"** (payer proof, position two)
3. "A higher standard for care"
4. **Named provider cards**: Yvette D. Wilhite, Kaitlin Olson, Luke Thomas, Gigi Natacia Jones, Brenda Barzee Franson, Alexa Bustamante (six real named providers with photos)
5. "Millions of successful sessions and counting" (scale proof)
6. "Your journey to mental well-being gets easier from here"
7. "Support at every step, so the next one is easier" with sub-blocks: The right match, without the wait / Insurance made easy / Clinical expertise you can trust / Care that drives progress / Support that's always there
8. "Find care based on your needs"
9. "Care on your terms"
10. "From our blog" plus "Tips for getting started on your journey"
11. FAQ: "Questions? We're here to help" with Getting started / Understanding costs
12. Closing CTA: "We're here when you need us" / "Find a provider"

**Most reusable structure:** named provider cards in position four, immediately after the quality claim and before any feature explanation. Rula understands that people choose a person, not a platform. For Newpoint, whose entire differentiator is two specific named clinicians, this placement should move even earlier.

## Typography
- **Jokker** (primary sans, distinctive geometric with character)
- **Recife Display** (serif display layer)
- **DM Sans** (fallback / secondary sans)
- **Licorice** (script, likely decorative accent only)

Again the serif-display-over-sans structure. Jokker is a genuinely characterful choice rather than a neutral default.

## Color
| Hex | Role |
|---|---|
| `#1D1733` | Deep aubergine-navy, primary dark |
| `#46219E` | Saturated purple, brand accent |
| `#3E2E73` | Mid purple |
| `#291551` | Deep purple |
| `#E9E5FF` | Pale lilac, tints and accordion backgrounds |
| `#AD99FF` | Light purple |
| `#F2F2FC` | Very pale lilac ground |
| `#F7F5EF` / `#F8F5EA` | Warm bone ground |
| `#15171A` / `#26272A` | Near-blacks |
| `#C1C5CD`, `#E0E2E6`, `#969AA0` | Cool grey scale |

A committed purple system over warm bone. The deep aubergine (`#1D1733`) as the dark anchor rather than a neutral black is a strong, ownable decision.

## Components
Named provider cards with photography. Accordion FAQ with a tinted background (`--accordion-item-bg: #E9E5FF`, a rare explicit token). Insurance module. Blog teasers. City and state landing page architecture in nav (New York NY, Los Angeles CA, Chicago IL, Philadelphia PA and so on, including PA cities relevant to Newpoint's service area).

Radius scale runs `0`, `0.1875rem`, `0.5rem`, `0.75rem`, up to `1.5rem`. The `1.5rem` cards are the softest geometry in the peer set.

## Motion and interaction
No custom easing tokens surfaced in the retrieved CSS. Motion appears to be conventional reveal and hover.

## Imagery
Real provider portraits, warm-toned, consistent treatment across cards. This consistency of portrait treatment is what makes the provider grid read as a curated practice rather than a directory.

## Conversion mechanics
"Find care" / "Find a provider" held as one CTA intent throughout, including a closing CTA that repeats it. Insurance proof carries a hard number (120+ plans). Scale proof ("Millions of successful sessions") does the credibility work that a small practice cannot borrow. FAQ splits explicitly into Getting started and Understanding costs, the two real objections.

## Tone of voice
Warm, competent, gently reassuring. "Support at every step, so the next one is easier" is characteristic: acknowledges difficulty without dwelling on it.

## Steal
- Named provider cards early, with consistent portrait treatment
- Hard numbers on insurance ("120+ plans") rather than "we accept most insurance"
- FAQ split explicitly into Getting started and Understanding costs
- Deep aubergine as a dark anchor instead of neutral black
- Closing CTA that repeats the single primary intent

## Avoid
- Twelve sections, which is more than a two-provider practice can fill honestly
- Scale claims Newpoint cannot make ("Millions of successful sessions")
- Four font families, which is more than the system needs
