/**
 * Server-safe motion helpers.
 *
 * Kept out of components/ui/Reveal.tsx deliberately: that module is
 * 'use client', and anything exported from it becomes a client reference that
 * server components cannot call.
 */

/** Stagger delay in seconds. Caps at six items, past which the cascade stops adding value. */
export function stagger(index: number, step = 0.06, cap = 6) {
  return Math.min(index, cap) * step;
}
