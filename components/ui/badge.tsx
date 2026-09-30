import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * shadcn's badge, with its token names mapped onto Newpoint's.
 *
 * shadcn ships against a semantic palette this repo does not define
 * (`primary`, `secondary`, `destructive`, `ring`, `foreground`). Tailwind v4
 * silently generates nothing for an unknown utility, so leaving those in would
 * have shipped classes that look intentional and do nothing. Each is mapped to
 * a real token instead:
 *
 *   bg-primary / text-primary-foreground  -> bg-np-blue-900 / text-white  16.10:1
 *   bg-secondary / text-secondary-...     -> bg-np-neutral-200 / text-np-ink  13.41:1
 *   bg-destructive / text-destructive-... -> bg-np-error / text-white  6.54:1
 *   text-foreground                       -> text-np-ink
 *   focus:ring-ring                       -> focus:ring-np-blue-600, the same
 *                                            focus colour globals.css uses
 *
 * Only `default` is rendered today (the "What to expect" eyebrow). The other
 * three are kept so the variant API matches shadcn's, and are mapped rather
 * than deleted so they work if they are ever used.
 *
 * THE PER-VARIANT HOVER FILL IS GONE, and it was doing real damage. Each
 * variant carried an 80%-alpha hover version of its own background.
 * shadcn ships it because its badge is often rendered as a link; both call
 * sites here render the plain <div> this component returns, so the hover fired
 * on something nothing could click. That is a false affordance on its own, and
 * on one of the two it also broke contrast.
 *
 * PageCta's badge overrides the fill to white with an np-blue-700 label. The
 * override lands, because twMerge resolves `bg-np-surface` against
 * `bg-np-blue-900`. It does NOT land on the hover, because twMerge treats
 * `hover:bg-*` as a separate group, so the chip kept flipping to np-blue-900/80
 * under a label that stayed np-blue-700: 11.55:1 at rest, 1.27:1 on hover, with
 * the text all but gone. The bento badge's hover did not fail (16.10:1 to
 * 8.56:1) but was the same false affordance.
 *
 * If a badge is ever rendered as a link or button, give it hover and focus
 * styling at that call site, where the element is actually interactive.
 */
const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-np-blue-600 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-np-blue-900 text-white',
        secondary: 'border-transparent bg-np-neutral-200 text-np-ink',
        destructive: 'border-transparent bg-np-error text-white',
        outline: 'text-np-ink',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
