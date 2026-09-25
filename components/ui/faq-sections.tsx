'use client';

import { useId, useState } from 'react';
import Image from 'next/image';

/**
 * The FAQ block: a sticky photograph beside a scrolling question list.
 *
 * CLIENT COMPONENT because the open/closed state is local. It is a leaf: the
 * section wrapper around it stays a server component.
 *
 * GRID is 5/12 image, 7/12 content, with a 64px gap, collapsing to one column
 * below md with the image on top. The image column is sticky from md up, offset
 * below the fixed navbar by --nav-h plus 2rem, so the photograph holds while
 * the list scrolls past it.
 *
 * THE IMAGE IS object-cover IN A 4:5 BOX, so unlike the `w-full h-auto` version
 * this one DOES crop. The source is 4:3 landscape (1.34) and the box is 0.8, so
 * cover scales by height and shows the middle ~60% of the frame's width. The
 * subject sits between 40% and 58% across, comfortably inside that, which is
 * why object-position stays centred; it is asserted in the verification rather
 * than assumed.
 *
 * FONTS. The block shipped with a <style> tag importing Poppins from Google and
 * applying it to `*`. That is deleted: a runtime @import blocks rendering on a
 * third-party request, and the selector would have restyled the whole page.
 *
 * COLOURS, mapped off Tailwind's stock palette onto Newpoint's:
 *   text-indigo-600 -> np-blue-600    eyebrow
 *   text-slate-500  -> np-neutral-600 intro and answers
 *   border-slate-200 -> np-neutral-200 row rules
 *   stroke="#1D293D" -> currentColor under text-np-ink
 *
 * ACCESSIBILITY. The block put the click handler on a <div>: no role, no
 * keyboard, no state. Each question is a real <button> with aria-expanded and
 * aria-controls, so Enter and Space come from the platform. A closed answer is
 * `inert`, which removes it from the accessibility tree AND the tab order in
 * one attribute; the block's max-h-0 + opacity-0 only hid it visually, so a
 * screen reader read every answer whether open or not.
 *
 * REDUCED MOTION is CSS-only, so it is right in the server-rendered HTML with
 * no hydration flash.
 */

export type FaqItem = { q: string; a: string };

export function FaqSections({
  eyebrow,
  heading,
  intro,
  faqs,
  imageSrc,
  imageWidth,
  imageHeight,
}: {
  eyebrow: string;
  heading: string;
  intro: string;
  faqs: readonly FaqItem[];
  imageSrc: string;
  /**
   * The file's real pixel dimensions. next/image needs the true pair; a wrong
   * one distorts rather than crops.
   */
  imageWidth: number;
  imageHeight: number;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const baseId = useId();

  return (
    /* Width and gutters are <WhatToExpect />'s, which are <Providers />'s:
       px-6 / md:px-12 / lg:px-16 and no max-width, so this section's content
       edges line up with every other section on the page. */
    <div className="px-6 md:px-12 lg:px-16">
      <div className="grid gap-8 md:grid-cols-12 md:gap-16">
        <div className="md:col-span-5">
          {/* --nav-h is the fixed bar's height and also drives
              scroll-padding-top in globals.css. The extra 2rem keeps the
              photograph clear of the bar rather than tucked under it. */}
          <div className="md:sticky md:top-[calc(var(--nav-h)+2rem)]">
            <Image
              src={imageSrc}
              alt=""
              width={imageWidth}
              height={imageHeight}
              sizes="(min-width: 768px) 42vw, 100vw"
              className="aspect-[4/5] w-full rounded-2xl object-cover"
            />
          </div>
        </div>

        <div className="md:col-span-7">
          <p className="text-np-blue-600 text-sm font-medium">{eyebrow}</p>
          {/* Same treatment as the What to expect heading: the block's own
              text-3xl step, the md:text-5xl above it, and tracking-tighter. */}
          <h2 className="font-regular mt-3 max-w-xl text-3xl tracking-tighter md:text-5xl">
            {heading}
          </h2>
          <p className="text-np-neutral-600 mt-4 max-w-[560px] text-lg leading-relaxed">{intro}</p>

          <div className="mt-10 max-w-[720px]">
            {faqs.map((faq, index) => {
              const open = openIndex === index;
              const panelId = `${baseId}-faq-${index}`;
              return (
                <div
                  key={faq.q}
                  className={`border-np-neutral-200 border-b py-5 ${index === 0 ? 'border-t' : ''}`}
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(open ? null : index)}
                    className="focus-visible:outline-np-blue-600 flex w-full cursor-pointer items-start justify-between gap-6 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {/* h3 under the section's h2, so the outline does not skip. */}
                    <h3 className="text-lg font-medium">{faq.q}</h3>
                    {/* mt-1 centres the 18px chevron on the question's FIRST
                        line (18px text on a ~27px line box), so a question that
                        wraps keeps the chevron beside its opening line rather
                        than drifting to the middle of the block. */}
                    <svg
                      aria-hidden="true"
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={`text-np-ink mt-1 shrink-0 ${
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
                    className={`text-np-neutral-600 max-w-[640px] overflow-hidden text-base leading-[1.6] transition-all duration-500 ease-in-out motion-reduce:transition-none ${
                      open
                        ? 'max-h-[600px] translate-y-0 pt-3 opacity-100'
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
      </div>
    </div>
  );
}
