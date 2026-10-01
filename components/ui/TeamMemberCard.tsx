import { ProviderPortrait } from '@/components/ui/ProviderPortrait';
import { Reveal } from '@/components/ui/Reveal';
import type { Provider } from '@/lib/content';

/**
 * The editorial provider card: a large portrait overlapping a block of type.
 *
 * ADAPTED FROM TeamMemberCard, NOT PORTED. The source is built on fixed pixel
 * widths and a shadcn Card over the semantic palette, with a circular arrow CTA
 * in the corner. None of that survives: the widths are fluid here, the surfaces
 * are this repo's tokens, and the arrow is gone because the card is not a link
 * and an arrow on a non-link is an affordance that leads nowhere.
 *
 * WHAT IS TAKEN is the composition — an uppercase tracked label, a display name
 * broken across two lines, body copy beneath, and a portrait that overlaps the
 * type block rather than sitting beside it in a column.
 *
 * `position` PUTS THE PORTRAIT ON THAT SIDE FROM md. Below md it stacks above
 * the type at both values, because an overlap needs horizontal room it does not
 * have on a phone, and a portrait tucked behind text at 390 is just a portrait
 * you cannot see.
 *
 * NO NEW COPY. The label is `credentials`, the name is split from
 * `displayName`, and the paragraphs are the provider's own bio entries passed
 * in by the page.
 *
 * THE TITLE RULE HOLDS HERE BY CONSTRUCTION. "Dr." arrives inside
 * `displayName`, and the credentials render as the label directly above it —
 * which is the adjacency CLAUDE.md requires, in the same visual block.
 *
 * Server component. <Reveal /> is the only client code and it is a leaf.
 */
export function TeamMemberCard({
  provider,
  paragraphs,
  position,
}: {
  provider: Provider;
  /** Body copy, verbatim. One <p> per entry. */
  paragraphs: readonly string[];
  /** Which side the portrait sits on from md. */
  position: 'left' | 'right';
}) {
  /* "Dr. Funmilayo" / "Whitaker". The last whitespace-separated token is the
     family name; everything before it — title, given name, and Ofoegbu's middle
     initial — is the first line. Derived rather than stored, so a change to
     displayName cannot leave the two out of step. */
  const parts = provider.displayName.trim().split(' ');
  const family = parts[parts.length - 1];
  const lead = parts.slice(0, -1).join(' ');

  const portraitFirst = position === 'left';

  return (
    <div className="grid items-center gap-8 md:grid-cols-12 md:gap-0">
      {/* THE PORTRAIT. md:col-span-6 with a negative margin on the type block
          below is what creates the overlap — the two cells are six columns
          each, and the type pulls back over the portrait's inner edge.

          DOM order is portrait-then-type at both positions; `md:order-2` moves
          it visually for `right` so the reading order never changes. */}
      <div
        className={`md:col-span-6 ${portraitFirst ? '' : 'md:order-2'} ${
          portraitFirst ? 'md:pr-0' : 'md:pl-0'
        }`}
      >
        <Reveal>
          <ProviderPortrait
            provider={provider}
            /* alt="" — the <h2> beside it says the name, and the h1 above said
               the name and the credentials. ProviderPortrait's own alt repeats
               both, so a screen reader would hear them three times on this
               page. The /services and /providers cards pass "" for the same
               reason, and `alt ?? image.alt` treats "" correctly. */
            alt=""
            /* Fluid, not the source's fixed width.
               580px, not 560: the card renders the portrait at 568 CSS px at
               1440, so a 560 declaration under-states the box and a browser
               sizing a 2x screen against it asks for 1120 when it wants 1136.
               The masters top out at 1120 either way — see the note in the
               page — but the declaration should describe the box it is in. */
            sizes="(min-width: 1024px) 580px, (min-width: 768px) 46vw, 100vw"
            className="aspect-square w-full"
            loading="eager"
          />
        </Reveal>
      </div>

      {/* THE TYPE BLOCK, overlapping the portrait from md. The negative margin
          is on the side facing the portrait and only applies from md, so the
          stacked layout below it is a plain column with normal spacing. */}
      <div
        /* relative z-10 SO THE CARD IS ON TOP IN BOTH VARIANTS.
           Grid paints in order-modified document order, so for `right` the type
           block paints first and the portrait lands on top of it — measured
           covering the card's facing edge by 64px at md and 96px at lg,
           including the ring and the text padding. For `left` the order happens
           to favour the card, which is exactly the kind of accident that holds
           until someone flips a variant. Stated rather than relied on. */
        className={`relative z-10 md:col-span-6 ${
          portraitFirst ? 'md:-ml-16 lg:-ml-24' : 'md:-mr-16 lg:-mr-24'
        } ${portraitFirst ? '' : 'md:order-1'}`}
      >
        {/* amount="some", not Reveal's 0.3 default. This block runs past 600px
            at 320 with two paragraphs, and the default threshold cannot be met
            by anything taller than about 3.3 viewports — at 400% zoom the
            observer never fires and the card stays at opacity 0 for good. The
            prop's own note in Reveal.tsx carries the measurement. */}
        <Reveal delay={0.08} amount="some">
          <div className="bg-np-surface rounded-card p-7 ring-1 ring-[var(--np-alpha-ink-08)] sm:p-9 lg:p-11">
            {/* The label. `credentials` verbatim; the tracking and case are
                presentation, so the string is unchanged for the build
                assertion and for schema. */}
            <p className="text-caption text-np-neutral-600 tracking-[0.14em] uppercase">
              {provider.credentials}
            </p>

            {/* Two lines, as the pattern has it. One <h2>, so the heading
                outline sees a single heading and a screen reader reads one
                continuous name — the break is a <span>, not a second heading. */}
            <h2 className="text-display-l text-np-ink mt-4 leading-[1.05]">
              {/* The trailing space is deliberate: JSX strips whitespace
                  between the two spans, so without it `textContent` reads
                  "Dr. FunmilayoWhitaker". Browsers insert a break at a block
                  boundary when computing the accessible name, but crawlers,
                  translation tools and some voice matching read textContent. */}
              <span className="block">{lead}{' '}</span>
              <span className="block">{family}</span>
            </h2>

            {paragraphs.map((para, i) => (
              <p
                key={i}
                className="text-body-l text-np-neutral-600 mt-6 max-w-[52ch] not-first:mt-4"
              >
                {para}
              </p>
            ))}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
