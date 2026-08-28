# Brand Assets Manifest

## Important limitation — read before using this folder
All of this site's images are served from Duda's CDN (`le-cdn.website-editor.net`) behind **signed, expiring CloudFront URLs** (the actual `<img>`/`og:image` URLs carry `?Expire=...&Key-Pair-Id=...&Signature=...` query parameters). Two independent attempts to pull the original files into this repo were blocked:
1. Direct HTTP fetch (both from a server-side tool and from in-page `fetch()`) fails with CORS ("Failed to fetch") or, when the signed query string is stripped, an explicit CloudFront `MissingKey` error.
2. Loading the image into a `<canvas>` for re-export fails because the CDN does not send permissive CORS headers, so the canvas is "tainted" and cannot be read back out.

**No image files could be saved into this folder as a result** — this `assets/` folder contains only this manifest, no binary files. A zoomed screenshot of the rendered logo was viewed directly in-browser during the crawl (so the description below is based on firsthand observation, not guesswork), but the cloud research environment used for this crawl has no file-write access back from the browser tool, so that capture could not be saved as a file here either. What follows is a complete inventory of every image URL and where each is used, based on the description above. For the rebuild, the original logo file (ideally vector/AI or a high-res PNG with transparency) and any real photography should be **requested directly from the client**, or exported directly from the IONOS/Duda site editor (which the client can access and which is not subject to the same CDN-signing restriction from the inside).

## Logo
- **No file saved in this repo** — see limitation above.
- **Live URLs seen (signed, will expire — for reference only):**
  - `https://le-cdn.website-editor.net/s/380d444799884e178928620e14dcda43/dms3rep/multi/opt/New+Point+healthcare+Services+LLC-logo-1920w.jpg` — used in the header
  - `https://le-cdn.website-editor.net/s/380d444799884e178928620e14dcda43/dms3rep/multi/opt/New+Point+healthcare+Services+LLC-logo+(1)-1920w.jpg` — a second, separately-uploaded copy of the same logo used as the `og:image`/`twitter:image` social-share image on all 3 pages
- **Design description (from the reference capture):** a blue medical-cross icon with a stylized white human figure inside it (rendered as a gradient from lighter to darker blue, roughly top-left to bottom-right), paired with the wordmark "NEWPOINT HEALTHCARE SERVICES, LLC" in bold blue sans-serif, and the tagline "Your Health is our Priority" beneath it in a lighter blue italic/script-style font.

## Other images in use (all decorative/stock background images, none downloadable — see limitation above)
| Filename (as hosted) | Used as | Notes |
|---|---|---|
| `New_Point_healthcare_Services_LLC-023-1920w.jpg` | Homepage hero background | Photo of a person in silhouette/backlight walking through a sunlit field, arms outstretched, face not visible. Generic stock-style wellness imagery, not a photo of the practice or its providers. |
| `point-48585ce8-1920w.jpg` | Background image, homepage content section | Filename gives no indication of content; not independently verified visually beyond its use as a section background. |
| `Picture1-1920w.jpg` | Background image, homepage (near a provider bio section) | Filename `Picture1` is a default paste/screenshot name — strong indicator this is placeholder/unedited stock art, not a real photo of the provider. |
| `ujuuu-1920w.jpg` | Background image, homepage (near a provider bio section) | Filename appears to be random/unedited upload naming. |
| `pointttt-1920w.jpg` | Background image, homepage content section | Filename appears to be random/unedited upload naming. |
| `dd-cdn.multiscreensite.com/1und1/1und1-logo4.png` | "IONOS" platform-attribution badge in the bottom content block | Not client brand content — this is the website-builder's own badge and should not be carried into the rebuild. |

**No photos of either provider, no office photos, and no team/group photos exist anywhere on the current site.** See `people-trust.md` for the trust-signal implications.

## Colors (hex, extracted from live computed CSS — not from a style guide, since none exists)
| Swatch | RGB (as computed) | Hex | Where used |
|---|---|---|---|
| Primary blue | rgb(35, 69, 152) | `#234598` | Button backgrounds, section background bands (e.g., behind the H1 hero text) |
| Accent / hover blue | rgb(31, 157, 214) | `#1F9DD6` | Link color, "Call Us" header button, button hover state |
| White | rgb(255, 255, 255) | `#FFFFFF` | Header background, button/heading text on dark backgrounds |
| Near-black | rgb(17, 17, 17) | `#111111` | Header nav text |
| Body background | rgb(238, 238, 238) | `#EEEEEE` | Page background (light gray, not pure white) |
| Body text | rgb(0, 0, 0) | `#000000` | Default paragraph text |

*(Button border/hover tokens found in the site's own CSS custom properties confirm the same two blues: `--btn-bg-color: rgba(35,69,152,1)` and `--btn-hover-bg: rgba(31,157,214,1)`.)*

## Fonts (as loaded via Google Fonts through the Duda CDN proxy — no local/self-hosted fonts)
| Role | Font family (computed) |
|---|---|
| Body text | "Source Sans Pro" |
| Headings (H1 confirmed) | Inter |
| Buttons / CTAs | Lato |

Three different typefaces across body/headings/buttons is more than a typical brand system uses — worth deciding in the rebuild whether to consolidate to 1–2 families for consistency, or confirm this 3-font mix is intentional.

## Recommended next step
Request from the client: the original logo file (vector preferred), any existing brand/style guide, and real photography (provider headshots at minimum). Everything else in this manifest (colors, fonts, image usage) is safe to carry forward as-observed.
