'use client';

import { useReducedMotion } from 'motion/react';
import { Fragment, useEffect, useState } from 'react';
import { useHydrated } from '@/lib/useHydrated';

/** Per the hero spec: 30ms between characters, 200ms before the first one. */
const charDelay = 30;

/**
 * Splits `text` on \n into lines, each line into words, each word into
 * characters. Every character transitions opacity and translateX over 500ms,
 * staggered by
 *   (lineIndex * lineLength * charDelay) + (charIndex * charDelay)
 * where charIndex counts across the whole line, spaces included, so the
 * timing is identical to the un-wrapped version.
 *
 * Words are wrapped in `inline-block whitespace-nowrap` spans and separated by
 * a real space, so a line can only break between words. Without this the
 * per-character spans let the browser break anywhere, producing "New Jersey an
 * / d Pennsylvania".
 *
 * The characters are aria-hidden and the heading carries the full text as an
 * aria-label, so screen readers announce one sentence rather than spelling it.
 *
 * THE H1 IS NEVER HIDDEN IN THE SERVER HTML. These spans used to carry
 * opacity: 0 inline, which meant the page's only H1 — the thing that says what
 * the practice does — was invisible to anyone whose JS did not run. The hidden
 * state now comes from the .js-gated [data-enter="left"] rule in globals.css,
 * and the inline transition styles are only written once this has hydrated.
 *
 * Under reduced motion there is no start state at all: the CSS rule sits behind
 * a no-preference query and `animating` is false, so the heading is simply
 * there. That replaces the old reliance on globals.css collapsing the
 * transition to 0.01ms, which only worked because the start state was inline.
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
  const hydrated = useHydrated();
  const reduce = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const lines = text.split('\n');

  /* Only ever true in the browser, with motion allowed. Everywhere else this
     returns undefined and the span carries no inline style at all, so the
     letter is visible unless the .js CSS hides it. */
  const animating = hydrated && !reduce;

  const charStyle = (delay: number): React.CSSProperties | undefined =>
    animating
      ? {
          opacity: started ? 1 : 0,
          transform: started ? 'translateX(0)' : 'translateX(-18px)',
          transitionProperty: 'opacity, transform',
          transitionDuration: '500ms',
          transitionDelay: `${delay}ms`,
        }
      : undefined;

  return (
    <h1 className={className} style={style} aria-label={text.replace(/\n/g, ' ')}>
      {lines.map((line, lineIndex) => {
        const lineLength = line.length;
        const words = line.split(' ');
        const lineOffset = lineIndex * lineLength * charDelay;

        // Start index of each word within the line, counting the single space
        // that follows every word but the last.
        let wordStart = 0;

        return (
          <span key={lineIndex} className="block">
            {words.map((word, wordIndex) => {
              const start = wordStart;
              wordStart += word.length + 1;
              const isLast = wordIndex === words.length - 1;

              return (
                <Fragment key={wordIndex}>
                  <span className="inline-block whitespace-nowrap">
                    {word.split('').map((char, i) => (
                      <span
                        key={i}
                        aria-hidden="true"
                        data-enter="left"
                        className="inline-block"
                        style={charStyle(lineOffset + (start + i) * charDelay)}
                      >
                        {char}
                      </span>
                    ))}
                  </span>
                  {/* A real, breakable space. Deliberately not inline-block:
                      an atomic inline box would remove the break opportunity
                      between words, which is the whole point of this change. */}
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      data-enter="left"
                      style={charStyle(lineOffset + (start + word.length) * charDelay)}
                    >
                      {' '}
                    </span>
                  )}
                </Fragment>
              );
            })}
          </span>
        );
      })}
    </h1>
  );
}
