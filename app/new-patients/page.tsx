import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { PageHeader } from '@/components/PageHeader';
import { PageCta, RelatedLinks } from '@/components/sections/PageCta';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { stagger } from '@/lib/motion';
import { GETTING_STARTED, NEW_PATIENTS_PAGE } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { breadcrumbSchema, organizationRef } from '@/lib/schema';

/**
 * New patient page.
 *
 * Expands the homepage's three-step sequence into a destination that can rank
 * for "how to start psychiatric treatment" queries, and puts the HIPAA warning
 * and the crisis guidance where a new patient will actually read them rather
 * than only in the contact form's small print.
 */
export const metadata = pageMetadata({
  title: NEW_PATIENTS_PAGE.metaTitle,
  description: NEW_PATIENTS_PAGE.metaDescription,
  path: '/new-patients',
});

export default function NewPatientsPage() {
  return (
    <>
      <JsonLd
        schemas={[
          organizationRef(),
          breadcrumbSchema([{ name: 'New patients', path: '/new-patients' }]),
        ]}
      />

      <Nav />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <PageHeader
          title={NEW_PATIENTS_PAGE.title}
          intro={NEW_PATIENTS_PAGE.intro}
          crumbs={[{ name: 'New patients', path: '/new-patients' }]}
        />

        <div className="py-20 md:py-28">
          <Container>
            <div className="grid gap-12 md:grid-cols-12 md:gap-16">
              <div className="md:col-span-4">
                <Reveal>
                  <h2 className="text-h2">The three steps</h2>
                </Reveal>
                <Reveal delay={0.08}>
                  <p className="text-body text-np-neutral-600 mt-4 max-w-[36ch]">
                    {GETTING_STARTED.body}
                  </p>
                </Reveal>
              </div>

              <ol className="md:col-span-8">
                {GETTING_STARTED.steps.map((step, i) => (
                  <Reveal as="li" key={step.title} delay={stagger(i, 0.08)}>
                    <div className="border-np-neutral-300 flex gap-6 border-b py-7 first:pt-0 last:border-b-0 last:pb-0">
                      {/* np-blue-600, matching the numerals in WhatToExpect.tsx
                          on the homepage, for the reason that section's own
                          comment sets out. This was np-amber-500 (#e9a93c),
                          which on this page's --color-np-neutral-50 ground
                          (#fbfaf8) measures 1.97:1. That is below even the 3:1
                          floor for large text, and text-h3 renders here at 22px
                          / weight 550, so the numeral does not qualify as large
                          text anyway (the exemption wants 24px, or 18.66px at
                          700). aria-hidden is not a defence: it stops a screen
                          reader reading the position twice, since the <ol>
                          already conveys it, but a sighted low-vision reader
                          has nothing else marking the sequence, so the glyph is
                          informative and 1.4.3 applies. blue-600 measures
                          8.47:1 on the same ground. */}
                      <span
                        aria-hidden="true"
                        className="font-display text-h3 text-np-blue-600 tabular-nums"
                      >
                        {i + 1}
                      </span>
                      <div>
                        <h3 className="text-h3">{step.title}</h3>
                        <p className="text-body text-np-neutral-600 mt-2 max-w-[58ch]">
                          {step.body}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </ol>
            </div>

            <div className="border-np-neutral-200 mt-20 border-t pt-12">
              <Reveal>
                <h2 className="text-h2 max-w-[22ch]">What to expect</h2>
              </Reveal>
              <ul className="mt-10 grid gap-8 md:grid-cols-3">
                {NEW_PATIENTS_PAGE.expectations.map((item, i) => (
                  <Reveal as="li" key={item.heading} delay={stagger(i, 0.08)}>
                    <div className="border-np-neutral-300 border-t pt-6">
                      <h3 className="text-h3">{item.heading}</h3>
                      <p className="text-body text-np-neutral-600 mt-3">{item.body}</p>
                    </div>
                  </Reveal>
                ))}
              </ul>
              {/* CLIENT: no "what to bring" checklist is published anywhere and
                  none is invented here. Confirm what the practice actually asks
                  new patients to have ready and it becomes a section. */}
            </div>

            <Reveal delay={0.1}>
              <aside className="rounded-card border-np-blue-600 bg-np-surface mt-20 border-l-2 p-7 ring-1 ring-[var(--np-alpha-ink-08)] md:p-9">
                <h2 className="text-h3">{NEW_PATIENTS_PAGE.privacyHeading}</h2>
                <p className="text-body text-np-neutral-600 mt-3 max-w-[70ch]">
                  {NEW_PATIENTS_PAGE.privacyBody}
                </p>
                <p className="text-body text-np-ink border-np-neutral-200 mt-5 max-w-[70ch] border-t pt-5">
                  If you need help now, call or text{' '}
                  <a
                    href="tel:988"
                    className="text-np-blue-600 font-medium underline-offset-4 hover:underline"
                  >
                    988
                  </a>{' '}
                  for the Suicide and Crisis Lifeline. In an emergency, call{' '}
                  <a
                    href="tel:911"
                    className="text-np-blue-600 font-medium underline-offset-4 hover:underline"
                  >
                    911
                  </a>{' '}
                  or go to your nearest emergency room.
                </p>
              </aside>
            </Reveal>
          </Container>
        </div>

        <RelatedLinks
          links={[
            {
              label: 'Psychiatric evaluation',
              description: 'Your first appointment, described step by step.',
              href: '/services/psychiatric-evaluation',
            },
            {
              label: 'Insurance and payment',
              description: 'The plans we accept and the sliding scale for self-pay patients.',
              href: '/insurance',
            },
            {
              label: 'Telehealth',
              description: 'Video appointments on an expanded schedule, in both states.',
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

        <PageCta heading="Take the first step" />
      </main>
      <Footer />
    </>
  );
}
