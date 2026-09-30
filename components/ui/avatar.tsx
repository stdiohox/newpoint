'use client';

import * as AvatarPrimitive from '@radix-ui/react-avatar';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * shadcn's avatar, unchanged in structure, with its one token name mapped onto
 * Newpoint's the way components/ui/badge.tsx does.
 *
 *   bg-secondary -> bg-np-neutral-200 + text-np-ink  (13.41:1, measured for the
 *                   badge's secondary variant, which uses the same pair)
 *
 * That mapping is not cosmetic. shadcn ships against a semantic palette this
 * repo does not define, and Tailwind v4 emits NOTHING for an unknown utility
 * rather than erroring — so a stray `bg-secondary` would look deliberate in the
 * source and render a transparent fallback in the browser.
 *
 * WHY THIS EXISTS ALONGSIDE ProviderPortrait, which also renders a provider's
 * face: they solve different problems and both are still used.
 *
 *   ProviderPortrait is a <picture> with a webp source and a jpg fallback at
 *   two pre-processed sizes. It is the right call at 240px on the provider page
 *   and the homepage grid, where the image IS the content and art direction
 *   matters.
 *
 *   Avatar is for the small circular case. What it adds is a real failure
 *   state: Radix tracks the image's load status and swaps in AvatarFallback if
 *   it errors or is slow, so a broken portrait degrades to initials instead of
 *   a broken-image glyph. A <picture> has no answer for that.
 *
 * AvatarImage forwards every <img> prop, so `srcSet` and `sizes` work on it and
 * responsive sources are not lost by moving to this component. The jpg fallback
 * is, since there is no <source> element here — acceptable for webp, which has
 * been universal for years, but it is the one thing this trades away.
 */

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'bg-np-neutral-200 text-np-ink flex h-full w-full items-center justify-center rounded-[inherit] text-xs',
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarFallback, AvatarImage };

export default Avatar;
