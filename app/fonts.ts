import localFont from 'next/font/local';
import { Outfit, Inter } from 'next/font/google';

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
 * next/font does not produce. That means Inter is currently requested twice.
 * Pointing the hero at `var(--font-inter)` and deleting the <link> removes the
 * duplicate and the standing `no-page-custom-font` lint warning — one line, but
 * it edits the hero, which is out of scope here.
 */
export const outfit = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-outfit',
  display: 'swap',
});

export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});
