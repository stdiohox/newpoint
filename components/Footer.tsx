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
 * measures against bg-white/95 over the scene. Glyph-core measurement — the
 * card captured twice, once with its text painted and once with it
 * transparent, worst case being the darkest backdrop pixel under any glyph
 * core — re-run on 2026-10-04 against the 70%-photograph-plus-overlay
 * composite, at 1440, 1024, 768, 390 and 320, every scroll position:
 *
 *   np-ink        15.57:1    the wordmark and the crisis line
 *   np-blue-700   10.57:1    988 and 911
 *   np-neutral-600 6.48:1    body, links at rest, column headings, legal
 *   np-neutral-500 4.11:1    FAILED — not used here any more
 *
 * The darkest backdrop found anywhere under a glyph was L = 0.9065 (#f6f5f3),
 * and it barely moves across the five widths: the overlay's job is partly that
 * — it takes the photograph's own range out of the card's backdrop, so the
 * numbers no longer depend on which part of the meadow a line happens to sit
 * over. Lightening the scene cannot lower these, but darkening it can, so
 * re-measure if the overlay or the 70% ever changes.
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
    /* bg-white under everything, and it is not decoration: the photograph is
       painted at 70% now, so SOMETHING has to be the other 30%. Leaning on the
       page background would make the footer's tone depend on whatever route it
       is sitting at the bottom of. */
    <footer className="relative min-h-[100svh] overflow-hidden bg-white">
      {/* THE PHOTOGRAPH. Decorative — the footer's own content says everything
          the footer means — so alt="" with aria-hidden on the wrapper. It is a
          background in the layout sense but a real <Image> rather than a CSS
          background, so it goes through the optimiser and gets a srcset; the
          wrapper does the bg-cover / bg-center job.

          70%, on the WRAPPER rather than the <Image>, so the optimiser's own
          element keeps its default compositing and one layer carries the
          fade. */}
      <div aria-hidden="true" className="absolute inset-0 z-0 opacity-70">
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

      {/* THE OVERLAY, between the photograph and the flowers. White at the top
          where the card sits, easing into np-blue-100 (#e3eaf8) at the foot
          where the flowers are — so the scene reads as light sky above and
          brand-tinted meadow below, and the card is never floating on a busy
          patch of photograph.

          THE STOPS ARE CHOSEN TO LEAVE THE PICTURE IN THE PICTURE. 0.45 white
          at the top is the most this will take: with the photograph already at
          70%, 0.45 leaves the top of the frame at 0.70 x 0.55 = 38% of the
          original image, which still reads as a photograph. Past about 0.6 it
          goes flat white and the brief's "not washed out" is lost. The bottom
          stop is deliberately the weakest (0.18) because the flowers are drawn
          over it and a tint strong enough to matter there would haze them. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-10 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0.28)_45%,rgba(227,234,248,0.18)_100%)]"
      />

      {/* THE CUT-OUT BAND. The parallax layer, at z-20: above the photograph
          and the overlay, below the card. */}
      <FooterFlowers src="/images/footer/footer-flowers-band.webp" width={2752} height={1036} />

      {/* THE CARD, at z-30 — above everything.

          THE FLOWERS NO LONGER OVERLAP IT, AND THE BOTTOM PADDING IS WHY.
          Until 2026-10-04 the card carried md:pb-[31rem] so the band could
          rise over 500 points of empty card: flowers in front of the panel,
          which was the HAUL pattern's look. It cost the disclaimer line, which
          the stems cut through. Raising the card above the band would have
          fixed the legibility and left the stems disappearing behind an opaque
          white edge, so the overlap is gone instead of merely reordered, and
          the empty card padding with it.

          THE CLEARANCE IS ARITHMETIC, not a tuned number, and both halves live
          in FooterParallax.tsx. The band's top is at

              sectionHeight + 64 (the -bottom-16 anchor) - BAND + y

          and y bottoms out at -TRAVEL = -40 at the top of the footer's scroll.
          The card's bottom edge is at sectionHeight - thisPadding. Setting the
          padding to exactly BAND leaves

              64 - 40 = 24px of clearance at the worst scroll position,
              64 + 40 = 104px once the footer has settled,

          at every viewport width, every card height and every text size —
          because both sides are written in the same max(280px,38vw) and the
          card's own height cancels out of the comparison. Change one of the
          three (padding, BAND, TRAVEL) and the margin moves; change the
          padding to anything that is not BAND and the proof is gone. */}
      <div className="relative z-30 px-4 pt-10 pb-[max(280px,38vw)] md:px-8">
        <FooterCard className="rounded-2xl bg-white/95 p-6 pb-10 shadow-xl backdrop-blur-sm sm:p-8 md:rounded-3xl md:p-10 mx-auto w-full max-w-7xl">
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

            {/* min-w-0 BECAUSE A GRID TRACK WILL NOT SHRINK PAST ITS CONTENT
                otherwise: a grid item's min-width is auto, so an unbreakable
                24-character address sets this column's floor and pushes the
                whole nav wider than the card. The wrap rule below is what lets
                the address break; this is what lets the column follow it. */}
            <div className="min-w-0">
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
                    {/* `anywhere`, NOT `break-word`, and only on the addresses.
                        At 200% text these two 24-character strings are the one
                        thing on the card that cannot wrap: measured at a 32px
                        root they ran 76px past the card edge at 1024 and 164px
                        at 768, and the footer's overflow-hidden then cut them
                        off with no way to scroll to them — SC 1.4.4, found by
                        a11y-architect. break-word only breaks a word when the
                        line is otherwise empty, which is not this case; the
                        address has a label beside it in the flex and prose
                        line-box. Scoped to the addresses because anywhere also
                        counts the break opportunity when computing min-content
                        width, and applying it to every link would let short
                        nav labels break mid-word too. */}
                    <a
                      href={`mailto:${p.email}`}
                      className={`${linkClass} [overflow-wrap:anywhere]`}
                    >
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
              there. Nothing may ever be drawn over it; the flower band used to
              be the standing risk and no longer reaches the card at all.

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
