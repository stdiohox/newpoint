import Image from 'next/image';
import Link from 'next/link';
import { ButtonWithIcon } from '@/components/ui/ButtonWithIcon';
import { FooterCard, FooterFlowers } from '@/components/FooterParallax';
import {
  BUSINESS,
  CONTACT_AND_FAQ,
  CRISIS,
  CTA,
  DELIVERY_LINE,
  FOOTER,
  NAV,
  PROVIDERS,
  SERVICE_PAGES,
} from '@/lib/content';

/**
 * Site footer, on every route.
 *
 * A PARALLAX SCENE WITH A CARD ON IT, since 2026-10-04. It was an inset
 * np-blue-900 panel before that, matching the Providers section's geometry;
 * the client asked for the HAUL parallax-footer pattern instead. What is taken
 * from that pattern is the composition — a full-height photograph, a cut-out
 * foreground band that drifts against it on scroll, and a light card floating
 * over both. What is NOT taken: its Inter override (this site has its own type
 * stack), its "View Below" spacer, and its social row. None of the three was
 * asked for.
 *
 * ONE COLUMN SOURCE OF TRUTH PER LIST, unchanged. Services is SERVICE_PAGES,
 * Practice is NAV with the Services entry filtered out (it has its own column)
 * plus CONTACT_AND_FAQ, Contact is BUSINESS and PROVIDERS. Nothing is
 * hand-listed, so a new service page or a nav change appears here without
 * anyone remembering to update the footer, and the footer cannot list a route
 * that does not exist. Every label is the one it had on the navy panel.
 *
 * THE CARD IS WHITE NOW, SO EVERY COLOUR MOVED WITH IT, AND ONE OF THEM HAD
 * TO CHANGE. The old panel measured its copy against np-blue-900; this one
 * measures against bg-white/95 over a photograph, which composites to about
 * #fdfdfe over the bright sky and #f5f6f5 over the dark foliage. Measured on
 * the worse of the two:
 *
 *   np-ink        15.72:1    the crisis numbers
 *   np-blue-600    8.16:1    links on hover and focus
 *   np-neutral-600 6.54:1    body, links at rest, column headings
 *   np-neutral-500 4.11:1    FAILS — not used here any more
 *
 * np-neutral-500 is the quiet grey this card first used for the column
 * headings, the provider names and the whole bottom bar. It is 4.45:1 on pure
 * white before the photograph is taken into account, so it was never passing;
 * a11y-architect caught it, and an earlier version of this note claimed the
 * card was "all clear of 4.5:1" without having measured that one. Everything
 * is np-neutral-600 now.
 *
 * The crisis strip keeps a ground of its own for the reason it had one before:
 * it should read as a distinct object rather than as another paragraph.
 *
 * THE ENTRANCE IS NEW, AND THE OLD NOTE SAYING THERE IS NONE IS GONE. That
 * note argued the footer is scrolled to on purpose and motion delays the phone
 * number. Two things answer it: the card's fade is 500ms and starts as soon as
 * any part of it enters the viewport, so it has resolved before a reader has
 * finished scrolling to it; and the hidden state lives only in the .js-gated
 * CSS, so with JavaScript off or reduced motion on, the card and its numbers
 * are simply there. See components/FooterParallax.tsx.
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
const PRACTICE_LINKS = [...NAV.filter((item) => item.href !== '/services'), CONTACT_AND_FAQ];

/** Shared link treatment. Hover and focus go to brand blue with a hairline
    underline, rather than underlining at rest so a stacked column does not
    read as a ruled list. */
const linkClass =
  'text-small text-np-neutral-600 underline-offset-4 transition-colors duration-[180ms] hover:text-np-blue-600 hover:underline focus-visible:text-np-blue-600 focus-visible:underline motion-reduce:transition-none';

