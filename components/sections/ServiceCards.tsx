import fs from 'node:fs';
import path from 'node:path';
import Image from 'next/image';
import { CircleCheck } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { SectionList } from '@/components/sections/SectionList';
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
  listNote?: string;
  bullets?: string[];
  highlight?: string;
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
function CardImage({
  media,
  sizes,
  stretch = false,
}: {
  media: CardMedia;
  sizes: string;
  /**
   * TRUE ON THE TWO WIDE CARDS, where the photograph sits BESIDE the copy.
   *
   * With bullets and a highlight the copy column is taller than a 16/9 panel at
   * half width — about 300px of picture against 400-500px of text at 1440 — so
   * a fixed ratio left the image floating against a column it could not fill.
   * Stretching the media to the row's height is what keeps the two halves
   * level, and it is the same thing ServiceBody does with `md:h-auto`.
   *
   * The ratio still applies below md, where the card stacks and the picture is
   * on its own line with nothing to match.
   */
  stretch?: boolean;
}) {
  const shell = stretch
    ? 'relative aspect-[16/9] w-full overflow-hidden rounded-lg md:aspect-auto md:h-full md:min-h-[260px]'
    : 'relative aspect-[16/9] w-full overflow-hidden rounded-lg';

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

      {/* The heading is visually hidden rather than dropped: the list needs a
          name for anyone arriving on it out of context, and a visible label on
          every card would repeat four times down the page.

          IT NAMES ITS SECTION RATHER THAN SAYING "What this means for you",
          which is what it read before. Two reasons, both from the healthcare
          review: most of these lines are general patient education, and that
          label framed general education as individualised implication for the
          reader's own care — which is the one thing this copy must not do. It
          also repeated verbatim on all four cards, so heading-list navigation
          showed four identical h3s with nothing to tell them apart. */}
      {section.bullets && (
        <>
          <h3 className="sr-only">{section.heading}: key points</h3>
          {/* role="list" per the note at the top of app/globals.css: Preflight
              strips list-style and WebKit then drops the implicit role. */}
          <ul role="list" className="mt-1 flex flex-col gap-2">
            {section.bullets.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <CircleCheck
                  aria-hidden="true"
                  size={17}
                  strokeWidth={1.75}
                  className="text-np-blue-600 mt-[0.2em] shrink-0"
                />
                <span className="text-small text-np-neutral-700">{item}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* The closing line. np-blue-50 rather than another bordered box: it sits
          INSIDE a card that already has a border, and a second one around it
          reads as a card in a card. */}
      {section.highlight && (
        <p className="rounded-chip bg-np-blue-50 text-small text-np-blue-700 mt-1 px-3 py-2">
          {section.highlight}
        </p>
      )}
    </div>
  );
}

export function ServiceCards({
  sections,
  media,
}: {
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
        {/* NO "How it is delivered" CARD. It was promoted out of the old
            sidebar to the head of this section when the layout was rebuilt, and
            then removed from the page entirely at the client's request.

            WHAT IS LOST IS THE MODALITY STATEMENT ON THIS PAGE. None of the
            body sections says outright that care is delivered by telehealth and
            in person, which is why the sidebar carried it. It is still on this
            service's homepage card and on /services, so the fact is not gone
            from the site — only from this page. `modality` stays on the type
            for those two callers. */}
        <div className="flex flex-col gap-5">
          {/* WIDE CARD, image left and copy right from md. Stacks below it, with
              the media first in DOM order so the phone reads picture-then-copy
              the way the desktop row does. */}
          <Reveal>
            <section id={wideTop.id} tabIndex={-1} className={`${CARD} focus:outline-none`}>
              <div className="grid items-stretch gap-4 md:grid-cols-2 md:gap-6">
                <CardImage media={media[wideTop.id]} sizes={half} stretch />
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
              <div className="grid items-stretch gap-4 md:grid-cols-2 md:gap-6">
                {/* md:h-full so the wrapper is as tall as the stretched grid
                    cell; without it the media panel's md:h-full resolves
                    against a shrink-wrapped parent and the stretch is lost. */}
                <div className="md:order-2 md:h-full">
                  <CardImage media={media[wideBottom.id]} sizes={half} stretch />
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
              {/* Chips AND the line that qualifies them, from one component in
                  every layout. See components/sections/SectionList.tsx. */}
              <SectionList
                heading={section.heading}
                list={section.list}
                note={section.listNote}
              />

              {/* BULLETS RENDER HERE TOO, AND AFTER THE CHIPS ON PURPOSE.
                  This branch used to render heading, body and list only, so a
                  section that fell through to it lost its bullets silently —
                  which on "Conditions we prescribe for" meant the ten-diagnosis
                  chip list shipped WITHOUT the line that stops it reading as
                  "all ten are prescribed for in every case". That hedge is the
                  reason the bullets exist on this section.

                  After the chips, not before, because one of those lines says
                  "this list" and has no referent until the chips are on screen. */}
              {section.bullets && (
                <>
                  <h3 className="sr-only">{section.heading}: key points</h3>
                  <ul role="list" className="mt-6 flex max-w-[62ch] flex-col gap-2">
                    {section.bullets.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <CircleCheck
                          aria-hidden="true"
                          size={17}
                          strokeWidth={1.75}
                          className="text-np-blue-600 mt-[0.2em] shrink-0"
                        />
                        <span className="text-small text-np-neutral-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </Reveal>
        ))}
      </Container>
    </div>
  );
}
