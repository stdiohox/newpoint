import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { PageHero } from '@/components/PageHero';
import { PageCta } from '@/components/sections/PageCta';
import { Container } from '@/components/ui/Container';
import { ProviderPortrait } from '@/components/ui/ProviderPortrait';
import { Reveal } from '@/components/ui/Reveal';
import { stagger } from '@/lib/motion';
import { PROVIDERS, PROVIDERS_PAGE } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { breadcrumbSchema, organizationRef } from '@/lib/schema';

/**
 * The providers index.
 *
 * WHY IT EXISTS. The navbar's "Providers" link pointed at `/#providers`, a
 * homepage anchor, while `/providers/[slug]` already served a page per
 * provider with nothing linking to them as a set. The nav item now has a
 * destination, and the two detail pages have a parent — which is also what
 * makes their breadcrumb trail resolve to a page rather than to an anchor.
 *
 * NOTHING HERE IS NEW COPY. Every string is PROVIDERS data or PROVIDERS_PAGE,
 * and the cards show exactly the four fields the brief names: name,
 * credentials, licence line, portrait.
 *
 * NO "Dr." AND NO VERIFIED BADGE. CLAUDE.md records both as client decisions
 * scoped to the /services "Providers you will see" cards. This is a different
 * surface and inherits neither — `name` is rendered verbatim, which is what
 * feeds schema and metadata everywhere else.
 *
 * NO CRISIS PANEL AND NO "Keep reading", matching the service pages. PageCta
 * is therefore the last block before the footer, so the footer's 988 / 911
 * strip is the next content a reader meets.
 */
export const metadata = pageMetadata({
  title: PROVIDERS_PAGE.metaTitle,
  description: PROVIDERS_PAGE.metaDescription,
  path: '/providers',
});

export default function ProvidersPage() {
  return (
    <>
      <JsonLd
        schemas={[
          organizationRef(),
          breadcrumbSchema([{ name: 'Providers', path: '/providers' }]),
        ]}
      />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        {/* The service pages' hero treatment: copy centred on the area below
            the navbar, centred from lg, and no CTA.

            NO scrim="home" HERE, AND THAT IS NOT AN OVERSIGHT. This page has no
            hero master — there is none for /providers and the posters belong to
            services — so it renders the np-blue-900 → np-sky gradient. All four
            of PageHero's `home` layers are gated on `image`, so passing it over
            a gradient emits NOTHING: it would silently drop even the ramp the
            other gradient heroes get, which is strictly less overlay than
            /insurance or /contact carry, not more. The default is what those
            pages use and what the gradient was measured against.

            The service heroes' overlay is the homepage's ramps over a
            photograph; with no photograph there is nothing for them to do. If a
            master is ever shot for this page, add it and switch the scrim then
            — and re-measure, because that is the combination that fails AA on
            the two service pages already carrying it. */}
        <PageHero
          title={PROVIDERS_PAGE.title}
          intro={PROVIDERS_PAGE.intro}
          align="center"
          copyAlign="center"
          showCta={false}
        />

        <div className="py-20 md:py-28">
          <Container>
            <ul role="list" className="grid gap-6 sm:grid-cols-2 md:gap-8">
              {PROVIDERS.map((p, i) => (
                <Reveal as="li" key={p.slug} delay={stagger(i, 0.08)} className="h-full">
                  {/* THE WHOLE CARD IS THE LINK, and its accessible name is the
                      concatenated content, which starts with the provider's
                      name. The portrait carries alt="" because the h2 beside it
                      already says who this is — ProviderPortrait's own alt
                      repeats the name AND the credentials, which a screen
                      reader would then hear twice per card. */}
                  <Link
                    href={`/providers/${p.slug}`}
                    className="rounded-card bg-np-surface ease-np-out flex h-full flex-col items-start gap-5 p-6 ring-1 ring-[var(--np-alpha-ink-08)] transition-shadow duration-[180ms] hover:shadow-[var(--shadow-np-card)] sm:flex-row sm:items-center"
                  >
                    <ProviderPortrait
                      provider={p}
                      alt=""
                      sizes="112px"
                      className="size-28 shrink-0 rounded-full"
                    />
                    <div className="min-w-0">
                      <h2 className="text-h3 text-np-ink">{p.name}</h2>
                      <p className="text-small text-np-neutral-600 mt-1">{p.credentials}</p>
                      <p className="text-small text-np-neutral-600 mt-1">{p.licensed}</p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </ul>
          </Container>
        </div>

        <PageCta />
      </main>
      <Footer />
    </>
  );
}
