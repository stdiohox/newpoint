'use client';

import * as React from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { NAV, CTA, BUSINESS } from '@/lib/content';

/**
 * The supplied Navbar1 block. Layout, classes and motion are the block's; the
 * changes are the ones the brief listed.
 *
 * BREAKPOINT is 70em, not md. That is the width the previous navbar switched
 * at, measured: the wordmark, six links and the CTA need about 892px of
 * content and do not fit below it. `md:` would have put six links into a 768px
 * pill. Every md: in the block becomes min-[70em]:.
 *
 * THE MOBILE PANEL KEEPS THE BLOCK'S LOOK and inherits the previous navbar's
 * entire modal contract, none of which the block had: role="dialog",
 * aria-modal, a Tab trap, Escape, scroll lock, inert on everything behind it,
 * focus returning to the trigger, and closing when the viewport crosses back
 * above 70em. The last one matters because CSS alone would hide the panel AND
 * the hamburger at 70em while `open` stayed true, leaving the page scroll
 * locked with no way to release it.
 *
 * THE PILL CARRIES min-h-[60px] so the bar is the same height in both modes.
 * Without it the CTA's own padding made the desktop bar 108px and the
 * hamburger one 104px, and --nav-h, which the hero's negative margin and
 * scroll-padding-top both read, can only hold one number.
 *
 * REDUCED MOTION removes the entrance, hover and slide animations rather than
 * shortening them. Under `reduce` the variants are not passed at all, so
 * nothing moves; a zero-length transition still moves the element.
 */

/** Matches --nav-h in globals.css, which drives scroll-padding-top. */
const DESKTOP = '(min-width: 70em)';

