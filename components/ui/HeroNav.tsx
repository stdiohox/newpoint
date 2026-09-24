'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { NAV, CTA, BUSINESS } from '@/lib/content';
import { ButtonWithIcon } from '@/components/ui/ButtonWithIcon';

/** Matches --nav-h in globals.css, which also drives scroll-padding-top. */
const NAV_H = 72;

/**
 * The hero's navbar. The bar itself is transparent: it sits directly on the
 * video and its overlays, with no tint, blur or gradient edge of its own. The
 * mobile panel below still uses .liquid-glass.
 *
 * At the desktop breakpoint and above: wordmark, the six nav links, and the
 * primary CTA on one line. Below it the links and CTA move into a full-screen
 * panel behind a hamburger button, because the spec's navbar had no mobile
 * navigation at all.
 *
 * BREAKPOINT: 70em (1120px), not `md`. `md` is 768px, and the row does not fit
 * anywhere near that, so every width from 768px up to ~1050px rendered the
 * wordmark, the links and the CTA crushed together and overlapping. Measured in
 * Chromium with the webfonts loaded, the three groups are 149px + 512px + 231px
 * = 892px of content. The bar's own chrome is 160px at this width (`lg:px-16`
 * on the header, `px-4` on the row), so they only stop overlapping at 1052px,
 * and that is with the wordmark touching the first link.
 *
 * 1116px is where each group clears its neighbour by 32px, which is the same
 * `gap-8` the links already use between themselves. 70em is the next clean
 * value above it and leaves 34.7px. Expressed in em rather than px for the
 * reason WhatToExpect.tsx documents for its own 56.25em: media-query em
 * resolves against the browser's initial font size, so a reader who raises
 * their default text size gets the hamburger at a proportionally wider
 * viewport instead of six widened links overlapping the CTA again.
 *
 * Icon paths are lucide's own Menu and X geometry, inlined because lucide-react
 * is not a dependency of this repo. Swapping to <Menu /> and <X /> later is a
 * like-for-like change.
 *
 * The blur sits on the backdrop rather than on the panel: .liquid-glass is
 * unlayered CSS, so its own backdrop-filter and position beat any Tailwind
 * utility of the same name. The panel therefore takes no positioning utilities.
 *
 * STICKINESS. The bar is `fixed`, not `sticky`. A sticky element is confined to
 * its containing block, and this one lives inside <Hero />, so it would unstick
 * the moment the hero scrolled away — the opposite of what is wanted. Nothing
 * between here and the viewport sets a transform or filter, so `fixed` resolves
 * against the viewport correctly.
 *
 * Over the hero it stays exactly as it was: no background, no blur, no border.
 * Once #hero-end passes under the bar it takes a solid ink fill, which is what
 * keeps the white wordmark and white links readable over ordinary page content.
 * Ink rather than the page's warm white specifically so the existing white mark
 * and white link colour keep working without swapping assets mid-scroll.
 *
 * The announcement pill is not part of this component. It sits in the hero's
 * content column and scrolls away with it, by design.
 */
