import fs from 'node:fs';
import path from 'node:path';
import Image from 'next/image';
import { CircleCheck } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { stagger } from '@/lib/motion';

/**
 * The telehealth body: one featured card, then a three-up grid.
 *
 * ADAPTED FROM card-18's BlogPostCard, NOT PORTED. That source is a shadcn
 * composition — Button, cva variants and Radix underneath, on the semantic
 * palette (bg-card, text-muted-foreground, border-border). None of those are
 * installed or defined here, and Tailwind v4 emits nothing for an unknown
 * utility, so a paste would have shipped an unstyled card wired to three
 * dependencies this repo does not carry. components/ui/badge.tsx records the
 * same trap. Taken: the shape — a numbered tag pill, a title, a lead, and a
 * media panel beside the copy on the featured card and above it in the grid.
 * Everything else is this repo's own tokens, and the only motion is <Reveal>,
 * which already uses motion/react.
 *
 * WHAT THE SOURCE HAS THAT THIS DELIBERATELY DOES NOT:
 *   - no date. These are page sections, not posts; there is nothing to date.
 *   - no "Read more" button and no stretched-link overlay. Nothing here is
 *     clickable, so a card-wide anchor would be an empty target.
 *   - NO HOVER LIFT AND NO TITLE-UNDERLINE REVEAL. Both are affordances: they
 *     tell a pointer user "this goes somewhere". On a card that goes nowhere
 *     that is a promise the markup cannot keep, and a keyboard user gets no
 *     equivalent because there is nothing to focus. The card-18 underline was
 *     dropped for exactly that reason rather than kept as decoration.
 *
 * THE TAG PILL IS THE SECTION NUMBER, 01-04, in source order. It is
 * aria-hidden: it is a visual index, and read aloud ahead of every heading it
 * would be four meaningless numbers in the heading flow.
 *
 * THE SECTION IDS TRAVEL WITH THE CARDS. The "On this page" rail is gone, but
 * the ids are deep-link targets that shared and external URLs point at — the
 * same reasoning ServiceBody and ServiceCards already record.
 */

export type GridSection = {
  id: string;
  heading: string;
  body: string;
  bullets?: string[];
};

export type GridMedia = { src: string; alt: string };

/**
 * Does the photograph exist yet?
 *
 * The paths are reserved before the artwork lands so the page can be built and
 * reviewed against its real layout. next/image pointed at a missing file does
 * not degrade — it 404s the optimiser and draws a broken image — so the slot is
 * checked and a neutral block is drawn instead. Safe here and nowhere near a
 * request: this route is statically generated, so every call runs at build
 * time, and when the files arrive they simply start rendering.
 */
