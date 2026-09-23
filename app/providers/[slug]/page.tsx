import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { PageHeader } from '@/components/PageHeader';
import { PageCta, RelatedLinks } from '@/components/sections/PageCta';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { ProviderPortrait } from '@/components/ui/ProviderPortrait';
import { stagger } from '@/lib/motion';
import { PROVIDERS, SERVICE_PAGES, BUSINESS } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { breadcrumbSchema, organizationRef, physicianSchemaFor } from '@/lib/schema';

/**
 * A page per provider.
 *
 * Two reasons this exists rather than staying an anchor on the homepage. First,
 * people search clinicians by name before booking, and a named page is what
 * ranks for that. Second, `Physician` schema needs a canonical URL to attach to;
 * the homepage previously defined both providers' `@id` against itself, which
 * asked one URL to be three entities.
 *
 * CLIENT: licence numbers, NPI numbers, and the certifying body behind the
 * board-certification claim are all unpublished. Each has a marked slot below.
 */

export function generateStaticParams() {
  return PROVIDERS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const provider = PROVIDERS.find((p) => p.slug === slug);
  if (!provider) return {};

  return pageMetadata({
    // "Psychiatric Nurse Practitioner" in the title, not just the post-nominals.
    // PMHNP is the practice's actual differentiator from the psychiatrist-led
    // competitor set, and "psychiatric nurse practitioner NJ" is its own query
    // cluster — credential abbreviations do not match it.
    title: `${provider.name}, Psychiatric Nurse Practitioner`,
    absoluteTitle: true,
    // Built from fixed-length parts rather than interpolating `experience`,
    // which runs long enough on one provider to push the description past the
    // ~155 characters Google will display.
    description: `${provider.name}, ${provider.credentials}. Psychiatric mental health nurse practitioner at Newpoint, licensed in New Jersey and Pennsylvania.`,
    path: `/providers/${provider.slug}`,
  });
}

