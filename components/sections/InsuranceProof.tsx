import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { stagger } from '@/lib/motion';
import { INSURANCE } from '@/lib/content';

/**
 * Layout family: full-width band, typographic payer list.
 *
 * Position 2 on purpose. Four of seven peers surface payer information in the
 * first or second position because cost and coverage is the first objection.
 *
 * CLIENT: payer names are set typographically rather than as brand marks.
 * Insurer logos are trademarks and their use generally requires the payer's
 * permission, so real SVG marks should only be added once the practice has
 * written approval or brand assets from each plan.
 */
export function InsuranceProof() {
  return (
    <section id="insurance" className="bg-np-neutral-100 scroll-mt-24 py-20 md:py-28">
      <Container>
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
            <ul className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
              {INSURANCE.payers.map((payer, i) => (
                <Reveal as="li" key={payer} delay={stagger(i)}>
                  <span className="font-display text-body text-np-ink font-medium">{payer}</span>
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
