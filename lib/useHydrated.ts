'use client';

import { useEffect, useState } from 'react';

/**
 * False during SSR and on the first client render, true from the first effect on.
 *
 * This exists so entrance animations can keep their hidden start state OUT of
 * the server-rendered HTML. Motion writes an `initial` prop straight into the
 * `style` attribute during SSR, so a component that starts at `opacity: 0`
 * ships invisible: if JS never runs, never finishes, or throws, the content is
 * simply gone. On a behavioral-health site that took the crisis panel, the
 * whole contact form, the navigation, and the hero H1 with it.
 *
 * The hidden state moves to CSS instead, keyed on the `js` class that
 * app/layout.tsx adds to <html> before first paint, and gated on
 * prefers-reduced-motion: no-preference. See the [data-enter] block in
 * app/globals.css. So:
 *
 *   no JS          -> no `js` class -> nothing is ever hidden
 *   reduced motion -> media query does not match -> nothing is ever hidden
 *   JS + motion OK -> CSS hides pre-paint, this hook lets the component take
 *                     over after hydration, and the two states match so there
 *                     is no flash
 *
 * Returning false on the first client render is deliberate, not a rounding
 * error: it has to match the server render exactly or hydration mismatches.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
