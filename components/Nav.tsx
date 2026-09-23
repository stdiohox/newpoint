'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { NAV, CTA, BUSINESS } from '@/lib/content';

/**
 * Interior-page navigation. The homepage uses <HeroNav /> instead, which sits
 * transparently on the video; this is its opaque counterpart for pages that
 * open on the warm ground.
 *
 * Single line at desktop, 72px tall, inside the 80px cap. Translucent with
 * content scrolling underneath, per the Apple materials note.
 *
 * CLIENT: the wordmark is set in type beside the existing mark. The original
 * logo file (vector preferred) has not been supplied, and the mark is carried
 * forward unchanged rather than redesigned.
 */
export function Nav() {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <header className="border-np-neutral-200 bg-np-neutral-50/85 supports-[not(backdrop-filter:blur(0))]:bg-np-neutral-50 sticky top-0 z-40 border-b backdrop-blur-md">
      <Container>
        <div className="flex h-[72px] items-center justify-between gap-6">
          <Link
            href="/"
            className="font-display text-body-l text-np-ink font-semibold tracking-[-0.02em]"
          >
            {BUSINESS.shortName}
            <span className="sr-only"> {BUSINESS.legalName}, home</span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-small text-np-neutral-700 ease-np-out hover:text-np-blue-600 transition-colors duration-[180ms]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button href={CTA.href} className="hidden sm:inline-flex">
              {CTA.label}
            </Button>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              className="rounded-input text-small text-np-ink px-3 py-2 font-medium ring-1 ring-[var(--np-alpha-ink-12)] lg:hidden"
            >
              {open ? 'Close' : 'Menu'}
            </button>
          </div>
        </div>
      </Container>

      <AnimatePresence initial={false}>
        {open && (
          <motion.nav
            id="mobile-nav"
            aria-label="Primary, mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0.01 : 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="border-np-neutral-200 overflow-hidden border-t lg:hidden"
          >
            <Container>
              <ul className="flex flex-col py-2">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="text-body text-np-neutral-700 block py-3"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li className="py-3 sm:hidden">
                  <Button href={CTA.href}>{CTA.label}</Button>
                </li>
              </ul>
            </Container>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
