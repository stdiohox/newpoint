import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * shadcn's Input, with its token names mapped onto this repo's palette, since
 * the project has no shadcn theme layer: border-input → np-neutral-300,
 * bg-background → white, placeholder → np-neutral-600, ring → np-blue-600.
 * ring-offset-background and file:text-foreground follow the same mapping.
 *
 * The file: utilities are kept from the original so the component stays a
 * general-purpose Input, but nothing in this repo may use type="file": the
 * project CLAUDE.md bars file uploads from the v1 intake flow outright.
 *
 * Lowercase filename, like badge.tsx and gradient-card.tsx. It does NOT
 * collide with a Capitalised sibling the way a shadcn button.tsx would collide
 * with Button.tsx on this case-insensitive filesystem.
 */
export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'border-np-neutral-300 placeholder:text-np-neutral-600 focus-visible:ring-np-blue-600 file:text-np-ink flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export { Input };
