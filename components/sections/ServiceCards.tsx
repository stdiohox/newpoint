import fs from 'node:fs';
import path from 'node:path';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { stagger } from '@/lib/motion';

/**
 * The medication-management body: a card grid in the Feature73 arrangement.
 *
 * ADAPTED, NOT PASTED. Feature73 is a shadcn/ui block built on that project's
 * semantic palette — bg-card, bg-muted, text-muted-foreground, border-border,
 * rounded-lg. This repo defines none of those, and Tailwind v4 emits nothing
 * for an unknown utility, so pasting the source would have shipped a grid that
 * renders unstyled. components/ui/badge.tsx records the same trap. What is
 * taken is the ARRANGEMENT: one wide two-column card, a pair of stacked-image
 * cards beside each other, then a second wide card with its image on the
 * opposite side. The surfaces are this repo's: np-surface on np-neutral-200,
 * np-neutral-100 for media, and the type scale the other sections use.
 *
 * NO LINKS AND NO BUTTONS, by instruction. Feature73 ships a "Learn more" link
 * per card; every one is dropped rather than pointed somewhere. The copy is the
 * service's own, verbatim, and each card keeps the section's h2 so the heading
 * outline and the deep-link ids are the ones this route has always served.
 *
 * THE ANCHOR IDS SURVIVE THE SIDEBAR. "On this page" is gone, but the ids are
 * still deep-link targets that external and shared URLs point at, so every card
 * keeps its id and tabIndex — the same reasoning ServiceBody.tsx records.
 */

export type CardSection = {
  id: string;
  heading: string;
  body: string;
  list?: string[];
};

export type CardMedia = { src: string; alt: string };

/**
 * Does the photograph exist yet?
 *
 * The four med-*.webp paths are RESERVED BEFORE THE ARTWORK LANDS, so the page
 * can be built and reviewed against its real layout. Pointing next/image at a
 * file that is not there does not degrade gracefully — it 404s the optimiser
 * and renders a broken image — so the slot is checked and a neutral block is
 * drawn instead.
 *
 * Reading the filesystem is safe here and nowhere near a request: this route is
 * statically generated (generateStaticParams), so every call happens at build
 * time. When the four files arrive, no code changes — they simply start
 * rendering.
 */