const headingClass = 'text-caption tracking-[0.08em] text-np-neutral-600 uppercase';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    /* MIN-HEIGHT, NOT HEIGHT, AND THE CARD IS IN FLOW AT EVERY WIDTH.
       The brief asked for a full-screen scene with the card absolutely
       positioned over it, and that is what this was — until the card was
       measured at 200% text size. With the card out of flow the section's
       height is fixed, so at 1280x800 the card ran 165px past the bottom edge
       and at 1024x768 it ran 370px past; `overflow-hidden` then cut the legal
       row off with no way to scroll to it. That is an SC 1.4.4 failure on
       every route, and a11y-architect flagged it.

       `min-h-[100svh]` keeps the scene exactly as tall as it looks today
       whenever the card fits — which is every viewport at normal text size —
       and lets it grow when the card does. svh, not vh: on iOS vh is the
       height with the browser chrome retracted, so a 100vh footer is taller
       than the screen until the user scrolls. */
    <footer className="relative min-h-[100svh] overflow-hidden">
      {/* THE PHOTOGRAPH. Decorative — the footer's own content says everything
          the footer means — so alt="" with aria-hidden on the wrapper. It is a
          background in the layout sense but a real <Image> rather than a CSS
          background, so it goes through the optimiser and gets a srcset; the
          wrapper does the bg-cover / bg-center job. */}
      <div aria-hidden="true" className="absolute inset-0 z-0">
        <Image
          src="/images/footer/footer-bg-2400.webp"
          alt=""
          fill
          loading="lazy"
          quality={82}
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      {/* THE CUT-OUT BAND, in front of the card. This is the parallax layer and
          the reason the card carries deep bottom padding: the flowers are meant
          to overlap its lower edge, which is the whole look. Nothing readable
          is placed in the overlap. */}
      <FooterFlowers src="/images/footer/footer-flowers-band.webp" width={2752} height={1036} />

      {/* THE CARD. z-10 puts it above the photograph and below the flowers.

          THE DEEP PADDING MOVES BETWEEN THE CARD AND THE WRAPPER, and which
          one holds it is what decides whether the flowers overlap the card or
          sit under it.

          From md it is on the CARD (pb-[31rem]): the band then rises over 500
          points of empty card, which is the parallax-footer look — flowers in
          front of the panel rather than beside it. Below md it is on the
          WRAPPER instead, because a phone card is already a screen and a half
          tall and half a screen of empty white inside it would be absurd;
          there the band simply sits below the card.

          Either way the number is the same calculation: the band's height plus
          the gap the text needs, less the 64px the band already hangs past the
          bottom edge. */}
      <div className="relative z-10 px-4 pt-10 pb-[19rem] md:px-8 md:pt-10 md:pb-10">
        <FooterCard className="rounded-2xl bg-white/95 p-6 pb-10 shadow-xl backdrop-blur-sm sm:p-8 md:rounded-3xl md:p-10 md:pb-[31rem] mx-auto w-full max-w-7xl">
          {/* TOP ROW. Identity on the left, the site's single CTA on the right. */}
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between md:gap-10 lg:gap-12">
            <div className="max-w-[46ch]">
              <Link
                href="/"
                className="focus-visible:outline-np-blue-600 flex w-fit items-center gap-2.5 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                {/* The colour mark, not the white one: this card is white. */}
                <Image
                  src="/brand/newpoint-mark-color.png"
                  alt=""
                  width={36}
                  height={36}
                  className="h-9 w-auto"
                />
                <span className="font-display text-np-ink text-xl font-semibold tracking-tight">
                  {BUSINESS.shortName}
                  <span className="sr-only"> {BUSINESS.legalName}, home</span>
                </span>
              </Link>
              <p className="text-body text-np-neutral-600 mt-5">{FOOTER.description}</p>
            </div>

            <div className="md:pt-1">
              {/* The default filled variant, not `on-ink`: that one lightens for
                  a dark ground and would wash out on this card. */}
              <ButtonWithIcon href={CTA.href}>{CTA.label}</ButtonWithIcon>
            </div>
          </div>

          {/* LINK COLUMNS. Three at md and up, stacked at mobile. */}
          <nav
            aria-label="Footer"
            className="mt-10 grid gap-8 sm:grid-cols-2 md:mt-8 md:grid-cols-3"
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
                    one. Each is labelled with the provider's name: an address
                    on its own tells a patient nothing about who reads it. */}
                {PROVIDERS.map((p) => (
                  <li key={p.email}>
                    <a href={`mailto:${p.email}`} className={linkClass}>
                      {p.email}
                    </a>
                    {/* `name`, NOT `displayName`, and that is the condition the
                        client set rather than an oversight: "Dr." may only
                        render where the credentials or the words "nurse
                        practitioner" are visible beside it. This line is a name
                        under an email address in a footer column with no room
                        for a role, so it keeps the plain name. See CLAUDE.md,
                        clinician titles. */}
                    <span className="text-small text-np-neutral-600 block">{p.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* CRISIS STRIP. It sat above the link columns on the navy panel,
              because there it was one scroll behind three stacked lists. Here
              the card is a single object, so the strip sits with the bottom
              bar — still inside the card on every width measured, and now on a
              tinted ground inside a white card rather than a lighter navy
              inside a dark one.

              IT IS THE ONLY CRISIS GUIDANCE on /insurance, /providers/[slug]
              and /services, so its position is the whole of the coverage
              there. It must never end up under the flower band: the card's
              bottom padding is what the flowers overlap, and this strip sits
              above that padding.

              np-blue-50 ground, np-ink numbers at 15.4:1 and np-neutral-600
              body at 6.3:1. */}
          <div className="bg-np-blue-50 mt-10 rounded-xl px-5 py-4 md:mt-8 ring-1 ring-[var(--np-alpha-ink-08)]">
            <p className="text-small text-np-ink">
              {FOOTER.crisis.before}{' '}
              <a
                href="tel:988"
                aria-label="988, Suicide and Crisis Lifeline"
                className="text-np-blue-700 decoration-np-blue-700/40 hover:decoration-np-blue-700 font-medium underline underline-offset-4 transition-colors duration-[180ms] motion-reduce:transition-none"
              >
                988
              </a>
              {FOOTER.crisis.between}{' '}
              <a
                href="tel:911"
                aria-label="911, medical emergency"
                className="text-np-blue-700 decoration-np-blue-700/40 hover:decoration-np-blue-700 font-medium underline underline-offset-4 transition-colors duration-[180ms] motion-reduce:transition-none"
              >
                911
              </a>
              {FOOTER.crisis.after}
            </p>
            {/* CRISIS.body verbatim, beside the numbers it qualifies — the
                pairing is what makes the warning actionable. The long note on
                the navy version explained why it repeats against legalNote and
                against CrisisPanel; both arguments still hold and neither is
                restated here. */}
            <p className="text-small text-np-neutral-600 mt-2">{CRISIS.body}</p>
          </div>

          {/* BOTTOM BAR. */}
          <div className="border-np-neutral-200 mt-6 border-t pt-5 md:mt-5 md:pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
              <p className="text-caption text-np-neutral-600">
                &copy; {year} {BUSINESS.legalName}
              </p>
              {/* The full stop is added here, not in the constant.
                  DELIVERY_LINE carries none because most of its call sites are
                  labels — a pill, a meta row, a modality row — and this is one
                  of the few places it stands as a sentence beside prose that is
                  punctuated. */}
              <p className="text-caption text-np-neutral-600">{DELIVERY_LINE}.</p>
            </div>
            <p className="text-caption text-np-neutral-600 mt-3 max-w-[72ch]">{FOOTER.legalNote}</p>
          </div>
        </FooterCard>
      </div>
    </footer>
  );
}
