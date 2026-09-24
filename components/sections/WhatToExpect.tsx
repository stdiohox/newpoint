import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { outfit } from '@/app/fonts';
import { stagger } from '@/lib/motion';
import { CTA, WHAT_TO_EXPECT } from '@/lib/content';

/**
 * Layout family: numbered horizontal rail.
 *
 * Sits directly after <Providers />, and replaces <GettingStarted /> on the
 * homepage rather than joining it. Both are the same process; carrying two
 * numbered sequences on one page would have restated the journey twice and
 * broken the "seven sections, seven distinct layout families" rule that
 * app/page.tsx documents.
 *
 * Nothing linked to #getting-started (no nav item, no footer link, no internal
 * href anywhere in the repo), so dropping that anchor from the homepage breaks
 * no inbound target.
 *
 * NOTE: components/sections/GettingStarted.tsx is now imported by nothing. The
 * homepage was its only consumer; /new-patients renders the GETTING_STARTED
 * copy through its own markup and never touched the component. The file is left
 * in place rather than deleted because removing it was not part of this change,
 * but it is dead code and should either be deleted or given a consumer.
 *
 * Server component. The only client code is <Reveal>, which is already an
 * isolated leaf.
 */

/**
 * Width and gutters are <Providers />'s, deliberately and exactly: the same
 * px-6 / md:px-12 / lg:px-16 site gutter scale, and no max-width. That scale is
 * <HeroNav />'s, so this section's content edges line up with the wordmark, the
 * header CTA and the providers panel above it on one continuous vertical line.
 *
 * This is NOT <Container> (max-w-[1200px] + px-4/md:px-8), which is what the
 * rest of the site's interior sections use. Matching Providers was the explicit
 * ask, and Providers left that cap behind.
 */
const GUTTERS = 'px-6 md:px-12 lg:px-16';

/**
 * Heading and intro are the services section's, to the value.
 *
 * Lifted from FeaturedServices.module.css .heading and .subtitle rather than
 * imported, because that file is a CSS module scoped to that component and its
 * class names are not reachable from here. The numbers are therefore duplicated
 * and CAN drift: if the services header is restyled, this is the other place to
 * change.
 *
 *   .heading   Outfit 500, 64px / -2.5px tracking / 1.05, #111, balanced
 *              -> 48px / -1.6px under `max-width: 768px`
 *   .subtitle  18px / 500 / 1.5, #404040 at 0.8 opacity, max-width 480px
 *
 * Two deliberate differences:
 *
 * 1. rem, not px. The services module sets a hard 64px/48px, which ignores the
 *    user's font-size setting entirely (page zoom still scales it; text-only
 *    zoom does not). 4rem and 3rem render identically at a 16px root and scale
 *    when the user asks them to. Same pixels by default, better under WCAG 1.4.4.
 *
 * 2. `min-[769px]` rather than `md`. The module's breakpoint is
 *    `max-width: 768px`, so 768 itself gets the small size; Tailwind's `md` is
 *    min-width 768 and would flip one pixel early. This keeps the crossover on
 *    the same pixel as the section it is matching.
 *
 * There is no `.badge` eyebrow here on purpose. FeaturedServices renders one
 * ("Services") and is the very next section, so a second small-caps label
 * immediately above it would double the device on two adjacent sections. The
 * brief asked for the heading and intro style, which is what this is.
 */
const HEADING_FONT = 'var(--font-outfit), ui-sans-serif, system-ui, sans-serif';

