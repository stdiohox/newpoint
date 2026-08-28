# Brightside Health

- **URL:** https://www.brightside.com (200, canonical)
- **Title:** "Anxiety & Depression Treatment Online | Medication & Therapy"
- **Meta description:** "Get anxiety and depression treatment online from licensed psychiatric providers and therapists. No need to wait, start a free consultation online today."
- **Platform:** WordPress (Gutenberg block editor)
- **Peer relevance:** HIGH. Psychiatry plus therapy plus medication, insurance-led, same regulated prescribing space as Newpoint.

## Layout system
WordPress block-theme container, conventional centered max width. Section rhythm is even and fairly tight. Whitespace is functional rather than expressive. The page prioritizes information coverage over composition.

## Hero pattern
Headline "It gets brighter from here. Get 1:1 help that works, and lasts." Emotional promise first, mechanism second. Single primary CTA ("Get Care"). Notably the hero headline carries two sentences, which is one more than the peer norm.

## Section flow (top to bottom)
1. Hero: "It gets brighter from here. Get 1:1 help that works, and lasts."
2. **"We accept insurance"** (payer proof immediately after hero)
3. "Get better, faster with quality mental health care"
4. "Results-based care, built for you" splitting into **Psychiatry** and **Therapy**
5. Specialty programs: Suicide Prevention Program, Teen Care
6. "Virtual, dedicated support every step of the way" with four features: 1:1 Video Sessions / Anytime Messaging / Interactive Lessons / Proactive Progress Tracking
7. Footer with For Clinicians / For Partners split audiences

**Most reusable structure:** insurance acceptance as its own named section in position two. Brightside, Rula, Grow, and Talkiatry all surface payer information within one scroll of the hero. This is the strongest single convergence in the peer set.

## Typography
Font files are served through Google Fonts with obfuscated filenames, so exact families could not be resolved from markup alone. Rendered impression is a geometric sans throughout with no serif display layer. **Needs manual screenshot review** to name the families with confidence.

## Color
Palette extraction is **unreliable** here: the hex values in the document are dominated by the WordPress default Gutenberg preset palette (`--wp--preset--color--*`: `#ff6900`, `#0693e3`, `#fcb900`, `#cf2e2e`, `#9b51e0`, `#00d084` and similar), which ships with every WordPress install and is not evidence of brand intent.

Plausibly brand-owned values found outside the preset block:
| Hex | Role |
|---|---|
| `#2874FC` | Bright blue, likely primary |
| `#020381` | Deep navy |
| `#313131` / `#32373C` | Text greys |
| `#FFF5CB`, `#FFCEEC`, `#FFCB70`, `#FEF84C` | Soft tint washes (yellow, pink, amber) |

The tint family suggests a warm pastel accent system over blue. **Flag: needs manual screenshot review** before any of these are treated as canonical.

## Components
Large mega-menu with audience splitting (Get Care / Our Approach / For Clinicians / For Partners). Feature quads. Program cards for specialty lines. Review and award modules referenced in navigation ("Reviews & Awards", "Research & Results"), indicating an evidence-forward trust strategy.

## Motion and interaction
Minimal. No custom easing tokens surfaced. Motion appears limited to standard hover and reveal. Character: static-leaning.

## Imagery
Warm photographic style, people-centered.

## Conversion mechanics
"Get Care" is the single repeated CTA intent, used in nav and hero. Insurance is the first objection handled. Trust is built through named research and outcomes ("Results-based care", "Research & Results", "Reviews & Awards") rather than through provider identity. Clinician recruitment is a visible secondary funnel.

## Tone of voice
Warm, hopeful, plain. "It gets brighter from here" is emotional rather than clinical. Copy avoids jargon almost entirely.

## Steal
- Insurance as a named section in position two
- Evidence and outcomes as the trust mechanism, framed in plain language
- Naming specialty programs explicitly rather than burying them in a conditions list

## Avoid
- Two-sentence hero headline (dilutes the promise)
- Leaving the WordPress default palette in the document, which makes brand color unreadable to anyone auditing the site
- Four-feature quad repeated multiple times in markup
