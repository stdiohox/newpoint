import Image from 'next/image';
import { CircleCheck, ImageIcon } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';

export type BodySection = {
  id: string;
  heading: string;
  body: string;
  list?: string[];
};

/** A real asset, or a slot the client still owes us a photograph for. */
export type RowMedia = { src: string; alt: string } | { placeholder: string };

/**
 * The assessment page's body, above ServiceFeature.
 *
 * ADAPTED FROM THE `feature-24` PATTERN: a padded rounded-3xl shell holding a
 * rounded-2xl media panel on one side and the copy on the other, with the
 * section's list rendered as a check-marked rundown inside it.
 *
 * IT IS AN ADAPTATION, NOT A PORT, and the reason is the same one written up
 * in components/ui/badge.tsx. That source is built on shadcn's semantic
 * palette — `bg-muted`, `text-foreground`, `text-muted-foreground` — none of
 * which this repo defines. Tailwind v4 emits nothing for an unknown utility,
 * so pasting it would have shipped a component that looks styled in the source
 * and renders unstyled in the page. Every token is mapped to a real one:
 *
 *   bg-muted              -> bg-np-neutral-100  the ramp's alternate ground
 *   text-foreground       -> text-np-ink
 *   text-muted-foreground -> text-np-neutral-600
 *
 * Dropped from the source on purpose: the marquee of tag chips and the mocked
 * chat UI. Both carry invented labels, and on a page about a psychiatric
 * assessment every visible string has to come from the practice. Neither
 * brought a dependency with it, so this adds no packages.
 *
 * THE RHYTHM BREAKS ON PURPOSE AT THE THIRD SECTION. Two alternating
 * image-and-text rows is a pattern; three is the zigzag every template ships.
 * The third section renders as a tinted statement band with no media, which
 * also gives the page its one colour moment, and the last two are handed to
 * ServiceFeature. Four layout families across five sections.
 *
 * NO NEW COPY. Every string is the service's own.
 */
export function ServiceBody({ sections, media }: { sections: BodySection[]; media: RowMedia[] }) {
  return (
    <div className="pt-20 md:pt-28">
      <Container>
        <div className="flex flex-col gap-5">
          {sections.map((section, i) => {
            if (i > 1) return null;

            /* The <section> carrying the id sits outside <Reveal>: Reveal swaps
               element type on hydration and React rebuilds the subtree, which
               would tear down and recreate these anchor targets. The long
               version is in ServiceFeature.tsx. */
            return (
              <section
                key={section.id}
                id={section.id}
                tabIndex={-1}
                className="focus:outline-none"
              >
                <Reveal>
                  {/* p-2 shell with a rounded-2xl core inside it, straight from
                      the source pattern: the inset makes the media read as a
                      plate sitting in a tray rather than a photograph with a
                      corner radius. rounded-3xl matches PageCta, which is the
                      other object on the page at this size. */}
                  <div className="bg-np-neutral-100 rounded-3xl p-2">
                    <div
                      className={`flex flex-col gap-0 md:flex-row ${
                        /* Alternating sides. Two rows, so this runs left then
                           right exactly once and never becomes a zigzag. */
                        i % 2 === 1 ? 'md:flex-row-reverse' : ''
                      }`}
                    >
                      <RowMediaPanel media={media[i]} />

                      <div className="flex flex-1 flex-col justify-center gap-6 p-6 sm:p-8 md:p-10">
                        <div className="flex flex-col gap-3">
                          {/* h2: these are the page's top-level sections and
                              the heading level they have always had. */}
                          <h2 className="text-h2">{section.heading}</h2>
                          <p className="text-body-l text-np-neutral-600 max-w-[52ch]">
                            {section.body}
                          </p>
                        </div>

                        {section.list && (
                          /* role="list" per the note at the top of
                             app/globals.css: Preflight strips list-style and
                             WebKit then drops the implicit role. */
                          <ul role="list" className="flex flex-col gap-3">
                            {section.list.map((item) => (
                              <li key={item} className="flex items-start gap-3">
                                <CircleCheck
                                  aria-hidden="true"
                                  size={20}
                                  strokeWidth={1.75}
                                  className="text-np-blue-600 mt-[0.15em] shrink-0"
                                />
                                <span className="text-body text-np-neutral-700">{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </Reveal>
              </section>
            );
          })}
        </div>
      </Container>

      {/* The third section, and the break in the rhythm. */}
      {sections[2] && (
        <section
          id={sections[2].id}
          tabIndex={-1}
          /* Full-bleed tint, contained copy. np-blue-50 is the faintest wash in
             the ramp and is the page's only colour moment. It is deliberately
             not a dark panel: design-tokens.md § 7 allows exactly one dark
             block on the site and PageCta already spends it. */
          className="bg-np-blue-50 mt-20 py-16 focus:outline-none md:mt-28 md:py-20"
        >
          <Container>
            <Reveal>
              {/* The one centred block on the page. Centred because it is short
                  and because everything around it is left aligned — a change of
                  pace, not a default. 52ch holds it to four lines at
                  text-body-l, which is as far as centred prose stays
                  comfortable. */}
              <div className="mx-auto max-w-[52ch] text-center">
                <h2 className="text-h2">{sections[2].heading}</h2>
                <p className="text-body-l text-np-neutral-600 mt-5">{sections[2].body}</p>
              </div>
            </Reveal>
          </Container>
        </section>
      )}
    </div>
  );
}

/**
 * The media half of a row: a photograph, or a labelled slot where one is still
 * owed.
 *
 * THE PLACEHOLDER IS MEANT TO LOOK UNFINISHED. It names what the section needs
 * and it does not pretend to be a design decision, because a slot that blends
 * in is a slot that ships. It carries no alt text and is aria-hidden: there is
 * nothing here for a screen reader yet, and describing an absent photograph to
 * one would be worse than saying nothing.
 */
function RowMediaPanel({ media }: { media: RowMedia }) {
  const shell =
    'relative shrink-0 overflow-hidden rounded-2xl h-64 md:h-auto md:w-1/2 md:min-h-[360px]';

  if ('placeholder' in media) {
    return (
      <div
        aria-hidden="true"
        className={`${shell} border-np-neutral-300 bg-np-neutral-50 flex items-center justify-center border border-dashed`}
      >
        <div className="flex max-w-[26ch] flex-col items-center gap-2 px-6 text-center">
          <ImageIcon size={22} strokeWidth={1.5} className="text-np-neutral-400" />
          {/* np-neutral-600, not the 500 this started on. 500 measures 4.27:1
              on the np-neutral-50 ground and fails SC 1.4.3, and aria-hidden is
              not a defence for that — it stops a screen reader announcing an
              absent photograph, it does nothing for a sighted low-vision reader
              who still has to read the slot. 600 measures 6.79:1. The icon
              above stays at 400: it is decorative and the text says the same
              thing. */}
          <p className="text-caption text-np-neutral-600 tracking-[0.08em] uppercase">
            Image to come
          </p>
          <p className="text-small text-np-neutral-600">{media.placeholder}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      <Image
        src={media.src}
        alt={media.alt}
        fill
        className="object-cover"
        sizes="(min-width: 768px) 46vw, 100vw"
      />
    </div>
  );
}
