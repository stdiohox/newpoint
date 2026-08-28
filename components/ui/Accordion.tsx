'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';

/**
 * Accordion, one of the four motion patterns allowed at MOTION_INTENSITY 4.
 * Items are separated by a single hairline, no container boxes, per the
 * minimalist discipline. Toggle is a plain + / - mark, not an icon library glyph.
 */
export function Accordion({ items }: { items: readonly { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const reduce = useReducedMotion();

  return (
    <ul className="border-np-neutral-200 border-t">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <li key={item.q} className="border-np-neutral-200 border-b">
            <h4>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${i}`}
                id={`faq-trigger-${i}`}
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
            </h4>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-trigger-${i}`}
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
