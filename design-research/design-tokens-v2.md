# Design Tokens v2 — proposal

> **Proposal, not adopted except amber retirement (2026-09-25)**

**Status: PROPOSAL. Reference only.** Reviewed 2026-09-25. The only token change adopted from this file is the retirement of `--np-amber-500` and `--np-amber-100` (§ 1.4, and see the note in `app/globals.css`). No other token here — type ramp, spacing, radii, elevation, motion — was taken up. [`design-tokens.md`](design-tokens.md) (v1) is what ships today, amber aside. Companion to [`design-synthesis-v2.md`](design-synthesis-v2.md).

All contrast ratios below are **calculated** with the WCAG relative-luminance formula, not estimated. Failing pairs are recorded as hard rules rather than quietly avoided.

---

## 1. Colour

### 1.1 The anchor

`#234598` is fixed. It is the practice's real brand blue, from the logo and domain, and it is the system's single chromatic accent in the sense all three references mean: one colour, strictly rationed, never decorative.

| Token | Hex | Notes |
|---|---|---|
| `--np-blue-700` | `#1B3576` | Hover and pressed on primary |
| `--np-blue-600` | `#234598` | **The anchor. Do not alter.** CTA fill, signature word, labels, links, focus |
| `--np-blue-300` | `#8FB0EE` | **On-dark only.** Links and accents on the ink field |
| `--np-blue-100` | `#E3EAF8` | Selected states, faintest wash |

Carried unchanged from v1. `#1F9DD6` stays retired.

### 1.2 The ink field — new

The one expressive surface, and the biggest addition in v2.

| Token | Hex | Notes |
|---|---|---|
| `--np-field` | `#0C1424` | Hero field. Deep ink with a blue cast, desaturated far enough to read near-black |
| `--np-field-lift` | `#131C2E` | Raised surfaces on the field. This is v1's `--np-ink`, demoted to a secondary role |

Grove tints its dark surface with its own accent (`#1c2b27`, green-cast). Same move, blue.

### 1.3 Warm neutrals

**The page ground stays `#FBFAF8`.** Not a style choice: both processed portraits have that exact value baked into their backgrounds (verified, corner pixels read `(251, 250, 248)`). Moving to pure white would put a visible off-white rectangle behind each provider. Changing it means re-running the matte pipeline, which is documented and cheap but is a real dependency.

| Token | Hex | Notes |
|---|---|---|
| `--np-ground` | `#FBFAF8` | Page ground. Locked to the portrait mattes |
| `--np-surface` | `#FFFFFF` | Cards and panels on the ground |
| `--np-mist` | `#F2F0EA` | **The single tinted band.** Grove's one-mist-section-per-page rule, warmed to match |
| `--np-neutral-700` | `#403D36` | Strong body text |
| `--np-neutral-600` | `#5C584F` | Body text, helper text |
| `--np-neutral-500` | `#7C776D` | Muted metadata |
| `--np-neutral-300` | `#D3CFC6` | Strong dividers |
| `--np-neutral-200` | `#E7E4DD` | Hairlines and card rings |
| `--np-text` | `#131C2E` | Body and heading text on light |

### 1.4 Retired

| Token | Reason |
|---|---|
| `--np-amber-500` `#E9A93C` | **Retired.** Direct consequence of the monochrome-plus-one law all three references state explicitly. Its jobs (provider credentials, step numerals) move to `--np-blue-600` |
| `--np-amber-100` `#FBEED5` | Retired with it |

### 1.5 Semantic

| Token | Hex |
|---|---|
| `--np-success` | `#2F7D4F` |
| `--np-error` | `#B3261E` |
| `--np-focus` | `#234598` |

### 1.6 Alpha tokens

```css
--np-alpha-ink-04:   rgb(19 28 46 / 0.04);   /* hover tint on light */
--np-alpha-ink-08:   rgb(19 28 46 / 0.08);   /* pressed tint on light */
--np-alpha-ink-12:   rgb(19 28 46 / 0.12);   /* hairline ring on light */
--np-alpha-white-08: rgb(255 255 255 / 0.08); /* hover tint on the field */
--np-alpha-white-14: rgb(255 255 255 / 0.14); /* hairline ring on the field */
```

### 1.7 Verified contrast

