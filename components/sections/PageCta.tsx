import Image from 'next/image';
import Link from 'next/link';
import { CalendarCheck, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { BUSINESS, CTA, DELIVERY_LINE } from '@/lib/content';

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
  { icon: MapPin, label: DELIVERY_LINE },
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
 * THE FILL IS TWO RADIALS OVER A PHOTOGRAPH: a 0.45 veil across the whole
 * panel and a 0.68 core behind the copy only. It was one opaque 0.94 radial
 * over the page ground until 2026-10-02, then one 0.86 radial over the
 * photograph, and splitting it is what let the picture come forward without
 * taking the type with it. The shape of the veil is unchanged throughout.
 * Three decisions there:
 *
 *   radial, not linear, and anchored at 50% 0%. The light pools at the top
 *   centre, exactly where the medallion and the heading sit, and falls away to
 *   the corners. A linear ramp would have put its lightest edge along one side
 *   of a centred composition, which fights it.
 *
 *   np-blue-700 to np-blue-900 rather than one flat navy. Two stops of the same
 *   family give the panel depth without introducing a second hue.
 *
 *   0.45 on the veil, so the meadow and the sky are plainly visible, and 0.68
 *   behind the copy, which is the lowest core that clears every floor. Both
 *   numbers are set by the BUTTONS rather than by the type — see the notes on
 *   the two overlay divs below, which carry every measurement.
 *
 * The stops follow 3t^2-2t^3 for the same reason the hero scrim does: a linear
 * interpolation between two stops has a slope discontinuity at each end, and on
 * a large flat panel that shows as a ring. Regenerate them from the curve rather
 * than hand-editing.
 *
 * EVERY FIGURE IN THIS FILE IS TIED TO ONE IMAGE. They were re-measured on
 * cta-band-2400.webp at a 0.45 veil plus a 0.68 core; the sets before it
 * (heading 9.79:1, body 8.28:1,
 * assurances 6.93:1) belonged to the opaque 0.94 panel and no longer applies.
 * Replacing the photograph invalidates all of them — the binding case is the
 * appointment label at 390, where object-cover puts the lit horizon behind the
 * buttons — so a new frame means a new sweep, not a glance.
 *
 * The `white/50 ring at 3.74:1` figure that used to sit here described
 * `onInkQuiet`, which this band no longer uses. Both buttons are glass now and
 * carry a white focus ring instead; the ring sits on the 2px band outside the
 * pill, which is overlay-over-photo rather than glass, and the combined 0.82
 * behind the copy is what bounds it as well as the type. Lowering that alpha
 * to chase button
 * contrast would come out of the focus indicator too.
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
        <div className="rounded-3xl relative overflow-hidden border border-transparent bg-np-blue-900 px-6 py-16 md:px-12 md:py-20">
          {/* THE PHOTOGRAPH, FULL-BLEED INSIDE THE PANEL. A dusk meadow, and
              it is decorative: alt="" because the heading and body say
              everything this block means, and a description of a field read
              out between the eyebrow and the heading would be noise. It
              depicts no person — the repo's standing objection to meadow
              footage, recorded in OPEN_CLIENT_ITEMS, is specifically about a
              PERSON in one reading as an implied treatment outcome.

              `fill` needs a positioned ancestor, which is why the panel gained
              `relative`, and `overflow-hidden` is what keeps the picture
              inside the 24px radius rather than squaring off the corners.

              Lazy, and sized for the panel rather than the viewport: this
              block closes nine pages and is below the fold on every one of
              them. The panel is the container's full width, which caps at
              1136px, so 1200px covers a DPR 1 screen and the srcset carries
              the rest. */}
          <Image
            src="/images/cta/cta-band-2400.webp"
            alt=""
            fill
            loading="lazy"
            quality={82}
            sizes="(min-width: 1280px) 1200px, 100vw"
            /* cta-photo is not a Tailwind class. It is the hook the
               forced-colors / reduced-transparency block at the foot of
               globals.css uses to hide this picture, for the reason recorded
               there: in forced-colors the panel's own navy becomes Canvas and
               its type CanvasText, but an <img> keeps painting, so the band
               would be system-colour text over a photograph. */
            className="cta-photo object-cover"
          />

          {/* LAYER ONE: THE VEIL, AT 0.45. It was a single 0.86 layer doing
              both jobs until 2026-10-02, and doing both is what made it too
              heavy: an alpha set by what white type needs is an alpha that
              hides the photograph everywhere, including the four fifths of the
              panel with no type on it.

              So the two jobs are two layers now. This one is the veil: it ties
              the picture to the navy the rest of the site uses and keeps the
              panel reading as one object, at an alpha chosen for the
              PHOTOGRAPH rather than for the text. Every stop, the ellipse and
              the 50% 0% anchor are the same shape they have always been.

              At 0.45 the meadow and the dusk sky are plainly legible across
              the corners and edges. The type sits on layer two.

              The stops are smoothstep-sampled, 3t^2-2t^3; regenerate them from
              the curve rather than hand-editing, as the note above says. */}
          <div
            aria-hidden="true"
            className="cta-overlay pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_130%_110%_at_50%_0%,rgba(27,53,118,0.45)_0%,rgba(26,52,115,0.45)_14.3%,rgba(25,49,108,0.45)_28.6%,rgba(23,44,99,0.45)_42.9%,rgba(20,40,88,0.45)_57.1%,rgba(18,35,79,0.45)_71.4%,rgba(17,32,72,0.45)_85.7%,rgba(16,31,69,0.45)_100%)]"
          />

          {/* LAYER TWO: THE COPY RADIAL, and it is the layer that carries the
              text. The veil above is now light enough to see the meadow
              through, which is the point of it — but light enough to see
              through is far too light to put white type on. So the darkening
              that the type needs sits only where the type is: an ellipse
              covering the copy column, flat across its inner half so every
              glyph gets full strength, then easing out so the corners keep the
              photograph.

              FLAT CORE, THEN SMOOTHSTEP, which is the shape PageHero's `hero`
              scrim uses and for the same reason: the worst pixel is never at
              the centre of a text block, it is at the end of the longest line.
              A conventional peaked radial delivers about half its peak there,
              so reaching the floor at the edge needs a centre dark enough to
              read as a spotlight. Holding the core flat to 50% spends the
              falloff on empty panel instead.

              86% x 96% at 50% 52%: wide enough to cover the meta row's full
              width at 1440 and tall enough to cover medallion-to-meta at 390,
              where the copy column is nearly the whole panel.

              0.68 IS THE CORE, AND IT IS THE LOWEST THAT CLEARS EVERY FLOOR.
              Measured over the 0.45 veil, worst backdrop pixel under a glyph,
              1440 / 390:

                core  heading       body        meta        appointment label
                0.74  7.91 / 8.33   7.61/7.71   7.53/9.52   5.73 / 5.34
                0.68  7.45 / 8.05   7.08/7.22   6.76/9.40   5.41 / 4.90
                0.62  7.08 / 7.53   6.69/6.79   6.38/9.26   5.22 / 4.54
                0.56  6.73 / 7.25   6.21/6.39   5.80/8.89   5.09 / 4.30  FAIL
                0.50  6.29 / 6.95   5.82/5.99   5.43/8.77   4.83 / 4.06  FAIL

              The appointment label at 390 is the binding case at every value,
              for the reason the button note below gives. 0.68 also holds it on
              hover, at 4.59:1; 0.62 does not (4.2:1). With the veil at 0.45
              that is 0.82 of combined alpha behind the copy and 0.45 at the
              corners, where the old single layer was 0.86 everywhere.

              DO NOT HAND-EDIT THE STOPS. They are 3t^2-2t^3 sampled at eight
              points; regenerate from the curve. */}
          <div
            aria-hidden="true"
            className="cta-overlay pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_86%_96%_at_50%_52%,rgba(16,31,69,0.68)_0%,rgba(16,31,69,0.68)_50%,rgba(16,31,69,0.651)_56.2%,rgba(16,31,69,0.574)_62.5%,rgba(16,31,69,0.465)_68.8%,rgba(16,31,69,0.34)_75.0%,rgba(16,31,69,0.215)_81.2%,rgba(16,31,69,0.106)_87.5%,rgba(16,31,69,0.029)_93.8%,rgba(16,31,69,0.0)_100.0%)]"
          />

          <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
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
                {DELIVERY_LINE}
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
              {/* BOTH BUTTONS ARE GLASS NOW, over the photograph rather than
                  over a flat navy. The pair still reads as primary and
                  secondary, but by tint rather than by fill-versus-outline:
                  the appointment button is the brighter glass at white/20, the
                  phone button the quieter at white/10. The white fill this
                  replaced would have sat on the picture as an opaque slab and
                  undone the point of putting one there.

                  MEASURED ON THE RENDERED BAND, worst pixel under a glyph, at
                  1440 and at 390, against a 4.5:1 floor:

                    "Request an appointment"  5.41 / 4.90:1   rest
                                              5.15 / 4.59:1   hover
                    the phone number          6.75 / 7.15:1   rest
                                              6.32 / 6.54:1   hover

                  THE PRIMARY ALSO CARRIES A PERMANENT 1px white/60 EDGE AND
                  font-semibold, added 2026-10-02. Tint alone was a weak
                  primary/secondary signal over a photograph — a11y-architect's
                  finding on the first version — and neither cue depends on
                  resolving the backdrop. The edge is declared on
                  .liquid-glass-bright rather than as a border utility, because
                  .liquid-glass's own `border: none` is unlayered and outranks
                  one. The heavier weight also puts more pixels at full white,
                  which is why the label measures slightly higher than it did
                  at font-medium.

                  The quieter button measures HIGHER because its tint lets more
                  of the navy wash through, and the wash is darker than the
                  glass. That is the opposite of what the hierarchy looks like,
                  and it is fine: both clear the floor, and the hierarchy is
                  carried by the tint difference, not by contrast.

                  EVERY COPY VARIANT WAS MEASURED, not just this page's. The
                  band takes a per-page heading and body, which change the
                  panel's height and so change where object-cover puts the
                  horizon. The four variants — the default, "Take the first
                  step", "Let us check your coverage" and "Book with <name>" —
                  land within 0.02 of each other at 390 (4.90 to 4.92) and
                  within 0.01 at 1440. /insurance is the worst of them, which
                  is why its figures are the ones quoted.

                  THE FOCUS RING IS BOUNDED TOO, and separately: it sits on the
                  2px band outside the pill, which is overlay-over-photo rather
                  than glass. The brightest backdrop pixel under it measures
                  L 0.051 at 390 and L 0.049 at 320 under 400% zoom — a white
                  ring at 10.42:1 and 10.60:1 against a 3:1 floor.

                  390 IS THE BINDING CASE, not 1440: the panel is narrow and
                  tall there, so object-cover scales the frame by height and
                  the lit horizon sits behind the buttons.

                  Focus rings are white and come from the variants; the glass
                  has no ring of its own, so without them a keyboard user would
                  have nothing but a 4px blur to find. */}
              <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
                <Button href={CTA.href} variant="onInkGlass" size="lg">
                  {CTA.label}
                </Button>
                <Button
                  href={`tel:${BUSINESS.phonePrimaryHref}`}
                  variant="onInkGlassQuiet"
                  size="lg"
                >
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
