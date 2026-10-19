'use client';

import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { useHydrated } from '@/lib/useHydrated';

/**
 * A surface that leans a few degrees toward the mouse. The same behaviour as
 * the /providers cards (components/ui/ProviderCard.tsx), as a wrapper so a
 * server component can use it around plain markup.
 *
 * - SPRING, NOT A TRANSITION, so it is interruptible: moving the pointer
 *   mid-settle retargets from the current angle. stiffness 220 / damping 22 /
 *   mass 0.4 is a damping ratio of about 1.17, so it settles without overshoot.
 * - MOUSE ONLY. pointermove fires for touch too, and a finger scrolling the
 *   page would otherwise tilt whatever it passed over.
 * - NOTHING 3D IS WRITTEN until the client has hydrated AND has not asked for
 *   reduced motion. Gating on `reduce` alone would put a transform in the
 *   server HTML that a reduced-motion client then drops: a hydration mismatch.
 *   Under reduced motion the surface is simply static.
 */
export function Tilt({
  children,
  maxTilt = 3,
  className = '',
}: {
  children: ReactNode;
  /** Degrees at the edge of the surface. Kept small: this is a clinical site. */
  maxTilt?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const hydrated = useHydrated();
  const tilt = hydrated && !reduce;

  /* Pointer position within the surface, in [-0.5, 0.5]. */
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 220, damping: 22, mass: 0.4 });
  const sy = useSpring(py, { stiffness: 220, damping: 22, mass: 0.4 });

  /* rotateX is inverted so the surface leans TOWARD the pointer. */
  const rotateY = useTransform(sx, [-0.5, 0.5], [-maxTilt, maxTilt]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [maxTilt, -maxTilt]);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!tilt || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width || !r.height) return;
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };

  const onLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    /* perspective on the wrapper, not the surface: a rotation without it is a
       flat skew rather than a tilt. */
    <div
      className={className}
      style={{ perspective: 1000 }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <motion.div style={tilt ? { rotateX, rotateY } : undefined}>
        {children}
      </motion.div>
    </div>
  );
}
