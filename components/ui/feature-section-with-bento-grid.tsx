import type { ReactNode } from 'react';
import Image from 'next/image';
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
 * In step order, and decorative in exactly the way the icons are: each card's
 * heading and body already say what the step is, so the photograph repeats
 * nothing and carries alt="". A description here would be read out before the
 * heading and add nothing a screen reader user does not already get.
 *
 * Source aspect ratios were chosen to match the cells: the two 2752x1536 files
 * are on the wide cards, the two 2048x2048 on the square ones. Resized to
 * 1600px (wide) and 1200px (square), webp q80, 77-146 KB each.
 */
const STEP_IMAGES = [
  '/images/what-to-expect/request.webp',
  '/images/what-to-expect/evaluation.webp',
  '/images/what-to-expect/treatment-plan.webp',
  '/images/what-to-expect/follow-up.webp',
] as const;

/**
 * Per-card object-position, in step order. Default centring is right for three
 * of the four.
 *
 * FOLLOW-UP (card 4) is the exception. Every card's image box is wider than the
 * 1600x893 source, so object-cover always scales to the box WIDTH and crops
 * vertically only, which makes the horizontal term irrelevant and the vertical
 * one the whole problem. The man's head runs from roughly 10% to 36% of the
 * source height, well above the middle, so centring cropped it: at 1440 the
 * visible band was about 30% to 70% of the image and took the top of his head
 * off, leaving a headless torso.
 *
 * 12% keeps the band's top edge above his hairline at every width. The band is
 * 41% of the image tall at 1440 and 63% at 390, so the top edge lands at 7% and
 * 4.6% respectively, both clear of the hairline with headroom to spare. The
 * ceiling is about 16% at 1440, the tightest case, so 12% is not on the edge.
 */
const STEP_IMAGE_POSITIONS = [
  'object-center',
  'object-center',
  'object-center',
  'object-[50%_12%]',
] as const;

/**
 * The block's own rhythm: cards 1 and 4 run two columns wide at lg and drop
 * their square ratio, cards 2 and 3 stay square. Four steps, four cells, so
 * the grid never carries a filler tile.
 */
const isWide = (i: number) => i === 0 || i === 3;

/**
 * What share of the viewport the card occupies, so next/image picks a sensible
 * source instead of assuming 100vw. The grid is 1 column, then 2 at sm (640),
 * then 3 at lg (1024), where the wide cards span two of the three.
 */
const sizesFor = (i: number) =>
  isWide(i)
    ? '(min-width: 1024px) 66vw, (min-width: 640px) 50vw, 100vw'
    : '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw';

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
  /*
   * TOP PADDING is pt-24 md:pt-32 (96px, 128px from 768px up), not the block's
   * own pt-20 lg:pt-40. py-24 md:py-32 is this site's section rhythm:
   * <Providers />, <Faq /> and <ContactCrisis /> all use it. The block's 160px
   * at lg was the outlier, and it landed directly under the providers panel,
   * which already contributes its own 128px bottom, for a 288px trough. It is
   * now 128 + 128 = 256px, the same gap as Faq to ContactCrisis.
   *
   * Bottom padding is deliberately untouched: the brief asked for the top. It
   * stays pb-20 lg:pb-40, so the gap down to <InsuranceProof /> is still the
   * block's 160px plus that section's own 112px.
   */
  return (
    <div className="w-full pt-24 pb-20 md:pt-32 lg:pb-40">
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
                  className={`bg-np-neutral-100 grid grid-cols-[minmax(0,1fr)] rounded-2xl ${
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

                  {/* Same grid cell as the spacer, so the taller of the two
                      still sets the height. p-6 moved off the li and onto the
                      text block below, because the photograph runs to the
                      card's edges and padding around it would inset it. */}
                  <div className="col-start-1 row-start-1 flex flex-col">
                    {/* The photograph takes the slack. `flex-1` means it
                        absorbs whatever height is left once the text has
                        taken what it needs, so at default size the card is
                        still exactly square and the image fills the top of
                        it. The floor stops it collapsing to a sliver when the
                        text grows; past that point the text wins and the card
                        grows instead, which is the whole point of the spacer.

                        overflow-hidden + rounded-t-2xl, matching the card's
                        own rounded-2xl, rather than
                        overflow-hidden on the li: clipping the card itself
                        would silently crop the text if it ever did overflow,
                        and only the image needs the corners. */}
                    <div className="relative min-h-[120px] w-full flex-1 overflow-hidden rounded-t-2xl">
                      <Image
                        src={STEP_IMAGES[i % STEP_IMAGES.length]}
                        alt=""
                        fill
                        sizes={sizesFor(i)}
                        className={`object-cover ${
                          STEP_IMAGE_POSITIONS[i % STEP_IMAGE_POSITIONS.length]
                        }`}
                      />
                    </div>

                    <div className="flex shrink-0 flex-col p-6">
                      <Icon aria-hidden="true" className="h-8 w-8 stroke-1" />
                      <div className="mt-4 flex flex-col">
                        {/* h3: the section's h2 is above and nothing nests deeper,
                            so the outline stays h2 -> h3 with no skip. */}
                        <h3 className="text-xl tracking-tight">{step.title}</h3>
                        <p className="text-np-neutral-600 max-w-xs text-base">{step.body}</p>
                      </div>
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