export function WhatToExpect() {
  return (
    <section
      id="what-to-expect"
      className={`bg-np-neutral-100 ${outfit.variable} py-24 md:py-32`}
    >
      <div className={GUTTERS}>
        <Reveal>
          <h2
            className="text-[3rem] tracking-[-1.6px] text-[#111] min-[769px]:text-[4rem] min-[769px]:tracking-[-2.5px]"
            style={{
              fontFamily: HEADING_FONT,
              fontWeight: 500,
              lineHeight: 1.05,
              textWrap: 'balance',
            }}
          >
            {WHAT_TO_EXPECT.heading}
          </h2>
        </Reveal>

        <Reveal delay={0.08}>
          {/* #404040 at 0.8 over np-neutral-100 (#f4f2ed) composites to about
              #6a6862 = 5.2:1, clear of the 4.5:1 AA asks of 18px/500. The
              services section runs the same pair over white at 5.74:1. */}
          <p
            className="mt-7 max-w-[480px] text-[1.125rem] leading-[1.5] font-medium text-[#404040] opacity-80"
          >
            {WHAT_TO_EXPECT.body}
          </p>
        </Reveal>

        {/* Numbered horizontal rail on desktop, stacked on mobile.

            <ol> because the order is the point: this is a sequence, and a
            screen reader should hear "list of 4 items" with real positions.
            The visible numeral is aria-hidden so the count is not read twice.

            The hairline is the step's own top border, not a drawn connector
            line. Four borders sitting on one row read as a single rail across
            the section at desktop, and restack into four separated rows on
            mobile without any of the pseudo-element trickery a real connector
            needs to avoid a tail hanging off the last item. */}
        {/* `grid-rows-subgrid` at desktop, so the numeral, the title and the
            body each sit on a row shared by all four steps. Without it the
            columns only align at their tops and a title that wraps pushes its
            own body down: "Comprehensive psychiatric evaluation" takes two
            lines while the other three take one, which left step 2's paragraph
            sitting a line below its neighbours.

            A min-height on the title would also have squared it up, but only
            for titles of one or two lines - it encodes today's copy as a
            layout constant. Subgrid measures whatever the rows actually are.

            Gated to the 4-column breakpoint on purpose: stacked on mobile each
            step is its own block and there is nothing to align across, so the
            li stays a plain block there. Where subgrid is unsupported the
            layout falls back to exactly the top-aligned version above, which
            is untidy rather than broken. */}
        {/* role="list" is not redundant, exactly as Providers.tsx documents for
            its <ul>: Tailwind Preflight sets list-style: none, and WebKit then
            drops the list role entirely. That applies to <ol> the same as <ul>,
            so without this VoiceOver never announces "list, 4 items" and the
            sequence this section exists to communicate is lost.

            The breakpoint is 56.25em, not the 900px it started as. Media-query
            em resolves against the browser's INITIAL font size, so a reader who
            raises their default text size gets the single-column stack at a
            proportionally wider viewport instead of four columns squeezed to
            276px each. (The heading's `min-[769px]` above stays in px on
            purpose: its job is to land on the same pixel as the services
            module's `max-width: 768px`, not to respond to text size.) */}
        <ol
          role="list"
          className="mt-14 grid grid-cols-1 gap-x-8 gap-y-10 min-[56.25em]:grid-cols-4 min-[56.25em]:grid-rows-[auto_auto_1fr]"
        >
          {WHAT_TO_EXPECT.steps.map((step, i) => (
            <Reveal
              as="li"
              key={step.title}
              delay={stagger(i, 0.08)}
              className="border-np-neutral-300 border-t pt-6 min-[56.25em]:row-span-3 min-[56.25em]:grid min-[56.25em]:grid-rows-subgrid min-[56.25em]:gap-0"
            >
              {/* np-blue-600, NOT the np-amber-500 this numeral pattern uses in
                  GettingStarted.tsx and on /new-patients. Measured on this
                  section's own --color-np-neutral-100 ground, amber-500
                  (#e9a93c) renders 1.84:1. That is below even the 3:1 floor for
                  large text, and this numeral does not qualify as large text
                  anyway (1.375rem at weight 600; the exemption wants 24px, or
                  18.66px at 700).

                  aria-hidden is not a defence here. It keeps a screen reader
                  from reading the number twice, since the <ol> already conveys
                  position, but a sighted user with low vision has nothing else
                  marking the sequence, so the glyph is informative and 1.4.3
                  applies to it. blue-600 on this ground measures 8.4:1.

                  The amber instances on /new-patients have the same problem and
                  are untouched: that page was not in scope for this change. */}
              <span
                aria-hidden="true"
                className="font-display text-np-blue-600 block text-[1.375rem] leading-none font-semibold tabular-nums"
              >
                {i + 1}
              </span>
              {/* h3: the section's h2 is above, and nothing here nests
                  deeper, so the outline stays h2 -> h3 with no skip. */}
              <h3 className="text-h3 mt-4 text-balance">{step.title}</h3>
              <p className="text-body text-np-neutral-600 mt-2 max-w-[42ch]">{step.body}</p>
            </Reveal>
          ))}
        </ol>

        {/* The site's single CTA intent, by the shared constant. Never a second
            label for this action: see the note on CTA in lib/content.ts. */}
        <Reveal delay={0.24}>
          <div className="mt-14">
            <Button href={CTA.href} size="lg">
              {CTA.label}
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
