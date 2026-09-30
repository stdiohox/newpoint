import Image from 'next/image';
import { CircleCheck } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';

export type FeatureBlock = {
  id: string;
  heading: string;
  body: string;
  /** Optional second paragraph. See the field's note in lib/content.ts. */
  detail?: string;
  /** Optional rundown, rendered under the copy in the left column only. */
  list?: string[];
};

/**
 * The two-column closing beat of the assessment page: the treatment plan stated
 * plainly on the left, and what follows it sitting on a photograph of a
 * consulting room on the right.
 *
 * NO NEW COPY, AND NOTHING SAID TWICE. Both blocks are the service's own
 * `sections` entries, moved here rather than copied here: the timeline above
 * renders only the sections this block does not take (see `layout` in
 * lib/content.ts). The eyebrow is the service's existing `nav` label. Nothing
 * on this page is a string that was written for this layout.
 *
 * THE CARD HAS NO LINK AND NO BUTTON, deliberately. The page already carries
 * one appointment CTA in PageCta, and a second call to action here would be two
 * routes to the same request competing a few hundred pixels apart.
 *
 * WHY THE CARD TEXT IS DARK, when every other photographic panel on this site
 * puts white type over a dark scrim. Those panels sit on video posters that are
 * bright edge to edge with a blown window behind the copy, so white was the
 * only colour that could carry. This photograph is the opposite: its top half
 * is an evenly lit off-white wall. Near-black type on it measures in the
 * high sevens, where white type would fail outright. Do not "bring this into
 * line" with the other panels without re-measuring.
 */
