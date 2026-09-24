import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { FeatureBentoGrid } from '@/components/ui/feature-section-with-bento-grid';
import { CTA, WHAT_TO_EXPECT } from '@/lib/content';

/**
 * Layout family: bento grid.
 *
 * The markup is now <FeatureBentoGrid />, the supplied shadcn block. This file
 * is the section wrapper and the content binding: it keeps the id, passes
 * WHAT_TO_EXPECT through, and renders the CTA below the grid.
 *
 * Sits directly after <Providers />, and replaced <GettingStarted /> on the
 * homepage rather than joining it. Both are the same process; carrying two
 * numbered sequences on one page would have restated the journey twice and
 * broken the "seven sections, seven distinct layout families" rule that
 * app/page.tsx documents. The family is now a bento grid rather than a
 * numbered rail, which is still that section's own family and no other's.
 *
 * Nothing linked to #getting-started (no nav item, no footer link, no internal
 * href anywhere in the repo), so dropping that anchor from the homepage breaks
 * no inbound target.
 *
 * NOTE: components/sections/GettingStarted.tsx has been deleted. The homepage
 * was its only consumer, so this section taking its slot left it imported by
 * nothing. The GETTING_STARTED copy in lib/content.ts is still live:
 * /new-patients renders it through its own markup and never touched the
 * component.
 *
 * NO SECTION BACKGROUND, deliberately. This section used to set
 * bg-np-neutral-100, and the block's cards map bg-muted onto that same
 * np-neutral-100. Keeping both would have painted the cards in the exact
 * colour of the ground behind them and made the grid disappear. The block's
 * own root carries no background, so the section inherits the page's
 * np-neutral-50 and the cards read against it.
 *
 * That also restores the tonal seam app/page.tsx flagged: <InsuranceProof />
 * follows this section and is still np-neutral-100, so the two no longer run
 * together as one band.
 *
 * The step numerals are gone with the rail that carried them, so the
 * np-blue-600 contrast note that used to live here no longer applies to this
 * file. /new-patients still carries that pattern and keeps its own note.
 *
 * The badge is WHAT_TO_EXPECT.badge ("How it works"), not the heading. They were
 * briefly the same string, which rendered "What to expect" twice, once as the
 * pill and once as the h2.
 *
 * The old note here said this section must not carry an eyebrow because
 * <FeaturedServices /> renders one directly below it. That is no longer true:
 * the homepage order now runs services, providers, what to expect, so the two
 * eyebrows are three sections apart.
 *
 * Server component. The only client code is <Reveal>, which is already an
 * isolated leaf.
 */
export function WhatToExpect() {
  return (
    <section id="what-to-expect">
      <FeatureBentoGrid
        badge={WHAT_TO_EXPECT.badge}
        heading={WHAT_TO_EXPECT.heading}
        intro={WHAT_TO_EXPECT.body}
        steps={WHAT_TO_EXPECT.steps}
      >
        {/* The site's single CTA intent, by the shared constant. Never a second
            label for this action: see the note on CTA in lib/content.ts. */}
        <Reveal delay={0.24}>
          <div>
            <Button href={CTA.href} size="lg">
              {CTA.label}
            </Button>
          </div>
        </Reveal>
      </FeatureBentoGrid>
    </section>
  );
}
