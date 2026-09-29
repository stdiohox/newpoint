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
const GOVERNMENT_PLANS: string[] = ['Medicare', 'NJ Medicaid'];
const COMMERCIAL = INSURANCE.payers.filter((p) => !GOVERNMENT_PLANS.includes(p));

/**
 * The card names the first few and counts the rest.
 *
 * It used to print every commercial payer, which worked at five names and
 * stopped working at ten, when the Pennsylvania carriers were added: a card
 * description is two or three lines of supporting copy, not a directory, and a
 * twelve-name run turned this card into a wall while the other three stayed
 * short. The count is exact rather than "and more" so the sentence still says
 * how much is missing, and /insurance carries the full list grouped by state.
 */
const NAMED_ON_CARD = 6;
const REMAINDER = COMMERCIAL.length - NAMED_ON_CARD;
const COMMERCIAL_SUMMARY =
  REMAINDER > 0
    ? `${COMMERCIAL.slice(0, NAMED_ON_CARD).join(', ')}, and ${REMAINDER} more.`
    : `${COMMERCIAL.join(', ')}.`;

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
    imageUrl: '/images/insurance/commercial.webp',
    description: COMMERCIAL_SUMMARY,
    ...CHECK_COVERAGE,
  },
  {
    gradient: 'sky',
    badgeText: 'Accepted',
    badgeColor: ACCEPTED_DOT,
    title: 'Medicare',
    imageUrl: '/images/insurance/medicare.webp',
    description: INSURANCE.coverageCheckNote,
    ...CHECK_COVERAGE,
  },
  {
    gradient: 'sage',
    badgeText: 'Accepted',
    badgeColor: ACCEPTED_DOT,
    title: 'NJ Medicaid',
    imageUrl: '/images/insurance/medicaid.webp',
    description: INSURANCE.coverageCheckNote,
    ...CHECK_COVERAGE,
  },
  {
    gradient: 'neutral',
    badgeText: 'Self-pay',
    badgeColor: SELF_PAY_DOT,
    title: 'Paying without insurance',
    imageUrl: '/images/insurance/self-pay.webp',
    description: INSURANCE.selfPay,
    ctaText: 'Insurance and payment in full',
    ctaHref: '/insurance',
  },
] as const;

export function InsuranceProof() {
  return (
    <section id="insurance" className="bg-np-surface py-20 md:py-28">
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
                /* The section ground is white, and the gradients are too pale
                   to define their own edge against it. Sampled from the
                   rendered page, each card's lightest corner measures 1.095 to
                   1.140:1 against white and the darkest only 1.21 to 1.30:1,
                   so the top-left corner of every card was effectively
                   invisible. The border is passed from here rather than baked
                   into <GradientCard />, because it is the white ground that
                   needs it, not the card. */
                className="border-np-neutral-200 border"
                gradient={card.gradient}
                badgeText={card.badgeText}
                badgeColor={card.badgeColor}
                title={card.title}
                description={card.description}
                ctaText={card.ctaText}
                ctaHref={card.ctaHref}
                imageUrl={card.imageUrl}
              />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
