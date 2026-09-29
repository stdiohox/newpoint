import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { PageHero } from '@/components/PageHero';
import { PageCta, RelatedLinks } from '@/components/sections/PageCta';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { ProviderPortrait } from '@/components/ui/ProviderPortrait';
import { stagger } from '@/lib/motion';
import { PROVIDERS, SERVICE_PAGES, BUSINESS } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { breadcrumbSchema, organizationRef, personSchemaFor } from '@/lib/schema';

/**
 * A page per provider.
 *
 * Two reasons this exists rather than staying an anchor on the homepage. First,
 * people search clinicians by name before booking, and a named page is what
 * ranks for that. Second, the provider's `Person` node needs a canonical URL to
 * attach to; the homepage previously defined both providers' `@id` against
 * itself, which asked one URL to be three entities.
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

  /** Schema only — the visible breadcrumb was removed from PageHero. */
  const crumbs = [{ name: provider.name, path: `/providers/${provider.slug}` }];

  const facts = [
    { label: 'Credentials', value: provider.credentials },
    { label: 'Role', value: provider.role },
    { label: 'Licensure', value: provider.licensed },
    { label: 'Education', value: provider.education },
    // The addiction-nursing caveat that used to sit here is resolved. It asked
    // for confirmation that substance use is a real service line before the
    // experience row implied one; both providers now publish it as a specialty
    // on their own directory profiles (Headway lists it FIRST for Ofoegbu), and
    // it appears in `treats` below, so the row no longer implies more than the
    // rest of the page states. See research/provider-directories.md.
    { label: 'Experience', value: provider.experience },
    { label: 'Approach', value: provider.approach },
    // Languages last: it is the row a patient scans for rather than reads in
    // order, and both providers speak more than English, which is a real reason
    // someone picks this practice over another.
    { label: 'Languages', value: provider.languages },
    // CLIENT: licence numbers and NPI are still not published. Candidates now
    // exist for Whitaker — NPI 1760719512, NJ 26NJ00646400 (APN), PA SP016195
    // (CRNP) — from U.S. News, Grow Therapy and Headway respectively. Add them
    // as rows here once the client confirms them and agrees to publish, noting
    // that NJ and PA use different title strings (APN vs CRNP) for one role.
    // Nothing was found for Ofoegbu.
  ];

  return (
    <>
      <JsonLd schemas={[organizationRef(), personSchemaFor(provider), breadcrumbSchema(crumbs)]} />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <PageHero
          eyebrow="Provider"
          title={`${provider.name}, ${provider.credentials}`}
          intro={provider.bio}
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
                <ul role="list" className="mt-6 flex flex-wrap gap-2.5">
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
                    {/* Telehealth is stated across both states, because both
                        providers are licensed in both. In-person care is stated
                        without a state: the only place-level evidence anywhere
                        in /research is Lawrence Township, New Jersey, and there
                        is no Pennsylvania location signal at all. The street
                        address remains an open item — see OPEN_CLIENT_ITEMS. */}
                    {/* "New patients at Newpoint start with", practice-voiced,
                        NOT a second clause about this provider. Sitting under a
                        named clinician's photograph, "New patients start with a
                        comprehensive psychiatric assessment" reads as a claim
                        that SHE performs it. That is sourced for Ofoegbu, whose
                        bio names assessments, and not for Whitaker, whose names
                        medication management only — which is exactly why
                        app/services/page.tsx refuses to bind either provider to
                        a named service and files the question under CLIENT.
                        Naming the practice keeps the sentence true on both
                        pages. */}
                    <p className="text-body-l text-np-neutral-600 mt-4 max-w-[58ch]">
                      {provider.name.split(' ')[0]} sees patients across{' '}
                      {BUSINESS.serviceArea.join(' and ')} by telehealth, and in person. New
                      patients at {BUSINESS.shortName} start with a comprehensive psychiatric
                      assessment; care continues as medication management on a schedule agreed with
                      you.
                    </p>
                  </Reveal>
                  <Reveal delay={0.12}>
                    <ul role="list" className="mt-8 space-y-3">
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
