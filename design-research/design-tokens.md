# Newpoint Design Tokens (proposed v1)

A real starting point for the build to consume, not a mood board. Structured as semantic numbered ramps with alpha variants, following the Vercel pattern documented in [`sites/vercel.md`](sites/vercel.md).

**Status:** proposed. Palette derives from the practice's existing brand equity (`#234598`, confirmed in the live site's own CSS custom properties per [`research/assets/manifest.md`](../research/assets/manifest.md)). Type pairing is a recommendation open to client input.

All contrast ratios below were **calculated, not estimated**, using the WCAG relative-luminance formula.

---

## 1. Color

### 1.1 Brand

| Token | Hex | Notes |
|---|---|---|
| `--np-blue-900` | `#101F45` | Deepest brand blue, rare |
| `--np-blue-700` | `#1B3576` | Hover and pressed state for primary |
| `--np-blue-600` | `#234598` | **Preserved brand primary.** Do not alter. Primary CTA, links, logo lockup |
| `--np-blue-500` | `#3D62B8` | Lighter interactive, borders on tint |
| `--np-blue-300` | `#8FB0EE` | **On-ink use only.** Links and CTAs inside the dark section |
| `--np-blue-100` | `#E3EAF8` | Tint wash, selected states |
| `--np-blue-50` | `#F1F5FC` | Faintest wash, table stripes |

`#1F9DD6`, the current site's cyan accent, is **retired**. It is the element most responsible for the generic-medical read.

### 1.2 Ink and warm neutrals

The neutral ramp is warm (yellow-shifted), not cool grey. This is where the category's warmth comes from in this system, replacing the cream ground that five peers share.

| Token | Hex | Notes |
|---|---|---|
| `--np-ink` | `#131C2E` | Near-black navy. Body text, and the single dark anchor section |
| `--np-neutral-900` | `#2A2822` | Warm near-black, secondary headings |
| `--np-neutral-700` | `#403D36` | Strong body text on light |
| `--np-neutral-600` | `#5C584F` | Body text |
| `--np-neutral-500` | `#7C776D` | Muted text, captions |
| `--np-neutral-400` | `#A8A399` | Placeholder text, disabled |
| `--np-neutral-300` | `#D3CFC6` | Strong dividers |
| `--np-neutral-200` | `#E7E4DD` | **Hairline dividers and card borders** |
| `--np-neutral-100` | `#F4F2ED` | Alternate section ground |
| `--np-neutral-50` | `#FBFAF8` | **Page ground.** Warm white |
| `--np-surface` | `#FFFFFF` | Cards and elevated surfaces |

### 1.3 Accent

| Token | Hex | Notes |
|---|---|---|
| `--np-amber-500` | `#E9A93C` | The single accent. Small non-text surfaces only |
| `--np-amber-100` | `#FBEED5` | Tint wash |

**Hard rule, verified by calculation:** amber on the light ground measures **1.97:1** and fails WCAG at every size. It must never carry text on `--np-neutral-50`. On `--np-ink` it measures **8.28:1** and is safe. Use it for active indicators, rule markers, and icon fills, never for body or link text on light.

### 1.4 Semantic

| Token | Hex | Notes |
|---|---|---|
| `--np-success` | `#2F7D4F` | Form success |
| `--np-error` | `#B3261E` | Form error text, passes AA on light |
| `--np-focus` | `#234598` | Focus ring, 2px offset 2px |

### 1.5 Alpha tokens

So hover and border states composite correctly over white, warm white, and ink without a second set of tokens:

```css
--np-alpha-ink-04: rgb(19 28 46 / 0.04);   /* hover tint on light */
--np-alpha-ink-08: rgb(19 28 46 / 0.08);   /* pressed tint on light */
--np-alpha-ink-12: rgb(19 28 46 / 0.12);   /* border on light */
--np-alpha-white-08: rgb(255 255 255 / 0.08);  /* hover tint on ink */
--np-alpha-white-14: rgb(255 255 255 / 0.14);  /* border on ink */
```

### 1.6 Verified contrast

| Pair | Ratio | Verdict |
|---|---|---|
| `--np-ink` on `--np-neutral-50` | **16.3:1** | AAA |
| `--np-blue-600` on `--np-neutral-50` | **8.5:1** | AAA body |
| White on `--np-blue-600` | **8.8:1** | AAA. Primary CTA is safe |
| White on `--np-ink` | **17.0:1** | AAA |
| `--np-blue-300` on `--np-ink` | **7.8:1** | AAA. On-ink links safe |
| `--np-amber-500` on `--np-ink` | **8.3:1** | AAA |
| `--np-amber-500` on `--np-neutral-50` | **2.0:1** | **FAILS. Never text on light** |
| `--np-blue-600` on `--np-ink` | **1.9:1** | **FAILS. Use `--np-blue-300` on ink** |

