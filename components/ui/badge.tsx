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
 */
const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-np-blue-600 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-np-blue-900 text-white hover:bg-np-blue-900/80',
        secondary: 'border-transparent bg-np-neutral-200 text-np-ink hover:bg-np-neutral-200/80',
        destructive: 'border-transparent bg-np-error text-white hover:bg-np-error/80',
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
