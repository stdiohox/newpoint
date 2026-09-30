'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

/**
 * "On this page", as a sticky rail that marks which step the reader is in.
 *
 * WHAT IT REPLACED AND WHY. The previous version was the same list of jump
 * links with no state: on a page reached from search it told a reader the page
 * answers their question, which is its main job, but once they started reading
 * it stopped telling them anything. Five steps of a patient journey is exactly
 * the length where "how much of this is left" is a real question, and the rail
 * answers it without adding a word of copy.
 *
 * EVERY LINK IS IN THE SERVER HTML. The active state is the only thing that
 * needs the client, and it is layered on: with no JS the full list renders and
 * every anchor works, which is the same standard the rest of this site holds
 * (see the [data-enter] note in app/globals.css). Nothing here is gated behind
 * hydration, so nothing can ship hidden.
 *
 * NO SCROLL LISTENER. IntersectionObserver only. A scroll handler would run on
 * every frame to compute something that changes five times a page.
 */
export function ServiceJourneyNav({ steps }: { steps: { id: string; heading: string }[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const nodes = steps
      .map(({ id }) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null);
    if (nodes.length === 0) return;

    /* THE BAND'S TOP EDGE IS THE LINE THE ANCHOR LINKS THEMSELVES LAND ON, and
       it is read from the token rather than written as a literal. <html>
       carries scroll-padding-top: calc(var(--nav-h) + 1.5rem), so a step that
       has just been jumped to comes to rest exactly here. Reading --nav-h is
       what stops the highlight and the jump drifting apart the next time the
       navbar height changes; 108 is only the fallback for the case where the
       custom property cannot be read at all. */
    const navH = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-h')
    );
    const bandTop = (Number.isFinite(navH) ? navH : 108) + 24;

    const onScreen = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) onScreen.add(entry.target.id);
          else onScreen.delete(entry.target.id);
        }

        /* Document order, not entry order. Two steps are in the band at once
           for most of the scroll, and the highlight belongs on the upper one;
           IntersectionObserver hands back whichever entries changed, in
           whatever order they changed. */
        const first = steps.find(({ id }) => onScreen.has(id));

        /* Nothing in the band — scrolled down into the FAQ, or caught between
           two steps — keeps the last step lit rather than clearing the rail. A
           highlight that blinks off gets read as a bug. A slightly stale one
           does not. */
        if (first) setActiveId(first.id);
      },
      /* -45% at the bottom so a step stops counting well before it leaves the
         screen. Without it the final step can never win: it is short, and the
         one above it stays in a full-height band until the page bottoms out. */
      { rootMargin: `-${bandTop}px 0px -45% 0px` }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [steps]);

  return (
    <nav aria-label="On this page">
      {/* h2, unchanged. It was an h2 before this rewrite and the page's outline
          is built around that. */}
      <h2 className="text-caption text-np-neutral-600 tracking-[0.08em] uppercase">On this page</h2>

      {/* <ol>, not the <ul> this replaced: the steps are a sequence now, and the
          list type is the only thing that tells a screen reader so.
          role="list" is not redundant — see the note at the top of
          app/globals.css. Tailwind Preflight strips list-style and WebKit then
          drops the implicit role, which would take "list, 5 items" with it. */}
      <ol role="list" className="mt-4">
        {steps.map(({ id, heading }) => {
          const isActive = id === activeId;

          return (
            <li key={id} className="relative">
              {/* The unlit track. One hairline per row rather than one border
                  on the <ol>, so the marker below has a segment to sit in. */}
              <span
                aria-hidden="true"
                className="bg-np-neutral-200 absolute inset-y-0 left-0 w-px"
              />

              {/* THE MARKER IS ONE ELEMENT THAT MOVES, not five that fade.
                  layoutId is what makes that true: exactly one is mounted at a
                  time, and Motion animates it between the rows rather than
                  cross-fading two. The motion is the point of the component —
                  it is what conveys "you moved" — which is the justification
                  for animating at all on a site pinned at MOTION_INTENSITY 4.

                  Decorative, and aria-hidden: aria-current on the link below
                  carries the same fact to a screen reader, so this is the
                  sighted channel only.

                  Reduced motion drops to duration 0. The global
                  prefers-reduced-motion block in globals.css cannot help here:
                  it zeroes CSS transition and animation durations, and this is
                  a JS-driven animation that block never sees. */}
              {isActive && (
                <motion.span
                  aria-hidden="true"
                  layoutId="service-journey-marker"
                  className="bg-np-blue-600 absolute inset-y-0 left-0 w-[2px]"
                  transition={
                    reduce ? { duration: 0 } : { duration: 0.32, ease: [0.16, 1, 0.3, 1] }
                  }
                />
              )}

              {/* aria-current="true" rather than "location". Both are defensible
                  for a table of contents and "location" is the more precise
                  word, but "true" is the value with no gaps in screen-reader
                  support, and on this site that decides it.

                  NO NUMERALS IN THE RAIL, deliberately. The steps carry them,
                  and a second set here would have to be legible to count as the
                  sequence marker for a low-vision reader — the argument
                  app/new-patients/page.tsx makes about its own numerals. At
                  np-neutral-400 they measure about 2.4:1 on this ground and
                  would fail SC 1.4.3; at a passing colour they compete with the
                  headings. The rail and the order do the job instead. */}
              <a
                href={`#${id}`}
                aria-current={isActive ? 'true' : undefined}
                className={`text-small ease-np-out block py-2.5 pl-4 transition-colors duration-[180ms] ${
                  isActive
                    ? 'text-np-blue-700 font-medium'
                    : 'text-np-neutral-600 hover:text-np-blue-600'
                }`}
              >
                {heading}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