| Pair | Ratio | Verdict |
|---|---|---|
| White on `--np-field` `#0C1424` | **18.4:1** | AAA |
| `--np-blue-300` on `--np-field` | **8.4:1** | AAA. On-field links safe |
| `--np-text` on `--np-ground` | **16.3:1** | AAA |
| `--np-blue-600` on `--np-ground` | **8.5:1** | AAA body |
| White on `--np-blue-600` | **8.8:1** | AAA. **This is why blue may be a fill here** while Grove's green may not be theirs |
| `--np-blue-600` on `--np-mist` | **7.8:1** | AAA |
| `--np-text` on `--np-mist` | **14.9:1** | AAA |
| `--np-blue-600` on `--np-field` | **2.1:1** | **FAILS. Never the pure accent on the field — use `--np-blue-300`** |

---

## 2. Typography

### 2.1 Families — proposed change

| Role | v1 | v2 proposal | Source | Licence |
|---|---|---|---|---|
| Display | Cabinet Grotesk | **Newsreader** | Google Fonts, self-hosted | SIL OFL |
| Body and UI | Switzer | **Switzer** (unchanged) | Fontshare | ITF FFL |

Still two families. Newsreader takes over Cabinet Grotesk's job rather than joining it. Variable, with a real optical-size axis so it holds at both 72px and 20px; screen-first rather than a print revival; not Grove's own Libre Caslon, so this is a shared idea rather than a clone; and not `Fraunces` or `Instrument_Serif`, the two serifs the taste discipline bans as reflex choices.

**Fallback, one line:** keep Cabinet Grotesk, drop the serif. No other decision in v2 depends on this.

### 2.2 Scale

Display weight drops to **400**. Superpower's whisper-weight transfers here *because the typeface changed*: a high-contrast serif at 400 carries presence through stroke contrast that Cabinet Grotesk at 400 would not. Tracking tightens as size grows; body sits near zero.

| Token | Size | Line height | Tracking | Weight | Family | Use |
|---|---|---|---|---|---|---|
| `display-xl` | `clamp(2.75rem, 6.5vw, 4.75rem)` | `1.0` | `-0.022em` | **400** | Newsreader | Hero headline only |
| `display-l` | `clamp(2rem, 4vw, 3rem)` | `1.08` | `-0.018em` | **400** | Newsreader | Section headlines |
| `h2` | `clamp(1.625rem, 2.6vw, 2.25rem)` | `1.15` | `-0.015em` | 400 | Newsreader | Section headings |
| `h3` | `1.3125rem` | `1.25` | `-0.01em` | 500 | Switzer | Card and block headings |
| `label` | `0.75rem` | `1.4` | `+0.1em` | 500 | Switzer | **Small-caps labels, uppercase.** Grove's clinical-report tone. Counts against the eyebrow budget |
| `body-l` | `1.125rem` | `1.55` | `-0.005em` | 400 | Switzer | Hero subtext, intros |
| `body` | `1rem` | `1.6` | `0` | 400 | Switzer | Default. Max measure `62ch` |
| `small` | `0.875rem` | `1.5` | `0` | 400 | Switzer | Meta, helper text |
| `caption` | `0.8125rem` | `1.45` | `+0.005em` | 500 | Switzer | Credential lines |

Sizes in `rem` so layout scales with the user's text-size preference.

**Eyebrow budget:** `label` is an eyebrow. Seven sections allows `ceil(7/3)` = **2**. At most two sections carry one.

---

## 3. Spacing and layout

4px base, unchanged from v1.

| Token | Value |
|---|---|
| `--sp-1` … `--sp-4` | `4 / 8 / 12 / 16px` |
| `--sp-6` … `--sp-8` | `24 / 32px` |
| `--sp-12` … `--sp-16` | `48 / 64px` |
| `--sp-20` … `--sp-32` | `80 / 96 / 128px` |

- **Container:** `1200px`, matching all three references exactly.
- **Section padding:** `80px` mobile, `112–128px` desktop. All three sit at 75–80px gaps; this runs slightly more generous because `VISUAL_DENSITY` is 3.
- **Text measure:** `62ch` body, `46ch` hero subtext. Grove caps at ~520px and is right to.

---

## 4. Radius — the 8 / 20 / pill system

Three steps. Nothing between them. Grove explicitly forbids **14–18px**, which is exactly where v1's 14px cards sit.

| Element | Token | Value |
|---|---|---|
| Buttons, tags, pills, nav capsule | `--r-pill` | `999px` |
| Cards, panels, media, **portraits** | `--r-card` | `20px` |
| Inputs, selects, small chips | `--r-input` | `8px` |
| Dividers, hairlines | `--r-none` | `0` |

Change from v1: cards move 14 → 20px and **unify with media**, so portraits and panels finally share one shape. v1 had them at 14 and 20 with no stated reason.

The arch mask stays **deferred**. Unchanged: the portraits have no headroom.

