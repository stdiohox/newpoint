import Image from 'next/image';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { PageHero } from '@/components/PageHero';
import { PageCta } from '@/components/sections/PageCta';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { stagger } from '@/lib/motion';
import { SERVICE_PAGES, WHAT_WE_TREAT, PROVIDERS, cardPosterFor } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { breadcrumbSchema, organizationRef, serviceSchemaFor } from '@/lib/schema';

/**
 * Services hub.
 *
 * Its job is structural as much as editorial: it is the single page that links
 * to all three service pages, which is how they get crawled and how link equity
 * reaches them. The live site's Services page is a single undifferentiated wall
 * of copy; this splits it into destinations and keeps the wall's content on them.
 */
export const metadata = pageMetadata({
  // The homepage owns the practice/provider angle; this page owns "psychiatric
  // services" as its head term, so the two are not arbitrating the same query.
  title: 'Psychiatric Services in NJ and PA',
  description:
    'Psychiatric assessment, medication management, and telehealth in New Jersey and Pennsylvania. What each involves and how to get started.',
  path: '/services',
});

export default function ServicesIndex() {
  return (
    <>
      <JsonLd
        schemas={[
          organizationRef(),
          ...SERVICE_PAGES.map(serviceSchemaFor),
          breadcrumbSchema([{ name: 'Services', path: '/services' }]),
        ]}
      />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        {/* The care pathway in one sentence, per the owners, 2026-09-29:
            assessment first, then medication management visits, with
            psychotherapy alongside them. The psychotherapy half is not a new
            claim — SERVICE_PAGES already states that the plan "combines
            psychotherapy approaches and psychopharmacology", sourced verbatim
            from the live Services page — but this is the first place the site
            names it as a way care is actually delivered rather than as
            something a plan may contain.

            "WHERE IT IS INDICATED" IS NOT PADDING, and an earlier draft of this
            line lost it. That draft read "on their own, or combined with
            psychotherapy", which frames therapy as an option the patient picks
            off a menu. Every sibling statement of this same fact hedges it as a
            clinical judgement — SERVICE_PAGES' "where both are indicated"
            twice, and the assessment FAQ's "where appropriate" — and
            WHAT_TO_EXPECT carries a comment explaining that the hedge is
            load-bearing. A patient who books expecting to choose talk therapy
            and is told at the assessment that it is a clinical call was
            mis-sold by this sentence.

            "Each of the three below" rather than "each of those": psychotherapy
            now appears in the preceding list and has no page, so an unscoped
            "those" promises a destination that does not exist. It is written as
            a mode of the medication-management track for the same reason, and
            because the source names no modality. Who delivers it, in what form,
            and whether it warrants a page of its own are all open — see
            OPEN_CLIENT_ITEMS. */}
        {/* THE PHOTOGRAPH REPLACES THE np-blue-900 → np-sky GRADIENT this hero
            used to run. The gradient was the fallback for a page with no
            picture of its own, and the hub page — the one that has to carry all
            three services — was the last interior page still opening on it.

            OBJECT-POSITION IS ONE VALUE BECAUSE ONLY ONE AXIS IS EVER LIVE.
            The source is 16:9 (1.792). Where the hero is wider than that it
            scales by width and crops vertically, so only the 25% matters; where
            it is narrower it scales by height and crops horizontally, so only
            the 70% does. The four target widths split cleanly across that line
            — 1440 and 1024 crop vertically, 768 and 390 horizontally — so a
            responsive value would set a number that does nothing at every step.

            Both numbers are measured off the frame, not judged. She runs from
            52% to 80% across it and her hair starts 15% down. The windows below
            are computed from the hero's RENDERED height, which is driven by this
            page's copy and not by min-h-[50dvh] — the box is 611px tall at 390,
            not the 422px the min-height alone would give, and using the
            min-height would put every figure here out by a third.
            - 70% across: at 390 the visible window is 35.5% of the width and
              lands on 45%-81%, which holds all of her and crops the blown
              window at 5%-30% out of the picture altogether. At 768 it is 69.7%
              wide, on 21%-91%. At 320 it narrows to 26.6%, on 51%-78%, which
              trims the outer edges of her but leaves her face, at 63%-74%, well
              inside. Her face sits about two-thirds across the crop at each.
            - 25% down: at 1440 the visible window is 71.4% of the height, on
              7%-79%, leaving 8% of headroom above her hair. At 1024 the hero is
              within 2% of the source's own aspect, so it crops almost nothing.

            SIZES IS NOT 100vw, AND THAT IS WHAT MAKES THE 2x EXPORT REAL.
            Below lg this hero is narrower than 16:9, so object-cover scales the
            image by HEIGHT and draws it wider than the viewport. Measured, the
            drawn width is 1201px at 320, 1098px at 390 and 1102px at 768 —
            near-constant, because it follows the hero's height rather than the
            viewport's width. 100vw described the box instead and fetched 640px
            to 828px for it: 0.53x to 0.75x of a device pixel per CSS pixel on a
            2x phone, which is soft. 1200px is the widest of those drawn widths
            and so covers every step below lg; at lg and up the box is the wider
            edge again and 100vw is correct. See PageHero's `sizes` note. */}
        <PageHero
          title="What we do, and how it works"
          intro="Care at Newpoint starts with a comprehensive psychiatric assessment and continues as medication management visits, with psychotherapy alongside them where it is indicated — in person or by telehealth. Telehealth runs across New Jersey and Pennsylvania. Each of the three below is a page of its own."
          image={{
            src: '/images/services/services-consult-2752.webp',
            objectPosition: '70% 25%',
            sizes: '(min-width: 1024px) 100vw, 1200px',
          }}
          scrim="hero"
        />

        <div className="py-20 md:py-28">
          <Container>
            {/* One detailed section per service, replacing the three-card grid
                that used to sit here. That grid repeated the homepage's cards
                almost exactly — same titles, same one-line summaries, one click
                further in — so a reader who followed "View all services" landed
                on a thinner copy of what they had just left.

                Everything below is existing sourced content re-laid-out, not
                rewritten: the intro and the opening section come from
                SERVICE_PAGES, the modality line from that service's own
                homepage card, and the names from PROVIDERS. No new claim is
                made about any service. */}
            <ul role="list" className="space-y-20 md:space-y-28">
              {SERVICE_PAGES.map((service, i) => {
                const href = `/services/${service.slug}`;
                const poster = cardPosterFor(href);

                return (
                  <Reveal as="li" key={service.slug} delay={stagger(i, 0.06)}>
                    <div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
                      {/* Alternates sides from md up and stacks below it. The
                          image takes md:order-2 on odd rows rather than the
                          text taking order-1, so the DOM order stays
                          image-then-text and the reading order is identical in
                          both directions. */}
                      <div
                        className={`rounded-media relative aspect-[4/3] overflow-hidden ${
                          i % 2 === 1 ? 'md:order-2' : ''
                        }`}
                      >
                        {poster && (
                          /* Decorative: the h2 immediately beside it names the
                             service, so an alt would only say it a second
                             time. */
                          <Image
                            src={poster}
                            alt=""
                            fill
                            sizes="(min-width: 768px) 50vw, 100vw"
                            className="object-cover"
                          />
                        )}
                      </div>

                      <div>
                        <h2 className="text-h2 max-w-[20ch]">{service.title}</h2>
                        <p className="text-body-l text-np-neutral-600 mt-4 max-w-[52ch]">
                          {service.intro}
                        </p>

                        <dl className="border-np-neutral-200 mt-8 space-y-5 border-t pt-8">
                          {/* WHAT HAPPENS, AS THE STAGES THEMSELVES, NOT AS A
                              QUOTED PARAGRAPH. This block first carried the
                              service's opening section verbatim — heading and
                              full body — which put 60-90 words of each child
                              page's unique prose on the hub as well, for three
                              pages already competing on the same query cluster.
                              Listing the section headings says what the service
                              involves, in the page's own words, without
                              duplicating a sentence of it. It also fixes the
                              telehealth block, which led with "An expanded
                              schedule" simply because that is section one. */}
                          <div>
                            <dt className="text-caption text-np-neutral-600 tracking-[0.08em] uppercase">
                              What happens
                            </dt>
                            <dd className="text-body text-np-neutral-700 mt-2">
                              {service.sections.map((s) => s.heading).join(' · ')}
                            </dd>
                          </div>

                          {/* NO "Who you will see" HERE, deliberately.
                              Naming both providers under each service asserts
                              that both personally deliver it. That is sourced
                              for medication management and telehealth, and NOT
                              for the comprehensive psychiatric assessment:
                              Ofoegbu's bio names assessments, Whitaker's names
                              medication management only. The page-wide "Who you
                              will see" section below says what is actually
                              sourced — these are the two clinicians — without
                              binding either to a named service.
                              CLIENT: confirm whether both providers perform
                              initial psychiatric assessments, and this becomes
                              a per-service field. */}

                          <div>
                            <dt className="text-caption text-np-neutral-600 tracking-[0.08em] uppercase">
                              How it is delivered
                            </dt>
                            <dd className="text-body text-np-neutral-700 mt-2">
                              {service.modality}
                            </dd>
                          </div>
                        </dl>

                        <Link
                          href={href}
                          className="text-np-blue-600 ease-np-out hover:text-np-blue-700 mt-8 inline-flex items-center gap-1 font-medium underline-offset-4 transition-colors duration-[180ms] hover:underline focus-visible:underline motion-reduce:transition-none"
                        >
                          Full details
                          <span aria-hidden="true">→</span>
                          <span className="sr-only"> about {service.title}</span>
                        </Link>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </ul>

            {/* Treatment options named on the live Services page but not built out
                as pages of their own, because the source material describes them
                in a single line each.
                CLIENT: skill-building groups and support groups are listed as
                treatment options but never described anywhere — no cadence,
                format, or topics. Supply those and each becomes a page. */}
            <div className="border-np-neutral-200 mt-20 border-t pt-12">
              <Reveal>
                <h2 className="text-h2 max-w-[22ch]">Also available</h2>
              </Reveal>
              <Reveal delay={0.08}>
                <p className="text-body-l text-np-neutral-600 mt-4 max-w-[62ch]">
                  Alongside assessment and medication management, we will work with you to find the
                  treatment option that fits.
                </p>
              </Reveal>
              <ul role="list" className="mt-8 grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  'Psychiatric consultation',
                  'Individual counseling',
                  'Skill-building groups',
                  'Support groups',
                  'Referral to follow-up services',
                  // Only options the practice itself names on its live Services
                  // page. Nothing is added to this menu.
                ].map((option, i) => (
                  <Reveal as="li" key={option} delay={stagger(i, 0.04)}>
                    <p className="border-np-neutral-200 text-body text-np-neutral-700 border-b pb-3">
                      {option}
                    </p>
                  </Reveal>
                ))}
              </ul>
            </div>

            <div className="border-np-neutral-200 mt-20 border-t pt-12">
              <Reveal>
                <h2 className="text-h2 max-w-[22ch]">Conditions we treat</h2>
              </Reveal>
              <Reveal delay={0.08}>
                <p className="text-body-l text-np-neutral-600 mt-4 max-w-[62ch]">
                  {WHAT_WE_TREAT.body}
                </p>
              </Reveal>
              <ul role="list" className="mt-8 flex flex-wrap gap-2.5">
                {WHAT_WE_TREAT.conditions.map((condition, i) => (
                  <Reveal as="li" key={condition} delay={stagger(i, 0.03)}>
                    <span className="rounded-chip bg-np-blue-50 text-small text-np-blue-700 inline-block px-3 py-1.5">
                      {condition}
                    </span>
                  </Reveal>
                ))}
              </ul>
              {/* CLIENT: no therapy modality (CBT, DBT, EMDR and similar) is named
                  anywhere in the source material, and none is invented here.
                  Naming the ones actually practised is the single highest-value
                  content addition left on this page.
                  CLIENT: age range served is not stated as a practice policy. */}
            </div>

            <div className="border-np-neutral-200 mt-20 border-t pt-12">
              <Reveal>
                <h2 className="text-h2 max-w-[22ch]">Who you will see</h2>
              </Reveal>
              <ul role="list" className="mt-8 grid gap-6 sm:grid-cols-2 md:gap-8">
                {PROVIDERS.map((p, i) => (
                  <Reveal as="li" key={p.slug} delay={stagger(i, 0.08)}>
                    <Link
                      href={`/providers/${p.slug}`}
                      className="rounded-card bg-np-surface ease-np-out group block h-full p-6 ring-1 ring-[var(--np-alpha-ink-08)] transition-shadow duration-[180ms] hover:shadow-[var(--shadow-np-card)]"
                    >
                      <h3 className="text-h3 group-hover:text-np-blue-600 ease-np-out transition-colors duration-[180ms]">
                        {p.name}
                      </h3>
                      <p className="font-display text-small text-np-neutral-600 mt-1 font-medium">
                        {p.credentials}
                      </p>
                      <p className="text-small text-np-neutral-600 mt-3">{p.licensed}</p>
                    </Link>
                  </Reveal>
                ))}
              </ul>
            </div>
          </Container>
        </div>

        <PageCta />
      </main>
      <Footer />
    </>
  );
}
