import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { PageHero } from '@/components/PageHero';
import { PageCta, RelatedLinks } from '@/components/sections/PageCta';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { Button } from '@/components/ui/Button';
import { CrisisPanel } from '@/components/ui/CrisisPanel';
import { stagger } from '@/lib/motion';
import { BUSINESS, CONTACT_PAGE, CTA, PROVIDERS } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { breadcrumbSchema, contactPageSchema, organizationRef } from '@/lib/schema';

/**
 * /contact.
 *
 * The live site had a real Contact page at this exact path, carrying priority
 * 1.0 in its sitemap. The rebuild previously 301'd it to a homepage fragment,
 * which worked for a human but left the most-searched page type for a clinical
 * practice with no destination of its own. This restores it.
 *
 * No form with a backend: the appointment request goes to the existing form in
 * the homepage's contact section, so there is exactly one submission path on
 * the site. Everything else here is a `tel:` or `mailto:` link.
 *
 * CLIENT: no hours, no street address, and no practice-wide inbox appear on
 * this page, because none of the three is confirmed anywhere in /research.
 */
export const metadata = pageMetadata({
  title: CONTACT_PAGE.metaTitle,
  description: CONTACT_PAGE.metaDescription,
  path: '/contact',
});

export default function ContactPage() {
  /** Schema only — the visible breadcrumb was removed from PageHero. */
  const crumbs = [{ name: 'Contact', path: '/contact' }];

  return (
    <>
      <JsonLd schemas={[organizationRef(), contactPageSchema(), breadcrumbSchema(crumbs)]} />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <PageHero title={CONTACT_PAGE.title} intro={CONTACT_PAGE.intro} />

        <div className="py-20 md:py-28">
          <Container>
            <div className="grid gap-12 md:grid-cols-12 md:gap-16">
              <div className="md:col-span-7">
                {/*
                 * This page's primary action is the one it can actually perform:
                 * the call. Everywhere else on the site the CTA points at the
                 * homepage form (CTA.href), which is right for pages that have no
                 * contact mechanism of their own — but on /contact that sent the
                 * highest-intent click away from the page whose whole job is to
                 * handle it.
                 *
                 * No booking link is used because none exists: research/ records
                 * no online scheduling widget, and the only absolute URL in the
                 * content layer is the site's own domain. So the action is tel:,
                 * per the fallback.
                 *
                 * The label names the action and the number rather than saying
                 * "Request an appointment", so the accessible name matches what
                 * activating it does. The form stays reachable underneath.
                 */}
                <Reveal>
                  <h2 className="text-h2">Request an appointment</h2>
                </Reveal>
                <Reveal delay={0.08}>
                  <p className="text-body-l text-np-neutral-600 mt-4 max-w-[58ch]">
                    Calling is the fastest way to reach us. Please keep health information out of
                    any message you send — tell us how to reach you and we will take the clinical
                    details directly.
                  </p>
                </Reveal>
                <Reveal delay={0.14}>
                  <div className="mt-8 flex flex-wrap items-center gap-5">
                    <Button href={`tel:${BUSINESS.phonePrimaryHref}`} size="lg">
                      Call {BUSINESS.phonePrimary}
                    </Button>
                    <a
                      href={CTA.href}
                      className="text-body text-np-blue-600 font-medium underline-offset-4 hover:underline"
                    >
                      Or send the appointment form
                    </a>
                  </div>
                </Reveal>

                {/* Phone */}
                <div className="border-np-neutral-200 mt-14 border-t pt-10">
                  <Reveal>
                    <h2 className="text-h2">Call us</h2>
                  </Reveal>
                  <Reveal delay={0.08}>
                    <p className="text-body text-np-neutral-600 mt-3 max-w-[52ch]">
                      {CONTACT_PAGE.phoneNote}
                    </p>
                  </Reveal>
                  <Reveal delay={0.12}>
                    <ul role="list" className="mt-6 space-y-3">
                      <li>
                        <a
                          href={`tel:${BUSINESS.phonePrimaryHref}`}
                          className="font-display text-h3 text-np-blue-600 ease-np-out underline-offset-4 transition-colors duration-[180ms] hover:underline"
                        >
                          {BUSINESS.phonePrimary}
                        </a>
                      </li>
                      {BUSINESS.phoneAlt.map((phone) => (
                        <li key={phone}>
                          <a
                            href={`tel:+1${phone.replace(/\D/g, '')}`}
                            className="text-body text-np-blue-600 font-medium underline-offset-4 hover:underline"
                          >
                            {phone}
                          </a>
                        </li>
                      ))}
                      <li className="text-small text-np-neutral-600 pt-1">Fax {BUSINESS.fax}</li>
                    </ul>
                  </Reveal>
                  {/* CLIENT: hours of operation are not published anywhere, so no
                      "we answer between" line is claimed here. */}
                </div>

                {/* Email */}
                <div className="border-np-neutral-200 mt-14 border-t pt-10">
                  <Reveal>
                    <h2 className="text-h2">Email a provider</h2>
                  </Reveal>
                  <Reveal delay={0.08}>
                    <p className="text-body text-np-neutral-600 mt-3 max-w-[58ch]">
                      {CONTACT_PAGE.emailNote}
                    </p>
                  </Reveal>
                  <ul role="list" className="mt-6 space-y-4">
                    {PROVIDERS.map((p, i) => (
                      <Reveal as="li" key={p.slug} delay={stagger(i, 0.06)}>
                        <p className="text-body text-np-ink font-medium">
                          {p.name}
                          <span className="text-np-neutral-600 font-normal">, {p.credentials}</span>
                        </p>
                        <a
                          href={`mailto:${p.email}`}
                          className="text-body text-np-blue-600 underline-offset-4 hover:underline"
                        >
                          {p.email}
                        </a>
                      </Reveal>
                    ))}
                  </ul>
                  {/* CLIENT: no practice-wide inbox (info@ / contact@) exists, so
                      the two named provider addresses are listed instead. */}
                </div>

                {/* Where we work. Service area, never an address. */}
                <div className="border-np-neutral-200 mt-14 border-t pt-10">
                  <Reveal>
                    <h2 className="text-h2">Where we see patients</h2>
                  </Reveal>
                  <Reveal delay={0.08}>
                    <p className="text-body-l text-np-neutral-600 mt-4 max-w-[60ch]">
                      {CONTACT_PAGE.areaNote}
                    </p>
                  </Reveal>
                  <Reveal delay={0.12}>
                    <ul role="list" className="mt-6 flex flex-wrap gap-2.5">
                      {BUSINESS.serviceArea.map((state) => (
                        <li
                          key={state}
                          className="rounded-chip bg-np-blue-50 text-small text-np-blue-700 px-3 py-1.5"
                        >
                          {state}
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                  {/* CLIENT: no street address, suite or ZIP is confirmed anywhere,
                      so none is stated and no map is embedded. Add both here and in
                      lib/schema.ts together once the client supplies it. */}
                </div>
              </div>

              {/* Crisis guidance, in the same treatment used across the site.
                  order-first below md: the grid stacks on a phone, and left in
                  DOM order a distressed visitor would scroll past three headings
                  and a chip list before reaching 988. */}
              <div className="order-first md:order-none md:col-span-5">
                <Reveal delay={0.12}>
                  {/* h2 here, not the homepage's h3: this panel is a sibling of
                      the page's other h2 sections rather than sitting under
                      one. */}
                  <CrisisPanel headingAs="h2" className="sticky top-28" />
                </Reveal>
              </div>
            </div>
          </Container>
        </div>

        <RelatedLinks
          links={[
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
            {
              label: 'Our services',
              description: 'Assessment, medication management and telehealth, in detail.',
              href: '/services',
            },
          ]}
        />

        <PageCta heading="We will take the next step with you" />
      </main>
      <Footer />
    </>
  );
}
