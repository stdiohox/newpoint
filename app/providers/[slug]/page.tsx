import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { PageHero } from '@/components/PageHero';
import { PageCta } from '@/components/sections/PageCta';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { TeamMemberCard } from '@/components/ui/TeamMemberCard';
import { stagger } from '@/lib/motion';
import { PROVIDERS, SERVICE_PAGES, BUSINESS, DELIVERY_LINE } from '@/lib/content';
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

/**
 * One hero photograph per provider, keyed by slug.
 *
 * Kept here rather than on the Provider type: it is a property of this route's
 * presentation, not of the provider, and nothing else renders it.
 *
 * NEITHER FRAME CONTAINS A PERSON, so the alts describe the rooms and claim
 * nothing about whose they are — the practice's in-person locations are still
 * unconfirmed under CLAUDE.md's care-modality rule.
 *
 * NO objectPosition HERE, AND X WOULD BE INERT IF THERE WERE. At the desktop
 * widths this hero box is WIDER than the image's 1.79:1 aspect — 1440x540 is
 * 2.67, 1024x540 is 1.90 — so object-cover scales by WIDTH, the full image
 * width is always shown, and the horizontal overflow is 0px. With nothing to
 * slide, the X component of objectPosition changes nothing at all there; it
 * only bites below lg, where the box is taller than the image and cover scales
 * by height instead (491px of overflow at 390).
 *
 * That is why a framing problem in the middle of one of these photographs
 * cannot be cropped out in CSS at 1440 or 1024, and has to be fixed in the
 * asset. It cost a pass to discover; it is written down so it does not cost
 * another.
 */
const HERO_IMAGE: Record<string, { src: string; alt: string }> = {
  'anastasia-ofoegbu': {
    src: '/images/providers/provider-anastasia-hero-2400.webp',
    alt: 'An empty sitting room with a green armchair and a cream armchair at either side, a side table holding a glass of water and an open notebook, and a potted fig tree against a plain wall.',
  },
  'funmilayo-whitaker': {
    src: '/images/providers/provider-funmilayo-hero-2400.webp',
    alt: 'An empty sitting room with a blue armchair at either side, a side table of white flowers on the left and a trailing plant on a cabinet on the right, against a plain wall between curtained windows.',
  },
};

