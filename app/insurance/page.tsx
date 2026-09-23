import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { PageHeader } from '@/components/PageHeader';
import { PageFaq } from '@/components/sections/PageFaq';
import { PageCta, RelatedLinks } from '@/components/sections/PageCta';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { stagger } from '@/lib/motion';
import { INSURANCE, INSURANCE_PAGE } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { breadcrumbSchema, faqSchemaFlat, organizationRef } from '@/lib/schema';

/**
 * Insurance as a destination rather than a footnote.
 *
 * The audit's finding: coverage information currently sits at the bottom of the
 * live Services page, where "does Newpoint take Aetna" has nothing to land on.
 * Payer names are set in type rather than as logos, which keeps the wall
 * consistent with the homepage and sidesteps the trademark permission question.
 */
export const metadata = pageMetadata({
  title: INSURANCE_PAGE.metaTitle,
  description: INSURANCE_PAGE.metaDescription,
  path: '/insurance',
});

export default function InsurancePage() {
  return (
    <>
      <JsonLd
        schemas={[
          organizationRef(),
          faqSchemaFlat(INSURANCE_PAGE.faqs),
          breadcrumbSchema([{ name: 'Insurance', path: '/insurance' }]),
        ]}
      />

      <Nav />
      <main id="main">
        <PageHeader
          title={INSURANCE_PAGE.title}
          intro={INSURANCE_PAGE.intro}
          crumbs={[{ name: 'Insurance', path: '/insurance' }]}
        />

        <div className="py-20 md:py-28">
          <Container>
            {/* Payer wall. Full ink strength, no grayscale: these names are the
                page's primary objection-handler and muting them would work
                against the only job the section has. */}
            <Reveal>
              <h2 className="text-h2 max-w-[20ch]">{INSURANCE_PAGE.sections[0].heading}</h2>
            </Reveal>
            <ul className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {INSURANCE.payers.map((payer, i) => (
                <Reveal as="li" key={payer} delay={stagger(i, 0.05)}>
                  <p className="font-display text-body-l text-np-ink border-np-neutral-200 border-b pb-4 font-medium tracking-[-0.01em]">
                    {payer}
                  </p>
                </Reveal>
              ))}
            </ul>
            <Reveal delay={0.2}>
              <p className="text-body-l text-np-neutral-600 mt-10 max-w-[62ch]">
                {INSURANCE_PAGE.sections[0].body}
              </p>
            </Reveal>

            <div className="mt-20 grid gap-10 md:grid-cols-3 md:gap-8">
              {INSURANCE_PAGE.sections.slice(1).map((section, i) => (
                <Reveal key={section.heading} delay={stagger(i, 0.08)}>
                  <div className="border-np-neutral-300 border-t pt-6">
                    <h2 className="text-h3">{section.heading}</h2>
                    <p className="text-body text-np-neutral-600 mt-3">{section.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </div>

        <PageFaq items={INSURANCE_PAGE.faqs} heading="Questions about cost" />

        <RelatedLinks
          links={[
            {
              label: 'Starting care',
              description: 'What happens between getting in touch and your first appointment.',
              href: '/new-patients',
            },
            {
              label: 'Psychiatric evaluation',
              description: 'The appointment every new patient starts with, described in full.',
              href: '/services/psychiatric-evaluation',
            },
            {
              label: 'Telehealth',
              description: 'Video appointments across New Jersey and Pennsylvania.',
              href: '/services/telehealth',
            },
            {
              label: 'Medication management',
              description:
                'Ongoing prescribing and review, tracked with standardized rating scales.',
              href: '/services/medication-management',
            },
          ]}
        />

        <PageCta
          heading="Let us check your coverage"
          body="Send us your contact details and ask us to check your plan before you book. Please do not include insurance ID or member numbers in the form."
        />
      </main>
      <Footer />
    </>
  );
}
