'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';

/**
 * Accordion, one of the four motion patterns allowed at MOTION_INTENSITY 4.
 * Items are separated by a single hairline, no container boxes, per the
 * minimalist discipline. Toggle is a plain + / - mark, not an icon library glyph.
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
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`${idPrefix}-panel-${i}`}
                  role="region"
                  aria-labelledby={`${idPrefix}-trigger-${i}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduce ? 0.01 : 0.32, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="text-body text-np-neutral-600 max-w-[65ch] pb-6">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
