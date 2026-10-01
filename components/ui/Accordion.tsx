'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { useHydrated } from '@/lib/useHydrated';

/**
 * Accordion, one of the four motion patterns allowed at MOTION_INTENSITY 4.
 * Items are separated by a single hairline, no container boxes, per the
 * minimalist discipline. Toggle is a plain + / - mark, not an icon library glyph.
 *
 * THE ANSWERS ARE IN THE SERVER HTML, AND THAT IS THE POINT OF THE SHAPE BELOW.
 * This used to wrap the panel in AnimatePresence and mount it only while open,
 * so the answer text existed nowhere until someone clicked. Measured on the
 * built output: zero occurrences of any answer in the rendered DOM, and zero in
 * a fully hydrated browser until the trigger was clicked. The only copy of that
 * text in the document was the FAQPage JSON-LD, which meant the page was
 * marking up content it did not show and roughly a hundred words of body copy
 * were invisible to search on every route that renders a FAQ.
 *
 * So the panel now always renders, and the collapse happens in two places:
 *
 *   before hydration  a plain <div> carrying the text. `.js [data-faq-panel]`
 *                     in globals.css hides it, and that class is set by the
 *                     inline script in app/layout.tsx before first paint, so a
 *                     reader with JS never sees an expanded flash.
 *   after hydration   React swaps in the motion element, which has no
 *                     data-faq-panel, so the CSS stops applying and the height
 *                     animation takes over.
 *
 * WITH SCRIPTING OFF, NOTHING IS HIDDEN: the `.js` class never lands, every
 * answer renders open, and the page is readable. That is the same failure mode
 * the [data-enter] block in globals.css is built around, and the same reason.
 * Do not "simplify" this back into a conditional mount.
 */
export function Accordion({
  items,
  headingLevel = 4,
  idPrefix = 'faq',
}: {
  items: readonly { q: string; a: string }[];
  /**
   * The heading level wrapping each trigger. Defaults to 4, which is correct
   * under the homepage's h2 → h3 group titles. Interior pages put the FAQ
   * directly under an h2 and pass 3, so the outline never skips a level.
   */
  headingLevel?: 3 | 4;
  /** Disambiguates the aria ids when more than one accordion is on a page. */
  idPrefix?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const hydrated = useHydrated();
  const Heading = `h${headingLevel}` as 'h3' | 'h4';

  return (
    <ul role="list" className="border-np-neutral-200 border-t">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <li key={item.q} className="border-np-neutral-200 border-b">
            <Heading>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`${idPrefix}-panel-${i}`}
                id={`${idPrefix}-trigger-${i}`}
                className="ease-np-out hover:text-np-blue-600 flex w-full items-start justify-between gap-6 py-5 text-left transition-colors duration-[180ms]"
              >
                <span className="font-display text-h3 text-np-ink">{item.q}</span>
                <span
                  aria-hidden="true"
                  className="font-body text-body-l text-np-blue-600 mt-1 shrink-0 leading-none select-none"
                >
                  {isOpen ? '−' : '+'}
                </span>
              </button>
            </Heading>
            {hydrated ? (
              /* initial={false} so the first hydrated render matches whatever
                 state we are already in rather than animating from closed.
                 aria-hidden and inert keep a collapsed panel out of the
                 accessibility tree and out of the tab order, which a panel
                 that is merely zero-height would not do. */
              <motion.div
                id={`${idPrefix}-panel-${i}`}
                role="region"
                aria-labelledby={`${idPrefix}-trigger-${i}`}
                initial={false}
                animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                transition={{ duration: reduce ? 0.01 : 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
                aria-hidden={!isOpen}
                inert={!isOpen}
              >
                <p className="text-body text-np-neutral-600 max-w-[65ch] pb-6">{item.a}</p>
              </motion.div>
            ) : (
              <div
                data-faq-panel
                id={`${idPrefix}-panel-${i}`}
                role="region"
                aria-labelledby={`${idPrefix}-trigger-${i}`}
              >
                <p className="text-body text-np-neutral-600 max-w-[65ch] pb-6">{item.a}</p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
