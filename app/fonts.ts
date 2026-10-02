import localFont from 'next/font/local';

/**
 * Self-hosted per design-tokens.md. Both are variable faces, one file each,
 * so the whole type system runs on two requests and hierarchy comes from
 * weight and scale rather than extra families.
 * Licences: app/fonts/*-LICENSE.txt (ITF Free Font Licence).
 */

export const cabinetGrotesk = localFont({
  src: [{ path: './fonts/CabinetGrotesk-Variable.woff2', weight: '100 900', style: 'normal' }],
  variable: '--font-cabinet-grotesk',
  display: 'swap',
  preload: true,
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

export const switzer = localFont({
  src: [{ path: './fonts/Switzer-Variable.woff2', weight: '100 900', style: 'normal' }],
  variable: '--font-switzer',
  display: 'swap',
  preload: true,
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

/**
 * Scoped to the featured services section only.
 *
 * The site's type system stays Cabinet Grotesk + Switzer. These two are applied
 * through a class on that one section, not on `body`, so nothing else inherits
 * them.
 *
 * NOTE: app/layout.tsx also pulls Inter over a plain <link> for the hero, whose
 * inline `fontFamily: "'Inter', sans-serif"` needs the literal family name that
 * next/font does not produce. That means Inter is still requested twice, and
 * since 2026-10-02 the two requests are no longer the same thing: this one is
 * served from the repo, the hero's is fetched from fonts.googleapis.com by the
 * browser at runtime. Pointing the hero at `var(--font-inter)` and deleting
 * the <link> would remove the duplicate, the last Google Fonts dependency on
 * the site and the standing `no-page-custom-font` lint warning — one line, but
 * it edits the hero, which is out of scope here.
 *
 * THE <link> IS NOT WHAT BROKE THE BUILD. It is a browser request at runtime;
 * the failure below happened in the build, inside next/font's loader.
 */
/**
 * SELF-HOSTED SINCE 2026-10-02, AND THEY WERE `next/font/google` BEFORE IT.
 *
 * WHY. Netlify failed a production build of `main` in next/font's Google
 * loader:
 *
 *   TypeError: Cannot read properties of null (reading '1')
 *   node_modules/next/dist/compiled/@next/font/dist/google/loader.js:122
 *
 * That line is `/\.(woff|woff2|eot|ttf|otf)$/.exec(googleFontFileUrl)[1]`, so
 * the crash means a src URL harvested from the fetched CSS did not end in a
 * font extension — the response Next parsed was not the real Google stylesheet.
 * The line above it already raises a clear "Failed to fetch" when a download
 * returns nothing, so this is the shape-of-response case: an error page, a
 * truncated body, or a proxy or rate-limiter answering instead of Google.
 *
 * IT WAS NEVER A CONFIG ERROR. The two calls were `Outfit({ subsets:
 * ['latin'], weight: ['500','600','700'] })` and `Inter({ subsets: ['latin'],
 * weight: ['400','500','600'] })`. Checked against the live API on
 * 2026-10-02: both families are variable with a 100-900 wght axis, both carry
 * the latin subset, neither call asked for italic, and every `src: url(...)`
 * in both stylesheets ends in `.woff2`. `main` also built clean locally from a
 * fresh `npm ci` at the exact commit Netlify failed on, and the same error had
 * hit this repo twice earlier the same day and cleared on a plain retry with
 * no code change.
 *
 * So the fix is not to correct a config; it is to stop depending on a network
 * fetch at build time. These are the same two families, the same two CSS
 * variables and the same rendering — served from the repo like Cabinet
 * Grotesk and Switzer above, which is why those two have never flaked.
 *
 * THE FILES ARE THE VARIABLE LATIN CUTS Google itself serves, downloaded from
 * fonts.gstatic.com: the woff2 whose @font-face block carries the
 * U+0000-00FF unicode-range, which is what `subsets: ['latin']` was selecting.
 * One file per family rather than three static weights each, so six requests
 * become two and any weight in 100-900 is available.
 *
 * Licences: app/fonts/Inter-LICENSE.txt and app/fonts/Outfit-LICENSE.txt, both
 * SIL OFL 1.1, both redistributable with the font binaries. Same arrangement
 * as the other two families.
 *
 * `preload: false` ON BOTH, deliberately, and it is the one behavioural
 * difference from the Google loader. next/font/local preloads by default;
 * next/font/google did not preload these, because they are scoped to one
 * section each rather than used on `body`. Preloading them now would add two
 * render-blocking font requests to every route for type that most routes never
 * paint. The fallback stack is the same one the CSS variables already name.
 */
export const outfit = localFont({
  src: [{ path: './fonts/Outfit-Variable.woff2', weight: '100 900', style: 'normal' }],
  variable: '--font-outfit',
  display: 'swap',
  preload: false,
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

export const inter = localFont({
  src: [{ path: './fonts/Inter-Variable.woff2', weight: '100 900', style: 'normal' }],
  variable: '--font-inter',
  display: 'swap',
  preload: false,
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});
