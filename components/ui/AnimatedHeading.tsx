'use client';

import { useEffect, useState } from 'react';

/** Per the hero spec: 30ms between characters, 200ms before the first one. */
const charDelay = 30;

/**
 * Splits `text` on \n into lines, then each line into characters. Every
 * character is an inline-block span that transitions opacity and translateX
 * over 500ms, staggered by
 *   (lineIndex * lineLength * charDelay) + (charIndex * charDelay).
 * Spaces render as   so they are not collapsed.
 *
 * The global prefers-reduced-motion block in globals.css collapses every one of
 * these transitions to 0.01ms, so the heading arrives whole and static.
 */
export function AnimatedHeading({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const lines = text.split('\n');

  return (
    <h1 className={className} style={style}>
      {lines.map((line, lineIndex) => {
        const lineLength = line.length;
        return (
          <span key={lineIndex} className="block">
            {line.split('').map((char, charIndex) => (
              <span
                key={charIndex}
                className="inline-block"
                style={{
                  opacity: started ? 1 : 0,
                  transform: started ? 'translateX(0)' : 'translateX(-18px)',
                  transitionProperty: 'opacity, transform',
                  transitionDuration: '500ms',
                  transitionDelay: `${lineIndex * lineLength * charDelay + charIndex * charDelay}ms`,
                }}
              >
                {char === ' ' ? ' ' : char}
              </span>
            ))}
          </span>
        );
      })}
    </h1>
  );
}
