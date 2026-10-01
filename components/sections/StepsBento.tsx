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

export function StepsBento({
  heading,
  intro,
  steps,
}: {
  heading: string;
  intro: string;
  /** Verbatim copy. One card per entry. */
  steps: readonly { title: string; body: string }[];
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
        {steps.map((step, i) => (
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

              <span
                aria-hidden="true"
                /* text-display-l, the largest step in this repo's scale below
                   the hero size. There is no display-m; inventing one for a
                   numeral would add a token the design system does not have. */
                className="font-display text-display-l text-np-blue-600 leading-none tabular-nums"
              >
                {i + 1}
              </span>

              <h3 className="text-h3 text-np-ink mt-6">{step.title}</h3>
              <p className="text-body text-np-neutral-600 mt-3 max-w-[52ch]">{step.body}</p>
            </div>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
