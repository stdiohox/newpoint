'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

/**
 * The supplied gradient card. Layout and classes are the block's; the only
 * changes are the ones the brief listed.
 *
 * MOTION comes from `motion/react`, the package this repo already depends on,
 * not framer-motion. Nothing new was installed. `motion/react` is the current
 * import path for the same library, so the API is unchanged.
 *
 * GRADIENTS are built from tokens that already exist in globals.css. The block
 * shipped with Tailwind's stock orange/gray/purple/green, none of which are
 * Newpoint colours:
 *
 *   orange -> blue     np-blue-50   -> np-blue-100      #f1f5fc -> #e3eaf8
 *   gray   -> neutral  np-neutral-100 -> np-neutral-200 #f4f2ed -> #e7e4dd
 *   purple -> sky      np-sky/10    -> np-sky/20        #4a76a4 at 10/20%
 *   green  -> sage     np-success/10 -> np-success/20   #2f7d4f at 10/20%
 *
 * sky and sage are the two the palette has no pale step for: np-sky and
 * np-success exist only as mid tones, so they are used at 10% and 20% over the
 * white card rather than inventing two new brand colours for one component.
 *
 *   text-foreground -> text-np-ink   #131c2e
 *   bg-background   -> bg-white      the badge's translucent chip
 *
 * REDUCED MOTION. The card lifts and scales on hover, and the image scales and
 * rotates. Both are decorative, so under prefers-reduced-motion the variants
 * are not passed at all and the card renders static. Honouring it by swapping
 * in a zero-length transition would still move the element.
 *
 * imageUrl is OPTIONAL. With none, the slot renders nothing rather than an
 * <img> with an empty src, which browsers resolve against the page URL and
 * request a second time.
 */
const cardVariants = cva(
  'relative flex flex-col justify-between h-full w-full overflow-hidden rounded-2xl p-8 shadow-sm transition-shadow duration-300 hover:shadow-lg',
  {
    variants: {
      gradient: {
        blue: 'bg-gradient-to-br from-np-blue-50 to-np-blue-100',
        sky: 'bg-gradient-to-br from-np-sky/10 to-np-sky/20',
        sage: 'bg-gradient-to-br from-np-success/10 to-np-success/20',
        neutral: 'bg-gradient-to-br from-np-neutral-100 to-np-neutral-200',
      },
    },
    defaultVariants: { gradient: 'neutral' },
  }
);

export interface GradientCardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  badgeText: string;
  badgeColor: string;
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  /** Optional. With no image the slot renders nothing. */
  imageUrl?: string;
}

const GradientCard = React.forwardRef<HTMLDivElement, GradientCardProps>(
  (
    {
      className,
      gradient,
      badgeText,
      badgeColor,
      title,
      description,
      ctaText,
      ctaHref,
      imageUrl,
      ...props
    },
    ref
  ) => {
    const reduce = useReducedMotion();
    const cardAnimation = { rest: { scale: 1, y: 0 }, hover: { scale: 1.03, y: -4 } };
    const imageAnimation = { rest: { scale: 1, rotate: 0 }, hover: { scale: 1.1, rotate: 3 } };

    return (
      <motion.div
        variants={reduce ? undefined : cardAnimation}
        initial="rest"
        whileHover={reduce ? undefined : 'hover'}
        animate="rest"
        className="h-full"
        ref={ref}
      >
        <div className={cn(cardVariants({ gradient }), className)} {...props}>
          {/* The right margin reserves the icon's column so the copy can never
              run under it: icon width + its 24px inset + a 16px gap. It tracks
              the icon's responsive size. Below the switch the icon is in flow
              above the badge, so no margin is needed. */}
          <div className="z-10 flex h-full flex-col min-[30rem]:me-[180px] sm:me-[216px] md:me-0 lg:me-[180px] xl:me-[240px]">
            {imageUrl && (
              /* THE ICON IS IN FLOW, not bled off a corner. Card-side, the key
                 parts of these icons are the middle (the heart, the check mark,
                 the card in the wallet), so anything that clips an edge clips
                 the subject.

                 Two layouts, one element, switched at min-[30rem] on the card
                 rather than the viewport... except Tailwind has no container
                 query configured here, so the switch is by viewport and the
                 breakpoints below were chosen from the CARD widths they produce.

                 Where the card is too narrow for anything to sit beside the
                 copy, the icon runs ABOVE THE BADGE at a small fixed size, in
                 normal flow. It is the first child of this column, which is
                 what puts it there without needing a second element.

                 That happens TWICE, because card width is not monotonic with
                 viewport: once below 30rem, and again across the whole md band,
                 where the grid goes to two columns and the card drops from
                 719px at 767 to 324px at 768. Beside-the-text at md left the
                 body wrapping to three words a line. So the ladder is
                 above -> beside -> above -> beside, not a single switch.

                 At and above the switch it becomes absolute, pinned to the
                 right edge and vertically centred, and the column keeps a right
                 margin so the copy never runs under it.

                 SIZES track card width rather than viewport, for the same
                 reason the layout does. 200px at xl, which is what 1440 gets,
                 down through 176 / 140 to 96 where the card is stacked. Each
                 step is checked against the card it actually produces, not
                 assumed from the breakpoint: the text column left over must
                 stay wide enough that the body does not wrap to three words a
                 line, which is what went wrong the first time md tried to put
                 the icon beside the copy.

                 Decorative: the heading and body already say what the card is,
                 so alt="" keeps it out of the accessibility tree. */
              <motion.img
                src={imageUrl}
                alt=""
                variants={reduce ? undefined : imageAnimation}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="pointer-events-none mb-4 h-24 w-24 shrink-0 object-contain min-[30rem]:absolute min-[30rem]:top-1/2 min-[30rem]:right-6 min-[30rem]:mb-0 min-[30rem]:h-[140px] min-[30rem]:w-[140px] min-[30rem]:-translate-y-1/2 sm:h-[176px] sm:w-[176px] md:static md:mb-4 md:h-24 md:w-24 md:translate-y-0 lg:absolute lg:top-1/2 lg:right-6 lg:mb-0 lg:h-[140px] lg:w-[140px] lg:-translate-y-1/2 xl:h-[200px] xl:w-[200px]"
              />
            )}
            <div className="text-np-ink/80 mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/50 px-3 py-1 text-sm font-medium backdrop-blur-sm">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: badgeColor }}
              />
              {badgeText}
            </div>
            <div className="flex-grow">
              <h3 className="text-np-ink mb-2 text-2xl font-bold">{title}</h3>
              <p className="text-np-ink/70 max-w-xs">{description}</p>
            </div>
            <div className="mt-6">
              <Button href={ctaHref} variant="sky" withArrow>
                {ctaText}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
);
GradientCard.displayName = 'GradientCard';

export { GradientCard, cardVariants };
