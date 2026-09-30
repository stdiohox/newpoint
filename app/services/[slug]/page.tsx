import { notFound } from 'next/navigation';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { PageHero } from '@/components/PageHero';
import { PageFaq } from '@/components/sections/PageFaq';
import { PageCta, RelatedLinks } from '@/components/sections/PageCta';
import { Container } from '@/components/ui/Container';
import { CrisisPanel } from '@/components/ui/CrisisPanel';
import { Reveal } from '@/components/ui/Reveal';
import { stagger } from '@/lib/motion';
import { SERVICE_PAGES, PROVIDERS, cardPosterFor } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { breadcrumbSchema, faqSchemaFlat, organizationRef, serviceSchemaFor } from '@/lib/schema';

/**
 * One indexable page per service.
 *
 * The homepage's services cards summarise each service in two sentences
 * each, which is the right density for an overview and far too thin to rank for
 * "psychiatric assessment new jersey". These pages carry that weight instead,
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
  const poster = cardPosterFor(`/services/${service.slug}`);

  /** Schema only — the visible breadcrumb was removed from PageHero. */
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
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <PageHero
          eyebrow="Services"
          title={service.title}
          intro={service.intro}
          /* The same frame the homepage card for this service shows at rest,
             so arriving here from that card is continuous. */
          image={poster ? { src: poster } : undefined}
        />

        <div className="py-20 md:py-28">
          <Container>
            <div className="grid gap-12 md:grid-cols-12 md:gap-16">
              {/* Sticky in-page contents. On a long page reached from search, this
                  is what tells a reader the page answers their question. */}
              <div className="md:col-span-4">
                <div className="md:sticky md:top-28">
                  <nav aria-label="On this page">
                    <h2 className="text-caption text-np-neutral-600 tracking-[0.08em] uppercase">
                      On this page
                    </h2>
                    <ul role="list" className="border-np-neutral-200 mt-4 space-y-3 border-l pl-4">
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
                  </nav>

                  {/* How care is delivered, in the same words the service's own
                    homepage card uses, so the two cannot disagree. The body
                    sections describe what the service IS; none of them stated
                    the modality outright, which left it on the card and in the
                    FAQ but nowhere on the page itself. Outside the <nav>
                    because it is page content, not navigation. */}
                  <div className="bg-np-surface border-np-neutral-200 mt-8 rounded-2xl border p-5">
                    {/* h3, not h2: "On this page" above it is already an h2, and
                        two sidebar labels ahead of the first topical heading
                        pushes UI chrome to the front of the heading outline. */}
                    <h3 className="text-caption text-np-neutral-600 tracking-[0.08em] uppercase">
                      How it is delivered
                    </h3>
                    <p className="text-body text-np-ink mt-2">{service.modality}</p>
                  </div>
                </div>
              </div>

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
                      className="border-np-neutral-200 border-b pb-10 last:border-b-0 last:pb-0 focus:outline-none [&:not(:first-child)]:pt-10"
                    >
                      <h2 className="text-h2">{section.heading}</h2>
                      <p className="text-body-l text-np-neutral-600 mt-4 max-w-[62ch]">
                        {section.body}
                      </p>
                      {section.list && (
                        <ul role="list" className="mt-6 flex flex-wrap gap-2.5">
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

        {/* CRISIS GUIDANCE IS EXPLICIT ON THESE ROUTES AND NOWHERE ELSE AMONG
            THE INTERIOR PAGES, and the asymmetry is deliberate.

            PageCta used to carry an inline crisis panel, which is why it sits
            above RelatedLinks. That panel was removed on 2026-09-30 at the
            client's request. On the five other routes that is fine: PageCta is
            the last thing before the footer, and the footer's crisis strip is
            the next content a reader meets.

            NOT HERE. RelatedLinks sits between the two and renders six cards,
            and the footer's strip is itself below three stacked link columns.
            On a phone that is roughly two thousand pixels from the CTA to the
            nearest 988, on the pages that name PTSD, psychosis and
            schizophrenia. /services/medication-management is the worst of them.

            So the shared panel is rendered here, ABOVE the CTA rather than
            below it, mirroring what /contact does with order-first. It is the
            same component the homepage and /contact use, it introduces no new
            copy, and it restores CRISIS.body — "not for emergencies and is not
            monitored around the clock" — which otherwise appears on these
            routes only as footer fine print.

            h2, not the default h3: it is a top-level section here, and the
            page's outline would skip a level otherwise. */}
        <div className="pb-16 md:pb-20">
          <Container>
            <CrisisPanel headingAs="h2" className="mx-auto max-w-3xl" />
          </Container>
        </div>

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
