import Image from 'next/image';
import { CalendarCheck, ClipboardList, MessageCircle } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import { stagger } from '@/lib/motion';

/**
 * The three steps, as a bento of dashed cards.
 *
 * ADAPTED FROM RuixenBentoCards, NOT PORTED. What is taken is the composition:
 * a six-column grid at lg where the first card is twice the height of the two
 * beside it, dashed borders instead of solid ones, and a small plus mark in
 * each corner so the dashes read as a drawn frame rather than as an unfinished
 * input.
 *
 * DROPPED: the source wraps every card in a Link and ends each with an arrow.
 * These cards go nowhere — the steps are the content, not a menu — and an
 * arrow on a non-link is an affordance that leads nowhere. Also dropped: its
 * semantic-palette classes (bg-card, text-muted-foreground, border-border),
 * which Tailwind v4 emits nothing for in this repo. components/ui/badge.tsx
 * records that trap.
 *
 * THE NUMERAL IS DECORATION AND THE <ol> IS THE SEQUENCE. Each card shows a
 * large step number, and it is aria-hidden: an ordered list already conveys
 * position, so an unhidden numeral would have a screen reader say "one, one,
 * reach out". `role="list"` is NOT redundant on it — Tailwind Preflight sets
 * list-style: none, WebKit then drops the list role, and with the numerals
 * hidden a VoiceOver reader would get neither the count nor the number. The
 * markup this replaced carried the same pairing for the same reason.
 *
 * np-blue-600 FOR THE NUMERAL, not a tint. It is informative for a sighted
 * low-vision reader even though it is hidden from assistive tech, so SC 1.4.3
 * applies to it. At text-display-l it is 36-52px, i.e. large text, so the
 * floor is 3:1 — and it clears either floor: 8.84:1 on this card's
 * np-surface ground (the measurement the page it replaced recorded, 8.47:1,
 * was against np-neutral-50, which is the page behind the card, not the card).
 * The amber it used to be measured 1.97:1.
 *
 * Server component. <Reveal /> is the only client code in it and it is a leaf.
 */
/* The four corner marks' placement. Each string centres a 12px cross ON the
   card's corner, which is what makes the dashed border read as a drawn frame
   rather than as a stray outline. */
const CORNERS = [
  'top-0 left-0 -translate-x-1/2 -translate-y-1/2',
  'top-0 right-0 translate-x-1/2 -translate-y-1/2',
  'bottom-0 left-0 -translate-x-1/2 translate-y-1/2',
  'bottom-0 right-0 translate-x-1/2 translate-y-1/2',
] as const;

/* ICONS BY POSITION, not by heading text. The headings are verbatim client
   copy and matching on their wording would break the moment one is edited; a
   fourth step would fall back to no icon rather than to the wrong one. The
   same reasoning is written out in ExpectCards.tsx. */
const STEP_ICONS = [MessageCircle, ClipboardList, CalendarCheck];