export function HeroNav() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /** The full-screen overlay. The inert walk starts here, not at the panel. */
  const overlayRef = useRef<HTMLDivElement>(null);

  /**
   * Solid once the end of the hero passes under the bar.
   *
   * Reads the sentinel's live position rather than assuming a viewport height,
   * so it stays correct when the hero grows past min-h-screen or the window is
   * resized. rAF-throttled and passive: this runs on every scroll frame, so it
   * only reads layout and flips one boolean.
   */
  useEffect(() => {
    const sentinel = document.getElementById('hero-end');
    if (!sentinel) {
      setSolid(true);
      return;
    }

    let frame = 0;
    const measure = () => {
      frame = 0;
      setSolid(sentinel.getBoundingClientRect().top <= NAV_H);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  /**
   * Closing is state only. Focus used to be restored here, but the background
   * is now `inert` while the panel is open, and an inert element cannot take
   * focus. This runs synchronously, before React commits the re-render that
   * lifts inert, so focusing the trigger here would silently do nothing. The
   * restore happens in the effect cleanup below, after inert comes off.
   */
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab') return;

      /**
       * Trap Tab inside the panel. `role="dialog" aria-modal="true"` announces
       * the panel as modal, but nothing enforced it for keyboard users: the
       * whole page behind the overlay stayed in the tab order, so tabbing past
       * the last link walked out of the dialog and into the hero underneath.
       */
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    /**
     * Take the rest of the document out of the accessibility tree.
     *
     * The Tab trap above only sees synthetic Tab keydowns. Screen-reader
     * browse-mode arrows (NVDA, JAWS) and VoiceOver/TalkBack swipe gestures
     * walk the accessibility tree directly and never fire one, so they walked
     * straight out of the dialog and into the hero behind it. The APG treats
     * `aria-modal` as a hint to AT, not an enforcement mechanism, and names
     * inert-ing the siblings as the reliable half.
     *
     * This walks up from the overlay and inerts the siblings at each level
     * rather than inert-ing <header> and <main> directly: <HeroNav /> renders
     * inside <Hero />, which is inside <main>, so inert-ing <main> would inert
     * the panel along with everything else. The walk reaches the bar, the hero
     * content, the other six homepage sections, the footer, #top and the skip
     * link, while never touching an ancestor of the panel itself.
     *
     * Elements that already carry inert are left alone and not restored, so a
     * pre-existing inert elsewhere on the page survives the panel closing.
     */
    const inerted: Element[] = [];
    for (let node: Element | null = overlayRef.current; node && node !== document.body;) {
      const parent: HTMLElement | null = node.parentElement;
      if (!parent) break;
      for (const sibling of parent.children) {
        if (sibling !== node && !sibling.hasAttribute('inert')) {
          sibling.setAttribute('inert', '');
          inerted.push(sibling);
        }
      }
      node = parent;
    }

    /**
     * Close if the viewport crosses back above the breakpoint while the panel
     * is open. Without this, CSS alone hid the overlay AND the hamburger at
     * 70em while `open` stayed true, so the cleanup below never ran: the page
     * kept `overflow: hidden` with no visible way to unlock it. Dragging a
     * window wider, un-maximising, or opening devtools was enough to freeze
     * the page. Escape still worked, but nothing told the user that.
     */
    const desktop = window.matchMedia('(min-width: 70em)');
    const onBreakpointChange = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener('change', onBreakpointChange);

    // Lock the page behind the panel, restoring whatever was there before.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    closeRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      desktop.removeEventListener('change', onBreakpointChange);
      document.body.style.overflow = previousOverflow;
      for (const el of inerted) el.removeAttribute('inert');

      /**
       * Only after inert is off, or the trigger cannot take focus. It is also
       * `min-[70em]:hidden`, so on the resize path above there is nothing to
       * focus and this is a no-op: focus falls to the body and the desktop nav
       * that just appeared is the next tab stop.
       *
       * Read at cleanup time on purpose. exhaustive-deps wants the node copied
       * into a variable at effect setup, but that is the wrong node to focus:
       * the point is to hand focus back to whatever the trigger is when the
       * panel actually closes. A snapshot would go stale if React ever swapped
       * the button, and focusing a detached node silently does nothing.
       */
      // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
      triggerRef.current?.focus();
    };
  }, [open, close]);

  return (
    <>
      <header
        className={`ease-np-out fixed inset-x-0 top-0 z-50 px-6 py-3 transition-colors duration-300 motion-reduce:transition-none md:px-12 lg:px-16 ${
          solid ? 'bg-np-ink' : 'bg-transparent'
        }`}
      >
        {/* Contrast scrim for the transparent state.
            Measured against the 1080p poster frame: white nav text over the raw
            footage reaches a median of 3.25:1 and a worst case of 1.75:1 — every
            pixel of the nav band is under WCAG AA. This gradient buys it back
            without a bar or a blur: worst case 4.93:1 at the very bottom edge of the bar,
            nothing in the text band under 4.5:1. It is the same #1F3B5C the hero already uses for its
            bottom-up gradient, and it fades out well above the headline, so the
            hero still reads as an uninterrupted frame.
            It is removed entirely once the bar goes solid, where the ink fill
            carries the contrast at 17:1 on its own. */}
        {!solid && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[200%] bg-gradient-to-b from-[#1F3B5C]/85 via-[#1F3B5C]/55 to-transparent"
          />
        )}
        <div className="relative flex h-[calc(var(--nav-h)-1.5rem)] items-center justify-between rounded-xl px-4">
          <a href="#top" aria-label="Newpoint home" className="inline-flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- a fixed-size
                inline SVG mark; next/image adds no optimisation for SVG. */}
            <img src="/brand/newpoint-mark-white.svg" alt="" className="h-8 w-auto" />
            <span className="text-2xl font-semibold tracking-tight">{BUSINESS.shortName}</span>
          </a>

          <nav aria-label="Primary" className="hidden items-center gap-8 min-[70em]:flex">
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

          <span className="hidden min-[70em]:inline-block">
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
            className="inline-flex items-center justify-center rounded-lg p-2 text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white min-[70em]:hidden"
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
      </header>

      {open && (
        // z-60: above the fixed bar (z-50), so the panel covers it while open.
        <div
          ref={overlayRef}
          className="fixed inset-0 z-[60] backdrop-blur-xl min-[70em]:hidden"
          onClick={close}
        >
          <div className="flex min-h-full items-stretch p-4">
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              onClick={(event) => event.stopPropagation()}
              className="liquid-glass flex w-full flex-col rounded-2xl p-6 text-white"
            >
              <div className="flex items-center justify-between">
                <a
                  href="#top"
                  aria-label="Newpoint home"
                  onClick={close}
                  className="inline-flex items-center gap-2.5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- a fixed-size
                      inline SVG mark; next/image adds no optimisation for SVG. */}
                  <img src="/brand/newpoint-mark-white.svg" alt="" className="h-8 w-auto" />
                  <span className="text-2xl font-semibold tracking-tight">
                    {BUSINESS.shortName}
                  </span>
                </a>
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
