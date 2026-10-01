/**
 * The handful of constants the CLIENT bundle is allowed to import.
 *
 * WHY THIS FILE EXISTS. `lib/content.ts` holds every string on the site — every
 * service page, both provider bios, the whole FAQ, the payer list and the
 * OPEN_CLIENT_ITEMS notes. `navbar-1.tsx` is a `'use client'` component and it
 * needed three things: the nav links, the CTA and the practice name. Importing
 * them from content.ts pulled that entire module into the browser bundle,
 * because a client component's import graph is shipped to the browser whether
 * or not the values are rendered. Tree-shaking removed some of it and could not
 * remove the rest: a top-level `.flatMap(...)` or any other call expression is
 * something the bundler cannot prove is side-effect free, so it keeps the data
 * alive. That is how seven unconfirmed insurance payers ended up readable in
 * static/chunks/app/layout-*.js while appearing nowhere on the page.
 *
 * So: this file is plain data and imports nothing. Client components import
 * from here. `content.ts` imports FROM this file and re-exports `NAV` and `CTA`
 * for the server components that already read them from there, which keeps one
 * source of truth and means no call site had to change.
 *
 * THE RULE, for anyone adding to this: a `'use client'` component may import
 * from `lib/nav.ts`, `lib/motion.ts`, `lib/utils.ts` and `lib/useHydrated.ts`,
 * and nothing else from `lib/`. Anything larger belongs in a server component
 * that passes what it needs down as props — which is what every other client
 * component here already does.
 */

/**
 * Primary navigation.
 *
 * Every href is root-relative, never a bare `#anchor`, because the nav renders
 * on interior routes as well as the homepage. A bare `#providers` on /insurance
 * would resolve against /insurance and go nowhere.
 */
/**
 * One row of a navbar dropdown.
 *
 * `detail` is an optional second line under the label — the Providers menu
 * shows each provider's credentials there. Services passes none, so its rows
 * are unchanged.
 *
 * THE ROWS ARE PASSED IN, NOT IMPORTED HERE, and that is the one rule this file
 * exists to enforce. Both menus are built from `lib/content.ts` — SERVICE_PAGES
 * and PROVIDERS — and content.ts already imports FROM this file, so importing
 * it back would be circular AND would pull every string on the site into the
 * client bundle, which is the leak the note at the top of this file describes.
 * app/layout.tsx is a server component: it maps the content data down to this
 * shape and hands it to <Navbar1 />. A provider added to PROVIDERS therefore
 * appears in the menu with no change here or in the navbar.
 */
export type NavChild = { label: string; href: string; detail?: string };

/**
 * Which primary items open a dropdown, keyed by the parent's own href.
 *
 * Declared here rather than compared inline in the navbar, which used to test
 * `item.href === '/services'` in two places. A second hardcoded href would have
 * made that four.
 */
export const SUBMENU_PARENTS = ['/services', '/providers'] as const;

export const NAV = [
  { label: 'Services', href: '/services' },
  /* A PAGE, NOT THE HOMEPAGE SECTION. This was `/#providers`, which scrolled
     to the homepage's provider band while /providers/[slug] served a page per
     provider with nothing linking to them as a set. /providers is now that
     set's index, and this one constant feeds all three surfaces — the desktop
     nav, the mobile menu and the footer's Practice column, which derives from
     NAV in components/Footer.tsx. */
  { label: 'Providers', href: '/providers' },
  { label: 'Insurance', href: '/insurance' },
  { label: 'New patients', href: '/new-patients' },
  /* NO "FAQ" AND NO "Contact" ENTRY, as of 2026-10-01, and both were removed
     by client decision rather than lost.

     The FAQ no longer has a page: it was merged into /contact under id="faq",
     and /faq 301s there. Contact has one too, and it is the CTA — the
     "Request an appointment" button below is in the navbar at every width,
     points at /contact, and is the single highest-intent destination on the
     site. A second plain "Contact" link beside it offered the same route in a
     quieter voice.

     THIS ARRAY FEEDS THREE SURFACES, so removing an entry removes it from all
     three at once: the desktop nav, the mobile menu and the footer's Practice
     column. The footer adds "Contact & FAQ" back on its own — see
     CONTACT_AND_FAQ below — because a footer is where a site lists what it
     has, and the CTA button is not in it. */
] as const;

/**
 * The footer's single link to /contact, carrying the one label that is new
 * copy: "Contact & FAQ".
 *
 * It is NOT in NAV. NAV is the navbar's list, and the navbar deliberately
 * carries no Contact link any more; putting it there to get it into the footer
 * would put it back in the bar the client asked to clear. One constant, used
 * once, named for what it is.
 */
export const CONTACT_AND_FAQ = { label: 'Contact & FAQ', href: '/contact' } as const;

/**
 * Single CTA intent across the entire site. Never a second label for this
 * action.
 *
 * `/contact`, NOT `/#contact`. It pointed at the homepage form band, which was
 * right while /contact had no form of its own — it had a "Request an
 * appointment" heading whose own link sent you back to the homepage. /contact
 * now renders the same <ContactCrisis /> the homepage does, so the CTA lands on
 * a page that can actually take the request instead of scrolling another route.
 *
 * The homepage section keeps its `id="contact"` for on-page use; nothing links
 * to `/#contact` any more.
 */
export const CTA = {
  label: 'Request an appointment',
  href: '/contact',
} as const;

/**
 * Just the two names, for the wordmark and its screen-reader label.
 *
 * Deliberately NOT the whole of `BUSINESS`: the navbar has no use for the phone
 * numbers, the fax, the provider inboxes or the service area, and shipping them
 * to the browser to render a logo is how this problem started. `BUSINESS` in
 * content.ts reads its names from here, so the two cannot drift.
 *
 * CLIENT: `legal` is still the assumed spelling — see CLAUDE.md, "Canonical
 * business name". Confirm against the LLC formation documents.
 */
export const BRAND = {
  short: 'Newpoint',
  legal: 'Newpoint Healthcare Services, LLC',
} as const;
