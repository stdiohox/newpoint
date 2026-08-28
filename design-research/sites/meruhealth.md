# Meru Health

- **URL:** https://www.meruhealth.com (200, canonical)
- **Title:** "Meru Health | Your #1 tool for better mental health"
- **Meta description:** "Meru Health is a 12-week digital mental health program proven to deliver fast, long-lasting recovery for anxiety, depression, stress, and more."
- **Platform:** Framer
- **Peer relevance:** MEDIUM. Program-based rather than provider-based, and B2B2C (sold through health plans and employers). Useful mainly for its outcomes-first structure.

## Layout system
Framer site, 711KB. The longest and densest homepage in the peer set at roughly twelve major sections. Many headings appear duplicated in markup, which is a Framer responsive-variant artifact (separate desktop/tablet/mobile instances of the same block) rather than genuine repetition.

## Hero pattern
Headline "Take the first step to feeling better". Action-oriented, no insurance qualifier, no speed claim. Positions the program rather than a person.

## Section flow (top to bottom)
1. Hero: "Take the first step to feeling better"
2. "How Meru Health helps"
3. **"See how people like you improved their well-being"** (outcomes and testimonials, unusually early)
4. "Getting started is easy as…" (process)
5. "Get to know Meru Health"
6. **"Meru Health vs. traditional therapy"** (explicit comparison section)
7. "Our program, your results"
8. "It's your mental health journey, but you're never alone"
9. "Who we serve:" splitting into **Adults** and **Teens**
10. "Health plans" (B2B audience)
11. FAQ: "Have questions about Meru Health? We're here to help." / "Still have more questions?"
12. Closing: "If you've made it this far, take a deep breath"

**Most reusable structure:** outcomes placed at position three, before the process explanation. And the closing line "If you've made it this far, take a deep breath" is the single warmest piece of copy in the peer set, a genuine moment of care rather than a CTA.

## Typography
- **Roobert** (Medium and SemiBold weights, identified via Framer's base64 font selectors)
- **Fragment Mono** (monospace, likely for small meta or data)
- Inter present as fallback

Roobert is a warm geometric sans. Meru is one of only two peers with **no serif display layer** (Brightside being the other).

## Color
| Hex | Role |
|---|---|
| `#0D5234` | Deep forest green, primary brand |
| `#083622` | Darker green |
| `#0D5435` | Green variant |
| `#02C06A` | Bright green accent |
| `#D8EAD4` | Pale sage tint |
| `#F4F1EA` | Warm cream ground |
| `#D1DFFD` / `#E8EEFD` | Pale blue tints |
| `#F9F9F9` | Off-white |

Deep forest green over warm cream, with pale blue as a secondary tint. The **green-over-cream** system is a distinct third direction alongside Two Chairs' sage-clay and Rula's purple-bone.

## Components
Comparison table ("Meru Health vs. traditional therapy"). Audience splitter (Adults / Teens). Outcome charts and testimonial modules. Health-plan and employer B2B paths. FAQ accordion with a two-tier structure.

## Motion and interaction
Framer's motion layer is present but no distinctive custom easing surfaced in the document. Framer defaults tend toward spring-based transitions.

## Imagery
Program screenshots, outcome charts, and warm human photography mixed. More product-shot heavy than the provider-led peers, consistent with selling a program rather than a person.

## Conversion mechanics
"Get started" plus "Request a demo" (the B2B path) run as parallel CTA intents, which slightly muddies the primary action. Outcomes data is the main trust mechanism. Comparison against traditional therapy is an aggressive but effective positioning device.

## Tone of voice
Gentle, encouraging, second-person. "It's your mental health journey, but you're never alone." Warmer than Talkiatry or Grow, less confident than Two Chairs.

## Steal
- Outcomes before process
- The closing "take a deep breath" moment: a human beat at the end of the page instead of a hard CTA
- Explicit comparison framing to define what the practice is not
- Deep green over warm cream as a credible alternative to sage or purple

## Avoid
- Twelve sections and 711KB
- Two competing CTA intents (Get started vs Request a demo) on one page
- "#1 tool" claim in the title tag, which is unverifiable and would be a regulatory risk for a prescribing practice
- Duplicated heading markup from responsive variants, which is bad for crawlers
