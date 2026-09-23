'use client';

import { useEffect, useState } from 'react';

/**
 * Opacity-only entrance wrapper, per the hero spec: setTimeout + React state,
 * Tailwind's transition-opacity class, and an inline transitionDuration.
 *
 * The global prefers-reduced-motion block in globals.css collapses the
 * transition to 0.01ms, so the content appears without movement.
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

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`transition-opacity ${visible ? 'opacity-100' : 'opacity-0'}${
        className ? ` ${className}` : ''
      }`}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}