export default async function ProviderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const provider = PROVIDERS.find((p) => p.slug === slug);
  if (!provider) notFound();


  /** Schema only — the visible breadcrumb was removed from PageHero. */
  const crumbs = [{ name: provider.name, path: `/providers/${provider.slug}` }];

  const facts = [
    { label: 'Credentials', value: provider.credentials },
    { label: 'Role', value: provider.role },
    { label: 'Licensure', value: provider.licensed },
    { label: 'Education', value: provider.education },
    // No 'Approach' row any more. It carried a clipped third-person paraphrase
    // of the same sentence the page now prints in the provider's own words,
    // under "My approach" below, so the two read as a stutter side by side.
    // PROVIDERS[].approach is kept as the short form for anywhere that needs a
    // scannable version.
    // The addiction-nursing caveat that used to sit here is resolved. It asked
    // for confirmation that substance use is a real service line before the
    // experience row implied one; both providers now publish it as a specialty
    // on their own directory profiles (Headway lists it FIRST for Ofoegbu), and
    // it appears in `treats` below, so the row no longer implies more than the
    // rest of the page states. See research/provider-directories.md.
    { label: 'Experience', value: provider.experience },
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
        {/* THE HERO CARRIES THE LABEL, THE NAME AND ONE LINE. The standfirst
            used to be bio[0], the provider's own first paragraph; it has moved
            to the editorial card, which now holds the whole bio. What is left
            is `role` and `licensed`, both verbatim from PROVIDERS — the two
            facts a reader wants before anything else, and the shortest thing
            that can sit under a two-line name without pushing the page down.

            IT ALSO KEEPS THE TITLE RULE SATISFIED TWICE OVER: the credentials
            are in the heading beside "Dr.", and `role` spells out "Psychiatric-
            Mental Health Nurse Practitioner" directly beneath it. */}
        <PageHero
          eyebrow="Provider"
          title={`${provider.displayName}, ${provider.credentials}`}
          intro={`${provider.role}. ${provider.licensed}.`}
          image={HERO_IMAGE[provider.slug]}
          /* Centred between the navbar and the hero's bottom edge — `center`
             centres on the area BELOW the nav, not on the header box, which
             matters because the header pulls itself up by --nav-h so the
             photograph runs behind the sticky bar. */
          align="center"
          /* Centred horizontally from lg, matching the service pages — the
             label, the heading and the line below it all centre together. */
          copyAlign="center"
          /* No appointment button in this hero. The navbar's, PageCta's and the
             footer's all remain, so the booking route is intact. */
          showCta={false}
          /**
           * scrim="hero" WITH copyAlign="center" — the centred-copy overlay the
           * service pages use, which is the one shaped for centred text.
           *
           * WHAT THE "SEAM" ACTUALLY WAS. The image element was never the
           * problem: it is `fill`, so position absolute, inset 0, 100% of the
           * hero box, object-cover — measured at 1440x540 against a 1440x540
           * header — and the only other children are the overlay div and the
           * copy, both full width, neither with a background behind the left.
           *
           * The edge is IN THE PHOTOGRAPHS. Sampling the raw frames with every
           * overlay hidden, the largest luminance steps across the width are
           * 0.48 at x 72% on Whitaker's and 0.47 at x 52% on Ofoegbu's: a wall
           * corner and a doorway. A left-to-right ramp that is dark on one side
           * and light on the other sits on top of that split and reads as one
           * hard join rather than two separate things.
           *
           * The centred overlay does not take sides. Its radial is centred on
           * the copy — 46% 58% below lg, 50% 58% at lg — so the darkening is
           * symmetric about the middle and the architectural edge is no longer
           * reinforced by a gradient running the same way.
           *
           * MEASURED at 1440, 1024, 390 and 320 on both frames; numbers are in
           * the commit message.
           */
          scrim="hero"
        />

        {/* THE EDITORIAL CARD, replacing the portrait-beside-intro columns.
            `position` puts the portrait on the left for Whitaker and the right
            for Ofoegbu, as asked.

            THE CARD HOLDS THE WHOLE BIO, every paragraph, for both providers.
            It used to take bio.slice(1), which left Ofoegbu's card with no body
            copy at all — her Headway bio is a single paragraph and the hero had
            it. The hero no longer carries any of it, so the full array lands
            here and neither card is empty.

            NOTHING IS PRINTED TWICE. bio[0] left the hero, and the body column
            below stopped mapping bio when this card took over. Verified against
            the rendered HTML: one occurrence of each paragraph per page. */}
        <div className="pt-20 md:pt-28">
          <Container>
            <TeamMemberCard
              provider={provider}
              paragraphs={provider.bio}
              position={provider.slug === 'funmilayo-whitaker' ? 'left' : 'right'}
            />
          </Container>
        </div>

        <div className="py-20 md:py-28">
          <Container>
            <div className="grid gap-12 md:grid-cols-12 md:gap-16">
              <div className="md:col-span-5">
                <Reveal delay={0.08}>
                  <dl className="border-np-neutral-200 border-t">
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
                      , or call the practice at{' '}
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
                      Please don’t include symptoms, diagnoses, medications, or insurance ID
                      numbers in an email. Email isn’t secure.
                    </p>
                  </div>
                </Reveal>
              </div>

              <div className="md:col-span-7">
                {/* HER OWN WORDS, IN HER OWN ORDER, and the first prose this
                    page has carried. Until now everything below the hero was a
                    definition list and a chip cloud — facts about a clinician
                    rather than a clinician talking. These three blocks are the
                    provider's Headway profile: the rest of her introduction,
                    then her approach, then what a patient can expect. The
                    headings are hers too, lightly shortened.

                    Rendered before "What she treats" deliberately: someone who
                    has just read her name and credentials in the hero wants to
                    know who she is, not to be handed a taxonomy. */}
                {/* THE REMAINING BIO PARAGRAPHS MOVED TO THE CARD ABOVE and are
                    not repeated here. They used to render in this column; with
                    TeamMemberCard carrying them, printing them again put
                    Whitaker's second paragraph on the page twice, about 600px
                    apart. Ofoegbu has a single-paragraph bio and was
                    unaffected, which is why it was easy to miss. */}

                <div
                  className={
                    provider.bio.length > 1
                      ? 'border-np-neutral-200 mt-12 border-t pt-10'
                      : undefined
                  }
                >
                  <Reveal>
                    <h2 className="text-h2">My approach</h2>
                  </Reveal>
                  <Reveal delay={0.08}>
                    <p className="text-body-l text-np-neutral-600 mt-4 max-w-[62ch]">
                      {provider.approachFull}
                    </p>
                  </Reveal>
                </div>

                <div className="border-np-neutral-200 mt-12 border-t pt-10">
                  <Reveal>
                    <h2 className="text-h2">What you can expect</h2>
                  </Reveal>
                  <Reveal delay={0.08}>
                    <p className="text-body-l text-np-neutral-600 mt-4 max-w-[62ch]">
                      {provider.expect}
                    </p>
                  </Reveal>
                </div>

                <div className="border-np-neutral-200 mt-12 border-t pt-10">
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
                </div>

                <div className="border-np-neutral-200 mt-12 border-t pt-10">
                  <Reveal>
                    <h2 className="text-h2">Appointments</h2>
                  </Reveal>
                  <Reveal delay={0.08}>
                    {/* DELIVERY_LINE, the client's own sentence, since
                        2026-10-02. This note used to say in-person care is
                        stated without a state because there is "no
                        Pennsylvania location signal at all" — a rule CLAUDE.md
                        has superseded, and a sentence the repo's own research
                        has since contradicted (Headway lists a Morrisville, PA
                        address for Dr. Whitaker). The street address is still
                        an open item; what changed is that the practice, not
                        this site, is making the geography claim. */}
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
                      {provider.name.split(' ')[0]} sees patients at {BUSINESS.shortName}.{' '}
                      {DELIVERY_LINE}. New patients start with a comprehensive psychiatric
                      assessment. After that, care continues as medication management on a schedule
                      you set together.
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

                {/* CLIENT: no certifying body is named anywhere, and the
                    post-nominals imply one that must not be assumed — which is
                    why `hasCredential` stays out of the JSON-LD.
                    THIS PAGE DOES CARRY A CERTIFICATION STATEMENT, as of
                    2026-10-02: the editorial card renders bio[0], which opens
                    "I am a dual board-certified…". The claim is the practice's
                    own and predates this site (research/people-trust.md,
                    research/content/home.md); the body behind it is still
                    unnamed, which is now an open item rather than a thing this
                    page avoids saying. */}
              </div>
            </div>
          </Container>
        </div>

        {/* "Elsewhere on the site" REMOVED at the client's request.
            PageCta is now the last block before the footer, so the footer's
            988 / 911 strip is the next content a reader meets — the same shape
            every other page on the site ends in. What is lost is internal
            linking weight: this grid was the only link from one provider's page
            to the other's, and to /new-patients and /insurance from here. All
            three remain reachable from the navbar — the footer carries no
            provider links — so the cost is weight rather than indexation. */}

        <PageCta heading={`Book with ${provider.name.split(' ')[0]}`} />
      </main>
      <Footer />
    </>
  );
}