export default async function ProviderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const provider = PROVIDERS.find((p) => p.slug === slug);
  if (!provider) notFound();

  const colleague = PROVIDERS.find((p) => p.slug !== provider.slug);

  /** One trail, used for both the visible breadcrumb and the schema, so the two cannot drift. */
  const crumbs = [{ name: provider.name, path: `/providers/${provider.slug}` }];

  const facts = [
    { label: 'Credentials', value: provider.credentials },
    { label: 'Role', value: provider.role },
    { label: 'Licensure', value: provider.licensed },
    // CLIENT: one provider's experience line names addiction nursing. That is
    // her own bio and is sourced, but substance-use treatment is NOT a confirmed
    // service line, and a credentials row reading "addiction" next to a booking
    // CTA can read as an offer. Confirm whether the practice treats substance
    // use before this page implies it.
    { label: 'Experience', value: provider.experience },
    { label: 'Approach', value: provider.approach },
    // CLIENT: add { label: 'NPI', value: '…' } and a state licence number row
    // here once supplied, or confirm the practice prefers not to publish them.
  ];

  return (
    <>
      <JsonLd
        schemas={[organizationRef(), physicianSchemaFor(provider), breadcrumbSchema(crumbs)]}
      />

      <Nav />
      <main id="main">
        <PageHeader
          eyebrow="Provider"
          title={`${provider.name}, ${provider.credentials}`}
          intro={provider.bio}
          crumbs={crumbs}
        />

        <div className="py-20 md:py-28">
          <Container>
            <div className="grid gap-12 md:grid-cols-12 md:gap-16">
              <div className="md:col-span-5">
                <Reveal>
                  <ProviderPortrait
                    provider={provider}
                    sizes="(min-width: 768px) 440px, 100vw"
                    className="w-full"
                    loading="eager"
                  />
                </Reveal>
                <Reveal delay={0.08}>
                  <dl className="border-np-neutral-200 mt-8 border-t">
                    {facts.map((fact) => (
                      <div
                        key={fact.label}
                        className="border-np-neutral-200 flex gap-6 border-b py-4"
                      >
                        <dt className="text-caption text-np-neutral-600 w-28 shrink-0 pt-0.5">
                          {fact.label}
                        </dt>
                        <dd className="text-small text-np-neutral-700">{fact.value}</dd>
                      </div>
                    ))}
                  </dl>
                </Reveal>
                <Reveal delay={0.12}>
                  <div className="mt-6">
                    <p className="text-small text-np-neutral-600">
                      Email{' '}
                      <a
                        href={`mailto:${provider.email}`}
                        className="text-np-blue-600 font-medium underline-offset-4 hover:underline"
                      >
                        {provider.email}
                      </a>
                      , or call the practice on{' '}
                      <a
                        href={`tel:${BUSINESS.phonePrimaryHref}`}
                        className="text-np-blue-600 font-medium underline-offset-4 hover:underline"
                      >
                        {BUSINESS.phonePrimary}
                      </a>
                      .
                    </p>
                    {/* This is the one place on the site that solicits free-text
                        email directly to a named clinician. Every other contact
                        surface carries the warning; without it here, someone
                        arriving from a name search describes their symptoms into
                        an ordinary mailbox. */}
                    <p className="text-caption text-np-neutral-600 mt-2 max-w-[46ch]">
                      Please do not include symptoms, diagnoses, medications, or insurance ID
                      numbers in an email. It is not a secure channel for them.
                    </p>
                  </div>
                </Reveal>
              </div>

              <div className="md:col-span-7">
                <Reveal>
                  <h2 className="text-h2">What {provider.name.split(' ')[0]} treats</h2>
                </Reveal>
                <ul className="mt-6 flex flex-wrap gap-2.5">
                  {provider.treats.map((condition, i) => (
                    <Reveal as="li" key={condition} delay={stagger(i, 0.04)}>
                      <span className="rounded-chip bg-np-blue-50 text-small text-np-blue-700 inline-block px-3 py-1.5">
                        {condition}
                      </span>
                    </Reveal>
                  ))}
                </ul>

                <div className="border-np-neutral-200 mt-12 border-t pt-10">
                  <Reveal>
                    <h2 className="text-h2">Appointments</h2>
                  </Reveal>
                  <Reveal delay={0.08}>
                    {/* CLIENT: "by telehealth" only. No street address is
                        published and it is unconfirmed whether a public office
                        exists, so this does not promise in-person appointments
                        in two states. Widen it once a location is confirmed. */}
                    <p className="text-body-l text-np-neutral-600 mt-4 max-w-[58ch]">
                      {provider.name.split(' ')[0]} sees patients across{' '}
                      {BUSINESS.serviceArea.join(' and ')} by telehealth. New patients start with a
                      comprehensive psychiatric evaluation; care continues as medication management
                      on a schedule agreed with you.
                    </p>
                  </Reveal>
                  <Reveal delay={0.12}>
                    <ul className="mt-8 space-y-3">
                      {SERVICE_PAGES.map((service) => (
                        <li key={service.slug}>
                          <Link
                            href={`/services/${service.slug}`}
                            className="text-body text-np-blue-600 font-medium underline-offset-4 hover:underline"
                          >
                            {service.title}
                            <span aria-hidden="true"> →</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                </div>

                {/* CLIENT: "board-certified" is claimed in the practice's own ad
                    copy, but no certifying body is named anywhere on the live
                    site. The post-nominals imply one and it must not be assumed,
                    so no certification statement appears on this page. */}
              </div>
            </div>
          </Container>
        </div>

        <RelatedLinks
          heading="Elsewhere on the site"
          links={[
            ...(colleague
              ? [
                  {
                    label: colleague.name,
                    description: `${colleague.credentials}. ${colleague.licensed}.`,
                    href: `/providers/${colleague.slug}`,
                  },
                ]
              : []),
            {
              label: 'Starting care',
              description: 'The three steps from first contact to ongoing treatment.',
              href: '/new-patients',
            },
            {
              label: 'Insurance and payment',
              description: 'The plans we accept and the sliding scale for self-pay patients.',
              href: '/insurance',
            },
          ]}
        />

        <PageCta heading={`Book with ${provider.name.split(' ')[0]}`} />
      </main>
      <Footer />
    </>
  );
}
