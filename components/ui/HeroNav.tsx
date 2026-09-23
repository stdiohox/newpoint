'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { NAV, CTA, BUSINESS } from '@/lib/content';
import { ButtonWithIcon } from '@/components/ui/ButtonWithIcon';

/**
 * The hero's navbar. The bar itself is transparent: it sits directly on the
 * video and its overlays, with no tint, blur or gradient edge of its own. The
 * mobile panel below still uses .liquid-glass.
 *
 * At md and above this is unchanged: wordmark, the five nav links, and the
 * primary CTA. Below md the links and CTA move into a full-screen panel behind
 * a hamburger button, because the spec's navbar had no mobile navigation at all.
 *
 * Icon paths are lucide's own Menu and X geometry, inlined because lucide-react
 * is not a dependency of this repo. Swapping to <Menu /> and <X /> later is a
 * like-for-like change.
 *
 * The blur sits on the backdrop rather than on the panel: .liquid-glass is
 * unlayered CSS, so its own backdrop-filter and position beat any Tailwind
 * utility of the same name. The panel therefore takes no positioning utilities.
 */
export function HeroNav() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);

    // Lock the page behind the panel, restoring whatever was there before.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    closeRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  return (
    <>
      <div className="px-6 pt-6 md:px-12 lg:px-16">
        <div className="flex items-center justify-between rounded-xl px-4 py-2">
          <span className="text-2xl font-semibold tracking-tight">{BUSINESS.shortName}</span>

          <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm transition-colors hover:text-gray-300"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <span className="hidden md:inline-block">
            <ButtonWithIcon href={CTA.href} size="sm">
              {CTA.label}
            </ButtonWithIcon>
          </span>

          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label="Open menu"
            className="inline-flex items-center justify-center rounded-lg p-2 text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:hidden"
          >
            <svg
              aria-hidden="true"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 backdrop-blur-xl md:hidden" onClick={close}>
          <div className="flex min-h-full items-stretch p-4">
            <div
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              onClick={(event) => event.stopPropagation()}
              className="liquid-glass flex w-full flex-col rounded-2xl p-6 text-white"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl font-semibold tracking-tight">
                  {BUSINESS.shortName}
                </span>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={close}
                  aria-label="Close menu"
                  className="inline-flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <svg
                    aria-hidden="true"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>

              <nav aria-label="Primary, mobile" className="mt-8 flex flex-col">
                {NAV.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    className="rounded-lg py-3 text-lg transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>

              <a
                href={CTA.href}
                onClick={close}
                className="mt-8 rounded-lg bg-white px-6 py-3 text-center font-medium text-black transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {CTA.label}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
