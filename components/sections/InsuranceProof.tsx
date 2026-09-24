import { Reveal } from '@/components/ui/Reveal';
import { GradientCard } from '@/components/ui/gradient-card';
import { stagger } from '@/lib/motion';
import { INSURANCE } from '@/lib/content';

/**
 * Layout family: gradient card grid.
 *
 * Replaces the typographic payer wall. The seven names in INSURANCE.payers are
 * now grouped into the three things they actually are, commercial plans,
 * Medicare and NJ Medicaid, with a fourth card for paying without insurance.
 *
 * Sits directly after <WhatToExpect />. The page answers what we treat, who you
 * will see and what happens first, and raises cost and coverage once the
 * visitor has a reason to care about it.
 *
 * WIDTH AND GUTTERS are <WhatToExpect />'s, which are <Providers />'s:
 * px-6 / md:px-12 / lg:px-16 and no max-width. This section used <Container>
 * (max-w-[1200px] + px-4/md:px-8), so its content edges did not line up with
 * the section above it.
 *
 * NO INVENTED NAMES OR FACTS. The commercial list is INSURANCE.payers with the
 * two government plans filtered out, so the names cannot drift from the source
 * and the order is the source's. The self-pay card is INSURANCE.selfPay
 * verbatim. The Medicare and NJ Medicaid cards share
 * INSURANCE.coverageCheckNote, which restates INSURANCE.body's own promise;
 * see the note on that field.
 *
 * Server component. The only client code is <Reveal> and <GradientCard>, both
 * isolated leaves.
 */

/** The commercial plans: everything in `payers` that is not a government one. */
const GOVERNMENT_PLANS = ['Medicare', 'NJ Medicaid'];
const COMMERCIAL = INSURANCE.payers.filter((p) => !GOVERNMENT_PLANS.includes(p));

/**
 * The dot is the card's one piece of semantic state, accepted vs self-pay, so
 * it earns its place. It is aria-hidden in the card: the badge text beside it
 * already says which, and a colour on its own is not information (SC 1.4.1).
 */
const ACCEPTED_DOT = 'var(--color-np-success)';
const SELF_PAY_DOT = 'var(--color-np-neutral-500)';

const CHECK_COVERAGE = { ctaText: 'Check your coverage', ctaHref: '/contact' } as const;

const CARDS = [
  {
    gradient: 'blue',
    badgeText: 'Accepted',
    badgeColor: ACCEPTED_DOT,
    title: 'Commercial insurance',
    description: `${COMMERCIAL.join(', ')}.`,
    ...CHECK_COVERAGE,
  },
  {
    gradient: 'sky',
    badgeText: 'Accepted',
    badgeColor: ACCEPTED_DOT,
    title: 'Medicare',
    description: INSURANCE.coverageCheckNote,
    ...CHECK_COVERAGE,
  },
  {
    gradient: 'sage',
    badgeText: 'Accepted',
    badgeColor: ACCEPTED_DOT,
    title: 'NJ Medicaid',
    description: INSURANCE.coverageCheckNote,
    ...CHECK_COVERAGE,
  },
  {
    gradient: 'neutral',
    badgeText: 'Self-pay',
    badgeColor: SELF_PAY_DOT,
    title: 'Paying without insurance',
    description: INSURANCE.selfPay,
    ctaText: 'Insurance and payment in full',
    ctaHref: '/insurance',
  },
] as const;

export function InsuranceProof() {
  return (
    <section id="insurance" className="bg-np-neutral-100 py-20 md:py-28">
      <div className="px-6 md:px-12 lg:px-16">
        <div className="md:max-w-[46ch]">
          <Reveal>
            <h2 className="text-h2">{INSURANCE.heading}</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="text-body text-np-neutral-600 mt-4">{INSURANCE.body}</p>
          </Reveal>
        </div>

        {/* Four cards, four cells. role="list" for the reason globals.css
            documents: Preflight strips list-style and WebKit then drops the
            list role. */}
        <ul role="list" className="mt-12 grid gap-6 md:grid-cols-2">
          {CARDS.map((card, i) => (
            <Reveal as="li" key={card.title} delay={stagger(i, 0.08)} className="h-full">
              <GradientCard
                gradient={card.gradient}
                badgeText={card.badgeText}
                badgeColor={card.badgeColor}
                title={card.title}
                description={card.description}
                ctaText={card.ctaText}
                ctaHref={card.ctaHref}
              />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
