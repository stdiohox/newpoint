# Provider portraits

Working assets for the ink-navy provider section defined in [`design-synthesis.md`](../../design-synthesis.md) (section 3 of the recommended homepage order).

**Received as-is. Nothing has been edited, cropped, retouched, or upscaled.** Cropping happens once the section layout is locked.

`source/` holds the untouched originals exactly as supplied, under their original filenames. The files at this level are renamed copies for the build.

## Status

| Provider | File | Status |
|---|---|---|
| Funmilayo Whitaker | `funmilayo-whitaker.jpeg` | Received |
| Anastasia Ofoegbu | `anastasia-ofoegbu.jpeg` | Received |

Both portraits are now present. The pair is usable at medium card scale with work; see the pair assessment below for what it cannot do.

## Technical report

| Property | Funmilayo Whitaker | Anastasia Ofoegbu |
|---|---|---|
| Resolution | 1346 x 1343 px | 1137 x 1138 px |
| Aspect ratio | 1.002:1 (square) | 0.999:1 (square) |
| File size | 758 KB (758,542 bytes) | 665 KB (665,219 bytes) |
| Format | JPEG, JFIF 1.01, baseline, 8-bit RGB | JPEG, JFIF 1.01, baseline, 8-bit RGB |
| Density | 72 dpi | 72 dpi |
| EXIF | Stripped | Stripped |

## Pair assessment

### What works

1. **Aspect ratios effectively match.** 1.002:1 against 0.999:1. Square is a viable shared target and needs no reconciliation.
2. **Both subjects wear navy.** Coincidental, but it reads as deliberate against the ink section and helps the pair cohere.
3. **Both are frontal, centered, and similarly scaled** within their frames, so a shared crop template is achievable.

### What needs fixing before build

1. **Backgrounds do not match.** Funmilayo sits against a plain warm grey wall, clean apart from a faint wall edge at far left. Anastasia sits against a brighter white interior with a window or door frame down the left edge and a picture-frame corner intruding top-left. Different in both tone and tidiness. Either normalize both to a single flat backdrop or cut both out onto the ink ground.
2. **Colour temperature differs.** Funmilayo is warmer and slightly darker overall; Anastasia is cooler and brighter. Needs matching in grade, or the two will look shot in different buildings, which they were.
3. **Neither has headroom.** Both crop into the hair at the top edge. The arch mask specified in the tokens (`border-radius: 100% 100% 20px 20px`) needs clear space above the head to read, and that space cannot be added by cropping. **The arch treatment is not viable with these files.** Fall back to `--r-media` (20px) rounded rectangles, or cut-outs on the ink ground.
4. **Resolution ceiling is set by the smaller file: ~560px displayed at 2x.** Fine for a medium card. Short for the hero-scale focal moment the synthesis describes. The section should be designed down to card scale, not up.
5. **Both are phone selfies, not portraiture.** Selfie-range camera distance, flat frontal light, blown highlights on forehead and nose, visible smoothing on Anastasia's. Camera angle differs: slightly above eye level for Anastasia, at or just below for Funmilayo.
6. **Expressions differ in register.** Funmilayo is smiling openly with teeth; Anastasia has a closed-mouth soft smile. Minor alone, visible when the two sit side by side.
7. **EXIF stripped and re-compressed on both**, consistent with transfer through a messaging app. If the original camera files still exist they will be materially better and are worth asking for.

## Recommendation

**Preferred:** commission one session for both providers. Same room, same light, same lens distance, same background, framed mid-chest with clear headroom, delivered at 2000px or more on the longest edge. Everything in the "needs fixing" list disappears at once, and the section gets back its arch treatment and hero scale.

**If a re-shoot is not possible,** these two are workable with:
- background replacement or cut-out onto the ink ground, applied identically to both
- a colour grade matching temperature and exposure across the pair
- a shared square crop template
- section designed at medium card scale, arch mask dropped for `--r-media`

Ask for the original camera files first either way. They cost nothing to request and may remove the compression problem outright.
