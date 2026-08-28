import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { stagger } from '@/lib/motion';
import { INSURANCE, PRACTICE_FACTS } from '@/lib/content';

/**
 * Layout family: fact row over a typographic payer wall.
 *
 * Position 2 on purpose. Four of seven peers surface payer information in the
 * first or second position because cost and coverage is the first objection.
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
 *
 * FACT ROW, adapted from Grove AI's proof-point formula with the big-number
 * treatment and the small-caps eyebrow labels removed. See disposition.md.
 */
export function InsuranceProof() {
  return (
    <section id="insurance" className="bg-np-neutral-100 scroll-mt-24 py-20 md:py-28">
      <Container>
        {/* Practice facts. Plain statements, no invented figures, no eyebrow labels. */}
        <ul className="border-np-neutral-300 grid gap-6 border-b pb-10 sm:grid-cols-3 sm:gap-8">
          {PRACTICE_FACTS.map((f, i) => (
            <Reveal as="li" key={f.fact} delay={stagger(i, 0.07)}>
              <p className="font-display text-h3 text-np-ink">{f.fact}</p>
              <p className="text-small text-np-neutral-600 mt-1.5 max-w-[32ch]">{f.detail}</p>
            </Reveal>
          ))}
        </ul>

        <div className="mt-14 grid gap-10 md:grid-cols-12 md:gap-16">
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
            <ul className="flex flex-wrap gap-x-10 gap-y-5">
              {INSURANCE.payers.map((payer, i) => (
                <Reveal as="li" key={payer} delay={stagger(i)}>
                  <span className="font-display text-body-l text-np-ink font-medium tracking-[-0.01em]">
                    {payer}
                  </span>
                </Reveal>
              ))}
            </ul>
            <Reveal delay={0.3}>
              <p className="border-np-neutral-300 text-small text-np-neutral-600 mt-10 max-w-[62ch] border-t pt-6">
                {INSURANCE.selfPay}
              </p>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
