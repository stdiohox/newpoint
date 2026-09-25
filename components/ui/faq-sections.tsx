'use client';

import { useId, useState } from 'react';
import Image from 'next/image';

/**
 * The supplied FAQ block. Layout and classes are the block's; the only changes
 * are the ones the brief listed.
 *
 * CLIENT COMPONENT because the open/closed state is local. It is a leaf: the
 * section wrapper around it stays a server component.
 *
 * FONTS. The block shipped with a <style> tag importing Poppins from Google
 * and applying it to `*`. That is deleted. A runtime @import blocks rendering
 * on a third-party request, the selector would have overridden every font on
 * the page rather than just this block, and the site already self-hosts its
 * own faces through next/font.
 *
 * IMAGE is next/image against a local file, not the CDN URL the block came
 * with. Decorative, so alt="": the questions beside it say what the section is.
 *
 * COLOURS, mapped off Tailwind's stock palette onto Newpoint's:
 *   text-indigo-600 -> np-blue-600   eyebrow
 *   text-slate-500  -> np-neutral-600 intro and answers
 *   border-slate-200 -> np-neutral-200 row rules
 *   stroke="#1D293D" -> currentColor with text-np-ink on the chevron
 *
 * ACCESSIBILITY. The block put the click handler on a <div>, which gives no
 * role, no keyboard access and no state. Each question is now a real <button>,
 * so Enter and Space come from the platform rather than from a key handler,
 * and it carries aria-expanded plus aria-controls pointing at its answer.
 *
 * A closed answer is `inert`, which takes it out of the accessibility tree AND
 * out of the tab order in one attribute. The block's own max-h-0 + opacity-0
 * only hid it visually: a screen reader still read every answer, open or not.
 *
 * REDUCED MOTION is handled in CSS rather than through a hook, so it is correct
 * in the server-rendered HTML with no hydration flash: motion-reduce cancels
 * both the chevron's rotation and the answer's height and opacity transitions.
 */

export type FaqItem = { q: string; a: string };

export function FaqSections({
  eyebrow,
  heading,
  intro,
  faqs,
  imageSrc,
}: {
  eyebrow: string;
  heading: string;
  intro: string;
  faqs: readonly FaqItem[];
  imageSrc: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const baseId = useId();

  return (
    /* Width and gutters are <WhatToExpect />'s, which are <Providers />'s:
       px-6 / md:px-12 / lg:px-16 and no max-width. The block's own
       `max-w-4xl mx-auto px-4 md:px-0` is gone, so this section's content edges
       line up with every other section on the page. */
    <div className="flex flex-col items-start justify-center gap-8 px-6 md:flex-row md:px-12 lg:px-16">
      <Image
        src={imageSrc}
        alt=""
        width={1200}
        height={1200}
        sizes="(min-width: 768px) 384px, 100vw"
        className="h-auto w-full max-w-sm rounded-xl"
      />
      <div className="w-full md:flex-1">
        <p className="text-np-blue-600 text-sm font-medium">{eyebrow}</p>
        <h2 className="text-3xl font-semibold">{heading}</h2>
        <p className="text-np-neutral-600 mt-2 pb-4 text-sm">{intro}</p>
        {faqs.map((faq, index) => {
          const open = openIndex === index;
          const panelId = `${baseId}-faq-${index}`;
          return (
            <div className="border-np-neutral-200 border-b py-4" key={faq.q}>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : index)}
                className="focus-visible:outline-np-blue-600 flex w-full cursor-pointer items-center justify-between gap-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {/* h3 under the section's h2, so the outline does not skip. */}
                <h3 className="text-base font-medium">{faq.q}</h3>
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={`text-np-ink shrink-0 ${
                    open ? 'rotate-180' : ''
                  } transition-all duration-500 ease-in-out motion-reduce:rotate-0 motion-reduce:transition-none`}
                >
                  <path
                    d="m4.5 7.2 3.793 3.793a1 1 0 0 0 1.414 0L13.5 7.2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <p
                id={panelId}
                inert={!open}
                className={`text-np-neutral-600 max-w-md overflow-hidden text-sm transition-all duration-500 ease-in-out motion-reduce:transition-none ${
                  open
                    ? 'max-h-[300px] translate-y-0 pt-4 opacity-100'
                    : 'max-h-0 -translate-y-2 opacity-0'
                }`}
              >
                {faq.a}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
