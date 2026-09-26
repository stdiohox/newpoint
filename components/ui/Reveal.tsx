'use client';

import { motion, useReducedMotion } from 'motion/react';
import { ReactNode } from 'react';
import { useHydrated } from '@/lib/useHydrated';

/**
 * Scroll reveal. MOTION_INTENSITY 4, per design-tokens.md section 6.4.
 *
 * Short travel distance (16px) on purpose: long slides read as sluggish, and for
 * an anxious audience they read as friction. Critically damped, nothing
 * overshoots.
 *
 * THE START STATE IS NOT IN THE SERVER HTML. Until this hydrates it renders a
 * plain element with no inline style, carrying only data-enter="up"; the
 * hidden state comes from the .js-gated CSS block in globals.css, which cannot
 * apply unless scripting is on. Without JS the content is simply visible, which
 * is the only acceptable failure mode for a page carrying crisis guidance.
 * Motion then mounts with the identical values, so the handover is invisible.
 *
 * Under reduced motion there is no start state anywhere: the CSS is behind a
 * no-preference query, and this renders the plain element and stops.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
  as = 'div',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'li' | 'section';
}) {
  const reduce = useReducedMotion();
  const hydrated = useHydrated();
  const Tag = as;

  /* Deliberately does not consult `reduce` — useReducedMotion resolves to null
     on the server and to a real boolean on the client, so branching on it here
     would make the first client render disagree with the server HTML. */
  if (!hydrated) {
    return (
      <Tag data-enter="up" className={className}>
        {children}
      </Tag>
    );
  }

  if (reduce) {
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = motion[as];

  return (
    <MotionTag
      data-enter="up"
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </MotionTag>
  );
}
