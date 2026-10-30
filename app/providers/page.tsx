import { preload } from 'react-dom';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { PageCta } from '@/components/sections/PageCta';
import { Container } from '@/components/ui/Container';
import { ProviderCard } from '@/components/ui/ProviderCard';
import { assertSourced } from '@/components/sections/Providers';
import { Reveal } from '@/components/ui/Reveal';
import { stagger } from '@/lib/motion';
import { CLOSING_PORTRAIT, PROVIDERS, PROVIDERS_PAGE } from '@/lib/content';
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
 * "Dr." IS RENDERED HERE, via PROVIDERS[].displayName, under the sitewide
 * override of 2026-10-01. The credentials pill sits directly beneath the name
 * on every card, which is the condition CLAUDE.md puts on the prefix.
 *
 * THE VERIFIED BADGE IS NOT, and the two were decided separately. The badge is
 * still scoped to the /services "Providers you’ll see" cards; do not read the
 * title override as widening it.
 *
 * `name` is untouched and is still what feeds schema, metadata and alt text.
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
  /* The header photo is this page's LCP element and a plain <img>, which the
     browser only finds after parsing the markup. Preloading it starts the
     download with the document. performance-optimizer, 2026-10-22. */
  preload(CLOSING_PORTRAIT.image.src, { as: 'image', fetchPriority: 'high' });

  return (
    <>
      <JsonLd
        schemas={[organizationRef(), breadcrumbSchema([{ name: 'Providers', path: '/providers' }])]}
      />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        {/* THE PROVIDERS' OWN PHOTOGRAPH, SINCE 2026-10-22. This header was a
            full-bleed PageHero over an empty waiting room, and it never met AA:
            the pale wall and lit doorway sat behind centred white copy, measured
            at h1 2.06:1 and intro 2.37:1 at 1440. The client then supplied a
            photograph of both providers together (CLOSING_PORTRAIT), and this
            page, the one about the two of them, is where it does the most work.

            A SPLIT HEADER RATHER THAN PageHero, because the photo is a 960x960
            square and PageHero is a full-bleed landscape slot: stretched across
            1440px it would be upscaled and soft, and white copy over two faces
            is the contrast problem again. Dark text on np-neutral-50 has no
            backdrop to measure against.

            -mt-[var(--nav-h)] plus the same padding PageHero uses keeps the page
            starting under the sticky navbar exactly as every other route does.

            THE PHOTO IS THE LCP ELEMENT HERE, so it loads eagerly with high
            fetch priority. It is the lossless file at the exact pixels supplied,
            the client's rule for provider photographs; if that weight ever needs
            to come down, it is the client's call, not a silent re-encode.

            NO Reveal ON THE COPY: it is above the fold, and nothing above the
            fold may ship hidden behind an entrance animation.

            "Dr." appears in the intro with the role words in the same sentence,
            which is the condition on the prefix; the H1 names no one. */}
        <header className="bg-np-neutral-50 relative -mt-[var(--nav-h)] pt-[calc(var(--nav-h)+3rem)] pb-14 md:pt-[calc(var(--nav-h)+4.5rem)] md:pb-20">
          <Container>
            <div className="grid items-center gap-10 md:grid-cols-12 md:gap-12 lg:gap-16">
              <div className="md:col-span-6 lg:col-span-6">
                <h1
                  className="font-display text-np-blue-800 font-medium"
                  style={{
                    fontSize: 'clamp(2.5rem, 1.75rem + 3vw, 4.5rem)',
                    letterSpacing: '-0.035em',
                    lineHeight: 1.02,
                    textWrap: 'balance',
                  }}
                >
                  {PROVIDERS_PAGE.title}
                </h1>
                <p className="text-body-l text-np-neutral-600 mt-6 max-w-[46ch]">
                  {PROVIDERS_PAGE.intro}
                </p>
              </div>

              <div className="md:col-span-6 lg:col-span-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={CLOSING_PORTRAIT.image.src}
                  width={CLOSING_PORTRAIT.image.width}
                  height={CLOSING_PORTRAIT.image.height}
                  alt={CLOSING_PORTRAIT.image.alt}
                  fetchPriority="high"
                  decoding="async"
                  className="rounded-media mx-auto h-auto w-full max-w-[560px] md:max-w-none"
                />
              </div>
            </div>
          </Container>
        </header>

        <div className="py-20 md:py-28">
          <Container>
            {/* STACKED, ONE CARD PER ROW, Whitaker first (client, 2026-10-25).
                Each card turns horizontal from md (portrait left, details
                right), so a full-width row reads as a profile rather than a
                stretched centred column. Capped at max-w-5xl so the bio keeps
                a readable measure. */}
            <ul role="list" className="mx-auto grid max-w-5xl gap-6 md:gap-8">
              {PROVIDERS.map((p, i) => (
                <Reveal as="li" key={p.slug} delay={stagger(i, 0.08)} className="h-full">
                  {/* Plain props rather than the Provider object: ProviderCard
                      is a client component, and handing it the whole record
                      would put every field — both full bios, the approach and
                      expect answers, the email — into the browser bundle to
                      render a card that shows five of them. `bio[0]` is the
                      provider's own opening paragraph, which is the short one
                      by construction. */}
                  <ProviderCard
                    provider={{
                      slug: p.slug,
                      displayName: p.displayName,
                      credentials: p.credentials,
                      licensed: p.licensed,
                      knowsLanguage: p.knowsLanguage,
                      /* The same approved sentence as the homepage card,
                         not the whole first paragraph: Ofoegbu's ran three
                         sentences against Whitaker's one, and its last
                         repeated the licence line printed just above it
                         (client, 2026-10-23: the bios looked unbalanced). */
                      bio: assertSourced(p.slug, p.bio),
                      treats: p.treats,
                      image: { webp1120: p.image.webp1120 },
                    }}
                  />
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
