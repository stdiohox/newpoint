import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { PageHeader } from '@/components/PageHeader';
import { PageCta } from '@/components/sections/PageCta';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { stagger } from '@/lib/motion';
import { SERVICE_PAGES, WHAT_WE_TREAT, PROVIDERS } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { breadcrumbSchema, organizationRef, serviceSchemaFor } from '@/lib/schema';

/**
 * Services hub.
 *
 * Its job is structural as much as editorial: it is the single page that links
 * to all three service pages, which is how they get crawled and how link equity
 * reaches them. The live site's Services page is a single undifferentiated wall
 * of copy; this splits it into destinations and keeps the wall's content on them.
 */
export const metadata = pageMetadata({
  // The homepage owns the practice/provider angle; this page owns "psychiatric
  // services" as its head term, so the two are not arbitrating the same query.
  title: 'Psychiatric Services in NJ and PA',
  description:
    'Psychiatric evaluation, medication management, and telehealth in New Jersey and Pennsylvania. What each involves and how to get started.',
  path: '/services',
});

export default function ServicesIndex() {
  return (
    <>
      <JsonLd
        schemas={[
          organizationRef(),
          ...SERVICE_PAGES.map(serviceSchemaFor),
          breadcrumbSchema([{ name: 'Services', path: '/services' }]),
        ]}
      />

      <Nav />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <PageHeader
          title="What we do, and how it works"
          intro="Care at Newpoint starts with a comprehensive psychiatric evaluation and continues as medication management, in person or by telehealth. Telehealth runs across New Jersey and Pennsylvania. Each of those is a page of its own below."
          crumbs={[{ name: 'Services', path: '/services' }]}
        />

        <div className="py-20 md:py-28">
          <Container>
            <ul role="list" className="grid gap-6 md:grid-cols-3 md:gap-8">
              {SERVICE_PAGES.map((service, i) => (
                <Reveal as="li" key={service.slug} delay={stagger(i, 0.08)}>
                  <Link
                    href={`/services/${service.slug}`}
                    className="rounded-card bg-np-surface ease-np-out group flex h-full flex-col p-7 ring-1 ring-[var(--np-alpha-ink-08)] transition-shadow duration-[180ms] hover:shadow-[var(--shadow-np-card)] md:p-8"
                  >
                    <h2 className="text-h3 group-hover:text-np-blue-600 ease-np-out transition-colors duration-[180ms]">
                      {service.title}
                    </h2>
                    <p className="text-body text-np-neutral-600 mt-3 flex-1">{service.intro}</p>
                    <span className="text-small text-np-blue-600 mt-6 font-medium">
                      Read more
                      <span aria-hidden="true"> →</span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </ul>

            {/* Treatment options named on the live Services page but not built out
                as pages of their own, because the source material describes them
                in a single line each.
                CLIENT: skill-building groups and support groups are listed as
                treatment options but never described anywhere — no cadence,
                format, or topics. Supply those and each becomes a page. */}
            <div className="border-np-neutral-200 mt-20 border-t pt-12">
              <Reveal>
                <h2 className="text-h2 max-w-[22ch]">Also available</h2>
              </Reveal>
              <Reveal delay={0.08}>
                <p className="text-body-l text-np-neutral-600 mt-4 max-w-[62ch]">
                  Alongside evaluation and medication management, we will work with you to find the
                  treatment option that fits.
                </p>
              </Reveal>
              <ul role="list" className="mt-8 grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  'Psychiatric consultation',
                  'Individual counseling',
                  'Skill-building groups',
                  'Support groups',
                  'Referral to follow-up services',
                  // Only options the practice itself names on its live Services
                  // page. Nothing is added to this menu.
                ].map((option, i) => (
                  <Reveal as="li" key={option} delay={stagger(i, 0.04)}>
                    <p className="border-np-neutral-200 text-body text-np-neutral-700 border-b pb-3">
                      {option}
                    </p>
                  </Reveal>
                ))}
              </ul>
            </div>

            <div className="border-np-neutral-200 mt-20 border-t pt-12">
              <Reveal>
                <h2 className="text-h2 max-w-[22ch]">Conditions we treat</h2>
              </Reveal>
              <Reveal delay={0.08}>
                <p className="text-body-l text-np-neutral-600 mt-4 max-w-[62ch]">
                  {WHAT_WE_TREAT.body}
                </p>
              </Reveal>
              <ul role="list" className="mt-8 flex flex-wrap gap-2.5">
                {WHAT_WE_TREAT.conditions.map((condition, i) => (
                  <Reveal as="li" key={condition} delay={stagger(i, 0.03)}>
                    <span className="rounded-chip bg-np-blue-50 text-small text-np-blue-700 inline-block px-3 py-1.5">
                      {condition}
                    </span>
                  </Reveal>
                ))}
              </ul>
              {/* CLIENT: no therapy modality (CBT, DBT, EMDR and similar) is named
                  anywhere in the source material, and none is invented here.
                  Naming the ones actually practised is the single highest-value
                  content addition left on this page.
                  CLIENT: age range served is not stated as a practice policy. */}
            </div>

            <div className="border-np-neutral-200 mt-20 border-t pt-12">
              <Reveal>
                <h2 className="text-h2 max-w-[22ch]">Who you will see</h2>
              </Reveal>
              <ul role="list" className="mt-8 grid gap-6 sm:grid-cols-2 md:gap-8">
                {PROVIDERS.map((p, i) => (
                  <Reveal as="li" key={p.slug} delay={stagger(i, 0.08)}>
                    <Link
                      href={`/providers/${p.slug}`}
                      className="rounded-card bg-np-surface ease-np-out group block h-full p-6 ring-1 ring-[var(--np-alpha-ink-08)] transition-shadow duration-[180ms] hover:shadow-[var(--shadow-np-card)]"
                    >
                      <h3 className="text-h3 group-hover:text-np-blue-600 ease-np-out transition-colors duration-[180ms]">
                        {p.name}
                      </h3>
                      <p className="font-display text-small text-np-neutral-600 mt-1 font-medium">
                        {p.credentials}
                      </p>
                      <p className="text-small text-np-neutral-600 mt-3">{p.licensed}</p>
                    </Link>
                  </Reveal>
                ))}
              </ul>
            </div>
          </Container>
        </div>

        <PageCta />
      </main>
      <Footer />
    </>
  );
}
