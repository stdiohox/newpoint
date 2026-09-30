# /services hero

Source art for the `/services` hub hero. The master is git-ignored by the
`design-research/assets/` rule in `.gitignore`; this README is the exception
that keeps the folder explaining itself.

| | |
|---|---|
| **Master** | `services-hero.jpg` — 2752 x 1536, JPEG baseline 8-bit RGB, 300 dpi, 2.41 MB |
| **Aspect** | 1.792:1 (16:9) |
| **Arrived as** | `services-hero.jpg` in the repo root, moved here untouched |
| **Ships as** | `public/images/services/services-consult-{1536,2048,2752}.webp` |

Nothing has been retouched, graded, or cropped. The webp derivatives are plain
width resizes of this file at quality 90 — the crop is done at render time by
`object-cover`, not baked in, because the hero is full-bleed and the visible
window changes shape with the viewport.

## The frame

A seated patient in a consulting room, three-quarters to camera, with the
clinician's back and shoulder in the near foreground at the right edge. Soft
daylight from a window on the left.

Measured positions, as fractions of the full frame — these are what
`app/services/page.tsx` sets `object-position` from, and the numbers to redo
if the master is ever replaced:

| Feature | x | y |
|---|---|---|
| Patient, full figure | 52% – 80% | 15% – 100% |
| Her face | 63% – 74% | 18% – 40% |
| Top of her hair | — | 15% |
| Blown window (brightest pixels in the frame) | 5% – 30% | 5% – 38% |
| Foreground clinician | 84% – 100% | 0% – 100% |

The blown window is the reason the crop is pushed right rather than centred.
It is the only part of the frame that cannot carry white text, and at the two
narrow breakpoints `object-position: 70%` crops it out of the picture entirely.

## Derivatives

**Only `services-consult-2752.webp` is served.** It is the `src` in
`app/services/page.tsx`, and Next's image optimiser resizes it to the width the
browser asks for, re-encoding at its own quality. Nothing references the other
two, so the widths below are what the resize ladder was sized *against*, not
files any visitor downloads.

| File | Width | On disk | Role |
|---|---|---|---|
| `services-consult-1536.webp` | 1536 | 95 KB | Not served. Reproducible derivative, kept so the ladder survives without the master |
| `services-consult-2048.webp` | 2048 | 162 KB | Not served. Same |
| `services-consult-2752.webp` | 2752 | 308 KB | **The one in use.** The optimiser's source for every width |

All three are under the 450 KB budget, though only the 308 KB one is on any
critical path — and even that is never sent whole at 2752 unless the browser
asks for it.

The widths that matter are set by the *drawn* image, not the viewport, because
`object-cover` scales by height once the hero is narrower than 16:9. Measured on
the rendered page:

| Viewport | Hero box | Image drawn | Needed at 2x |
|---|---|---|---|
| 320 | 320 x 668 | 1201 px | 2402 |
| 390 | 390 x 611 | 1098 px | 2196 |
| 768 | 768 x 614 | 1102 px | 2204 |
| 1024 | 1024 x 562 | 1024 px | 2048 |
| 1440 | 1440 x 574 | 1440 px | 2880 (capped at the master's 2752) |

which is why the page sets `sizes="(min-width: 1024px) 100vw, 1200px"` rather
than a plain `100vw`. A plain `100vw` describes the hero box, and below lg the
box is far narrower than the picture drawn into it.

To regenerate:

```sh
node -e "
const sharp = require('sharp');
for (const w of [1536, 2048, 2752]) {
  sharp('design-research/assets/services/services-hero.jpg')
    .resize({ width: w, withoutEnlargement: true })
    .webp({ quality: 90, effort: 6 })
    .toFile('public/images/services/services-consult-' + w + '.webp');
}
"
```