function hasAsset(src: string) {
  try {
    return fs.existsSync(path.join(process.cwd(), 'public', src.replace(/^\//, '')));
  } catch {
    return false;
  }
}

/**
 * THE PLACEHOLDER CARRIES NO TEXT and is aria-hidden. A label like "image to
 * come" is a note to whoever is sourcing the artwork; aria-hidden does nothing
 * for a crawler or a sighted reader, so it would ship a production note to
 * patients. ServiceBody's slot records the same finding.
 */
function GridImage({
  media,
  sizes,
  className = '',
}: {
  media: GridMedia;
  sizes: string;
  className?: string;
}) {
  const shell = `relative w-full overflow-hidden bg-np-neutral-100 ${className}`;

  if (!hasAsset(media.src)) {
    return <div aria-hidden="true" className={shell} />;
  }

  return (
    <div className={shell}>
      <Image
        src={media.src}
        alt={media.alt}
        fill
        /* Below the fold at every width, so lazy throughout and no priority
           anywhere in this component. 82 is in next.config.ts's
           images.qualities. */
        loading="lazy"
        quality={82}
        sizes={sizes}
        className="object-cover"
      />
    </div>
  );
}

const CARD = 'bg-np-surface border-np-neutral-200 overflow-hidden rounded-xl border';

function TagPill({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      /* self-start, not inline-block. The pill is a direct child of a
         `flex flex-col` card, where the default align-items: stretch makes it
         span the full column width — a full-bleed blue bar rather than a tag.
         inline-block does not help, because stretch acts on the flex item's
         cross size regardless of its display. */
      className="rounded-chip bg-np-blue-50 text-caption text-np-blue-700 self-start px-2.5 py-1 font-medium tracking-[0.08em]"
    >
      {String(n).padStart(2, '0')}
    </span>
  );
}

function Bullets({ section }: { section: GridSection }) {
  if (!section.bullets) return null;
  return (
    <>
      {/* Visually hidden, and it NAMES ITS SECTION rather than repeating one
          generic label on every card: four identical headings give heading-list
          navigation nothing to tell them apart, and a label promising what
          something "means for you" frames general education as personal advice.
          Both points come from the healthcare review of the medication page. */}
      <h3 className="sr-only">{section.heading}: key points</h3>
      {/* role="list" per the note at the top of app/globals.css: Preflight
          strips list-style and WebKit then drops the implicit role. */}
      <ul role="list" className="mt-4 flex flex-col gap-2">
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
  );
}

export function ServiceGrid({
  sections,
  media,
}: {
  sections: GridSection[];
  /** Keyed by section id, so reordering a section cannot hand it another
      section's photograph. */
  media: Record<string, GridMedia>;
}) {
  const [featured, ...rest] = sections;

  return (
    <div className="py-20 md:py-28">
      <Container>
        {/* FEATURED CARD: media beside the copy from md, stacked below it.
            items-stretch plus a media panel with no fixed ratio at md, so the
            picture is as tall as the copy and the two halves stay level however
            many points the section carries. */}
        <Reveal>
          <article className={CARD}>
            <div className="flex flex-col md:flex-row md:items-stretch">
              <GridImage
                media={media[featured.id]}
                sizes="(min-width: 768px) 46vw, 100vw"
                className="aspect-[16/9] md:aspect-auto md:min-h-[320px] md:w-1/2"
              />
              <div className="flex flex-1 flex-col justify-center gap-3 p-6 sm:p-8 md:p-10">
                <TagPill n={1} />
                <section id={featured.id} tabIndex={-1} className="focus:outline-none">
                  <h2 className="text-h2">{featured.heading}</h2>
                  <p className="text-body text-np-neutral-600 mt-3 max-w-[58ch]">{featured.body}</p>
                  <Bullets section={featured} />
                </section>
              </div>
            </div>
          </article>
        </Reveal>

        {/* THE THREE-UP ROW. h-full on the article plus items-stretch on the
            grid, so the three cards are the same height whatever their copy
            runs to, and the media caps sit on one line. */}
        <div className="mt-5 grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((section, i) => (
            <Reveal key={section.id} delay={stagger(i, 0.08)} className="h-full">
              <article className={`${CARD} flex h-full flex-col`}>
                {/* MEDIA CAP. aspect-[16/9] fixes the shape, so the three caps
                    sit on one line whatever the copy below them runs to, and
                    the cards stay equal height through `items-stretch` on the
                    grid plus h-full here.

                    No rounding of its own: the card already has rounded-xl and
                    overflow-hidden, so the panel's top corners are clipped to
                    the card's radius and a second radius here would show as a
                    lighter sliver inside the first. */}
                <GridImage
                  media={media[section.id]}
                  sizes="(min-width: 1024px) 360px, (min-width: 768px) 46vw, 100vw"
                  className="aspect-[16/9]"
                />
                <div className="flex flex-1 flex-col gap-3 p-6">
                  <TagPill n={i + 2} />
                  <section
                    id={section.id}
                    tabIndex={-1}
                    className="flex flex-1 flex-col focus:outline-none"
                  >
                    <h2 className="text-h3">{section.heading}</h2>
                    <p className="text-body text-np-neutral-600 mt-3">{section.body}</p>
                    <Bullets section={section} />
                  </section>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </div>
  );
}
