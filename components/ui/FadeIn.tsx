'use client';

import { useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useHydrated } from '@/lib/useHydrated';

/**
 * Opacity-only entrance wrapper, per the hero spec: setTimeout + React state,
 * Tailwind's transition-opacity class, and an inline transitionDuration.
 *
 * THE START STATE IS NOT IN THE SERVER HTML. This used to render the
 * `opacity-0` class outright, which left the hero's supporting line and its
 * primary CTA invisible to anyone whose JS did not run. It now ships bare and
 * is hidden only by the .js-gated [data-enter] rule in globals.css.
 *
 * The visible state is written as an INLINE opacity rather than Tailwind's
 * `opacity-100`, and that is load-bearing: `.js [data-enter]` is an
 * attribute-plus-class selector and outranks a single utility class, so the
 * class form would lose and the content would never come back. Inline styles
 * outrank both.
 *
 * Under reduced motion there is no start state at all, which replaces the old
 * reliance on globals.css collapsing the transition to 0.01ms.
 */
export function FadeIn({
  delay = 0,
  duration = 1000,
  className,
  children,
}: {
  delay?: number;
  duration?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const hydrated = useHydrated();
  const reduce = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const animating = hydrated && !reduce;

  return (
    <div
      data-enter="fade"
      className={`transition-opacity${className ? ` ${className}` : ''}`}
      style={{
        transitionDuration: `${duration}ms`,
        ...(animating ? { opacity: visible ? 1 : 0 } : null),
      }}
    >
      {children}
    </div>
  );
}
