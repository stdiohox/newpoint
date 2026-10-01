import { notFound } from 'next/navigation';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { PageHero } from '@/components/PageHero';
import { PageFaq } from '@/components/sections/PageFaq';
import { PageCta, RelatedLinks } from '@/components/sections/PageCta';
import { ServiceBody, type RowMedia } from '@/components/sections/ServiceBody';
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

  /* Anchor ids are derived once, here, and every consumer below reads them from
     this array, so the body and the feature block cannot drift apart and the
     ids stay byte-identical to what this route has always served. */
  const sectionItems = service.sections.map((section) => ({
    id: slugify(section.heading),
    heading: section.heading,
    body: section.body,
    detail: section.detail,
    list: section.list,
  }));

  /* Every section renders as a row, so there is no split to guard any more.
     `layout: 'feature'` simply selects the row treatment over the shared prose
     layout; a service with four sections or six gets four or six rows. */
  const useFeatureLayout = service.layout === 'feature';

  /* ONE PHOTOGRAPH PER ROW, in section order. All five are now real assets —
     the gap on "The tools we use" is closed.

     The pairings are by what the photograph shows, not by its filename.
     `treatment-plan.webp` is a notebook and pen on a desk, which is why it
     sits with the plan.

     THREE OF THESE ARE COMMISSIONED FOR THIS PAGE and are the only images in
     the library shot against its sections rather than borrowed from elsewhere:
     `eval-covers`, `eval-tools` and `eval-after`. Masters are 2752x1536; the
     served derivative is a single 1600px-wide webp at encoder quality 90, which
     is the widest next/image is ever asked for here — `sizes` in
     components/sections/ServiceBody.tsx tops out at 600 CSS px, so 1600 covers
     a 2x screen with room spare and a second width would never be fetched.

     THE TWO IMAGES THIS DISPLACED ARE STILL IN USE ELSEWHERE and were not
     orphaned: `services-consult-2752.webp` is the /services hub hero, and
     `what-to-expect/follow-up.webp` is in the homepage bento grid. Neither
     should be deleted on the strength of this page no longer pointing at it. */
  const bodyMedia: RowMedia[] = [
    {
      src: '/images/services/eval-covers-1600.webp',
      /* Describes the photograph and stops there. It does not say these are
         Newpoint's providers or Newpoint's room — alt text is a place a claim
         gets made by accident.

         THE SECOND FIGURE IS "a person", NOT "a clinician", AND THE BINDING
         REASON IS THE PER-SERVICE SOURCING CONSTRAINT, not the care-modality
         rule. Whether both providers perform the comprehensive psychiatric
         assessment is an open client item — see app/services/page.tsx:313-325,
         which carries the sourcing breakdown. Naming a clinician in the alt of
         the photograph heading "What the assessment covers" is a quiet way of
         asserting it.

         Citing the right rule matters here because the care-modality
         restriction is written to be LIFTED once the client confirms the PA
         office (CLAUDE.md, "Care modality"). If that were the stated reason,
         this guardrail would expire while the constraint it protects is still
         open, and the next editor would reasonably put "clinician" back. */
      alt: 'A woman in an armchair beside a window, speaking and gesturing with one hand, with a second person in the foreground, seen from behind, holding a closed folder.',
    },
    {
      /* THE SLOT THE CLIENT COMMENT ASKED FOR, now filled. It wanted "the
         written side of the assessment — a questionnaire on a clipboard, a
         rating scale part-completed — rather than another room interior",
         and this is a printed questionnaire being filled in. */
      src: '/images/services/eval-tools-1600.webp',
      /* "a printed questionnaire", not a named instrument. The sheet in the
         frame carries no legible title or letterhead, and the section's list
         names a questionnaire and rating scales generically for the same
         reason the copy does — which instruments the practice uses is not
         something this repo can substantiate. */
      alt: 'A woman filling in a printed questionnaire with a pen at a wooden table.',
    },
    {
      src: '/images/services/evaluation-card-2752.webp',
      alt: 'A quiet consulting room with two armchairs turned towards each other across a small wooden side table, beside a curtained window.',
    },
    {
      src: '/images/what-to-expect/treatment-plan.webp',
      alt: 'An open notebook and a pen on a desk, beside a cup of tea, a pair of glasses and a small plant.',
    },
    {
      src: '/images/services/eval-after-1600.webp',
      /* No claim that this is a patient of the practice, and none that it is a
         Newpoint telehealth appointment — it is a woman at a laptop, and the
         lid faces away, so there is no call on screen to describe. The
         section's own copy carries the modality. */
      alt: 'A woman smiling at an open laptop at a kitchen table, a mug beside her.',
    },
  ];

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
          title={service.title}
          intro={service.intro}
          /* The same frame the homepage card for this service shows at rest,
             so arriving here from that card is continuous.

             quality 90 STOPS A SECOND GENERATION OF LOSS; IT DOES NOT MAKE THIS
             SHARP. These posters are 1280x720 video stills, and next/image never
             upscales, so at 1440 the browser gets 1280px stretched across 1440
             CSS px: 0.44 device pixels per CSS pixel on a 2x screen. That is the
             softness, and no encoder setting reaches it. What quality does reach
             is the re-encode on top: measured against the poster, q75 gives RMSE
             1.61 at 39.7 KB and q90 gives 1.12 at 69.2 KB, so 30% less added
             error for 30 KB. Worth it, and not a fix.
             CLIENT: a genuinely sharp hero here needs a ~2800px still. The mp4
             is 1280x720 as well, so a frame grab does not help, and the only
             other asset in design-research is a different photograph (an empty
             consulting room). This needs a new export from the original shoot. */
          image={service.heroImage ?? (poster ? { src: poster, quality: 90 } : undefined)}
          /* THE SCRIM FOLLOWS THE ASSET, NOT THE ROUTE.
             `poster` never drops below 0.62 alpha anywhere in the frame. That
             floor exists for the video posters: they are bright edge to edge
             with a blown window behind the copy, and nothing lighter carries
             white text on them. The cost is that it mutes the whole photograph
             evenly, because a flat floor cannot tell the copy's corner from the
             rest of the frame.

             `hero` is the /services treatment: a 0.10 tint over the whole frame
             plus a radial that does the heavy work only behind the copy. Behind
             the text it reaches about 66%, which is denser than the poster
             floor; away from it, about 12%, so the photograph reads as a
             photograph rather than a darkened rectangle.

             A page earns it by having a real master. The posters cannot use it,
             so this switches on heroImage rather than on the slug. */
          scrim={service.heroImage ? 'hero' : 'poster'}
          /* Matches /services: centred from lg, left-aligned below it, where
             the copy is a tall paragraph and centring costs more than it buys. */
          copyAlign="center"
          /* Off on the assessment page only, per the flag's note in
             lib/content.ts. The other two services keep theirs. */
          showCta={!service.hideHeroCta}
        />

        {/* TWO BODY LAYOUTS, PICKED BY THE SERVICE, NOT BY THE SLUG.
            `layout: 'feature'` is the assessment page's bespoke treatment;
            everything else keeps the shared prose layout below. The flag's own
            comment in lib/content.ts carries the reasoning.

            BOTH BRANCHES DERIVE THEIR ANCHOR IDS FROM THE SAME slugify CALL on
            the same headings, so the in-page anchors are byte-identical to what
            this route served before. */}
        {useFeatureLayout ? (
          <ServiceBody sections={sectionItems} media={bodyMedia} />
        ) : (
          <div className="py-20 md:py-28">
            <Container>
              <div className="grid gap-12 md:grid-cols-12 md:gap-16">
                {/* Sticky in-page contents. On a long page reached from search,
                    this is what tells a reader the page answers their question. */}
                <div className="md:col-span-4">
                  <div className="md:sticky md:top-28">
                    <nav aria-label="On this page">
                      <h2 className="text-caption text-np-neutral-600 tracking-[0.08em] uppercase">
                        On this page
                      </h2>
                      <ul
                        role="list"
                        className="border-np-neutral-200 mt-4 space-y-3 border-l pl-4"
                      >
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
                  {service.sections.map((section, i) => {
                    /* SPACING COMES FROM THE INDEX, NOT FROM :first-child /
                       :last-child, and swapping it was a bug fix rather than a
                       preference.

                       Each <section> is the ONLY child of its own Reveal
                       wrapper, so every one of them matched BOTH :first-child
                       and :last-child. `[&:not(:first-child)]:pt-10` therefore
                       never applied to anything and `last:border-b-0 last:pb-0`
                       applied to everything: the sections rendered flush
                       against each other with no divider anywhere, on all
                       three service routes.

                       Do not restore the structural selectors while Reveal
                       wraps each item. */
                    const isLast = i === service.sections.length - 1;

                    return (
                      <Reveal key={section.heading} delay={stagger(i, 0.05)}>
                        {/* tabIndex -1 so activating a jump link moves real focus
                            into the section. Without it the viewport scrolls but the
                            screen-reader cursor and document.activeElement stay on the
                            sidebar link, which has just scrolled out of view. */}
                        <section
                          id={slugify(section.heading)}
                          tabIndex={-1}
                          className={`focus:outline-none ${i === 0 ? '' : 'pt-10'} ${
                            isLast ? '' : 'border-np-neutral-200 border-b pb-10'
                          }`}
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
                    );
                  })}
                </div>
              </div>
            </Container>
          </div>
        )}

        <PageFaq items={service.faqs} />

        {/* CRISIS GUIDANCE IS EXPLICIT ON THE PROSE ROUTES AND NOWHERE ELSE
            AMONG THE INTERIOR PAGES, and the asymmetry is deliberate.

            PageCta used to carry an inline crisis panel, which is why it sits
            above RelatedLinks. That panel was removed on 2026-09-30 at the
            client's request. On the five other routes that is fine: PageCta is
            the last thing before the footer, and the footer's crisis strip is
            the next content a reader meets.

            THE PROSE ROUTES STILL NEED IT. RelatedLinks sits between the two
            and renders six cards, and the footer's strip is itself below three
            stacked link columns. On a phone that is roughly two thousand pixels
            from the CTA to the nearest 988, on pages that name PTSD, psychosis
            and schizophrenia. /services/medication-management is the worst of
            them.

            THE FEATURE LAYOUT DROPS BOTH THIS PANEL AND RelatedLinks, at the
            client's request of 2026-09-30, and the two removals are what make
            each other safe. The distance this panel existed to close was
            created by the six-card grid below the CTA. Remove the grid and
            PageCta becomes the last block before the footer, exactly as it is
            on the five other routes, so the footer's "In a crisis, call or text
            988. In an emergency, call 911." is the next content a reader meets.
            Measured on this page it is now nearer the CTA than it has ever
            been, not further.

            WHAT IS GENUINELY LOST is CRISIS.body — "not for emergencies and is
            not monitored around the clock" — which now appears on this route
            only as footer fine print. CLAUDE.md asks for crisis guidance where
            a distressed visitor would plausibly look, and the footer strip is
            still that. If RelatedLinks ever comes back to this layout, this
            panel has to come back with it.

            h2, not the default h3: it is a top-level section here, and the
            page's outline would skip a level otherwise. */}
        {!useFeatureLayout && (
          <div className="pb-16 md:pb-20">
            <Container>
              <CrisisPanel headingAs="h2" className="mx-auto max-w-3xl" />
            </Container>
          </div>
        )}

        <PageCta />

        {/* "Keep reading" IS DROPPED ON THE FEATURE LAYOUT, at the client's
            request of 2026-09-30, on the grounds that every one of its six
            destinations is reachable from the navbar: both sibling services sit
            in the Services submenu, and New patients, Insurance and Providers
            are all top-level items. Nothing here is orphaned by removing it.

            WHAT IT COSTS IS INTERNAL LINKING, not reachability, and CLAUDE.md
            makes SEO a deliverable rather than a finishing touch. This cluster
            is how link equity flowed from a page that ranks to pages the
            homepage does not link to directly, with anchor text richer than a
            nav label. The nav still links them sitewide, so the loss is weight,
            not indexation.

            featured=2 is kept on the prose routes: there the first two cards
            are always the other two services, and as six identical tiles those
            two were the hardest to pick out of the cluster. */}
        {!useFeatureLayout && (
          <RelatedLinks
            heading="Keep reading"
            featured={2}
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
        )}
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