---

## 2. Typography

### 2.1 Families

| Role | Family | Source | Licence |
|---|---|---|---|
| Display | **Cabinet Grotesk** | Fontshare | Free for commercial use |
| Body and UI | **Switzer** | Fontshare | Free for commercial use |

Two families, replacing the three unrelated families on the current site (Source Sans Pro, Inter, Lato). Both self-hosted via `next/font/local` with `font-display: swap`. Never linked from Google Fonts in production.

Cabinet Grotesk is a deliberate refusal of the category's serif-display convention (four of seven peers). Switzer is a warm-neutral workhorse chosen over Inter, which the taste discipline discourages as a default.

### 2.2 Scale

Tracking tightens as size increases and body sits near zero, per the Apple type discipline. Sizes are fluid where they need to be.

| Token | Size | Line height | Tracking | Weight | Use |
|---|---|---|---|---|---|
| `display-xl` | `clamp(2.75rem, 6vw, 4.5rem)` | `1.02` | `-0.03em` | 600 | Hero headline only |
| `display-l` | `clamp(2.25rem, 4.5vw, 3.25rem)` | `1.06` | `-0.025em` | 600 | Section headline on ink |
| `h2` | `clamp(1.75rem, 3vw, 2.5rem)` | `1.1` | `-0.02em` | 600 | Section headings |
| `h3` | `1.375rem` | `1.2` | `-0.01em` | 550 | Card and block headings |
| `body-l` | `1.125rem` | `1.6` | `0` | 400 | Hero subtext, intro paragraphs |
| `body` | `1rem` | `1.65` | `0` | 400 | Default. Max measure `65ch` |
| `small` | `0.875rem` | `1.5` | `0.005em` | 400 | Meta, form helper text |
| `caption` | `0.8125rem` | `1.45` | `0.01em` | 500 | Credential lines, captions |

Scale in `rem` so the layout grows with the user's text-size preference.

---

## 3. Spacing

4px base unit.

| Token | Value |
|---|---|
| `--sp-1` | `4px` |
| `--sp-2` | `8px` |
| `--sp-3` | `12px` |
| `--sp-4` | `16px` |
| `--sp-6` | `24px` |
| `--sp-8` | `32px` |
| `--sp-12` | `48px` |
| `--sp-16` | `64px` |
| `--sp-24` | `96px` |
| `--sp-32` | `128px` |
| `--sp-40` | `160px` |

**Section padding:** `--sp-24` (96px) mobile, `--sp-32` to `--sp-40` (128 to 160px) desktop. At `VISUAL_DENSITY: 3` the page should breathe heavily.
**Container:** `max-width: 1200px`, `padding-inline: --sp-4` mobile, `--sp-8` desktop.
**Text measure:** `65ch` maximum on body copy.

---

## 4. Radius

One documented rule, applied everywhere. Mixed systems are only legitimate when the rule is explicit, so here it is:

| Element | Token | Value |
|---|---|---|
| Primary and secondary buttons | `--r-pill` | `999px` |
| Cards and panels | `--r-card` | `14px` |
| Inputs and selects | `--r-input` | `10px` |
| Media and portraits | `--r-media` | `20px` |
| Tags and small chips | `--r-chip` | `6px` |
| Dividers and hairlines | `--r-none` | `0` |

**Portrait treatment:** provider portraits in section 3 use `--r-media` (20px rounded rectangle), the same token as all other media. No special shape.

> **Deferred: the arch mask.** The original proposal was an arch borrowed from Cerebral, `border-radius: 100% 100% 20px 20px`, as the one characterful shape in the system. It is **not viable with the supplied photos**: the arch needs clear space above the head for the dome to read, and neither portrait has headroom (both crop into the hair at the top edge). Cropping can only remove that space, never add it. See [`assets/providers/README.md`](assets/providers/README.md).
>
> **This idea is deferred, not discarded.** If better originals or a reshoot arrive at 2000px or more on the longest edge with headroom above the head, revisit the arch mask together with the hero-scale treatment in [`design-synthesis.md`](design-synthesis.md) Part 4. It remains the strongest available route to a distinctive shape in this system.

---

## 5. Shadow