export function ServiceFeature({
  eyebrow,
  left,
  card,
  image,
}: {
  eyebrow: string;
  left: FeatureBlock;
  card: FeatureBlock;
  image: { src: string; alt: string };
}) {
  return (
    <div className="pb-20 md:pb-28">
      <Container>
        {/* items-start, not items-center. The card's copy is pinned to the top
            of the image because that is where the wall is, so centring the left
            column against a 720px card left the two blocks of copy starting
            400px apart and reading as unrelated. Top-aligned they read as one
            object, and the empty lower left is the counterweight to the
            furniture in the lower right. */}
        <div className="grid items-start gap-10 md:grid-cols-2 md:gap-12 lg:gap-16">
          {/* The <section> carrying the anchor id sits OUTSIDE <Reveal>, and
              stays there. Reveal renders a plain element before hydration and
              the motion equivalent after; those are different React element
              types, so React unmounts one and mounts the other and destroys
              every DOM node beneath it.

              NOTHING OBSERVES THESE IDS ANY MORE — the "On this page" rail that
              did was removed with the sidebar. They are kept because they are
              deep-link targets that external and shared URLs still point at,
              and a target rebuilt on hydration is one a fragment navigation can
              miss. */}
          <section id={left.id} tabIndex={-1} className="focus:outline-none">
            <Reveal amount="some">
              {/* md:pt-12 matches the card's own md:p-12, so the eyebrow and
                  the card's h3 start on the same line. Below md the card sits
                  under this column and there is nothing to align to. */}
              <div className="md:pt-12 md:pr-4">
                {/* The service's own `nav` label, not a written-for-this-block
                    kicker. It is the one eyebrow on this page, which is what
                    keeps it from reading as the templated label-above-every-
                    heading pattern. */}
                <p className="text-caption text-np-neutral-600 tracking-[0.08em] uppercase">
                  {eyebrow}
                </p>
                <h2 className="text-h2 mt-3">{left.heading}</h2>
                <p className="text-body-l text-np-neutral-600 mt-5 max-w-[46ch]">{left.body}</p>
                {left.detail && (
                  <p className="text-body-l text-np-neutral-600 mt-4 max-w-[46ch]">{left.detail}</p>
                )}

                {/* THE RUNDOWN IS IN THE LEFT COLUMN AND NOT ON THE CARD. The
                    card's copy sits on a photograph and is held to a measured
                    contrast floor across eighteen viewport widths; every line
                    added to it is another line that has to clear that floor and
                    another chance for the crop to put one over the furniture.
                    The left column is type on a flat ground with no such
                    constraint, so that is where content grows.

                    role="list" per the note at the top of app/globals.css:
                    Preflight strips list-style and WebKit then drops the
                    implicit role. */}
                {left.list && (
                  <ul role="list" className="mt-7 flex flex-col gap-3">
                    {left.list.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CircleCheck
                          aria-hidden="true"
                          size={20}
                          strokeWidth={1.75}
                          className="text-np-blue-600 mt-[0.15em] shrink-0"
                        />
                        <span className="text-body text-np-neutral-700 max-w-[42ch]">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Reveal>
          </section>

          <section id={card.id} tabIndex={-1} className="focus:outline-none">
            <Reveal amount="some" delay={0.08}>
              {/* rounded-3xl as specified, which is also the radius PageCta's
                  panel uses. Both are large objects where the 14px card token
                  reads as a square with its corners filed off. */}
              {/* BELOW md THE CARD IS AN ASPECT RATIO, NOT A FIXED HEIGHT, and
                  that is what keeps the copy legible rather than what makes it
                  look right.

                  object-cover crops the axis that is not binding. With a fixed
                  height the card got wider as the viewport did while staying
                  520 tall, so the visible slice of the photograph grew: at
                  540-767px it was wide enough to swallow the fiddle-leaf fig,
                  and the darkest pixel behind the copy measured rgb(2,0,0) —
                  1.11:1 against np-ink. Shifting object-position could not
                  rescue it, because at those sizes the window is wider than the
                  clear stretch of wall, so there is nowhere clear to put it.

                  With a ratio, height scales with width, so the visible slice is
                  a CONSTANT 1229 source pixels wide at every viewport below md
                  and always lands clear of the plant. Above md the column is
                  capped by the 1200px container and can no longer run wide, so
                  the fixed 720 is safe there and is what the layout wants.

                  If you change this ratio, or the padding, re-run the contrast
                  sweep. The two are load-bearing together. */}
              <div className="relative aspect-[4/5] min-h-[480px] overflow-hidden rounded-3xl md:aspect-auto md:min-h-[720px]">
                {/* THE CROP IS PUSHED RIGHT, AND THAT IS AN ACCESSIBILITY
                    DECISION RATHER THAN A COMPOSITIONAL ONE.

                    The card is portrait and the photograph is 16:9, so
                    object-cover scales to fill the height and crops the width.
                    Centred, the left edge of that window lands on the
                    fiddle-leaf fig, whose leaves are near-black: the darkest
                    pixel behind the copy measured 1.03:1 against np-ink, which
                    is no contrast at all.

                    At 65% the window clears the plant entirely and holds wall,
                    the beige armchair and the side table. Measured across card
                    sizes from 328x720 up to 544x720, the worst pixel behind the
                    copy is then 7.63:1. See the scrim note below for the
                    mobile case, which the crop alone does not solve. */}
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover"
                  style={{ objectPosition: '65% 50%' }}
                  /* The card is full width below md and a little under half the
                     1200px container above it. 45vw is the upper bound of that
                     half across the breakpoints, so the browser never picks a
                     candidate narrower than it needs. */
                  sizes="(min-width: 1280px) 600px, (min-width: 768px) 45vw, 100vw"
                />

                {/* THERE IS DELIBERATELY NO SCRIM HERE, and that is a measured
                    result rather than an omission.

                    Swept at 18 viewport widths from 320 to 1920, taking the
                    single darkest pixel inside the measured text box plus an
                    8px pad: the worst case is 7.62:1 for the np-ink h3 and
                    4.85:1 for the np-neutral-700 paragraph, both clear of the
                    4.5:1 floor. The geometry above is what buys that. Before
                    the aspect ratio and the min-height were in place, the worst
                    case was 1.07:1 and it would have taken a white veil at 0.64
                    alpha to recover — which would have flattened the
                    photograph into a pale rectangle on every screen in order to
                    fix a band of them.

                    If the copy, the padding, the crop or the ratio changes,
                    re-measure before assuming this still holds. The paragraph
                    has the thinner margin of the two. */}

                <div className="relative z-10 p-8 sm:p-10 md:p-12">
                  {/* h2 STYLED AS text-h3, not an actual h3, and the
                      distinction is the whole point. This card is its own
                      <section> with its own anchor id, sitting beside the left
                      column rather than inside it — the two are peers. An h3
                      immediately after the left column's h2 told a screen
                      reader the opposite, that this is a subsection of "Your
                      treatment plan", which is a 1.3.1 mismatch between the
                      structure and what the layout plainly shows. The class
                      keeps the size it had.

                      np-ink rather than the np-neutral-700 the body uses: it is
                      the larger of the two and should be the more certain of
                      the two on a surface that is a photograph. */}
                  <h2 className="text-h3 text-np-ink">{card.heading}</h2>
                  <p className="text-body text-np-neutral-700 mt-3 max-w-[32ch]">{card.body}</p>
                </div>
              </div>
            </Reveal>
          </section>
        </div>
      </Container>
    </div>
  );
}