export function StepsBento({
  heading,
  intro,
  steps,
  media,
}: {
  heading: string;
  intro: string;
  /** Verbatim copy. One card per entry. */
  steps: readonly { title: string; body: string }[];
  /**
   * A photograph for the first card, which is the tall one.
   *
   * ONLY THE FIRST CARD TAKES ONE, and that is deliberate rather than a
   * limitation: step 1 spans both rows at lg, so it is the only card with
   * leftover height to fill. Giving the two short cards pictures as well would
   * make three equal cards out of a bento. Omit it and the card is simply
   * text, which is what it was before 2026-10-01.
   */
  media?: { src: string; alt: string };
}) {
  return (
    <section aria-labelledby="three-steps-heading">
      {/* THE SECTION HEADER, above the grid rather than in the left column it
          used to sit in. The bento needs the full width at lg, and a heading
          column would have taken a third of it. */}
      <Reveal>
        <h2 id="three-steps-heading" className="text-h2">
          {heading}
        </h2>
      </Reveal>
      <Reveal delay={0.08}>
        <p className="text-body-l text-np-neutral-600 mt-4 max-w-[52ch]">{intro}</p>
      </Reveal>

      {/* SIX COLUMNS AT lg, ONE BELOW IT. The first card spans three columns
          and both rows, so it sits full height beside the two stacked on its
          right. Below lg the cards stack in document order, which is the order
          of the steps — the layout carries no meaning the <ol> does not. */}
      <ol role="list" className="mt-10 grid gap-5 lg:grid-cols-6 lg:grid-rows-2">
        {steps.map((step, i) => {
          const Icon = STEP_ICONS[i];
          return (
          <Reveal
            as="li"
            key={step.title}
            delay={stagger(i, 0.08)}
            /* amount="some", not Reveal's 0.3 default. A card that is taller
               than about 3.3 viewports can never satisfy a 0.3 threshold and
               stays hidden for good; the tall first card at 320 and 400% zoom
               is the shape that gets closest. The measurement behind this is
               in Reveal.tsx. */
            amount="some"
            className={i === 0 ? 'lg:col-span-3 lg:row-span-2' : 'lg:col-span-3 lg:row-span-1'}
          >
            {/* h-full on BOTH the Reveal's child and the card: the grid cell
                stretches, the Reveal's div has to pass that down, and the card
                has to fill it — otherwise the tall first card is content
                height inside a two-row cell. */}
            <div className="bg-np-surface rounded-card border-np-neutral-300 relative flex h-full flex-col border border-dashed p-7 md:p-8">
              {/* THE CORNER MARKS. Four plus signs at the card's corners, drawn
                  as two 1px bars each rather than a glyph, so they stay crisp
                  at any zoom and need no font. aria-hidden and
                  pointer-events-none: they are frame, not content.

                  -translate-x/y-1/2 on each corner puts the cross centre ON the
                  corner, which is what makes the dashed border read as a
                  deliberate drawing rather than a stray outline. */}
              <span aria-hidden="true" className="pointer-events-none">
                {/* ONE LITERAL CLASS STRING PER CORNER, and the duplication is
                    the point. Composing these from conditionals put both
                    `-translate-x-1/2` and `translate-x-1/2` on the right-hand
                    marks; in Tailwind v4 both write the same --tw-translate-x
                    variable, so the winner is decided by stylesheet order
                    rather than by the order they appear in the attribute, and
                    the mark landed 6px inside the card instead of on its
                    corner. Caught in review. Literal strings also keep them
                    visible to Tailwind's scanner, which only reads class
                    strings it can see whole. */}
                {CORNERS.map((pos) => (
                  <span key={pos} className={`absolute block h-3 w-3 ${pos}`}>
                    <span className="bg-np-neutral-300 absolute top-1/2 left-0 h-px w-full -translate-y-1/2" />
                    <span className="bg-np-neutral-300 absolute top-0 left-1/2 h-full w-px -translate-x-1/2" />
                  </span>
                ))}
              </span>

              {/* NUMERAL AND ICON ON ONE LINE. The icon sits beside the number
                  rather than above the heading so the card has one visual
                  anchor instead of two stacked ones. Both are aria-hidden: the
                  <ol> conveys the position and the heading names the step, so
                  neither adds anything a screen reader has not already had. */}
              <div className="flex items-center gap-4">
                <span
                  aria-hidden="true"
                  /* text-display-l, the largest step in this repo's scale below
                     the hero size. There is no display-m; inventing one for a
                     numeral would add a token the design system does not have. */
                  className="font-display text-display-l text-np-blue-600 leading-none tabular-nums"
                >
                  {i + 1}
                </span>
                {/* Decoration, matched to the copy rather than chosen for
                    variety: a message bubble for reaching out, a clipboard for
                    the assessment, a checked calendar for ongoing appointments.
                    Nothing here is a control, so SC 1.4.11 does not reach the
                    circle; the heading carries the meaning either way. */}
                {Icon && (
                  <span className="bg-np-blue-50 flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                    <Icon
                      aria-hidden="true"
                      size={20}
                      strokeWidth={1.75}
                      className="text-np-blue-700"
                    />
                  </span>
                )}
              </div>

              <h3 className="text-h3 text-np-ink mt-6">{step.title}</h3>
              <p className="text-body text-np-neutral-600 mt-3 max-w-[52ch]">{step.body}</p>

              {/* THE PHOTOGRAPH FILLS WHAT IS LEFT OF THE TALL CARD. Only the
                  first step has one, and only the first step is two rows high,
                  which is what left the empty area this closes.

                  lg:mt-auto + lg:flex-1 is the trick: the auto margin pushes it
                  to the foot of the flex column and flex-1 hands it whatever
                  height the copy left over. A flex item will not go below its
                  intrinsic size on its own, which is why the min-height is set
                  explicitly rather than left at auto — see the floor below.

                  Below lg there is no leftover height to take, so it falls back
                  to a 16:9 band under the copy. */}
              {media && i === 0 && (
                /* lg:min-h-40 IS A FLOOR, NOT A HEIGHT. `min-h-0` alone lets
                   the photograph shrink to nothing: its height is whatever the
                   copy leaves over, so a longer step 1 body, a text-spacing
                   override (SC 1.4.12) or simply the low end of lg could
                   collapse it to a sliver and leave a gap above the card's
                   padding. 10rem sits below every measured height — 280px at
                   1440, 277px at 1100, 274px at 1024 — so it never binds in
                   the layouts that work, and the
                   grid rows are auto-sized, so a card that does hit the floor
                   grows its row rather than overflowing. */
                <div className="bg-np-blue-50 rounded-xl mt-6 aspect-video overflow-hidden lg:mt-auto lg:aspect-auto lg:min-h-40 lg:flex-1">
                  <Image
                    src={media.src}
                    alt={media.alt}
                    width={2000}
                    height={1116}
                    /* Below the fold on every viewport: the hero and the
                       section header come first. */
                    loading="lazy"
                    /* 82, as on the other downscaled masters in this repo —
                       the resampling dominates, not the encoder setting. It is
                       in next.config's `qualities` allow-list. */
                    quality={82}
                    /* The card is half the grid at lg and full width below it.
                       Measured drawn width at 1440: 494px. */
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>
          </Reveal>
          );
        })}
      </ol>
    </section>
  );
}
