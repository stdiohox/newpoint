import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { PageHero } from '@/components/PageHero';
import { PageCta } from '@/components/sections/PageCta';
import { Container } from '@/components/ui/Container';
import { ProviderCard } from '@/components/ui/ProviderCard';
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
  return (
    <>
      <JsonLd
        schemas={[
          organizationRef(),
          breadcrumbSchema([{ name: 'Providers', path: '/providers' }]),
        ]}
      />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        {/* The service pages' hero treatment: the homepage's overlay, copy
            centred on the area below the navbar, centred from lg, and no CTA.

            THE SCRIM IS scrim="home" NOW, WHICH IT COULD NOT BE BEFORE. The
            note that stood here said `home` was deliberately absent because all
            four of PageHero's `home` layers are gated on `image`, and over the
            np-blue-900 → np-sky gradient this page used to render they emit
            nothing at all — strictly less overlay than /insurance or /contact
            carry. That reasoning was correct and is now spent: the page has a
            photograph, so the layers have something to sit on.

            It is the same pair of gradients the homepage uses, through the same
            branch the two service heroes go through.

            CONTRAST DOES NOT MEET AA AT THE DESKTOP WIDTHS. Measured on the
            rendered page at glyph core pixels only — a whole-box sample reads
            the brightest pixel in the box rather than one a letter covers:

              1440  h1 2.06:1 (floor 3)   intro 2.37:1 (floor 4.5)
              1024  h1 2.18:1 (floor 3)   intro 1.69:1 (floor 4.5)
               390  h1 3.10:1 PASS        intro 6.75:1 PASS

            The worst backdrop under a glyph is the room's pale wall and the lit
            doorway behind the copy, about rgb(181,180,184) at 1440. THIS IS THE
            THIRD PAGE TO MEASURE THE SAME WAY and the cause is the one
            PageHero's scrim note records: the homepage ramps are shaped for a
            100vh section whose copy is short, bottom-anchored and in the left
            column of a two-column grid, and this header is ~540-610px with
            centred copy that fills it. At 390 the box is tall enough that the
            bottom ramp still covers the copy, which is why only that width
            passes.

            The overlay was required to be the homepage's, copied, so this is
            reported rather than fixed. The remedy is scrim="hero", whose radial
            sits behind a centred block, or a master whose centre is not a lit
            wall. */}
        <PageHero
          title={PROVIDERS_PAGE.title}
          intro={PROVIDERS_PAGE.intro}
          image={{
            src: '/images/providers/providers-hero-2400.webp',
            /* Describes the room and stops there. NOT "our waiting room": the
               practice's in-person locations are still unconfirmed under
               CLAUDE.md's care-modality rule, and alt text is where that gets
               claimed by accident. No people are in frame, so there is no
               patient or provider to misattribute either. */
            alt: 'An empty waiting room with upholstered armchairs around a jute rug, a side table holding flowers and books, a potted fig tree, and an open doorway to a desk beyond.',
          }}
          scrim="home"
          align="center"
          copyAlign="center"
          showCta={false}
        />

        <div className="py-20 md:py-28">
          <Container>
            {/* Two columns from md, one below it. items-stretch so the pair
                are the same height whatever their bio and specialty list run
                to — Ofoegbu's bio is twice Whitaker's and her list one item
                longer. */}
            <ul role="list" className="grid items-stretch gap-6 md:grid-cols-2 md:gap-8">
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
                      bio: p.bio[0],
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