---

## 5. Elevation — halos, not shadows

Drop shadows are retired. Grove's language: a component that needs separation gets a ring, not a blur.

```css
/* Default: nothing. Most surfaces need no elevation at all. */
--elev-none: none;

/* Hairline ring. The workhorse — replaces every card shadow in v1. */
--elev-ring: inset 0 0 0 1px var(--np-alpha-ink-08);

/* Halo. For the few surfaces that must float, e.g. the nav capsule. */
--elev-halo: 0 0 0 1px rgb(19 28 46 / 0.06), 0 1px 2px rgb(19 28 46 / 0.04);

/* Inset highlight on filled buttons. Grove's signature: what makes a
   filled button read as an object rather than a rectangle. */
--elev-inset: inset 0 1px 0 rgb(255 255 255 / 0.15);

/* On the ink field. */
--elev-ring-field: inset 0 0 0 1px var(--np-alpha-white-14);
```

Nothing in the system exceeds **2px offset at 6% opacity**. v1's `--shadow-np-lift` and `--shadow-np-card` are both superseded.

---

## 6. Motion

`MOTION_INTENSITY: 5`, one step above v1. The inventory grows by exactly two entries: a hero entrance and a nav material transition.

### 6.1 Easing

```css
--ease-out:    cubic-bezier(0.16, 1, 0.3, 1);      /* everything entering */
--ease-in-out: cubic-bezier(0.45, 0, 0.55, 1);     /* on-screen A to B */
```

### 6.2 Duration

```css
--dur-instant: 100ms;  /* press feedback */
--dur-fast:    180ms;  /* hover */
--dur-base:    320ms;  /* accordion, disclosure */
--dur-reveal:  600ms;  /* scroll reveal */
--dur-hero:    800ms;  /* hero entrance, once, on load */
```

### 6.3 Springs

Critically damped. Nothing overshoots: there is still no momentum-driven interaction anywhere in this brief.

```js
const springDefault = { type: 'spring', bounce: 0, duration: 0.4 };
const springSheet   = { type: 'spring', bounce: 0, duration: 0.3 };
```

### 6.4 The permitted inventory

| Pattern | Where | Notes |
|---|---|---|
| **Scroll reveal** | All sections | 16px travel, 60ms stagger, cap 6 |
| **Hover effect** | Buttons, cards, links | Under 180ms |
| **Press feedback** | All buttons | `scale(0.98)`, 100ms |
| **Accordion** | FAQ | 320ms height |
| **Hero entrance** | Hero only, on load | **New.** Serif headline fades up 20px over 800ms, subhead and CTAs stagger behind. Once, never on scroll-back |
| **Material transition** | Nav capsule | **New.** Backdrop blur and background opacity shift as the field scrolls past. Per the Apple materials guidance: a translucent layer with content moving beneath, not an opaque strip |

No parallax, no pinned sections, no marquee, no scroll hijack, no scroll cues.

### 6.5 Reduced motion

Mandatory. Every reveal collapses to opacity, every transform is dropped, the hero entrance becomes a plain fade, and the nav goes to a solid background with no blur transition. Gate with `useReducedMotion()` and the global `@media (prefers-reduced-motion: reduce)` block already in place.

---

## 7. Component notes

- **Primary button:** `--np-blue-600` fill, white text (8.8:1), pill, `--elev-inset`. The only filled colour surface in the system.
- **Secondary button:** transparent, 1px `--np-alpha-ink-12` ring, `--np-blue-600` text, pill. Grove's canonical pair.
- **Nav capsule:** `--np-field-lift` at reduced opacity with `backdrop-filter`, pill radius, `--elev-halo`, desktop only. Collapses to a conventional sticky bar below `lg`.
- **Provider portrait:** `--r-card` (20px), no shadow, no ring — the matte background already meets the page ground.
- **Payer wall:** unchanged from what ships. It already follows the reference discipline and does not need rebuilding.
- **Small-caps label:** `label` token, `--np-blue-600`, uppercase, `+0.1em`. Maximum two on the page.
- **Crisis panel:** `--np-surface`, `--elev-ring`, 2px left rule in `--np-blue-600`. Calm, never an alarm banner.

---

## 8. Decisions still open

Listed in [`design-synthesis-v2.md`](design-synthesis-v2.md) Part 8. The two with the widest blast radius:

1. **Serif or not.** Newsreader proposed; Cabinet Grotesk is a one-line fallback and nothing else depends on it.
2. **Dark hero or not.** If dropped, `--np-field` goes unused and the hero reverts to a light split. Every other token here survives unchanged.
