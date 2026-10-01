import { LockKeyhole } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { PageHero } from '@/components/PageHero';
import { PageCta } from '@/components/sections/PageCta';
import { ExpectCards } from '@/components/sections/ExpectCards';
import { StepsBento } from '@/components/sections/StepsBento';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { GETTING_STARTED, NEW_PATIENTS_PAGE } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { breadcrumbSchema, organizationRef } from '@/lib/schema';

/**
 * New patient page.
 *
 * Expands the homepage's three-step sequence into a destination that can rank
 * for "how to start psychiatric treatment" queries, and puts the HIPAA warning
 * and the crisis guidance where a new patient will actually read them rather
 * than only in the contact form's small print.
 */
export const metadata = pageMetadata({
  title: NEW_PATIENTS_PAGE.metaTitle,
  description: NEW_PATIENTS_PAGE.metaDescription,
  path: '/new-patients',
});

/**
 * The hero photograph, replacing the homepage card's video poster.
 *
 * Described rather than decorative: written off the frame, not from the page.
 *
 * NO objectPosition. At 1440 and 1024 the hero box is wider than this master's
 * 1.79:1, so object-cover scales by width, the horizontal overflow is 0 and an
 * X value would be inert there; the default vertical centre keeps her and the
 * side table both in frame. Below lg the box is taller and the centred window
 * holds the wall she is sitting against, which is where the copy goes.
 */
const HERO_IMAGE = {
  src: '/images/new-patients/new-patients-hero-2400.webp',
  alt: 'A woman sitting in a green armchair at home, smiling at the phone in her hands, with a fiddle-leaf fig and a mug on a small wooden table beside her against a plain wall.',
  /* 100vw describes the BOX; below lg object-cover scales this by height and
     draws it wider than the viewport. 1024 rather than the measured maximum,
     for the reason the insurance and assessment heroes record: it lands a DPR
     2 device on the 2048 candidate instead of the 3840 one. */
  sizes: '(min-width: 1024px) 100vw, 1024px',
  /* 82, as on the other downscaled masters: the resampling dominates, not the
     encoder setting. */
  quality: 82,
};