export function Navbar1() {
  const [isOpen, setIsOpen] = useState(false);
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /**
   * State only. Focus restore happens in the effect cleanup, after inert comes
   * off: an inert element cannot take focus, and this runs synchronously
   * before React commits the re-render that lifts it.
   */
  const close = useCallback(() => setIsOpen(false), []);
  const toggleMenu = () => setIsOpen((v) => !v);

  /** An in-page anchor like /#faq is "current" only when we are on that page. */
  const isActive = (href: string) => {
    const [path] = href.split('#');
    const base = path === '' ? '/' : path.replace(/\/$/, '') || '/';
    if (href.includes('#')) return false;
    return pathname === base || (base !== '/' && pathname.startsWith(base + '/'));
  };

  useEffect(() => {
    if (!isOpen) return;

    /*
     * Held as a local, not read back off the ref in the cleanup. React detaches
     * refs during the mutation phase, so by the time a passive cleanup runs
     * panelRef.current is already null and the cleanup's write goes nowhere.
     * The node itself outlives that — AnimatePresence keeps it mounted for the
     * exit spring — so the node is what the cleanup needs to hold.
     *
     * The removeAttribute clears the inert a previous cleanup set, for the case
     * where the panel is reopened while still animating out and Motion hands
     * back the same node rather than a fresh one.
     */
    const panel = panelRef.current;
    panel?.removeAttribute('inert');

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab') return;
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
     * Take everything behind the panel out of the accessibility tree and the
     * tab order. The Tab trap above only sees synthetic Tab keydowns; screen
     * reader browse-mode arrows and swipe gestures walk the tree directly and
     * fire none, so aria-modal alone does not contain them.
     *
     * Siblings are inerted level by level walking up from the panel, never an
     * ancestor of it. Anything already inert is left alone and not restored.
     */
    const inerted: Element[] = [];
    for (let node: Element | null = panel; node && node !== document.body;) {
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

    const desktop = window.matchMedia(DESKTOP);
    const onBreakpointChange = () => {
      if (desktop.matches) setIsOpen(false);
    };
    desktop.addEventListener('change', onBreakpointChange);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    closeRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      desktop.removeEventListener('change', onBreakpointChange);
      document.body.style.overflow = previousOverflow;
      for (const el of inerted) el.removeAttribute('inert');
      /*
       * The panel itself goes inert on the way out. AnimatePresence keeps the
       * node mounted for the length of the exit spring — about a second — and
       * measured, it sits there at opacity 0 with pointer-events: auto and
       * seven still-tabbable links. Tab pressed straight after Escape landed
       * on invisible off-screen content, and the sliding panel swallowed
       * clicks meant for the page underneath.
       *
       * It has to be done to the node, not as an `inert={!isOpen}` prop:
       * React has already unmounted this child by the time it is exiting, so
       * the prop would keep whatever value it last rendered with and never
       * reach false.
       */
      panel?.setAttribute('inert', '');
      /*
       * Read at cleanup time on purpose. exhaustive-deps wants the node copied
       * into a variable at effect setup, but that is the wrong node to focus:
       * the point is to hand focus back to whatever the trigger is when the
       * panel actually closes. A snapshot goes stale if React swaps the
       * button, and focusing a detached node silently does nothing.
       */
      // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
      triggerRef.current?.focus();
    };
  }, [isOpen, close]);

  const logo = (
    <Link
      href="/"
      className="focus-visible:outline-np-blue-600 flex items-center gap-2.5 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed-size
          inline SVG mark; next/image adds no optimisation for SVG. */}
      <img src="/brand/newpoint-mark-ink.svg" alt="" className="h-8 w-auto" />
      <span className="text-np-ink text-xl font-semibold tracking-tight">
        {BUSINESS.shortName}
        <span className="sr-only"> {BUSINESS.legalName}, home</span>
      </span>
    </Link>
  );

  return (
    <div className="flex w-full justify-center px-4 py-6">
      <div className="relative z-10 flex min-h-[60px] w-full max-w-6xl items-center justify-between rounded-full bg-white px-6 py-3 shadow-lg">
        <div className="flex items-center">
          <motion.div
            className="mr-6"
            initial={reduce ? false : { scale: 0.8 }}
            animate={reduce ? undefined : { scale: 1 }}
            whileHover={reduce ? undefined : { scale: 1.03 }}
            transition={{ duration: 0.3 }}
          >
            {logo}
          </motion.div>
        </div>

        <nav aria-label="Primary" className="hidden items-center space-x-8 min-[70em]:flex">
          {NAV.map((item) => (
            <motion.div
              key={item.href}
              initial={reduce ? false : { opacity: 0, y: -10 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              whileHover={reduce ? undefined : { scale: 1.05 }}
            >
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className="text-np-ink hover:text-np-neutral-700 focus-visible:outline-np-blue-600 rounded text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 aria-[current=page]:underline aria-[current=page]:underline-offset-8 motion-reduce:transition-none"
              >
                {item.label}
              </Link>
            </motion.div>
          ))}
        </nav>

        <motion.div
          className="hidden min-[70em]:block"
          initial={reduce ? false : { opacity: 0, x: 20 }}
          animate={reduce ? undefined : { opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          whileHover={reduce ? undefined : { scale: 1.05 }}
        >
          {/* Filled np-blue-900, not the hero's glass: glass over a white pill
              shows nothing. White on np-blue-900 measures 16.10:1. */}
          <Link
            href={CTA.href}
            className="bg-np-blue-900 hover:bg-np-blue-700 focus-visible:outline-np-blue-900 inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-medium whitespace-nowrap text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none"
          >
            {CTA.label}
          </Link>
        </motion.div>

        <motion.button
          ref={triggerRef}
          type="button"
          aria-label="Open menu"
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="focus-visible:outline-np-blue-600 flex items-center rounded-full p-1 focus-visible:outline-2 focus-visible:outline-offset-2 min-[70em]:hidden"
          onClick={toggleMenu}
          whileTap={reduce ? undefined : { scale: 0.9 }}
        >
          <Menu aria-hidden="true" className="text-np-ink h-6 w-6" />
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-50 bg-white px-6 pt-24 min-[70em]:hidden"
            initial={reduce ? false : { opacity: 0, x: '100%' }}
            animate={reduce ? undefined : { opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <motion.button
              ref={closeRef}
              type="button"
              aria-label="Close menu"
              className="focus-visible:outline-np-blue-600 absolute top-6 right-6 rounded-full p-2 focus-visible:outline-2 focus-visible:outline-offset-2"
              onClick={close}
              whileTap={reduce ? undefined : { scale: 0.9 }}
              initial={reduce ? false : { opacity: 0 }}
              animate={reduce ? undefined : { opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <X aria-hidden="true" className="text-np-ink h-6 w-6" />
            </motion.button>

            <nav aria-label="Primary, mobile" className="flex flex-col space-y-6">
              {NAV.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={reduce ? false : { opacity: 0, x: 20 }}
                  animate={reduce ? undefined : { opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 + 0.1 }}
                  exit={reduce ? undefined : { opacity: 0, x: 20 }}
                >
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className="text-np-ink focus-visible:outline-np-blue-600 rounded text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-4 aria-[current=page]:underline aria-[current=page]:underline-offset-8"
                    onClick={close}
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                initial={reduce ? false : { opacity: 0, y: 20 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                exit={reduce ? undefined : { opacity: 0, y: 20 }}
                className="pt-6"
              >
                <Link
                  href={CTA.href}
                  className="bg-np-blue-900 hover:bg-np-blue-700 focus-visible:outline-np-blue-900 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-base font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none"
                  onClick={close}
                >
                  {CTA.label}
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
