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

| File | Width | Size | Covers |
|---|---|---|---|
| `services-consult-1536.webp` | 1536 | 95 KB | 390 (image renders 756 CSS px wide, 2x = 1512) |
| `services-consult-2048.webp` | 2048 | 162 KB | 1024 (1024 CSS px, 2x = 2048) and 768 (1101 CSS px, 2x = 2202) |
| `services-consult-2752.webp` | 2752 | 308 KB | 1440 (1440 CSS px, 2x would be 2880 — the master's 2752 is the ceiling) |

All three are under the 450 KB budget. `2752` is the one referenced in the page;
`sizes="100vw"` is accurate because the hero is full-bleed, and Next's image
optimiser generates the intermediate widths from it. The smaller two are
committed for the same reason `public/images/hero/` carries its ladder — so the
resize is reproducible without the master, which does not ship.

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