Shadows are tinted to the ink navy, never pure black, and stay ultra-diffuse. At this density most grouping should be done with hairlines and space rather than elevation.

```css
--shadow-none: none;                                        /* the default */
--shadow-sm: 0 1px 2px rgb(19 28 46 / 0.04);                /* rare */
--shadow-card: 0 2px 8px rgb(19 28 46 / 0.05);              /* card hover only */
--shadow-lift: 0 12px 32px -8px rgb(19 28 46 / 0.10);       /* portraits, modals */
--shadow-ring: inset 0 0 0 1px var(--np-alpha-ink-12);      /* preferred over a border */
```

---

## 6. Motion

`MOTION_INTENSITY: 4`. The complete inventory is scroll reveal, hover effect, press feedback, and accordion collapse. No parallax, no pinned sections, no marquee, no scroll hijack.

### 6.1 Easing

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);      /* default for everything entering */
--ease-in-out: cubic-bezier(0.45, 0, 0.55, 1);  /* on-screen A to B moves */
```

### 6.2 Duration

```css
--dur-instant: 100ms;  /* press feedback */
--dur-fast: 180ms;     /* hover states */
--dur-base: 320ms;     /* accordion, disclosure */
--dur-reveal: 600ms;   /* scroll reveal */
```

### 6.3 Springs

Following the Apple damping-and-response model. Critically damped by default: there is no momentum-driven interaction anywhere in this brief, so **nothing on this site should overshoot**.

```js
// Motion (motion/react)
const springDefault = { type: 'spring', bounce: 0, duration: 0.4 };  // damping 1.0, response 0.4
const springSheet   = { type: 'spring', bounce: 0, duration: 0.3 };  // mobile nav, disclosure
```

### 6.4 Scroll reveal

Short travel distance. Long slides read as sluggish and, for an anxious audience, as friction.

```js
initial={{ opacity: 0, y: 16 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true, amount: 0.3 }}
transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
```

Stagger delay `60ms` per item, capped at six items before the cascade stops adding value.

### 6.5 Reduced motion

Mandatory at this intensity. Every reveal collapses to a plain opacity cross-fade, every transform is dropped.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

In Motion, gate with `useReducedMotion()` and pass `initial={false}`.

---

## 7. Implementation notes

- **Rendering:** static or server rendering for all indexable content. No client-only marketing pages, which is the mistake [`sites/cerebral.md`](sites/cerebral.md) documents.
- **Theme:** light only for v1. The page theme is locked; the ink provider section is a deliberate single color-block moment, not a theme flip, and it appears exactly once.
- **Icons:** one family, Phosphor, at a standardized `1.5` stroke weight. No hand-rolled SVG icon paths.
- **Insurer logos:** real SVG marks, no text wordmarks, no category labels beneath them.
- **Focus:** every interactive element ships a visible focus ring using `--np-focus` at 2px with 2px offset.
- **Fonts:** self-host both families, subset to Latin, `font-display: swap`, preload the display weight used above the fold.

### 7.1 Provider portrait constraint (provisional)

The two supplied portraits are square, EXIF-stripped, and re-compressed, carrying the signature of transfer through a messaging app: **1346 x 1343** (Funmilayo Whitaker) and **1137 x 1138** (Anastasia Ofoegbu). The smaller file sets the ceiling for the pair at roughly **560px displayed at 2x**.

Consequences for the build, all provisional:

| | |
|---|---|
| Render size | Cap provider portraits at **560px** displayed. Do not upscale. |
| Shape | `--r-media` (20px). The arch mask is deferred, see section 4. |
| Aspect | Square, `1:1`. Both files match closely enough (1.002:1 and 0.999:1) to share one crop template. |
| Preprocessing | Backgrounds and colour temperature differ between the two and must be normalized before use. |
| Format | Convert to AVIF with WebP fallback at build time. Serve at `1x` and `2x` only; there is not enough source pixel data for `3x`. |

**Upgrade path:** if originals at 2000px or more with headroom arrive, lift the render cap, restore the arch mask, and revisit the hero-scale treatment.

---

## 8. Open decisions

1. **Type pairing** is a recommendation. If the client has a brand guide, per the redesign protocol it wins over this proposal.
2. **The logo is not redesigned.** The existing mark (blue medical cross with a white human figure, plus the "Your Health is our Priority" tagline) carries forward unchanged until the client explicitly asks otherwise. The original vector file is still an open request.
3. **`--np-amber-500` is the one accent.** If the client's brand guide names a different secondary, replace it globally rather than adding a second accent.
