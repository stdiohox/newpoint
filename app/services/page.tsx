import Image from 'next/image';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { PageHero } from '@/components/PageHero';
import { PageCta } from '@/components/sections/PageCta';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

/**
 * Initials for the avatar's fallback, shown only if a portrait fails to load.
 *
 * First and LAST word, not the first two: "Anastasia O. Ofoegbu" has a middle
 * initial, and taking the first two words would render "AO." — a stray full
 * stop from a name particle rather than a surname.
 */
function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

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

            VERTICAL PLACEMENT is align="center", which centres the copy in the
            area below the nav rather than in the header — the header runs up
            behind the sticky bar, so its own centre is about 54px higher than
            the centre of what is actually visible. Measured, pill bottom to h1
            box top: 88px at 1440, 1210 and 1024, and 103px to the cap-height,
            against the 80px asked for. The block's centre lands on 349px at
            1440 where the centre of the visible area is 349.5px.

            SIZES IS NOT 100vw, AND THAT IS WHAT MAKES THE 2x EXPORT REAL.
            Below lg this hero is narrower than 16:9, so object-cover scales the
            image by HEIGHT and draws it wider than the viewport. Measured, the
            drawn width is 1201px at 320, 1098px at 390 and 1102px at 768 —
            near-constant, because it follows the hero's height rather than the
            viewport's width. 100vw described the box instead and fetched 640px
            to 828px for it: 0.53x to 0.75x of a device pixel per CSS pixel on a
            2x phone, which is soft. 1200px is the widest of those drawn widths
            and so covers every step below lg; at lg and up the box is the wider
            edge again and 100vw is correct. See PageHero's `sizes` note.

            MEASURED CONTRAST, worst pixel a glyph actually covers, on the
            rendered page at 2x. It lives here rather than in PageHero because
            it is a property of THIS crop under THAT scrim, and either one
            moving invalidates it. Floors are 3:1 for the H1 (36-52px, large
            text) and 4.5:1 for the intro and the CTA label.

                          H1     intro   CTA
              1440        7.33   6.85    14.09
              1024        7.55   5.25    11.39
              768         9.79   6.63    13.36
              430         7.53   6.04    10.97
              412         7.78   5.25     9.50
              390         7.37   5.99    11.06
              390 @200%   5.82   6.75    —
              360         6.88   6.02    10.54
              320         7.00   6.31    11.25

            320 and 200% text are in the list on purpose: they are the two
            shapes where the copy block is tallest relative to the frame, they
            are SC 1.4.10 and 1.4.4 obligations, and an earlier revision of this
            scrim passed the named breakpoints while failing both.

            COPY MEASURE: min(18ch, 620px) heading, 540px intro, to keep the
            text clear of her.

            min() RATHER THAN A PLAIN 620px, AND THE DIFFERENCE IS THE WHOLE
            POINT. A bare 620px is WIDER than the max-w-[18ch] it overrides at
            1024, so it un-wrapped the heading onto one line that ran to 587px
            while she began at 610px — 23px. A cap is supposed to be an upper
            bound, and min() makes it one: 18ch wins wherever it is narrower, so
            1024 keeps its two lines and 620px only ever binds where the type is
            large enough for 18ch to exceed it. Measured h1 box: 599px at 1440,
            530px at 1024, two lines at both.

            MEASURING HER IS NOT THE SAME AS MEASURING THE NEAREST DARK THING.
            Two props sit between the copy and her, and each fooled an earlier
            version of the probe: the olive tree at x 660-850, and the armchair,
            which a plain darkness test locks onto at the rows the intro
            occupies and which reported a 45px OVERLAP that does not exist. She
            is isolated instead by colour — her shirt is blue (B-R > 14) and her
            hair is dark (L < 115), where the chair and table are warm grey with
            B <= R. Row-for-row clearance, each line against her edge at that
            line's own height:

              1440   261px        1210   294px
              1280   302px        1024    54px

            1024 is the tight one and it is geometry, not the cap: at that width
            the hero is 578px tall, so its 1.772 aspect falls just BELOW the
            source's 16:9 and the image starts scaling by height instead of
            width. object-position's 70% becomes live and slides her left in the
            frame. Nothing overlaps, but this is the width to re-measure if the
            copy or the hero's height ever changes again. */}
        <PageHero
          title="What we do, and how it works"
          intro="Care at Newpoint starts with a comprehensive psychiatric assessment and continues as medication management visits, with psychotherapy alongside them where it is indicated — in person or by telehealth. Telehealth runs across New Jersey and Pennsylvania. Each of the three below is a page of its own."
          image={{
            src: '/images/services/services-consult-2752.webp',
            objectPosition: '70% 25%',
            sizes: '(min-width: 1024px) 100vw, 1200px',
          }}
          scrim="hero"
          copyMaxWidth={{ title: 'min(18ch, 620px)', intro: '540px' }}
          align="center"
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
                    {/* GAP LADDER: 32px stacked, 56px at md, 160px from lg up.
                        Still one value from 1024 on rather than a second
                        breakpoint, so every desktop width gets the same figure.
                        md keeps 56px: it is two columns but only 768-1023 wide.

                        160 rather than the 128 it replaces, which was measured
                        on screen and correct but read as tight next to how much
                        air the rest of the page carries. At the container's
                        1136px content box it leaves 976px to split, so the
                        image column is 407px and the text 569px. At 1024, the
                        narrowest width this applies to, the split is 333/467
                        and the image is 250px tall — still the larger element
                        in the row, which is the thing that would break first if
                        this grew again.

                        THE COLUMN RATIO ALTERNATES WITH THE ROW, and it has to.
                        The image takes md:order-2 on odd rows, so on those rows
                        it renders in grid column TWO. A fixed [5fr_7fr] would
                        therefore give the image 5/12 on even rows and 7/12 on
                        odd ones — the ratio would flip with the alternation
                        instead of staying with the image. Flipping the template
                        to match keeps the image on 5 and the text on 7 in both
                        directions.

                        fr, not a 12-column grid. grid-cols-12 with a 128px gap
                        would put that gap between all twelve tracks, eleven of
                        them, which overflows the 1136px container before any
                        content is placed. Two fr tracks produce exactly one gap.

                        items-start, NOT items-center. Centring made the image
                        float against the text block, which is taller on every
                        row; top alignment puts the image's top edge on the h2's.
                        Note this is BOX alignment: the h2's line-height leaves a
                        few px of leading above its cap-height, so the image edge
                        sits marginally above the letterforms. Optical alignment
                        would need a negative offset tuned per type size, which
                        is a design call rather than the one asked for. */}
                    <div
                      className={`grid items-start gap-8 md:grid-cols-2 md:gap-14 lg:gap-40 ${
                        i % 2 === 1 ? 'lg:grid-cols-[7fr_5fr]' : 'lg:grid-cols-[5fr_7fr]'
                      }`}
                    >
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

                          {/* NO "Providers you will see" HERE, deliberately.
                              Naming both providers under each service asserts
                              that both personally deliver it. That is sourced
                              for medication management and telehealth, and NOT
                              for the comprehensive psychiatric assessment:
                              Ofoegbu's bio names assessments, Whitaker's names
                              medication management only. The page-wide
                              "Providers you will see" section below says what is
                              actually sourced — these are the two clinicians —
                              without binding either to a named service.
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
                {/* "Providers", not "clinicians" or "our team": it is the word
                    the navbar, the /providers/[slug] route and the PROVIDERS
                    constant all already use, so the heading names the same
                    thing the reader clicks through to. It also stays inside the
                    title rules — both are advanced practice nurses, so nothing
                    here may read as physician, psychiatrist or Dr. */}
                <h2 className="text-h2 max-w-[22ch]">Providers you will see</h2>
              </Reveal>
              <ul role="list" className="mt-8 grid gap-6 sm:grid-cols-2 md:gap-8">
                {PROVIDERS.map((p, i) => (
                  <Reveal as="li" key={p.slug} delay={stagger(i, 0.08)}>
                    <Link
                      href={`/providers/${p.slug}`}
                      className="rounded-card bg-np-surface ease-np-out group block h-full p-6 ring-1 ring-[var(--np-alpha-ink-08)] transition-shadow duration-[180ms] hover:shadow-[var(--shadow-np-card)]"
                    >
                      <div className="flex items-center gap-4">
                        {/* shadcn's Avatar rather than the hand-rolled circle
                            this replaced. The circle itself is no different —
                            what it buys is a real failure state: Radix tracks
                            the image's load status and swaps in the initials if
                            the portrait errors, where the previous
                            overflow-hidden wrapper would have shown a
                            broken-image glyph inside a neat circle.

                            srcSet, not src alone. AvatarImage forwards every
                            <img> prop, so the two pre-processed webp sizes
                            survive the move; only ProviderPortrait's <picture>
                            jpg fallback is lost, which webp has not needed for
                            years. ProviderPortrait still renders the 240px
                            portraits on the provider page and the homepage.

                            alt="" because the h3 beside it already says the
                            name: the portrait's own alt repeats the name AND
                            the credentials, so a screen reader would hear both
                            twice per card. The fallback initials are
                            aria-hidden for the same reason. */}
                        <Avatar className="size-14">
                          <AvatarImage
                            src={p.image.webp560}
                            srcSet={`${p.image.webp560} 560w, ${p.image.webp1120} 1120w`}
                            sizes="56px"
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                          <AvatarFallback aria-hidden="true" className="font-display font-medium">
                            {initialsOf(p.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          {/* "Dr." IS A DISPLAY PREFIX HERE AND NOWHERE ELSE.
                              The client asked for it on 2026-09-30 after being
                              shown CLAUDE.md's rule against it, and reaffirmed;
                              CLAUDE.md now records that decision. It is written
                              inline rather than into PROVIDERS[].name on
                              purpose, because that field feeds schema.org
                              Person, the page metadata and the portrait alt
                              text, and the prohibition on implying `Physician`
                              in structured data was NOT what was overturned.
                              Putting it in the data would carry the title into
                              all three silently.
                              CLIENT: if this should be site-wide, it needs a
                              decision per surface — visible copy is one
                              question, schema and metadata are another. */}
                          <h3 className="text-h3 group-hover:text-np-blue-600 ease-np-out transition-colors duration-[180ms]">
                            Dr. {p.name}
                          </h3>
                          <p className="font-display text-small text-np-neutral-600 mt-1 font-medium">
                            {p.credentials}
                          </p>
                        </div>
                      </div>
                      <p className="text-small text-np-neutral-600 mt-4">{p.licensed}</p>
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
