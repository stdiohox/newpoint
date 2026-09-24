import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { stagger } from '@/lib/motion';
import { INSURANCE } from '@/lib/content';

/**
 * Layout family: typographic payer wall.
 *
 * Now sits directly after <WhatToExpect />, not at position 2. The page answers
 * what we treat, who you will see and what happens first, and raises cost and
 * coverage once the visitor has a reason to care about it.
 *
 * The fact row that used to head this section ("Two providers", "Dual-certified",
 * "Two states") has been removed. PRACTICE_FACTS in lib/content.ts is no longer
 * rendered anywhere; every claim it made is still carried in prose by
 * <Providers /> and the provider pages.
 *
 * PAYER WALL, adapted from Grove AI's Press/Partner Logo Strip and Mintlify's
 * Partner Logo Tile: no background, no border, no hover, even baseline, sitting
 * directly on the page. Payer names are set in type rather than as brand marks,
 * which also resolves the trademark question, since insurer logos generally
 * require the payer's written permission.
 *
 * Deliberate deviation from both references: they render logos in GRAYSCALE so
 * the wall recedes. These stay at full ink strength. Payer names are the primary
 * objection-handler on this page and muting them would work against the only job
 * this section has. Grayscale is a technique for desaturating real brand marks
 * and does not transfer meaningfully to type.
 */
export function InsuranceProof() {
  return (
    <section id="insurance" className="bg-np-neutral-100 py-20 md:py-28">
      <Container>
        {/* No mt-14: the fact row this used to sit under is gone, so this grid
            is now the section's first child and the section's own py carries
            the spacing. */}
        <div className="grid gap-10 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-5">
            <Reveal>
              <h2 className="text-h2">{INSURANCE.heading}</h2>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="text-body text-np-neutral-600 mt-4 max-w-[46ch]">{INSURANCE.body}</p>
            </Reveal>
          </div>

          <div className="md:col-span-7">
            {/* Even baseline wall: no background, no border, no hover state. */}
            <ul role="list" className="flex flex-wrap gap-x-10 gap-y-5">
              {INSURANCE.payers.map((payer, i) => (
                <Reveal as="li" key={payer} delay={stagger(i)}>
                  <span className="font-display text-body-l text-np-ink font-medium tracking-[-0.01em]">
                    {payer}
                  </span>
                </Reveal>
              ))}
            </ul>
            <Reveal delay={0.3}>
              <div className="border-np-neutral-300 mt-10 max-w-[62ch] border-t pt-6">
                <p className="text-small text-np-neutral-600">{INSURANCE.selfPay}</p>
                <p className="text-small mt-4">
                  <Link
                    href="/insurance"
                    className="text-np-blue-600 font-medium underline-offset-4 hover:underline"
                  >
                    Insurance and payment in full
                    <span aria-hidden="true"> →</span>
                  </Link>
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
