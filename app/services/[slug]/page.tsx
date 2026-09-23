import { notFound } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { PageHeader } from '@/components/PageHeader';
import { PageFaq } from '@/components/sections/PageFaq';
import { PageCta, RelatedLinks } from '@/components/sections/PageCta';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { stagger } from '@/lib/motion';
import { SERVICE_PAGES, PROVIDERS } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { breadcrumbSchema, faqSchemaFlat, organizationRef, serviceSchemaFor } from '@/lib/schema';

/**
 * One indexable page per service.
 *
 * The homepage's WhatWeTreat cards summarise all four services in two sentences
 * each, which is the right density for an overview and far too thin to rank for
 * "psychiatric evaluation new jersey". These pages carry that weight instead,
 * each targeting a single query cluster, each with its own title, description,
 * its own schema.org node, and FAQ block.
 *
 * Statically generated at build time: the content is a constant, so there is no
 * reason for any of this to be rendered on demand.
 */

export function generateStaticParams() {
  return SERVICE_PAGES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = SERVICE_PAGES.find((s) => s.slug === slug);
  if (!service) return {};

  return pageMetadata({
    title: service.metaTitle,
    description: service.metaDescription,
    path: `/services/${service.slug}`,
  });
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = SERVICE_PAGES.find((s) => s.slug === slug);
  if (!service) notFound();

  const siblings = SERVICE_PAGES.filter((s) => s.slug !== service.slug);

  /** One trail, used for both the visible breadcrumb and the schema, so the two cannot drift. */
  const crumbs = [
    { name: 'Services', path: '/services' },
    { name: service.nav, path: `/services/${service.slug}` },
  ];

  return (
    <>
      <JsonLd
        schemas={[
          organizationRef(),
          serviceSchemaFor(service),
          faqSchemaFlat(service.faqs),
          breadcrumbSchema(crumbs),
        ]}
      />

      <Nav />
      <main id="main">
        <PageHeader
          eyebrow="Services"
          title={service.title}
          intro={service.intro}
          crumbs={crumbs}
        />

        <div className="py-20 md:py-28">
          <Container>
            <div className="grid gap-12 md:grid-cols-12 md:gap-16">
              {/* Sticky in-page contents. On a long page reached from search, this
                  is what tells a reader the page answers their question. */}
              <nav aria-label="On this page" className="md:col-span-4">
                <div className="md:sticky md:top-28">
                  <h2 className="text-caption text-np-neutral-600 tracking-[0.08em] uppercase">
                    On this page
                  </h2>
                  <ul className="border-np-neutral-200 mt-4 space-y-3 border-l pl-4">
                    {service.sections.map((section) => (
                      <li key={section.heading}>
                        <a
                          href={`#${slugify(section.heading)}`}
                          className="text-small text-np-neutral-600 hover:text-np-blue-600 ease-np-out transition-colors duration-[180ms]"
                        >
                          {section.heading}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </nav>

              <div className="md:col-span-8">
                {service.sections.map((section, i) => (
                  <Reveal key={section.heading} delay={stagger(i, 0.05)}>
                    {/* tabIndex -1 so activating a jump link moves real focus
                        into the section. Without it the viewport scrolls but the
                        screen-reader cursor and document.activeElement stay on the
                        sidebar link, which has just scrolled out of view. */}
                    <section
                      id={slugify(section.heading)}
                      tabIndex={-1}
                      className="border-np-neutral-200 scroll-mt-28 border-b pb-10 last:border-b-0 last:pb-0 focus:outline-none [&:not(:first-child)]:pt-10"
                    >
                      <h2 className="text-h2">{section.heading}</h2>
                      <p className="text-body-l text-np-neutral-600 mt-4 max-w-[62ch]">
                        {section.body}
                      </p>
                      {section.list && (
                        <ul className="mt-6 flex flex-wrap gap-2.5">
                          {section.list.map((item) => (
                            <li
                              key={item}
                              className="rounded-chip bg-np-blue-50 text-small text-np-blue-700 px-3 py-1.5"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </Reveal>
                ))}
              </div>
            </div>
          </Container>
        </div>

        <PageFaq items={service.faqs} />

        {/* PageCta carries the crisis panel, so it sits ABOVE RelatedLinks:
            a reader who arrived on a page naming PTSD, psychosis and
            schizophrenia should not have to scroll past a "keep reading" grid
            to find 988. */}
        <PageCta />

        <RelatedLinks
          heading="Keep reading"
          links={[
            ...siblings.map((s) => ({
              label: s.title,
              description: s.metaDescription,
              href: `/services/${s.slug}`,
            })),
            {
              label: 'Starting care',
              description: 'The three steps from first contact to ongoing treatment.',
              href: '/new-patients',
            },
            {
              label: 'Insurance and payment',
              description:
                'The plans we accept, the sliding scale for self-pay patients, and how to check your coverage.',
              href: '/insurance',
            },
            ...PROVIDERS.map((p) => ({
              label: p.name,
              description: `${p.credentials}. ${p.licensed}.`,
              href: `/providers/${p.slug}`,
            })),
          ]}
        />
      </main>
      <Footer />
    </>
  );
}

/** Heading to anchor id. Section headings are fixed content, so this is total. */
function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
