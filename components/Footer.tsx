import Image from 'next/image';
import Link from 'next/link';
import { ButtonWithIcon } from '@/components/ui/ButtonWithIcon';
import {
  BUSINESS,
  CONTACT_AND_FAQ,
  CRISIS,
  CTA,
  FOOTER,
  NAV,
  PROVIDERS,
  SERVICE_PAGES,
} from '@/lib/content';

/**
 * Site footer, on every route.
 *
 * AN INSET PANEL, NOT A FULL-BLEED BAND. It takes the Providers section's
 * geometry deliberately: the same px-6 / md:px-12 / lg:px-16 gutters and the
 * same 28px-to-48px radius at the same min-[960px] breakpoint. Those two are
 * now the only np-blue-900 panels on the site, so matching them makes the
 * footer read as the closing bookend to that section rather than as a third,
 * slightly-different dark treatment. Only the top corners are rounded; the
 * panel runs to the bottom of the document.
 *
 * ONE COLUMN SOURCE OF TRUTH PER LIST. Services is SERVICE_PAGES, Practice is
 * NAV with the Services entry filtered out (it has its own column), Contact is
 * BUSINESS and PROVIDERS. Nothing is hand-listed, so a new service page or a
 * nav change appears here without anyone remembering to update the footer, and
 * the footer cannot list a route that does not exist.
 *
 * CONTRAST, measured against np-blue-900 (#101f45): white/80 body and links
 * are 10.7:1, white headings 15.6:1, and white/60 on the bottom row 6.3:1.
 * All clear of 4.5:1, so this passes AA at every size rather than relying on
 * the large-text allowance.
 *
 * `on-ink` swaps the global blue-600 focus ring for white, which globals.css
 * measures at 1.93:1 against this ground. Every link here is keyboard-visible
 * because of it.
 *
 * NO ENTRANCE ANIMATION, deliberately. The footer is the one part of the page
 * a visitor scrolls to on purpose, usually to find a phone number, and motion
 * there delays the thing they came for. It also keeps the footer off the
 * .js-gated entrance path, so it renders identically with JavaScript disabled.
 *
 * CLIENT: no street address is published or confirmed, so no address block
 * exists here by design. Geography is stated as service area only. Add a
 * PostalAddress here and in lib/schema.ts together, once confirmed.
 * CLIENT: hours of operation are not published, so no hours block is shown.
 * CLIENT: there are no privacy, terms or accessibility routes to link to. The
 * bottom row carries the disclaimer only. Add the links here once those pages
 * exist.
 */

/**
 * Practice column: everything in the primary nav except Services, which has
 * its own column beside it, plus the one link the navbar does not carry.
 *
 * CONTACT_AND_FAQ IS APPENDED, NOT IN NAV. The navbar lost its "FAQ" and
 * "Contact" entries on 2026-10-01 — the FAQ was merged into /contact and the
 * CTA button already points there — but a footer lists what a site has, and
 * the CTA button is not in the footer. So one link, under the label the client
 * asked for, and it is the last entry in the column because it is the one that
 * is not a section of the practice.
 */
const PRACTICE_LINKS = [
  ...NAV.filter((item) => item.href !== '/services'),
  CONTACT_AND_FAQ,
];

/** Shared link treatment. white/80 to white, with the hairline underline on
    hover rather than on rest so six stacked links do not read as a ruled list. */
const linkClass =
  'text-small text-white/80 underline-offset-4 transition-colors duration-[180ms] hover:text-white hover:underline focus-visible:text-white focus-visible:underline motion-reduce:transition-none';

