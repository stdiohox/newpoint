# Provider portraits

Working assets for the ink-navy provider section defined in [`design-synthesis.md`](../../design-synthesis.md) (section 3 of the recommended homepage order).

**Received as-is. Nothing has been edited, cropped, retouched, or upscaled.** Cropping happens once the section layout is locked.

`source/` holds the untouched original exactly as supplied, under its original filename. The files at this level are renamed copies for the build.

## Status

| Provider | File | Status |
|---|---|---|
| Anastasia Ofoegbu | `anastasia-ofoegbu.jpeg` | Received. See assessment below |
| Funmilayo Whitaker | — | **NOT RECEIVED** |

The section cannot be built until both portraits exist, because it depends on consistent treatment across the pair.

## anastasia-ofoegbu.jpeg

| Property | Value |
|---|---|
| Resolution | 1137 x 1138 px |
| Aspect ratio | 0.999:1 (square) |
| File size | 665 KB (665,219 bytes) |
| Format | JPEG, JFIF 1.01, baseline, 8-bit, 3-channel RGB |
| Density | 72 dpi |
| EXIF | Fully stripped (no camera make, model, or capture date) |

### Assessment against the ink-navy anchor section

Blocking or near-blocking:

1. **Crop has no headroom.** Hair is cut off at the top edge and the frame ends at the collarbone. The arch mask specified in the tokens (`border-radius: 100% 100% 20px 20px`) needs clear space above the head for the dome to read. That space cannot be added by cropping, only removed.
2. **Resolution ceiling is about 560px displayed.** At 1138px on the longest edge the image supports roughly 560px at 2x. The synthesis treats these portraits as the page's focal moment, which implies a larger render. Fine for a medium card, short for a hero-scale portrait.
3. **Snapshot rather than portraiture.** Selfie-range camera distance, slightly above eye level, flat frontal light, visible skin-smoothing, blown highlights on forehead and nose. The reference standard in the peer set (Two Chairs, Rula) is consistent professional portraiture.
4. **Background is a domestic or office interior**, not neutral. A window or door frame runs down the left edge and a picture-frame corner appears top-left. Busy at the edges and hard to match in a second photo.
5. **EXIF fully stripped and re-compressed**, consistent with the file having passed through a messaging app. The original camera file will be higher quality if it still exists.

Non-blocking:

6. Square aspect is workable and is a reasonable target ratio for both, but it must be matched by the second portrait.
7. The navy top happens to sit well against the ink section, though this is coincidence and not a reason to keep the shot.

### Recommendation

Commission or re-shoot both providers together in one session: same room, same light, same lens distance, same background, framed mid-chest with clear headroom, delivered at 2000px or more on the longest edge. That is the only way the pair reads as one practice rather than two files.

If a re-shoot is not possible, the fallback is to design the section for a smaller, evenly-cropped pair and drop the arch mask, which costs the section its distinctiveness.
