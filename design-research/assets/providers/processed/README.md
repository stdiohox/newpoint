# Processed provider portraits

Build-ready derivatives for the **card-scale** provider section (section 3, per [`design-synthesis.md`](../../../design-synthesis.md) Part 4).

Originals in [`../`](../) and [`../source/`](../source/) are **untouched**. Everything here is regenerable from them.

## Files

| File | Size | Bytes |
|---|---|---|
| `funmilayo-whitaker-1120.webp` | 1120 x 1120 | 51.8 KB |
| `funmilayo-whitaker-1120.jpg` | 1120 x 1120 | 103.2 KB |
| `funmilayo-whitaker-560.webp` | 560 x 560 | 22.1 KB |
| `funmilayo-whitaker-560.jpg` | 560 x 560 | 37.7 KB |
| `anastasia-ofoegbu-1120.webp` | 1120 x 1120 | 38.5 KB |
| `anastasia-ofoegbu-1120.jpg` | 1120 x 1120 | 86.7 KB |
| `anastasia-ofoegbu-560.webp` | 560 x 560 | 15.5 KB |
| `anastasia-ofoegbu-560.jpg` | 560 x 560 | 31.7 KB |

`560` is the `1x` asset, `1120` the `2x`, matching the 560px display cap in [`design-tokens.md`](../../../design-tokens.md) section 7.1. Serve WebP with JPEG fallback. **No `3x`**: there is not enough source data, and nothing here is upscaled.

## Canonical source

`funmilayo-whitaker.jpeg` is byte-identical to `source/mrs funmi.jpeg` (sha256 `85ec9085…`), and `anastasia-ofoegbu.jpeg` to `source/mrs Anastasia .jpeg` (sha256 `11be7997…`). The renamed copies are canonical for the build; `source/` preserves the originals under their supplied filenames. Nothing has diverged.

## What was done

### 1. Background: flat `#FBFAF8`

Both subjects were segmented with the macOS Vision framework (`VNGenerateForegroundInstanceMaskRequest`, the same subject-lifting engine Photos uses) and composited over flat `--np-neutral-50` `#FBFAF8`. One instance detected per image, hair edges preserved.

Removed: Anastasia's window frame and picture-frame corner; Funmilayo's wall edge.

**Why the light ground rather than ink `#131C2E`:** both subjects have very dark hair, which would merge into the ink background and lose the head silhouette entirely. On the warm white the hair reads crisply, and the portraits become light cards sitting on the ink section, which gives section 3 its contrast and makes the cards read as objects. This is a deliberate deviation from the "cut out onto the ink ground" option floated earlier, driven by what the images actually contain.

Verified: top corners, top edge, and left edge measure exactly `(251, 250, 248)`. Background is flat, maximum deviation 10/255 in the sampled strip, which is JPEG ringing adjacent to hair, not matte error. Bottom corners are legitimately subject: hair and clothing reach the frame edge in both.

### 2. Colour grade, matched to Funmilayo

Funmilayo is the reference and is ungraded. Anastasia was corrected toward her using per-channel gains derived from mean RGB over the Vision-detected face region, inset 15% to sample skin rather than hair or edges.

| | Funmilayo (ref) | Anastasia before | Anastasia after |
|---|---|---|---|
| Face mean RGB | `181.5, 117.9, 93.0` | `205.7, 137.7, 112.2` | `183.4, 121.0, 96.2` |

Gap closed from **24 units** on the red channel to **under 3 units** on all three. Gains applied: `0.900, 0.878, 0.855`, at 85% strength to avoid an over-corrected look, through a LUT with a soft shoulder above 92% luminance so highlights roll off instead of clipping. Zero channels clipped to 255.

### 3. Matched square framing

Both were cropped so the **face occupies the same fraction of the frame**, which aspect-ratio matching alone does not achieve. Face rectangles were measured with Vision.

| | Crop box | Side | Face fraction | Face centre x | Face centre y |
|---|---|---|---|---|---|
| Funmilayo | `(13, 51, 1289, 1327)` | 1276 | 0.610 | 0.500 | 0.578 |
| Anastasia | `(0, 1, 1137, 1138)` | 1137 | 0.610 | 0.515 | 0.579 |

Face fraction `0.610` is set by Anastasia and could not be loosened: her face already fills that much of her full frame, so there is no wider crop available. Funmilayo was cropped tighter to meet her. Her horizontal centre sits 1.5% right of true centre because the crop clamps at the frame edge; this is not visible at card scale.

Headroom remains absent in both, as expected. The arch mask stays deferred.

### 4. Export

Lanczos downsample, JPEG quality 82 progressive and optimized, WebP quality 82 method 6.

## Reproducing

Two small Swift tools (Vision matting, face-rectangle measurement) plus a Python driver were used. They live in the session scratchpad and are not committed, since the outputs are deterministic and the originals are preserved. If regeneration is needed the recipe above is complete: segment with `VNGenerateForegroundInstanceMaskRequest`, composite over `#FBFAF8`, grade to the reference face means, crop to face fraction `0.610` with face centre at `(0.50, 0.578)`, export at 1120 and 560.

## Still true after processing

Processing fixed the backgrounds, the colour mismatch, and the framing. It cannot fix what is not in the files: both remain phone selfies at selfie camera distance with flat frontal light, no headroom, and a 560px ceiling. The single-session reshoot at 2000px or more remains the upgrade path that unlocks the arch mask and hero-scale treatment.
