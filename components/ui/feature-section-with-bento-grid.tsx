import type { ReactNode } from 'react';
import { CalendarCheck, ClipboardList, FileText, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Bento feature grid, from the supplied shadcn block. Layout and classes are
 * the block's; the only changes are the ones the brief listed.
 *
 * CONTENT is props, not literals. Every string comes from WHAT_TO_EXPECT in
 * lib/content.ts, so no copy is authored here.
 *
 * TOKENS. The block is written against shadcn's semantic palette, which this
 * repo does not define:
 *
 *   bg-muted             -> bg-np-neutral-100   the card ground
 *   text-muted-foreground -> text-np-neutral-600  6.33:1 on that ground
 *
 * np-neutral-500 was the other candidate for the muted text and is not usable:
 * it measures 3.98:1 on np-neutral-100 and 4.45:1 on white, both under 4.5:1.
 * np-neutral-600 is the lightest token that clears AA, and is already what the
 * rest of the site uses for muted body copy.
 *
 * WIDTH. `container mx-auto` is replaced by <Providers />'s gutters, which is
 * also what this section used before: px-6 / md:px-12 / lg:px-16, no max-width.
 *
 * SEMANTICS. The grid is an <ol role="list"> and each card an <li>, in step
 * order, because the four steps are a sequence rather than a set. role="list"
 * is required repo-wide: Preflight strips list-style and WebKit then drops the
 * list role. See the note in app/globals.css.
 *
 * ICONS are decorative. Each step's heading names the step in text, so the
 * glyph repeats information already available and is aria-hidden.
 *
 * NOTE ON THE BLOCK'S OWN CLASSES, kept as given rather than corrected:
 * `font-regular` on the h2 is not a Tailwind class and generates nothing, so
 * the heading takes its weight from the global h1/h2/h3 rule in globals.css.
 * It is left in place because removing it, or writing `font-normal`, would
 * change the rendered weight rather than preserve it.
 */

export type BentoStep = {
  title: string;
  body: string;
};

/** In step order. Decorative: every card's heading already names the step. */
const STEP_ICONS = [CalendarCheck, ClipboardList, FileText, RefreshCw] as const;

/**
 * The block's own rhythm: cards 1 and 4 run two columns wide at lg and drop
 * their square ratio, cards 2 and 3 stay square. Four steps, four cells, so
 * the grid never carries a filler tile.
 */
const isWide = (i: number) => i === 0 || i === 3;

export function FeatureBentoGrid({
  badge,
  heading,
  intro,
  steps,
  children,
}: {
  badge: string;
  heading: string;
  intro: string;
  steps: readonly BentoStep[];
  /** Rendered below the grid. Carries the section's CTA. */
  children?: ReactNode;
}) {
  return (
    <div className="w-full py-20 lg:py-40">
      <div className="px-6 md:px-12 lg:px-16">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col items-start gap-4">
            <div>
              <Badge>{badge}</Badge>
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="font-regular max-w-xl text-left text-3xl tracking-tighter md:text-5xl">
                {heading}
              </h2>
              <p className="text-np-neutral-600 max-w-xl text-left text-lg leading-relaxed tracking-tight lg:max-w-lg">
                {intro}
              </p>
            </div>
          </div>

          <ol role="list" className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step, i) => {
              const Icon = STEP_ICONS[i % STEP_ICONS.length];
              return (
                <li
                  key={step.title}
                  className={`bg-np-neutral-100 grid grid-cols-[minmax(0,1fr)] rounded-md p-6 ${
                    isWide(i) ? 'h-full lg:col-span-2' : ''
                  }`}
                >
                  {/* Ratio spacer. Sets the card's MINIMUM height and nothing
                      else: it paints nothing and is out of the a11y tree.

                      HEIGHT IS max(ratio, content), the same approach as the
                      provider cards in Providers.tsx. The li is a one-cell
                      grid and the spacer and the content share that cell, so
                      the taller of the two sets the row height. At default
                      text size the spacer wins and the card is exactly square,
                      pixel for pixel what `aspect-square` on the li gave: the
                      spacer sits inside p-6, so its height is the content-box
                      width, and adding the padding back returns the card to
                      the full width. When the text needs more room, from a
                      user font-size setting or longer approved copy, the card
                      grows instead of overflowing.

                      The previous version put aspect-square on the li itself,
                      which fixes height from width and cannot grow. Nothing
                      clipped at a 16px root, but two cards were already at
                      exactly 100% of their box at 1024 and 640, so any
                      enlargement spilled the text straight out of the card. */}
                  <div
                    aria-hidden="true"
                    className={`col-start-1 row-start-1 ${
                      isWide(i) ? 'aspect-square lg:aspect-auto' : 'aspect-square'
                    }`}
                  />

                  {/* Same grid cell as the spacer. The row stretches to the
                      card's height, so justify-between still pins the icon to
                      the top and the text to the bottom. */}
                  <div className="col-start-1 row-start-1 flex flex-col justify-between">
                    <Icon aria-hidden="true" className="h-8 w-8 stroke-1" />
                    <div className="flex flex-col">
                      {/* h3: the section's h2 is above and nothing nests deeper,
                          so the outline stays h2 -> h3 with no skip. */}
                      <h3 className="text-xl tracking-tight">{step.title}</h3>
                      <p className="text-np-neutral-600 max-w-xs text-base">{step.body}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {children}
        </div>
      </div>
    </div>
  );
}
