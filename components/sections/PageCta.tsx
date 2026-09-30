import Link from 'next/link';
import { CalendarCheck, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { BUSINESS, CTA } from '@/lib/content';

/**
 * Two things a patient wants to know at the moment of deciding to make contact,
 * and neither is a new claim. "No health details needed" restates the body copy
 * directly above it, which already asks people to keep health information out of
 * the form; saying it as a reassurance rather than an instruction is the point.
 * The states are the confirmed telehealth footprint, per CLAUDE.md's
 * care-modality note.
 *
 * THE SECOND LINE SAYS "Telehealth in", AND DROPPING THOSE TWO WORDS IS A
 * REGULATED MISTAKE, NOT A TRIM. It first read "New Jersey and Pennsylvania",
 * which sat a few lines under a badge saying "In person or by telehealth" and
 * let the pair be read as in-person care in both states. CLAUDE.md is explicit:
 * state telehealth across both states freely, but state in-person care WITHOUT
 * attaching it to a state until the client confirms where, because the only
 * place-level evidence anywhere is Lawrence Township, NJ. The naming is what
 * keeps a Pennsylvania reader from driving to an office nobody has confirmed.
 *
 * Deliberately NOT here: response times, availability, "accepting new patients".
 * All three are the kind of thing a reader would act on and none is sourced.
 */
const assurances = [
  { icon: ShieldCheck, label: 'No health details needed' },
  { icon: MapPin, label: 'Telehealth in New Jersey and Pennsylvania' },
];

/**
 * Closing block for interior pages.
 *
 * THE CRISIS PANEL IS NO LONGER HERE, and the reason it was safe to remove is
 * specific: components/Footer.tsx carries a dedicated crisis strip with tappable
 * 988 and 911, it renders on every route, and it sits immediately below this
 * section. The panel was restating, a few hundred pixels higher, what the footer
 * says anyway. CLAUDE.md asks for crisis guidance where a distressed visitor
 * would plausibly look; the footer strip is that, and it was deliberately placed
 * above the footer's bottom row for the same reason.
 *
 * ONE PAGE LOST SOMETHING REAL, THOUGH. app/services/[slug] puts this block
 * above RelatedLinks precisely so 988 came before a "keep reading" grid on pages
 * that name PTSD, psychosis and schizophrenia. With the panel gone the nearest
 * 988 on those routes is the footer, which is BELOW that grid. See the note at
 * that call site. Putting <CrisisPanel /> on the service detail pages is the fix
 * if that matters.
 *
 * IT IS A CONTAINER, NOT A BAND, AND THAT IS WHAT MAKES THE NAVY WORK AGAIN.
 * The objection to the first version was a deep navy strip running edge to
 * edge. The colour was never really the problem: a full-bleed dark band butts
 * straight into the navy footer, so the two merged into one dark mass and the
 * page ended on a wall. Holding the same navy inside a rounded panel, with the
 * page ground visible all the way around it, gives the block an edge and a
 * shadow line instead of a horizon. The footer then reads as a separate thing
 * below it.
 *
 * THE FILL IS A RADIAL, SMOOTHSTEPPED, AT 0.94 ALPHA. Three decisions there:
 *
 *   radial, not linear, and anchored at 50% 0%. The light pools at the top
 *   centre, exactly where the medallion and the heading sit, and falls away to
 *   the corners. A linear ramp would have put its lightest edge along one side
 *   of a centred composition, which fights it.
 *
 *   np-blue-700 to np-blue-900 rather than one flat navy. Two stops of the same
 *   family give the panel depth without introducing a second hue.
 *
 *   0.94, so the warm page ground lifts it very slightly instead of the panel
 *   being an opaque slab. Measured, the lightest point composites to
 *   rgb(40,65,126) and the darkest to rgb(30,44,80).
 *
 * The stops follow 3t^2-2t^3 for the same reason the hero scrim does: a linear
 * interpolation between two stops has a slope discontinuity at each end, and on
 * a large flat panel that shows as a ring. Regenerate them from the curve rather
 * than hand-editing.
 *
 * Measured on the lightest point, which is the worst case: white heading
 * 9.79:1, white/90 body 8.28:1, white/80 assurances 6.93:1, the white pill
 * 9.79:1, and the secondary button's white/50 ring 3.74:1 against the 3:1
 * SC 1.4.11 wants. The panel itself is 9.39:1 against the page.
 *
 * CENTRED COLUMN, NOT THE 7/5 SPLIT IT REPLACED. With the panel gone there is no
 * second column to balance, and the request reads as a single moment.
 *
 * THE PHONE NUMBER IS A BUTTON. It was a bare underlined link next to a filled
 * button, so the two routes to the same practice looked like a primary action
 * and an afterthought. Calling is the faster route for anyone in distress, and
 * it should not be the quieter one.
 */
export function PageCta({
  heading = 'Ready when you are',
  body = 'Send us your contact details and we will get back to you about an appointment. Please keep health information out of the form.',
}: {
  heading?: string;
  body?: string;
}) {
  return (
    <section className="py-20 md:py-28">
      <Container>
        {/* rounded-3xl, which is a step up from the 14-16px the other cards
            use. Deliberate: this panel is several times their area, and a 14px
            radius on something 1136px wide reads as a square with the corners
            filed off rather than as a rounded object. */}
        <div className="rounded-3xl border border-transparent bg-[radial-gradient(ellipse_130%_110%_at_50%_0%,rgba(27,53,118,0.94)_0%,rgba(26,52,115,0.94)_14.3%,rgba(25,49,108,0.94)_28.6%,rgba(23,44,99,0.94)_42.9%,rgba(20,40,88,0.94)_57.1%,rgba(18,35,79,0.94)_71.4%,rgba(17,32,72,0.94)_85.7%,rgba(16,31,69,0.94)_100%)] px-6 py-16 md:px-12 md:py-20">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <Reveal>
              {/* Two nested plates rather than one filled tile, so the mark reads
                as an object on the panel rather than a sticker on it. Decorative,
                and the h2 below says what this is. */}
              <div className="relative flex size-20 items-center justify-center">
                <div
                  aria-hidden="true"
                  className="rounded-card absolute inset-0 bg-white/10 ring-1 ring-white/25"
                />
                <div
                  aria-hidden="true"
                  className="bg-np-blue-600 absolute inset-1 rounded-[10px]"
                />
                <CalendarCheck
                  aria-hidden="true"
                  size={30}
                  strokeWidth={1.75}
                  className="relative text-white"
                />
              </div>
            </Reveal>

            {/* A fact, not a label. An eyebrow reading "Next step" above a heading
              that already says "Ready when you are" would be the templated move;
              the modality is the thing a reader actually needs here and it is
              confirmed content.

              Kept as a white chip rather than made white-on-white with the rest
              of the copy: it is the one element that should read as a separate
              object. The chip is at least 9.79:1 against the panel and carries
              its np-blue-700 label at 11.55:1 inside. It keeps Badge's own
              border width with a transparent colour, so forced-colors repaints
              an edge rather than dissolving the chip into the panel. */}
            <Reveal delay={0.06}>
              <Badge className="bg-np-surface text-np-blue-700 mt-6 border-transparent">
                In person or by telehealth
              </Badge>
            </Reveal>

            <Reveal delay={0.1}>
              <h2 className="text-h2 mt-5 text-white">{heading}</h2>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="text-body-l mt-4 text-white/90">{body}</p>
            </Reveal>

            <Reveal delay={0.22}>
              {/* Stacked below sm so neither label wraps on a phone: "Request an
                appointment" is 24 characters and does not survive a half-width
                pill at 320.

                The pair swaps roles on a dark ground. `primary` is np-blue-600,
                which would sink into this navy panel, so the filled button is
                white and the outline one carries the white ring. */}
              <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
                <Button href={CTA.href} variant="onInk" size="lg">
                  {CTA.label}
                </Button>
                <Button href={`tel:${BUSINESS.phonePrimaryHref}`} variant="onInkQuiet" size="lg">
                  <Phone aria-hidden="true" size={18} strokeWidth={1.75} />
                  {BUSINESS.phonePrimary}
                </Button>
              </div>
            </Reveal>

            <Reveal delay={0.28}>
              <ul
                role="list"
                className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
              >
                {assurances.map(({ icon: Icon, label }) => (
                  <li key={label} className="text-small flex items-center gap-2 text-white/80">
                    <Icon aria-hidden="true" size={16} strokeWidth={1.75} className="shrink-0" />
                    {label}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}

/**
 * Internal link cluster. Every interior page ends with links to its siblings,
 * which is how link equity reaches pages that the homepage does not link to
 * directly and how a reader gets from one service to the next without the nav.
 */
export function RelatedLinks({
  heading = 'Keep reading',
  links,
  featured = 0,
}: {
  heading?: string;
  links: { label: string; description: string; href: string }[];
  /**
   * How many of the leading cards read as primary.
   *
   * Defaults to 0, so the five routes that were already using this component
   * render exactly as before. app/services/[slug] passes 2: that page ends with
   * six cards, of which the first two are the other two services, and as six
   * identical tiles the sibling services were the least findable thing in the
   * cluster despite being the most relevant.
   *
   * THE GRID IS UNCHANGED AND SO IS THE LINK SET. The promotion is a surface
   * and a hover affordance, not a column span: at lg these are three per row,
   * and giving two of them a wider span would leave a hole or an orphan in the
   * remaining four. Nothing is added, removed or reordered here — the cards a
   * page hands over are the cards it gets.
   */
  featured?: number;
}) {
  if (links.length === 0) return null;

  return (
    <section className="border-np-neutral-200 border-t py-16 md:py-20">
      <Container>
        <Reveal>
          <h2 className="text-h3 text-np-neutral-600">{heading}</h2>
        </Reveal>
        <ul role="list" className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link, i) => {
            const isFeatured = i < featured;

            return (
              <Reveal as="li" key={link.href} delay={i * 0.06}>
                <Link
                  href={link.href}
                  className={`rounded-card ease-np-out group block h-full p-6 ring-1 transition-shadow duration-[180ms] hover:shadow-[var(--shadow-np-card)] ${
                    isFeatured
                      ? /* blue-50 over the page's warm white, with a blue-100
                           hairline instead of the ink ring. Both are already in
                           the system — it is the wash the section-list chips use
                           — so this promotes a card without introducing a
                           surface the site does not already have. The heading
                           starts blue rather than arriving there on hover,
                           which is the whole of the visual difference at rest. */
                        'bg-np-blue-50 ring-np-blue-100'
                      : 'bg-np-surface ring-[var(--np-alpha-ink-08)]'
                  }`}
                >
                  <h3
                    className={`text-h3 group-hover:text-np-blue-600 ease-np-out transition-colors duration-[180ms] ${
                      isFeatured ? 'text-np-blue-700' : ''
                    }`}
                  >
                    {link.label}
                  </h3>
                  <p className="text-small text-np-neutral-600 mt-2">{link.description}</p>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
