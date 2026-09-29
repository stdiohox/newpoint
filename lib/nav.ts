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
export const NAV = [
  { label: 'Services', href: '/services' },
  { label: 'Providers', href: '/#providers' },
  { label: 'Insurance', href: '/insurance' },
  { label: 'New patients', href: '/new-patients' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'Contact', href: '/contact' },
] as const;

/** Single CTA intent across the entire site. Never a second label for this action. */
export const CTA = {
  label: 'Request an appointment',
  href: '/#contact',
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
