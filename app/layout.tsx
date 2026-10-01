import type { Metadata, Viewport } from 'next';
import { cabinetGrotesk, switzer } from './fonts';
import { BUSINESS, PROVIDERS, SERVICE_PAGES } from '@/lib/content';
import { Navbar1 } from '@/components/ui/navbar-1';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(BUSINESS.domain),
  title: {
    default: 'Psychiatric Nurse Practitioners in NJ and PA | Newpoint',
    template: `%s | ${BUSINESS.shortName}`,
  },
  description:
    'Psychiatric assessment, medication management, and telehealth for New Jersey and Pennsylvania, from two doctorate-prepared nurse practitioners.',
  applicationName: BUSINESS.legalName,
  authors: [{ name: BUSINESS.legalName }],
  /**
   * Both names for the first appointment, and both names for the category.
   *
   * DO NOT COUNT THIS AS SEARCH COVERAGE. Google has ignored meta keywords for
   * years and Bing gives it no useful weight; it is kept because it is free and
   * because it documents the vocabulary, not because it ranks for anything. The
   * real carriers of "psychiatric evaluation" are the /services slug, the
   * assessment page's meta description, and the one sentence of body copy that
   * names the synonym. See the slug note in lib/content.ts.
   */
  keywords: [
    'psychiatric nurse practitioner',
    'medication management',
    'psychiatric assessment',
    'psychiatric evaluation',
    'behavioral health',
    'mental health care',
    'telehealth psychiatry',
    'New Jersey',
    'Pennsylvania',
  ],
  openGraph: {
    type: 'website',
    siteName: BUSINESS.legalName,
    url: BUSINESS.domain,
    title: 'Psychiatric Nurse Practitioners in NJ and PA | Newpoint',
    description:
      'Psychiatric assessment, medication management, and telehealth from two doctorate-prepared psychiatric nurse practitioners serving New Jersey and Pennsylvania.',
    locale: 'en_US',
    // The 1200x630 card is generated at app/opengraph-image.tsx and applies to
    // every route. CLIENT: replace it with a supplied asset if one exists.
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Psychiatric Nurse Practitioners in NJ and PA | Newpoint',
    description:
      'Psychiatric assessment, medication management, and telehealth for New Jersey and Pennsylvania.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: BUSINESS.domain },
};

export const viewport: Viewport = {
  themeColor: '#FBFAF8',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /* suppressHydrationWarning because the inline script in <head> adds the
       `js` class to this element before React hydrates, so the className React
       finds here legitimately differs from the one the server sent. It applies
       to this element only and does not extend into the tree. */
    <html
      lang="en"
      suppressHydrationWarning
      className={`${cabinetGrotesk.variable} ${switzer.variable}`}
    >
      {/* Inter is loaded for the hero section only. The site's type stack stays
          Cabinet Grotesk + Switzer; see the hero wrapper in components/sections/Hero.tsx. */}
      <head>
        {/*
         * Marks the document as scripted, before first paint.
         *
         * Every entrance animation on this site hides its element to begin
         * with. That hidden state lives in CSS behind this class (see the
         * [data-enter] block in globals.css) rather than in a server-rendered
         * inline style, so that markup which arrives without working JS is
         * never invisible. The class is what tells CSS "JS is running, so
         * something will animate this back in".
         *
         * It must stay a plain synchronous script in <head>: next/script, or
         * anything deferred, runs after first paint, which would show the
         * content and then hide it again. beforeInteractive is not available
         * to a Server Component here.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('js')`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/*
         * focus:z-[70], not z-50.
         *
         * The skip link is the first thing a keyboard user reaches, and it
         * positions itself at top-4 — inside the band the sticky navbar
         * occupies. At z-50 it tied with the bar, and because the bar comes
         * later in the DOM the bar won the paint order and covered the link
         * completely on every route, at both widths, in both nav states. That
         * is a WCAG 2.2 SC 2.4.11 Focus Not Obscured failure on the single most
         * important focus target on the site, and it was invisible in review
         * because the link only renders when focused.
         *
         * 70 clears both the bar (50) and the hero's mobile panel (60).
         * Verified by scripts/focus-sweep.mjs.
         */}
        <a
          href="#main"
          className="focus:rounded-input focus:bg-np-surface focus:text-body focus:text-np-ink focus:ring-np-blue-600 sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[70] focus:px-4 focus:py-2 focus:ring-2"
        >
          Skip to content
        </a>
        {/* One navbar for every route. It is STICKY rather than fixed, so it
            reserves its own space on interior pages and no page needs to pad
            for it. The homepage hero pulls itself up by --nav-h to sit under
            it, which is the only special case. z-50 stays below the skip
            link's z-70.

            A <header>, not a <div>: as a direct child of <body> this is the
            site's banner landmark, and it was the only thing missing one. Every
            route audited at 0 banners before this — the PageHero <header> sits
            inside <main>, which correctly does NOT compute to banner, so there
            was nothing for a screen-reader user to jump to. Purely semantic;
            nothing about the layout or the sticky behaviour changes. */}
        <header className="sticky top-0 z-50">
          {/* The submenu is passed down, not imported by the navbar.
              navbar-1.tsx is a client component, and lib/nav.ts's rule is that
              anything larger than those few constants belongs in a server
              component that hands down exactly what it needs. Importing
              SERVICE_PAGES there would put every service page's sections, FAQs
              and metaDescription into the browser bundle to render three links.
              `nav` is the short label the footer already uses; `title` is the
              H1 and runs to "Telehealth psychiatry in New Jersey and
              Pennsylvania", which is not a menu row. */}
          {/* BOTH DROPDOWNS ARE DERIVED, keyed by the parent item's own href.
              A service added to SERVICE_PAGES or a provider added to PROVIDERS
              appears in the navbar with no change here, in lib/nav.ts or in the
              navbar component.

              The mapping happens in this server component on purpose: the
              navbar is 'use client', and importing lib/content.ts from it would
              ship every string on the site to the browser. lib/nav.ts carries
              the NavChild shape and SUBMENU_PARENTS; the data walks down as
              props. See the note at the top of lib/nav.ts. */}
          <Navbar1
            submenus={{
              '/services': SERVICE_PAGES.map((s) => ({
                label: s.nav,
                href: `/services/${s.slug}`,
              })),
              /* `credentials`, not `role`: it is the shorter line and the one
                 that tells the two apart — and it is also what PERMITS the
                 title here. `displayName` carries "Dr.", and CLAUDE.md's
                 condition is that the credentials or "nurse practitioner" must
                 be visible beside it; `detail` is that qualifier, on the same
                 row. A row that dropped `detail` would have to drop the prefix
                 with it. */
              '/providers': PROVIDERS.map((p) => ({
                label: p.displayName,
                href: `/providers/${p.slug}`,
                detail: p.credentials,
              })),
            }}
          />
        </header>
        {children}
      </body>
    </html>
  );
}
