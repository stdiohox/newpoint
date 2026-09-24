import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Conditional class names, with later Tailwind utilities winning over earlier
 * ones of the same kind. `clsx` resolves the conditionals; `twMerge` resolves
 * the conflicts, so a caller's `className` can override a component's defaults
 * instead of depending on stylesheet order.
 *
 * Added for components/ui/badge.tsx, which is shadcn's badge and expects this
 * helper at this path.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