function hasAsset(src: string) {
  try {
    return fs.existsSync(path.join(process.cwd(), 'public', src.replace(/^\//, '')));
  } catch {
    return false;
  }
}

/**
 * One media panel: the photograph, or the slot reserved for it.
 *
 * 16/9 ON BOTH BRANCHES, so the reserved block is the same shape the
 * photograph will be and the layout does not move when the file appears.
 *
 * THE PLACEHOLDER CARRIES NO TEXT, by instruction, and is aria-hidden. A label
 * like "image to come" is a note to whoever is sourcing the artwork, and
 * aria-hidden does nothing for a crawler or a sighted reader — it would ship a
 * production note to patients. ServiceBody.tsx's slot records the same finding.
 */
function CardImage({ media, sizes }: { media: CardMedia; sizes: string }) {
  const shell = 'relative aspect-[16/9] w-full overflow-hidden rounded-lg';

  if (!hasAsset(media.src)) {
    return <div aria-hidden="true" className={`${shell} bg-np-neutral-100`} />;
  }

  return (
    <div className={shell}>
      <Image
        src={media.src}
        alt={media.alt}
        fill
        /* Below the fold on every width, so lazy is correct and there is no
           priority anywhere in this component. */
        loading="lazy"
        quality={82}
        sizes={sizes}
        className="object-cover"
      />
    </div>
  );
}

const CARD = 'bg-np-surface border-np-neutral-200 rounded-xl border p-4 sm:p-5';

function CardCopy({ section }: { section: CardSection }) {
  return (
    <div className="flex flex-col justify-center gap-3 p-2 sm:p-3">
      <h2 className="text-h3">{section.heading}</h2>
      <p className="text-body text-np-neutral-600 max-w-[58ch]">{section.body}</p>
    </div>
  );
}

export function ServiceCards({
  modality,
  sections,
  media,
}: {
  modality: string;
  /** Exactly the service's sections, in order. The last is rendered as its own
      block below the grid rather than as a card. */
  sections: CardSection[];
  /** Keyed by section id, so a reordered section cannot silently take another
      section's photograph. */
  media: Record<string, CardMedia>;
}) {
  /* The grid takes the first four; whatever remains falls through to the block
     below it. Written as a split rather than as four indexes so a fifth card
     would not quietly disappear. */
  const [wideTop, pairA, pairB, wideBottom] = sections;
  const rest = sections.slice(4);

  /* Every media panel in this grid is half-width from md — the wide cards
     split two columns and the pair sits two-up — so one string serves all
     four. 560px is the widest a half-column reaches inside the 1136px
     container. */
  const half = '(min-width: 1024px) 560px, (min-width: 768px) 46vw, 100vw';

  return (
    <div className="py-20 md:py-28">
      <Container>
        {/* HOW IT IS DELIVERED, PROMOTED OUT OF THE OLD SIDEBAR and set at the
            head of the section. It is the one fact none of the body sections
            states outright, so it led the sidebar; with the sidebar gone it
            leads the section instead.

            h2 now, not h3. In the sidebar it sat under an "On this page" h2 and
            was deliberately demoted so two chrome labels did not open the
            outline. That h2 is gone, so this is a top-level section heading
            like every card below it, and an h3 here would skip a level upward. */}
        <Reveal>
          <div className={`${CARD} max-w-[52ch] p-5`}>
            <h2 className="text-caption text-np-neutral-600 tracking-[0.08em] uppercase">
              How it is delivered
            </h2>
            <p className="text-body text-np-ink mt-2">{modality}</p>
          </div>
        </Reveal>

        <div className="mt-10 flex flex-col gap-5 md:mt-12">
          {/* WIDE CARD, image left and copy right from md. Stacks below it, with
              the media first in DOM order so the phone reads picture-then-copy
              the way the desktop row does. */}
          <Reveal>
            <section id={wideTop.id} tabIndex={-1} className={`${CARD} focus:outline-none`}>
              <div className="grid items-center gap-4 md:grid-cols-2 md:gap-6">
                <CardImage media={media[wideTop.id]} sizes={half} />
                <CardCopy section={wideTop} />
              </div>
            </section>
          </Reveal>

          {/* THE PAIR, image on top of copy in both. One grid of two rather than
              two cards that happen to sit side by side, so their tops align and
              the shorter of the two does not float. */}
          <div className="grid gap-5 md:grid-cols-2">
            {[pairA, pairB].map((section, i) => (
              <Reveal key={section.id} delay={stagger(i, 0.08)}>
                <section
                  id={section.id}
                  tabIndex={-1}
                  className={`${CARD} h-full focus:outline-none`}
                >
                  <CardImage media={media[section.id]} sizes={half} />
                  <CardCopy section={section} />
                </section>
              </Reveal>
            ))}
          </div>

          {/* WIDE CARD WITH THE IMAGE ON THE RIGHT. md:order-2 on the media
              rather than order-1 on the copy, so DOM order stays
              media-then-copy and the reading order matches the first wide card
              in both directions. */}
          <Reveal>
            <section id={wideBottom.id} tabIndex={-1} className={`${CARD} focus:outline-none`}>
              <div className="grid items-center gap-4 md:grid-cols-2 md:gap-6">
                <div className="md:order-2">
                  <CardImage media={media[wideBottom.id]} sizes={half} />
                </div>
                <CardCopy section={wideBottom} />
              </div>
            </section>
          </Reveal>
        </div>

        {/* "Conditions we prescribe for" AND ANYTHING AFTER IT: its own block,
            not a card. It carries a chip list rather than a photograph, and
            boxing it like the four above would promise an image slot that is
            never coming. The chips are the same treatment the prose layout
            gives them. */}
        {rest.map((section, i) => (
          <Reveal key={section.id} delay={stagger(i, 0.05)}>
            <section
              id={section.id}
              tabIndex={-1}
              className="border-np-neutral-200 mt-14 border-t pt-12 focus:outline-none md:mt-16"
            >
              <h2 className="text-h2">{section.heading}</h2>
              <p className="text-body-l text-np-neutral-600 mt-4 max-w-[62ch]">{section.body}</p>
              {section.list && (
                /* role="list" per the note at the top of app/globals.css:
                   Preflight strips list-style and WebKit then drops the
                   implicit role. */
                <ul role="list" className="mt-6 flex flex-wrap gap-2.5">
                  {section.list.map((item) => (
                    <li
                      key={item}
                      className="rounded-chip bg-np-blue-50 text-small text-np-blue-700 px-3 py-1.5"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </Reveal>
        ))}
      </Container>
    </div>
  );
}
