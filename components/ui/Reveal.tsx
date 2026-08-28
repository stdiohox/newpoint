'use client';

import { motion, useReducedMotion } from 'motion/react';
import { ReactNode } from 'react';

/**
 * Scroll reveal. MOTION_INTENSITY 4, per design-tokens.md section 6.4.
 *
 * Short travel distance (16px) on purpose: long slides read as sluggish, and for
 * an anxious audience they read as friction. Critically damped, nothing
 * overshoots. Collapses to a plain opacity change under reduced motion.
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
  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: reduce ? 0.2 : 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </MotionTag>
  );
}
