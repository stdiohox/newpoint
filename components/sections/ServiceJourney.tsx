import { Check } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { stagger } from '@/lib/motion';

export type JourneyStep = {
  id: string;
  heading: string;
  body: string;
  list?: string[];
};

/**
 * The service body as a numbered patient journey: a single centred column of
 * timeline steps.
 *
 * THE STICKY SIDEBAR IS GONE, AND WITH IT TWO THINGS. It held an "On this page"
 * contents rail that tracked the active step, and the "How it is delivered"
 * card that rendered `modality`. Both were removed at the client's request on
 * 2026-09-30.
 *
 * REMOVING THE MODALITY CARD REMOVED A SURFACE, NOT A FACT, and that was
 * checked rather than assumed. CLAUDE.md's care-modality rule makes where care
 * happens a confirmed claim that the page should carry. It still does, in four
 * places: this service's own "Can the assessment be done by telehealth?" FAQ,
 * which states it with the full two-state scope and is the strongest of them;
 * PageCta's "In person or by telehealth" badge; PageCta's "Telehealth in New
 * Jersey and Pennsylvania" assurance; and the footer. If those ever go, the
 * fact needs a home again before this stays deleted.
 *
 * The contents rail's component, ServiceJourneyNav, has no other caller and was
 * deleted with it. The steps keep their anchor ids, so every in-page link that
 * ever pointed here still resolves; nothing now generates those links on this
 * route, but external and shared links to them do.
 *
 * WHY NUMBERS ARE LEGITIMATE HERE, given that numbered section markers are
 * otherwise a templated tell. The assessment page's five sections are a real
 * sequence and the order carries information the reader needs: what the
 * appointment covers, then the instruments used inside it, then the diagnosis
 * that comes out of it, then the plan built on the diagnosis, then what happens
 * after the plan. A reader deciding whether to book wants to know where the
 * appointment ends and ongoing care begins, and that is precisely what the
 * numbering tells them.
 *
 * IT IS OPT-IN FOR EXACTLY THAT REASON. `journey` is set on one service in
 * lib/content.ts and the other two keep the plain prose layout, because their
 * sections are categories rather than steps — medication management lists
 * prescribing, measurement, adjustment, collaboration and conditions, which
 * happen concurrently and in no order. Numbering those would assert a sequence
 * that does not exist. Do not switch it on for a service without checking that
 * its sections actually run in order.
 *
 * NO NEW COPY. Every string rendered here comes from the service's own
 * `sections`. The component restructures; it does not write.
 *
 * Server component throughout now that the rail's active state is gone. The
 * headings, the bodies and the anchors are all in the static HTML, which is
 * what CLAUDE.md's SEO brief requires of indexable content.
 */
