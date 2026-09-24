'use client';

import * as React from 'react';
import Link from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
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
          {imageUrl && (
            /* Decorative: the card's own heading and body already say what it
               is, so the graphic repeats nothing, and alt="" keeps it out of
               the accessibility tree. The block shipped with a template
               literal naming the card and the words "background graphic",
               which announced a description of the decoration before the
               heading it decorates. */
            <motion.img
              src={imageUrl}
              alt=""
              variants={reduce ? undefined : imageAnimation}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              /* Position and the rest of the classes are the block's. Only the
                 WIDTH is responsive, because the block's flat w-3/4 covered
                 the text on every narrow card.

                 The card's text does not scale with the card: p-8 and the
                 body's max-w-xs are fixed, so on a narrow card the copy fills
                 almost the whole width while a 75% image still eats the right
                 half of it. Measured against the painted text rects, not the
                 block rects, w-3/4 was clear at 1440 and 640 and covered the
                 body copy at 1024, 768 and 390, and the CTA at 768 and 390.

                 The ladder tracks card width, which is not monotonic with
                 viewport: the grid goes to two columns at md, so cards get
                 NARROWER at 768 (324px) and 1024 (436px) than they are at 640
                 (592px, still one column). Hence the dip back to w-1/3 at md.

                 The 2xl step exists because w-3/4 is safe at 1440 but not at
                 1280, where the card is at its narrowest for that range (564px)
                 and the icon clipped one glyph by 41px^2. xl carries w-2/3 and
                 w-3/4 waits for 1536. Checked at 17 viewport widths, including
                 both sides of every breakpoint. */
              className="pointer-events-none absolute -right-1/4 -bottom-1/4 w-1/3 opacity-80 sm:w-3/4 md:w-1/3 lg:w-1/2 xl:w-2/3 2xl:w-3/4 dark:opacity-30"
            />
          )}
          <div className="z-10 flex h-full flex-col">
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
            <Link
              href={ctaHref}
              className="group text-np-ink mt-6 inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline focus-visible:underline"
            >
              {ctaText}
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
              />
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }
);
GradientCard.displayName = 'GradientCard';

export { GradientCard, cardVariants };
