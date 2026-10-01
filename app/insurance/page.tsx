import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { PageHero } from '@/components/PageHero';
import { PageFaq } from '@/components/sections/PageFaq';
import { PageCta, RelatedLinks } from '@/components/sections/PageCta';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { stagger } from '@/lib/motion';
import { INSURANCE, INSURANCE_PAGE } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { breadcrumbSchema, faqSchemaFlat, organizationRef } from '@/lib/schema';

/**
 * Insurance as a destination rather than a footnote.
 *
 * The audit's finding: coverage information currently sits at the bottom of the
 * live Services page, where "does Newpoint take Aetna" has nothing to land on.
 * Payer names are set in type rather than as logos, which keeps the wall
 * consistent with the homepage and sidesteps the trademark permission question.
 */
export const metadata = pageMetadata({
  title: INSURANCE_PAGE.metaTitle,
  description: INSURANCE_PAGE.metaDescription,
  path: '/insurance',
});

/**
 * The hero photograph. Described rather than decorative: the H1 names the page,
 * and the alt is written off the frame itself.
 *
 * NO objectPosition. At 1440 and 1024 the hero box is wider than the master's
 * 1.79:1, so object-cover scales by width, the horizontal overflow is 0px and
 * an X value would be inert; the vertical crop the default 50% gives keeps her
 * head and the tabletop both in frame. Below lg the box is taller than the
 * image and the centred window is the part of the picture that holds her and
 * the folder, which is the subject.
 */
const HERO_IMAGE = {
  src: '/images/insurance/insurance-hero-2400.webp',
  alt: 'A woman sitting at a wooden table at home, looking through an open paper folder, with loose papers and a phone on the table beside her, a potted fig plant and a mug on a sideboard to the left and a curtained window behind her.',
  /* 100vw describes the BOX, and below lg object-cover scales this by height
     and draws it wider than the viewport — the measurement PageHero's `sizes`
     note records. MEASURED ON THIS HERO, not estimated: drawn width 958px at
     320, 786px at 390, 807px at 600 and a maximum of 1102px at 768.

     1024px, not 1102px, for the reason the assessment hero records: 1024
     lands a DPR 2 device on the 2048 candidate, where 1102 would ask for 2204
     and fetch the 3840 one. Measured on this asset, 2048w is 116 KB against
     162 KB at 3840w, for a frame whose visible portion below lg is barely
     half its width. The 78px shortfall is at 768 alone and is 7%. */
  sizes: '(min-width: 1024px) 100vw, 1024px',
  /* 82, matching the assessment master and for the same reason: this is a
     2400px source being downscaled, so the resampling dominates and the
     encoder setting is not the binding constraint. Measured here: 2048w costs
     116 KB at q82 against 178 KB at q90. The q90 argument in
     app/services/[slug]/page.tsx is about the 1280x720 video posters, where a
     re-encode sits on top of an already-soft upscale. */
  quality: 82,
};