export function ServiceJourney({ steps }: { steps: JourneyStep[] }) {
  return (
    <div className="py-20 md:py-28">
      <Container>
        {/* ONE CENTRED COLUMN, not the 8 of a 12-column grid. With the sidebar
            gone the steps could simply have kept their old width and sat in a
            third of the page with nothing beside them, which reads as a layout
            that lost something rather than one that was designed.

            max-w-3xl is 768px. The rail column and its gap take 64px of that,
            leaving the prose at roughly 62ch of text-body-l, which is the
            measure the rest of the site holds its body copy to. Wider would
            have been easy here and would have cost legibility. */}
        <div className="mx-auto max-w-3xl">
          {/* role="list" for the reason globals.css documents. It matters more
              here than usual because the numerals are aria-hidden: without the
              list role a VoiceOver reader would get neither "list, 3 items" nor
              the glyph, and the sequence this layout exists to convey would
              vanish. */}
          <ol role="list">
            {steps.map((step, i) => {
              const isLast = i === steps.length - 1;

              return (
                /* THE <section> SITS OUTSIDE <Reveal>, AND THAT NESTING ORDER
                   IS LOAD-BEARING. Do not wrap it back up.

                   Reveal renders a plain element before hydration and the
                   matching motion component after (see components/ui/Reveal.tsx
                   and the [data-enter] note in globals.css). Those are two
                   different React element types, so on hydration React does not
                   patch the node — it unmounts the plain one and mounts a new
                   one, destroying every DOM node beneath it.

                   Anything holding a long-lived reference to a node inside a
                   Reveal is therefore pointing at a detached element a few
                   hundred milliseconds after load. The contents rail that used
                   to sit beside these steps did exactly that — it resolved
                   these ids once and handed the nodes to an
                   IntersectionObserver — and with the section inside the
                   Reveal that observer fired once at observe time and then went
                   permanently silent, because the elements it watched were no
                   longer in the document. The rail never lit up.

                   THAT RAIL HAS SINCE BEEN REMOVED, and this nesting still
                   stands, for two reasons. The ids are anchor targets that
                   outside links and shared URLs still point at, and they should
                   not be torn down and rebuilt on hydration. And the next thing
                   that wants to observe a section will hit the same trap.

                   Kept out here, the <li> and the <section> are plain
                   server-rendered markup that hydration never replaces, and
                   Reveal only swaps its own wrapper below them.

                   tabIndex -1 so following a link to one of these anchors moves
                   real focus into the step: without it the viewport scrolls but
                   the screen-reader cursor and document.activeElement stay
                   where they were. */
                <li key={step.id}>
                  <section id={step.id} tabIndex={-1} className="focus:outline-none">
                    <Reveal delay={stagger(i, 0.05)}>
                      <div className="grid grid-cols-[1.75rem_1fr] gap-x-4 sm:grid-cols-[2.5rem_1fr] sm:gap-x-6">
                        {/* The rail column. Grid stretches it to the row height,
                          which is what lets the connector run the full distance
                          to the next numeral. */}
                        <div className="flex flex-col items-center">
                          {/* np-blue-600 and the font-display / tabular-nums
                            pairing are lifted verbatim from the step numerals in
                            app/new-patients/page.tsx, so the site has one
                            numbered-step treatment rather than two. That file
                            carries the full contrast write-up; the short version
                            is that aria-hidden is not a defence for a low
                            contrast numeral, because a sighted low-vision reader
                            has nothing else marking the sequence, so SC 1.4.3
                            applies and blue-600 measures 8.47:1 on this ground.

                            mt aligns the numeral's cap with the h2's rather than
                            its line box: the numeral renders at 22px and the
                            heading at up to 40px, so top-aligning the two boxes
                            leaves the digit floating. */}
                          <span
                            aria-hidden="true"
                            className="font-display text-h3 text-np-blue-600 mt-1 tabular-nums md:mt-2"
                          >
                            {i + 1}
                          </span>

                          {!isLast && (
                            <span
                              aria-hidden="true"
                              className="bg-np-neutral-200 mt-3 w-px flex-1"
                            />
                          )}
                        </div>

                        {/* SPACING IS DRIVEN BY THE INDEX, NOT BY :last-child, and
                          that is the bug fix this rewrite carries.

                          The previous markup put `pb-10 last:pb-0` and
                          `[&:not(:first-child)]:pt-10` on the <section>. Every
                          section is the ONLY child of its own Reveal wrapper, so
                          each one matched :first-child AND :last-child: the top
                          padding never applied to anything and the bottom
                          padding and divider were removed from everything. All
                          five sections rendered flush against each other, which
                          is why "The tools we use" collided with the paragraph
                          above it.

                          Reading the index cannot break that way, because it
                          does not care what the DOM parent is. Do not convert
                          these back to structural selectors while Reveal wraps
                          each item. */}
                        <div className={isLast ? '' : 'pb-12 md:pb-16'}>
                          <h2 className="text-h2">{step.heading}</h2>
                          <p className="text-body-l text-np-neutral-600 mt-4 max-w-[62ch]">
                            {step.body}
                          </p>

                          {/* THE LIST WAS A ROW OF CHIPS AND IS NOW A PANEL. The
                            three items are full sentences of up to 62
                            characters; in rounded-chip pills they wrapped into
                            ragged multi-line blocks that read as tags rather
                            than as content, and they were the other half of the
                            collision, since a wrapped chip row has no space
                            under it either.

                            Hairlines between rows rather than a border on each:
                            one divider per boundary, three rows, so it groups
                            without turning into a ruled table. ring-1 over a
                            border matches RelatedLinks and the shadow
                            discipline in design-tokens.md § 5. */}
                          {step.list && (
                            <ul
                              role="list"
                              className="rounded-card bg-np-surface divide-np-neutral-200 mt-6 divide-y ring-1 ring-[var(--np-alpha-ink-08)]"
                            >
                              {step.list.map((item) => (
                                <li
                                  key={item}
                                  className="text-body text-np-neutral-700 flex items-start gap-3 px-5 py-4"
                                >
                                  {/* lucide at stroke 1.75, the weight every other
                                    icon on the site uses. Decorative: the row's
                                    own text says what the item is. */}
                                  <Check
                                    aria-hidden="true"
                                    size={18}
                                    strokeWidth={1.75}
                                    className="text-np-blue-600 mt-[0.3em] shrink-0"
                                  />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </Reveal>
                  </section>
                </li>
              );
            })}
          </ol>
        </div>
      </Container>
    </div>
  );
}
