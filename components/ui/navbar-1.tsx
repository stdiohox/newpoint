'use client';

import * as React from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ChevronDown, Menu, X } from 'lucide-react';
/* lib/nav.ts, NOT lib/content.ts. This is a client component, so whatever it
   imports is shipped to the browser — importing the copy module put every
   provider bio, FAQ answer and payer name into a public chunk. nav.ts holds
   only these three and imports nothing. See the note at the top of it. */
import { NAV, CTA, BRAND, type NavChild } from '@/lib/nav';
import { useHydrated } from '@/lib/useHydrated';

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

/**
 * One entry of a submenu. The shape lives in lib/nav.ts, which is also where
 * SUBMENU_PARENTS declares which primary items open one.
 */
export type { NavChild };

export function Navbar1({
  submenus = {},
}: {
  /**
   * Dropdown rows, keyed by the PARENT ITEM'S OWN href.
   *
   * Keyed rather than one prop per menu, so adding a third dropdown is a key
   * here and an entry in SUBMENU_PARENTS, not another prop threaded through
   * two render branches. app/layout.tsx builds both from lib/content.ts.
   */
  submenus?: Partial<Record<string, readonly NavChild[]>>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const reduce = useReducedMotion();
  const hydrated = useHydrated();
  const pathname = usePathname();
  const panelId = useId();
  const submenuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /**
   * The Services submenu.
   *
   * A DISCLOSURE, NOT role="menu". The ARIA Authoring Practices are explicit
   * that menu/menuitem is for application menus, where arrow keys move a single
   * roving tabstop and Tab leaves the whole widget. Site navigation is a list of
   * links, and giving it menu semantics tells a screen-reader user to expect
   * keys that do not work here and removes each link from the Tab order they do
   * expect. So: a button with aria-expanded, controlling a plain list of links.
   *
   * THE LABEL STAYS A LINK. /services is a real page and the hub the three
   * children are reached from, so it keeps its own tab stop and its own
   * destination; the chevron beside it is a separate control that only opens
   * the list. Folding both into one button would have cost the destination, and
   * the usual workaround, a first child reading "All services", spends a row of
   * the menu restating the thing the reader just pointed at.
   */
  const [openKey, setOpenKey] = useState<string | null>(null);
  /**
   * Whether the pointer opened it. A click that opens should PIN the submenu,
   * or moving the mouse away closes what the user just deliberately opened;
   * a hover that opens should close on leave. Without this flag the two
   * mechanisms fight and the panel flickers shut under the cursor.
   */
  const pinnedRef = useRef(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* One node per parent href, so the outside-click, focus-leave and Escape
     handlers can ask about whichever menu is currently open. */
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  /**
   * The open flag mirrored into a ref, so handlers read the live value.
   *
   * The click handler cannot read `openKey` out of its render closure: the
   * pointer has to cross the group to reach the chevron, so hover has already
   * opened it, and the click then lands in whatever render existed when the
   * listener was attached. That is the difference between pinning what hover
   * opened and slamming it shut under the cursor. Not the state updater form
   * either, because deciding `pinned` inside it would be a side effect and
   * StrictMode invokes updaters twice.
   */
  const openRef = useRef<string | null>(null);

  const setSubmenu = useCallback((next: string | null, pinned: boolean) => {
    /* Clear here rather than at each call site. A pending hover-close timer
       belongs to whichever menu was open when it was armed; once the open menu
       changes it would fire against the new one. Not reachable through the
       current handlers, but it is one line to make it impossible. */
    clearTimeout(hoverTimer.current ?? undefined);
    openRef.current = next;
    pinnedRef.current = pinned;
    setOpenKey(next);
  }, []);

  const closeSubmenu = useCallback(() => {
    clearTimeout(hoverTimer.current ?? undefined);
    setSubmenu(null, false);
  }, [setSubmenu]);

  /**
   * State only. Focus restore happens in the effect cleanup, after inert comes
   * off: an inert element cannot take focus, and this runs synchronously
   * before React commits the re-render that lifts it.
   */
  const close = useCallback(() => setIsOpen(false), []);
  const toggleMenu = () => setIsOpen((v) => !v);

  /**
   * Close the submenu on Escape, on a pointer press outside it, and when focus
   * leaves the group entirely.
   *
   * FOCUS LEAVING MATTERS AS MUCH AS THE OTHER TWO. Tabbing off the last link
   * has to shut it, or a keyboard user ends up with an open panel behind them
   * that the mouse never opened and no visible way to dismiss. `focusin` on the
   * document is what catches it: focusout on the container fires before the new
   * element has focus, so relatedTarget is unreliable in some browsers.
   *
   * Escape returns focus to the chevron, but ONLY when focus is inside the
   * group. A hover-opened panel can be dismissed with Escape while the caret is
   * somewhere else entirely, and yanking focus to the navbar from wherever the
   * user actually was is worse than the open panel.
   */
  useEffect(() => {
    if (!openKey) return;
    const group = () => groupRefs.current[openKey];
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const inside = group()?.contains(document.activeElement);
      closeSubmenu();
      if (inside) btnRefs.current[openKey]?.focus();
    };
    const outside = (e: Event) => {
      if (!group()?.contains(e.target as Node)) closeSubmenu();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
    };
  }, [openKey, closeSubmenu]);

  /** A route change closes it; otherwise it survives the navigation it caused. */
  useEffect(() => {
    closeSubmenu();
  }, [pathname, closeSubmenu]);

  useEffect(() => () => clearTimeout(hoverTimer.current ?? undefined), []);

  /**
   * Hover opens only where hovering is real. A coarse pointer fires synthetic
   * mouseenter on tap, which would open the panel on the same tap that follows
   * the link. The guard keeps touch on click-to-toggle.
   */
  const canHover = () =>
    typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

  const hoverOpen = (key: string) => {
    if (!canHover()) return;
    const open = openRef.current;
    /* DO NOT PULL A PANEL OUT FROM UNDER THE KEYBOARD. With two menus, a mouse
       resting near the navbar can drift over the other trigger while focus sits
       on a child link of the open one; swapping openKey would unmount the
       focused element and drop focus to the body (SC 2.4.3). hoverClose has
       always had this guard; with a second menu hoverOpen needs it too. */
    const active = document.activeElement;
    const openGroup = open ? groupRefs.current[open] : null;
    /* Only when focus is inside the open PANEL, not merely inside the group.
       Clicking a chevron leaves focus on that chevron, which is in the group —
       guarding on the group would then block hover from ever switching menus
       after a click, which is the ordinary way to move between two of them.
       `closest('ul')` is the panel list; the trigger and the parent link are
       not in one. */
    if (open && open !== key && openGroup && active && openGroup.contains(active) && active.closest('ul'))
      return;
    /* PIN DOES NOT TRANSFER. `pinnedRef` is shared by both menus, so passing it
       straight through handed a click-pinned state to a menu the pointer had
       merely hovered: it then ignored mouseleave and stayed open as if it had
       been clicked. Only carry the pin when this is the menu that already
       holds it. */
    setSubmenu(key, open === key ? pinnedRef.current : false);
  };
  const hoverClose = (key: string) => {
    if (!canHover() || pinnedRef.current) return;
    /* Do not close what the keyboard is standing in. If hover opened the panel
       and the user then tabbed into a child link, a mouse leave would hide the
       element holding focus and drop it to the body. */
    if (groupRefs.current[key]?.contains(document.activeElement)) return;
    clearTimeout(hoverTimer.current ?? undefined);
    /* A gap between the label and the panel would otherwise close it while the
       pointer crosses. 120ms covers the travel without feeling sticky. */
    hoverTimer.current = setTimeout(() => setSubmenu(null, false), 120);
  };

  /**
   * Pointer toggle.
   *
   * THE FIRST BRANCH IS THE WHOLE POINT. Reaching the chevron means crossing the
   * group, so on a hover device the panel is ALREADY open and unpinned by the
   * time the click lands. Toggling from there would close it on the click the
   * user made to keep it, which is what a plain `!open` did. Clicking an
   * unpinned open panel pins it instead; everything else toggles.
   */
  const toggleSubmenu = (key: string) => {
    if (openRef.current === key && !pinnedRef.current) {
      setSubmenu(key, true);
      return;
    }
    const next = openRef.current === key ? null : key;
    setSubmenu(next, next !== null);
  };

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
        {BRAND.short}
        <span className="sr-only"> {BRAND.legal}, home</span>
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
          {NAV.map((item) => {
            /* Both the dropdown items and the plain ones come through here;
               a parent with no rows supplied falls back to a plain link, which
               is what kept /services a link before any service existed. */
            const children = submenus[item.href] ?? [];
            const hasSubmenu = children.length > 0;
            const isSubmenuOpen = openKey === item.href;
            const panelId = `${submenuId}-${item.href.replace(/\W+/g, '-')}`;
            return (
              <motion.div
                key={item.href}
                /* The start state is CSS, never a server-rendered inline style:
                 the primary navigation must not need JS to be visible. Motion
                 writes nothing on the server because `initial` is false and
                 `animate` is undefined until hydration; once `animate` lands it
                 picks the hidden values up from the computed style that the
                 .js-gated [data-enter] rule applied before first paint. */
                data-enter="down"
                initial={false}
                animate={hydrated && !reduce ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: 0.3 }}
                /* NO HOVER SCALE ON THE ITEM THAT OWNS THE SUBMENU. The panel is
                   absolutely positioned inside this element, so a 1.05 on the
                   wrapper scales a 256px dropdown along with the 60px label and
                   the panel visibly grows as the pointer enters it. Losing the
                   flourish on one of six labels is the cheaper trade.

                   IT IS `scale: 1`, NOT `undefined`, AND THAT IS NOT A STYLE
                   CHOICE. Dropping the prop stopped Motion running this item's
                   ENTRANCE: it sat at the [data-enter="down"] start state,
                   opacity 0 and translateY(-10px), so "Services" was missing
                   from the bar while the other five faded in. An explicit no-op
                   keeps the animation wired and changes nothing on hover. */
                whileHover={reduce ? undefined : { scale: hasSubmenu ? 1 : 1.05 }}
              >
                {hasSubmenu ? (
                  <div
                    ref={(node) => {
                      groupRefs.current[item.href] = node;
                    }}
                    className="relative"
                    onMouseEnter={() => hoverOpen(item.href)}
                    onMouseLeave={() => hoverClose(item.href)}
                  >
                    <div className="flex items-center gap-1">
                      {/* aria-current="true", not "page", when only a CHILD is
                          current. isActive matches by prefix, so on
                          /services/telehealth both this and the child link
                          claimed to be the page and a screen reader announced
                          two current items in one nav. "true" says "in this
                          branch" without claiming to be the destination.

                          onClick closes it because pathname does not change
                          when this is clicked from /services itself, so the
                          route effect never fires and a hover-opened panel
                          would sit there over the page it just re-entered. */}
                      <Link
                        href={item.href}
                        aria-current={
                          pathname === item.href ? 'page' : isActive(item.href) ? 'true' : undefined
                        }
                        onClick={closeSubmenu}
                        className="text-np-ink hover:text-np-neutral-700 focus-visible:outline-np-blue-600 rounded text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 aria-[current=page]:underline aria-[current=page]:underline-offset-8 motion-reduce:transition-none"
                      >
                        {item.label}
                      </Link>
                      {/* The name is on the link, so this control needs its own.
                        "Services submenu" rather than a bare "Expand": in a
                        screen reader's control list every nav would otherwise
                        read the same.

                        p-1.5 not p-1: at p-1 the hit area was exactly 24x24,
                        which passes SC 2.5.8 with nothing to spare. */}
                      <button
                        ref={(node) => {
                          btnRefs.current[item.href] = node;
                        }}
                        type="button"
                        aria-label={`${item.label} submenu`}
                        aria-expanded={isSubmenuOpen}
                        aria-controls={panelId}
                        onClick={() => toggleSubmenu(item.href)}
                        className="text-np-ink hover:text-np-neutral-700 focus-visible:outline-np-blue-600 -m-1.5 rounded p-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none"
                      >
                        <ChevronDown
                          aria-hidden="true"
                          size={16}
                          strokeWidth={2}
                          className={`transition-transform duration-[180ms] motion-reduce:transition-none ${
                            isSubmenuOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* THE 12px OFFSET IS PADDING ON A WRAPPER, NOT A MARGIN ON
                        THE PANEL, and that is a behaviour fix rather than a
                        styling preference. As a margin it was dead space: the
                        pointer left the group crossing it, fired mouseleave, and
                        the panel only survived because the 120ms timer outran
                        the trip. As padding the gap belongs to the hoverable
                        element, so the pointer never leaves at all and the timer
                        is back to being a safety net.

                        The wrapper is absolute and the panel fills it, so the
                        drop shadow still reads against the page. */}
                    <AnimatePresence>
                      {isSubmenuOpen && (
                        <motion.div
                          className="absolute top-full left-0 z-20 pt-3"
                          initial={reduce ? false : { opacity: 0, y: -6 }}
                          animate={reduce ? undefined : { opacity: 1, y: 0 }}
                          exit={reduce ? undefined : { opacity: 0, y: -6 }}
                          transition={{ duration: 0.16 }}
                        >
                          <ul
                            id={panelId}
                            role="list"
                            aria-label={`${item.label} pages`}
                            /* border-transparent alongside the ring: forced-colors
                             drops box-shadows, which is what a Tailwind ring and
                             this shadow both are, and the panel would lose its
                             edge against the page entirely. */
                            className="rounded-card ring-np-neutral-200 w-64 border border-transparent bg-white p-2 shadow-lg ring-1"
                          >
                            {children.map((child) => (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  aria-current={isActive(child.href) ? 'page' : undefined}
                                  onClick={closeSubmenu}
                                  className="text-np-ink hover:bg-np-neutral-100 focus-visible:outline-np-blue-600 block rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 aria-[current=page]:underline aria-[current=page]:underline-offset-4 motion-reduce:transition-none"
                                >
                                  {child.label}
                                  {/* The secondary line sits INSIDE the link, so
                                      it joins the accessible name: "Funmilayo
                                      Whitaker DNP, FNP-BC, PMHNP-BC". That is
                                      what tells the two rows apart when they are
                                      read out of context in a links list.

                                      font-normal because the row is font-medium;
                                      without it the credentials inherit the
                                      weight and compete with the name. Services
                                      passes no detail, so its rows render
                                      exactly as before. */}
                                  {child.detail && (
                                    <span className="text-np-neutral-600 mt-0.5 block text-xs font-normal">
                                      {child.detail}
                                    </span>
                                  )}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className="text-np-ink hover:text-np-neutral-700 focus-visible:outline-np-blue-600 rounded text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 aria-[current=page]:underline aria-[current=page]:underline-offset-8 motion-reduce:transition-none"
                  >
                    {item.label}
                  </Link>
                )}
              </motion.div>
            );
          })}
        </nav>

        <motion.div
          className="hidden min-[70em]:block"
          /* Same handover as the nav links above. */
          data-enter="right"
          initial={false}
          animate={hydrated && !reduce ? { opacity: 1, x: 0 } : undefined}
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
            /* SCROLLABLE, AND IT HAD TO BECOME SO. This is fixed inset-0 with
               the body scroll locked, so anything past the viewport was simply
               unreachable. Six links, the CTA and the gaps already came to
               about 450px under a 96px top padding; the three service children
               add roughly 120px. That overflows a landscape phone and, more
               sharply, a 400% zoom viewport of about 256px, which is SC 1.4.10
               Reflow. overscroll-contain stops the scroll chaining to the
               locked body behind it. */
            className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-white px-6 pt-24 pb-10 min-[70em]:hidden"
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

                  {/* OPEN, NOT A SECOND DISCLOSURE. The desktop submenu is
                      collapsed because a nav bar has no room for it; this panel
                      is a full-screen sheet with room to spare, and three extra
                      links do not justify another control to press, another
                      aria-expanded to get right, or another thing inside the
                      dialog's focus trap. They are simply indented under their
                      parent. */}
                  {(submenus[item.href] ?? []).length > 0 && (
                    <ul
                      role="list"
                      aria-label={`${item.label} pages`}
                      className="border-np-neutral-200 mt-4 space-y-4 border-l pl-4"
                    >
                      {(submenus[item.href] ?? []).map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            aria-current={isActive(child.href) ? 'page' : undefined}
                            className="text-np-neutral-600 focus-visible:outline-np-blue-600 rounded text-base focus-visible:outline-2 focus-visible:outline-offset-4 aria-[current=page]:underline aria-[current=page]:underline-offset-8"
                            onClick={close}
                          >
                            {child.label}
                            {/* Same secondary line as the desktop panel. */}
                            {child.detail && (
                              /* np-neutral-600, not 500. At 14px normal weight
                                 this is not large text, so SC 1.4.3 wants
                                 4.5:1 and neutral-500 (#7c776d) measures about
                                 4.45:1 on white — a miss, and it also made the
                                 secondary line lighter than the name above it.
                                 neutral-600 is about 7.1:1 and matches the
                                 desktop panel. */
                              <span className="text-np-neutral-600 mt-0.5 block text-sm">
                                {child.detail}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
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