export default function NewPatientsPage() {
  return (
    <>
      <JsonLd
        schemas={[
          organizationRef(),
          breadcrumbSchema([{ name: 'New patients', path: '/new-patients' }]),
        ]}
      />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <PageHero
          title={NEW_PATIENTS_PAGE.title}
          intro={NEW_PATIENTS_PAGE.intro}
          image={HERO_IMAGE}
          /* Centred between the navbar and the hero's bottom edge — `center`
             centres on the area BELOW the nav, not on the header box, because
             the header pulls itself up by --nav-h so the photograph runs
             behind the sticky bar. */
          align="center"
          /* Centred horizontally from lg, left-aligned below it, as on the
             service and provider pages. The CTA centres with the copy: see
             PageHero's `showCta` block, which wraps it in lg:justify-center
             whenever copyAlign is center. */
          copyAlign="center"
          /**
           * scrim="hero" with copyAlign="center" — the service pages' overlay,
           * unchanged.
           *
           * THE STRONGEST VERTICAL EDGE IS NOWHERE NEAR THE HEADLINE. Sampling
           * mean |dI/dx| down each column of the master, the largest steps are
           * at x 3.2% and x 8.9% (the fig's leaves and its pot against the
           * wall) and x 79.7% (her hair against the wall). Through x 20-55%
           * the frame is flat wall and the quietest part of the picture, which
           * is exactly where a centred heading lands.
           *
           * At 1440 and 1024 the box is wider than the image's 1.79:1, so the
           * whole width maps across and those three land at css x 46/128/1148
           * and x 33/91/816, against headlines that run 421-1020 and 247-777.
           * Below lg the crop is a centred window — 30.5%-69.5% of the source
           * at 390, 35.5%-64.5% at 320 — and all three are outside it. The
           * strongest edge anywhere inside that window measures 0.45 against
           * 33.1 for the frame's strongest: flat wall, not an edge.
           *
           * GLYPH-CORE CONTRAST, white text, worst backdrop pixel under a
           * glyph, measured on the rendered page — THE HEADING PASSES
           * EVERYWHERE AND THE INTRO MISSES AT THE TWO DESKTOP WIDTHS:
           *
           *   1440  h1 3.55:1 PASS (floor 3)   intro 4.07:1 (floor 4.5)
           *   1024  h1 3.51:1 PASS             intro 4.07:1 (floor 4.5)
           *    390  h1 4.86:1 PASS             intro 5.01:1 PASS
           *    320  h1 4.26:1 PASS             intro 4.72:1 PASS
           *
           * NOT FIXED HERE: the overlay was specified as the service pages',
           * and /insurance records the identical failure on an identically
           * bright wall. The measured minimum is +0.11 flat alpha over the
           * frame — the `hero` scrim's 0.10 tint to 0.21 — which puts the
           * intro at 4.51:1 and 4.52:1. +0.10 is not enough (4.46/4.47). That
           * is a new overlay value and would move the service pages with it
           * unless it becomes a separate scrim, so it needs asking for.
           *
           * THIS IS NOW THE SECOND PAGE WITH THE SAME RESULT. The pattern is
           * the frame, not the page: a bright, evenly-lit wall behind centred
           * copy is exactly what this scrim's radial is too light for.
           */
          scrim="hero"
        />

        <div className="py-20 md:py-28">
          <Container>
            {/* THE COPY IS VERBATIM AND IT IS THE SAME COPY AS BEFORE. "The
                three steps" was already hard-coded here; GETTING_STARTED.body
                is the intro it already carried. Only the arrangement changed:
                the heading column became a section header, and the three
                bordered rows became the bento. */}
            <StepsBento
              heading="The three steps"
              intro={GETTING_STARTED.body}
              steps={GETTING_STARTED.steps}
              /* The photograph that fills the tall first card.
                 DECORATIVE, alt="", by client decision on 2026-10-01 — which
                 is what a11y-architect recommended when this shipped
                 described. The heading and body already say what step 1 is,
                 the picture is mood rather than information, and its alt was
                 announced between the body of step 1 and step 2, in the middle
                 of a list, where every word of it was noise a reader did not
                 ask for. SC 1.1.1 asks for exactly this on a decorative image.
                 Do not write a description back in without being asked. */
              media={{
                src: '/images/new-patients/step-reach-out-2000.webp',
                alt: '',
              }}
            />

            <div className="mt-20">
              <ExpectCards heading="What to expect" items={NEW_PATIENTS_PAGE.expectations} />
              {/* CLIENT: no "what to bring" checklist is published anywhere and
                  none is invented here. Confirm what the practice actually asks
                  new patients to have ready and it becomes a section. */}
            </div>

            <Reveal delay={0.1}>
              {/* Same card treatment as CrisisPanel and the contact cards:
                  white, hairline np-neutral-200, rounded-2xl. The blue-600
                  left bar is gone for the reason recorded on CrisisPanel — on
                  a page read by people about to start psychiatric care, a
                  warning-callout bar is the one element that raises the
                  temperature. The copy inside is unchanged. */}
              <aside
                aria-labelledby="privacy-heading"
                className="bg-np-surface border-np-neutral-200 mt-20 rounded-2xl border p-7 md:p-9"
              >
                {/* TWO COLUMNS FROM md, ONE BELOW IT, and the order flips with
                    the layout. At md the shield sits in the empty right half
                    and centres against the text column; below md there is no
                    empty half to fill, so it goes above the heading at half
                    the size — `order-first` on the icon rather than moving it
                    in the DOM, because the heading must stay the first thing a
                    screen reader meets in a labelled region.

                    items-center, so the shield centres on the text column
                    whatever height the copy takes. */}
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
                  <div className="md:flex-1">
                    <h2 id="privacy-heading" className="text-h3">
                      {NEW_PATIENTS_PAGE.privacyHeading}
                    </h2>
                    <p className="text-body text-np-neutral-600 mt-3 max-w-[70ch]">
                      {NEW_PATIENTS_PAGE.privacyBody}
                    </p>
                    <p className="text-body text-np-ink border-np-neutral-200 mt-5 max-w-[70ch] border-t pt-5">
                      If you need help now, call or text{' '}
                      <a
                        href="tel:988"
                        className="text-np-blue-600 font-medium underline underline-offset-4"
                      >
                        988
                      </a>{' '}
                      for the Suicide and Crisis Lifeline. In an emergency, call{' '}
                      <a
                        href="tel:911"
                        className="text-np-blue-600 font-medium underline underline-offset-4"
                      >
                        911
                      </a>{' '}
                      or go to your nearest emergency room.
                    </p>
                  </div>

                  {/* DECORATION, AND NOTHING BUT. aria-hidden on the circle, so
                      the glyph adds no announcement to a region whose whole
                      content is the warning beside it — and it must not read
                      as a reassurance badge to assistive tech when it is a
                      graphic on a panel about what NOT to send.

                      A LOCK, NOT A CHECKED SHIELD, since 2026-10-01. The
                      shield's tick was the problem the point above describes
                      in the other direction: a check mark beside "What not to
                      send us" reads as approval of the thing the panel is
                      warning about. A keyhole says "this channel is not
                      secure" without affirming anything. Same size, same
                      circle, same responsive behaviour.

                      shrink-0 so the circle keeps its diameter when the copy
                      is long, and order-first only below md. */}
                  <span
                    aria-hidden="true"
                    className="bg-np-blue-50 order-first flex h-20 w-20 shrink-0 items-center justify-center rounded-full md:order-none md:h-32 md:w-32"
                  >
                    <LockKeyhole
                      strokeWidth={1.5}
                      className="text-np-blue-600 h-10 w-10 md:h-16 md:w-16"
                    />
                  </span>
                </div>
              </aside>
            </Reveal>
          </Container>
        </div>

        {/* NO "Keep reading" HERE. Removed at the client's instruction on
            2026-10-01, as on the service pages, /providers, /faq, /contact and
            /insurance before it. Every link it carried is in the navbar and in
            the footer; PageCta below still carries the appointment route. Do
            not re-add it — flag the conflict instead. */}
        <PageCta heading="Take the first step" />
      </main>
      <Footer />
    </>
  );
}