export default function InsurancePage() {
  return (
    <>
      <JsonLd
        schemas={[
          organizationRef(),
          faqSchemaFlat(INSURANCE_PAGE.faqs),
          breadcrumbSchema([{ name: 'Insurance', path: '/insurance' }]),
        ]}
      />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <PageHero
          title={INSURANCE_PAGE.title}
          intro={INSURANCE_PAGE.intro}
          image={HERO_IMAGE}
          /* Centred between the navbar and the hero's bottom edge. `center`
             centres on the area BELOW the nav rather than on the header box,
             because the header pulls itself up by --nav-h so the photograph
             runs behind the sticky bar. */
          align="center"
          /* Centred horizontally from lg, left-aligned below it — the service
             pages' alignment, unchanged. */
          copyAlign="center"
          /* No appointment button in this hero. The navbar's, PageCta's and the
             footer's all remain, so the booking route is intact. */
          showCta={false}
          /**
           * scrim="hero" WITH copyAlign="center" — the service pages' overlay,
           * taken as it stands with no new values.
           *
           * THE STRONGEST VERTICAL EDGE IN THIS FRAME IS CLEAR OF THE HEADLINE
           * AT EVERY WIDTH. Sampling mean |dI/dx| down each column of the
           * master, the largest steps are at x 90.0% (the window frame behind
           * her) and x 9.0% (the sideboard's edge); in the band the headline
           * occupies the strongest is x 79.6%, her shoulder against the
           * curtain. The middle of the frame, x 25-70%, is flat wall and the
           * quietest part of the picture.
           *
           * At 1440 and 1024 the box is wider than the image's 1.79:1, so the
           * full width maps straight across: that 79.6% edge lands at css x
           * 1154 and x 815, and the headline ends at 1020 and 777. Below lg
           * the box is taller and the crop is a centred window — 25.2%-74.8%
           * of the source at 390 and 33.3%-66.7% at 320 — so all three edges
           * are cropped out entirely. The strongest edge anywhere inside that
           * window measures 0.52 against 43.2 for the frame's strongest, which
           * is flat wall, not an edge.
           *
           * GLYPH-CORE CONTRAST, white text, worst backdrop pixel under a
           * glyph, measured on the rendered page — AND THE INTRO MISSES AA AT
           * THE TWO DESKTOP WIDTHS:
           *
           *   1440  h1 3.70:1 PASS (floor 3)   intro 4.25:1 (floor 4.5)
           *   1024  h1 3.65:1 PASS             intro 4.29:1 (floor 4.5)
           *    390  h1 4.57:1 PASS             intro 5.18:1 PASS
           *    320  h1 4.76:1 PASS             intro 5.08:1 PASS
           *
           * NOT FIXED HERE, BECAUSE BOTH LEVERS WERE RULED OUT BY THE BRIEF:
           * the overlay was specified as the service pages' exactly, with no
           * new values, and the crop cannot reach it either. Sweeping
           * objectPosition Y across 0%/25%/50%/75%/100% moves the intro only
           * between 4.24:1 and 4.37:1 at 1440 and 4.29:1 to 4.42:1 at 1024 —
           * the wall behind the copy is uniformly bright, so there is no
           * darker part of the frame to crop to. (Y is inert below lg anyway:
           * the box is taller than the image there, so the vertical overflow
           * is 0.)
           *
           * THE MINIMUM CHANGE THAT WOULD FIX IT, measured and not applied:
           * +0.08 flat alpha over the frame, i.e. the `hero` scrim's 0.10 tint
           * raised to 0.18. That puts the intro at 4.58:1 at 1440 and 4.65:1
           * at 1024 with both headings above 3.9:1. +0.06 clears 1024 (4.52:1)
           * and not 1440 (4.45:1). It is a new overlay value, so it needs
           * asking for — and it would change the service pages too unless it
           * becomes a fifth scrim.
           */
          scrim="hero"
        />

        <div className="py-20 md:py-28">
          <Container>
            {/* Payer wall. Full ink strength, no grayscale: these names are the
                page's primary objection-handler and muting them would work
                against the only job the section has. */}
            <Reveal>
              <h2 className="text-h2 max-w-[20ch]">{INSURANCE_PAGE.sections[0].heading}</h2>
            </Reveal>
            {/* GROUPED BY STATE, not one flat wall. The wall carried no
                Pennsylvania plan at all, so a PA visitor scanning it could not
                tell "your plan is not listed" from "we do not cover your
                state". The scope label above each run answers that before they
                start reading names.

                ONLY `confirmed` PAYERS ARE RENDERED. The unconfirmed candidates
                from the directory capture stay in PAYER_GROUPS with their
                sourcing notes and never reach the page. See lib/content.ts.

                A group with no confirmed plan keeps its heading and shows the
                coverage-check invitation instead of a list — which is the state
                Pennsylvania is in. An empty <ul> under a state heading reads as
                "we cover nothing here", which is both wrong and worse than
                saying nothing; the invitation turns the gap into the next
                step. */}
            {INSURANCE.groups.map((group, gi) => {
              const shown = group.payers.filter((p) => p.confirmed);

              return (
                <div key={group.scope} className={gi === 0 ? 'mt-10' : 'mt-14'}>
                  <Reveal>
                    <h3 className="text-caption text-np-neutral-600 tracking-[0.08em] uppercase">
                      {group.scope}
                    </h3>
                  </Reveal>

                  {shown.length > 0 ? (
                    <ul
                      role="list"
                      className="mt-5 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3"
                    >
                      {shown.map((payer, i) => (
                        <Reveal as="li" key={payer.name} delay={stagger(i, 0.05)}>
                          <p className="font-display text-body-l text-np-ink border-np-neutral-200 border-b pb-4 font-medium tracking-[-0.01em]">
                            {payer.name}
                          </p>
                        </Reveal>
                      ))}
                    </ul>
                  ) : (
                    <Reveal>
                      <p className="text-body-l text-np-neutral-600 mt-5 max-w-[52ch]">
                        {INSURANCE.unconfirmedScopeNote}
                      </p>
                    </Reveal>
                  )}
                </div>
              );
            })}
            <Reveal delay={0.2}>
              <p className="text-body-l text-np-neutral-600 mt-10 max-w-[62ch]">
                {INSURANCE_PAGE.sections[0].body}
              </p>
            </Reveal>

            <div className="mt-20 grid gap-10 md:grid-cols-3 md:gap-8">
              {INSURANCE_PAGE.sections.slice(1).map((section, i) => (
                <Reveal key={section.heading} delay={stagger(i, 0.08)}>
                  <div className="border-np-neutral-300 border-t pt-6">
                    <h2 className="text-h3">{section.heading}</h2>
                    <p className="text-body text-np-neutral-600 mt-3">{section.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </div>

        <PageFaq items={INSURANCE_PAGE.faqs} heading="Questions about cost" />

        <RelatedLinks
          links={[
            {
              label: 'Starting care',
              description: 'What happens between getting in touch and your first appointment.',
              href: '/new-patients',
            },
            {
              label: 'Psychiatric assessment',
              description: 'The appointment every new patient starts with, described in full.',
              href: '/services/psychiatric-evaluation',
            },
            {
              label: 'Telehealth',
              description: 'Video appointments across New Jersey and Pennsylvania.',
              href: '/services/telehealth',
            },
            {
              label: 'Medication management',
              description:
                'Ongoing prescribing and review, tracked with standardized rating scales.',
              href: '/services/medication-management',
            },
          ]}
        />

        <PageCta
          heading="Let us check your coverage"
          body="Send us your contact details and ask us to check your plan before you book. Please do not include insurance ID or member numbers in the form."
        />
      </main>
      <Footer />
    </>
  );
}
