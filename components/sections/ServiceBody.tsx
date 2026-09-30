import Image from 'next/image';
import { CircleCheck, ImageIcon } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';

export type BodySection = {
  id: string;
  heading: string;
  body: string;
  /** Optional second paragraph. See the field's note in lib/content.ts. */
  detail?: string;
  list?: string[];
};

/** A real asset, or a slot the client still owes us a photograph for. */
export type RowMedia = { src: string; alt: string } | { placeholder: string };

/**
 * The assessment page's body: every section as an image-and-copy row.
 *
 * ONE TREATMENT, APPLIED TO ALL OF THEM, at the client's request on
 * 2026-09-30. Earlier revisions gave the middle section a tinted centred band
 * and handed the last two to a separate component that set its copy on top of
 * a photograph. That was three different looks down one page. The client asked
 * for the row treatment throughout and this is it.
 *
 * Adapted from the `feature-24` pattern: a padded rounded-3xl shell holding a
 * rounded-2xl media panel on one side and the copy on the other. An adaptation
 * rather than a port, for the reason components/ui/badge.tsx already documents
 * — that source is built on shadcn's semantic palette, which this repo does
 * not define, and Tailwind v4 emits nothing for an unknown utility, so pasting
 * it would have shipped a component that renders unstyled. bg-muted maps to
 * np-neutral-100, text-foreground to np-ink, text-muted-foreground to
 * np-neutral-600.
 *
 * THE COPY IS BESIDE THE PHOTOGRAPH, NOT ON IT, and that is worth knowing
 * before anyone changes it back. The version this replaced set the last
 * section's copy over the image, which put it under a contrast floor that had
 * to be measured across eighteen viewport widths and held the crop, the aspect
 * ratio and the padding hostage to it. Copy on a flat ground makes all of that
 * go away: np-neutral-600 on np-neutral-100 is 6.33:1 at every size, and the
 * image can now be cropped for composition alone.
 *
 * NO NEW COPY HERE. Every string is the service's own.
 */
export function ServiceBody({ sections, media }: { sections: BodySection[]; media: RowMedia[] }) {
  return (
    <div className="py-20 md:py-28">
      <Container>
        {/* gap-5 between rows, from the source pattern: tight enough that they
            read as one stack rather than as separate sections. */}
        <div className="flex flex-col gap-5">
          {sections.map((section, i) => (
            /* The <section> carrying the id sits outside <Reveal>, and stays
               there. Reveal renders a plain element before hydration and the
               motion equivalent after; those are different React element
               types, so React unmounts one and mounts the other and destroys
               every DOM node beneath it. Nothing observes these ids any more,
               but they are deep-link targets that external and shared URLs
               still point at, and a target rebuilt on hydration is one a
               fragment navigation can miss. */
            <section key={section.id} id={section.id} tabIndex={-1} className="focus:outline-none">
              {/* amount="some" rather than Reveal's 0.3 default. These rows run
                  to roughly 900px, and a threshold of 0.3 cannot be met by
                  anything taller than about 3.3 viewports: at 400% zoom the
                  observer never fires and the row stays at opacity 0 for good.
                  Measured at 320x200 before this was added. See the prop's own
                  note in components/ui/Reveal.tsx. */}
              <Reveal amount="some">
                <div className="bg-np-neutral-100 rounded-3xl p-2">
                  <div
                    className={`flex flex-col md:flex-row ${
                      /* Alternating sides, so the eye has somewhere new to go
                         on each row instead of running down one gutter. */
                      i % 2 === 1 ? 'md:flex-row-reverse' : ''
                    }`}
                  >
                    <RowMediaPanel media={media[i]} />

                    <div className="flex flex-1 flex-col justify-center gap-6 p-6 sm:p-8 md:p-10">
                      <div className="flex flex-col gap-3">
                        {/* h2 throughout: these are the page's top-level
                            sections and they are peers of one another. The last
                            one was briefly an h3, which told a screen reader it
                            was a subsection of the one above it. */}
                        <h2 className="text-h2">{section.heading}</h2>
                        <p className="text-body-l text-np-neutral-600 max-w-[52ch]">
                          {section.body}
                        </p>
                        {section.detail && (
                          <p className="text-body-l text-np-neutral-600 mt-1 max-w-[52ch]">
                            {section.detail}
                          </p>
                        )}
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
          ))}
        </div>
      </Container>
    </div>
  );
}

/**
 * The media half of a row: a photograph, or a labelled slot where one is still
 * owed.
 *
 * THE PLACEHOLDER IS MEANT TO LOOK UNFINISHED. It says a photograph is coming
 * and nothing more. What the photograph should show lives in the comment
 * beside the slot in app/services/[slug]/page.tsx, because a note to the
 * client is not something to render at patients. A slot that blends in is a
 * slot that ships.
 *
 * It is aria-hidden and carries no alt text: there is nothing here yet, and
 * describing an absent photograph to a screen reader is worse than saying
 * nothing. The caption is np-neutral-600 rather than 500 because aria-hidden
 * does nothing for a sighted low-vision reader, and 500 measures 4.27:1 on
 * this ground, under the 4.5:1 SC 1.4.3 asks for.
 */
function RowMediaPanel({ media }: { media: RowMedia | undefined }) {
  const shell =
    'relative shrink-0 overflow-hidden rounded-2xl h-64 md:h-auto md:w-1/2 md:min-h-[380px]';

  /* A row with no media entry at all falls back to the slot rather than
     rendering a half-width hole or throwing on a missing src. */
  if (!media || 'placeholder' in media) {
    return (
      <div
        aria-hidden="true"
        className={`${shell} border-np-neutral-300 bg-np-neutral-50 flex items-center justify-center border border-dashed`}
      >
        <div className="flex max-w-[26ch] flex-col items-center gap-2 px-6 text-center">
          <ImageIcon size={22} strokeWidth={1.5} className="text-np-neutral-400" />
          <p className="text-caption text-np-neutral-600 tracking-[0.08em] uppercase">
            Image to come
          </p>
          <p className="text-small text-np-neutral-600">
            {media?.placeholder ?? 'A photograph for this section is on the way.'}
          </p>
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
        sizes="(min-width: 1280px) 600px, (min-width: 768px) 46vw, 100vw"
      />
    </div>
  );
}
