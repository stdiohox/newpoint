import { ClipboardList, UserRound, Video } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import { stagger } from '@/lib/motion';

/**
 * "What to expect" as three tinted cards.
 *
 * DELIBERATELY A DIFFERENT TREATMENT FROM THE STEPS ABOVE IT. The steps are
 * dashed, white and numbered because they are a sequence you move through;
 * these are three standing facts about the care, in no order, so they are
 * soft-tinted, iconned and unnumbered. Two sections of identical cards would
 * have read as one long list of six.
 *
 * THE ICONS ARE DECORATION AND NOTHING ELSE — aria-hidden, with the heading
 * beside each one carrying the meaning. They are matched to the copy rather
 * than chosen for variety: a person for the provider card, a clipboard for the
 * assessment, a camera for telehealth. Nothing here is a control, so SC 1.4.11
 * does not reach the circles; the heading and body carry their own contrast.
 *
 * np-blue-50 ground with np-blue-100 circles, not a new colour: both are in
 * the palette already, the circle is a tint of the ground it sits on, and the
 * body copy stays np-neutral-600, which this repo measures throughout.
 *
 * Server component. <Reveal /> is the only client code and it is a leaf.
 */

/* ICONS BY POSITION, as the client asked: UserRound, ClipboardList, Video.
   Indexed rather than keyed off the copy, because the headings are verbatim
   client strings and matching on their text would break the moment one is
   edited. If a fourth expectation is ever added, this falls back to no icon
   rather than to the wrong one. */
const ICONS = [UserRound, ClipboardList, Video];

export function ExpectCards({
  heading,
  items,
}: {
  heading: string;
  /** Verbatim copy. One card per entry. */
  items: readonly { heading: string; body: string }[];
}) {
  return (
    <section aria-labelledby="what-to-expect-heading">
      <Reveal>
        <h2 id="what-to-expect-heading" className="text-h2 max-w-[22ch]">
          {heading}
        </h2>
      </Reveal>

      {/* role="list" for the same Preflight/WebKit reason the steps carry it.

          THREE COLUMNS FROM lg, NOT md. At 768 three columns leave each card
          about 220px wide, and after the padding that is a measure of roughly
          20 characters — these headings and bodies then run to eight or more
          lines each. Nothing overflows, so it is not a reflow failure; it is
          simply bad to read, and 768 is also where a 1440 screen lands at
          200% zoom. One column below lg beats three narrow ones. */}
      <ul role="list" className="mt-10 grid gap-5 lg:grid-cols-3">
        {items.map((item, i) => {
          const Icon = ICONS[i];
          return (
            <Reveal
              as="li"
              key={item.heading}
              delay={stagger(i, 0.08)}
              /* See the matching note in StepsBento: a tall card and a 0.3
                 threshold is how a reveal never fires. */
              amount="some"
            >
              <div className="bg-np-blue-50 rounded-card flex h-full flex-col p-7 md:p-8">
                {Icon && (
                  <span className="bg-np-blue-100 flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                    <Icon
                      aria-hidden="true"
                      size={22}
                      strokeWidth={1.75}
                      className="text-np-blue-700"
                    />
                  </span>
                )}
                <h3 className="text-h3 text-np-ink mt-6">{item.heading}</h3>
                <p className="text-body text-np-neutral-600 mt-3">{item.body}</p>
              </div>
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}
