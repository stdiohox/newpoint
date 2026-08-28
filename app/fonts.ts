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