const headingClass = 'text-caption tracking-[0.08em] text-white uppercase';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="px-6 md:px-12 lg:px-16">
      <div className="bg-np-blue-900 on-ink rounded-t-[28px] px-6 py-14 text-white min-[960px]:rounded-t-[48px] min-[960px]:px-10 min-[960px]:py-16">
        {/* TOP ROW. Identity on the left, the site's single CTA on the right.
            The `on-ink` ButtonWithIcon, not the hero's `glass`: glass tints
            with np-blue-900/35, which over this panel's own np-blue-900
            composites back to np-blue-900 and leaves the pill with no body.
            `on-ink` lightens instead, which is what a flat ground allows. See
            the variant's note in ButtonWithIcon. */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
          <div className="max-w-[46ch]">
            <Link
              href="/"
              className="flex w-fit items-center gap-2.5 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <Image
                src="/brand/newpoint-mark-white.svg"
                alt=""
                width={36}
                height={36}
                className="h-9 w-auto"
              />
              <span className="font-display text-xl font-semibold tracking-tight text-white">
                {BUSINESS.shortName}
                <span className="sr-only"> {BUSINESS.legalName}, home</span>
              </span>
            </Link>
            <p className="text-body mt-5 text-white/80">{FOOTER.description}</p>
          </div>

          <div className="lg:pt-2">
            <ButtonWithIcon href={CTA.href} variant="on-ink">
              {CTA.label}
            </ButtonWithIcon>
          </div>
        </div>

        {/* CRISIS STRIP, AND IT IS ABOVE THE LINK COLUMNS ON PURPOSE.
            It used to sit between the columns and the bottom row, with a
            comment saying it was placed so that "someone in crisis scanning a
            footer should not have to read past a services list to find it".
            The stacking order did not deliver that. The columns are
            sm:grid-cols-2 md:grid-cols-3, so on a phone they are one column of
            three stacked groups — 3 services, 5 practice links, a phone number
            and two provider inboxes — and the strip landed below all of it.
            Measured on /services/medication-management at 390, moving it here
            brings 988 704px closer.

            This is the only crisis guidance on /insurance, /providers/[slug]
            and /services, so its position is the whole of the coverage there.

            The hairline is not decoration: np-blue-800 measures 1.22:1 against
            this ground, enough to read as a raised surface but not enough to
            draw its own edge. */}
        <div className="bg-np-blue-800 mt-14 rounded-xl px-5 py-4 ring-1 ring-white/15">
          <p className="text-small text-white">
            {FOOTER.crisis.before}{' '}
            <a
              href="tel:988"
              aria-label="988, Suicide and Crisis Lifeline"
              className="font-medium text-white underline decoration-white/40 underline-offset-4 transition-colors duration-[180ms] hover:decoration-white motion-reduce:transition-none"
            >
              988
            </a>
            {FOOTER.crisis.between}{' '}
            <a
              href="tel:911"
              aria-label="911, medical emergency"
              className="font-medium text-white underline decoration-white/40 underline-offset-4 transition-colors duration-[180ms] hover:decoration-white motion-reduce:transition-none"
            >
              911
            </a>
            {FOOTER.crisis.after}
          </p>

          {/* THE WARNING BELONGS BESIDE THE NUMBERS, and until now it was not
              anywhere near them.

              CRISIS.body used to reach a reader through CrisisPanel, which
              renders on the homepage and /contact and used to render on the
              service routes as well. It came off /services/psychiatric-
              evaluation with the panel on 2026-09-30, and the only thing left
              carrying "not monitored around the clock" on that route was
              FOOTER.legalNote — which sits below three stacked link columns,
              in the smallest type on the page, decoupled from the 988 and 911
              it qualifies. A reader was being told to call 988 in one place
              and that nobody is watching this site a long scroll later.

              Pairing them is what makes the warning actionable, so it is said
              here, in the same panel, in the practice's own existing words.
              This is CRISIS.body verbatim; no new string.

              IT REPEATS TWICE OVER, AND BOTH ARE ACCEPTED RATHER THAN
              OVERLOOKED.

              Against legalNote, on "not monitored around the clock": legalNote
              is a general disclaimer about medical advice and belongs in the
              legal row, while this is safety guidance and belongs with the
              numbers. If one of the two has to go later, this is the one to
              keep.

              Against CrisisPanel, on the five routes that still render it:
              those pages now carry this sentence twice, once mid-page beside
              the panel's numbers and once here beside the footer's. That is
              the right kind of repetition. Each instance qualifies its own set
              of numbers, they are a full page apart, and a reader who meets
              only one of them still gets the warning with the number it
              applies to. The alternative was making a global footer depend on
              which route it is rendering under.

              white/80 measures 8.99:1 on the np-blue-800 strip, against the
              13.19:1 of the line above it. Quieter than the numbers, which is
              the intended order of reading, and far clear of AA. */}
          <p className="text-small mt-2 text-white/80">{CRISIS.body}</p>
        </div>

        {/* LINK COLUMNS. Three at md and up, stacked at mobile. Every href is a
            route that exists; see the note above about derivation. */}
        <nav
          aria-label="Footer"
          className="mt-14 grid gap-10 sm:grid-cols-2 md:grid-cols-3 md:gap-8"
        >
          <div>
            <h2 className={headingClass}>{FOOTER.columns.services}</h2>
            <ul role="list" className="mt-4 space-y-3">
              {SERVICE_PAGES.map((service) => (
                <li key={service.slug}>
                  <Link href={`/services/${service.slug}`} className={linkClass}>
                    {service.nav}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={headingClass}>{FOOTER.columns.practice}</h2>
            <ul role="list" className="mt-4 space-y-3">
              {PRACTICE_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={headingClass}>{FOOTER.columns.contact}</h2>
            <ul role="list" className="mt-4 space-y-3">
              <li>
                <a href={`tel:${BUSINESS.phonePrimaryHref}`} className={linkClass}>
                  {BUSINESS.phonePrimary}
                </a>
              </li>
              {/* The two provider inboxes, because there is no practice-wide
                  one. Each is labelled with the provider's name: an address on
                  its own tells a patient nothing about who reads it. */}
              {PROVIDERS.map((p) => (
                <li key={p.email}>
                  <a href={`mailto:${p.email}`} className={linkClass}>
                    {p.email}
                  </a>
                  {/* `name`, NOT `displayName`, and that is the condition the
                      client set rather than an oversight: "Dr." may only render
                      where the credentials or the words "nurse practitioner"
                      are visible beside it. This line is a name under an email
                      address in a footer column with no room for a role, so it
                      keeps the plain name. See CLAUDE.md, clinician titles. */}
                  <span className="text-small block text-white/60">{p.name}</span>
                </li>
              ))}
            </ul>
            {/* The full stop is added here, not in the constant. DELIVERY_LINE
                carries none because most of its call sites are labels — a pill,
                a meta row, a modality row — and this is one of the few places
                it stands as a sentence beside prose that is punctuated. */}
            <p className="text-small mt-5 max-w-[30ch] text-white/80">{FOOTER.modality}.</p>
          </div>
        </nav>

        {/* BOTTOM ROW. */}
        <div className="mt-10 border-t border-white/15 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
            <p className="text-caption text-white/60">
              &copy; {year} {BUSINESS.legalName}
            </p>
            <p className="text-caption max-w-[62ch] text-white/60">{FOOTER.legalNote}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
