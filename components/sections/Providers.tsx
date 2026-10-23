import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import { outfit } from '@/app/fonts';
import { stagger } from '@/lib/motion';
import { PROVIDERS } from '@/lib/content';

/**
 * Layout family: a gradient panel carrying two portrait cards.
 *
 * This is still the page's single colour-block moment and it still appears
 * exactly once. What changed is where the colour lives: it used to be the
 * section's own ink ground, and it is now a rounded panel inset in the page
 * gutters, so the section sits on the same warm white as the rest of the page.
 * A rounded panel only reads as a panel against something lighter than itself;
 * on the old ink ground the corners disappeared.
 *
 * The gradient is built from three existing @theme blues, darkest at the top
 * left through to --color-np-sky at the bottom right.
 *
 * Portraits are 4:5 at every width, at the resolution the client supplied:
 * see PROVIDERS[].image.portrait, which the provider pages use too. The square
 * crops under image.webp560 / image.webp1120 now only serve the small circular
 * avatars.
 */

/**
 * The exact sentence each card shows, stored verbatim rather than looked up by
 * position.
 *
 * An earlier version selected by sentence index. That was a latent compliance
 * bug, not a style problem: `bio.split` on full stops breaks on "Anastasia O.",
 * and inserting or reordering a sentence in content.ts would silently shift
 * every index. Funmilayo's OTHER bio sentence says "across the lifespan", and
 * the confirmed age range is still an open client item, so an index shift would
 * have quietly committed the practice to treating children on the busiest page
 * of the site. assertSourced() below turns any such drift into a build failure.
 *
 * BOTH CARDS NOW CARRY CREDENTIALS AND YEARS, since 2026-10-23. Anastasia's
 * used to be her second sentence only ("I have been a nurse for 14 years…"),
 * chosen because her first reads close to Funmilayo's. Side by side, that left
 * one card stating dual board certification and the other not, which read as
 * one provider being more qualified than the other; the client flagged it.
 * Both hold DNP, FNP-BC, PMHNP-BC, so the cards now say so in each provider's
 * own words: Funmilayo's first sentence, and Anastasia's first two.
 */
const CARD_SENTENCE: Record<string, string> = {
  'funmilayo-whitaker':
    'I am a dual board-certified Mental Health Nurse Practitioner (DNP-PMHNP) and Family Nurse Practitioner (FNP) with over 15 years of direct patient care experience.',
  'anastasia-ofoegbu':
    'My name is Anastasia Ofoegbu, a dual board-certified Psychiatric Mental Health (DNP-PMHNP) and Family Nurse Practitioner (FNP). I have been a nurse for 14 years with the last 11 years in Mental Health and Addiction.',
};

/**
 * Claims the cards must never carry.
 *
 * AGE TERMS ONLY, since 2026-09-29. Substance use and addiction used to be on
 * this list beside them because neither was a confirmed service line. That has
 * changed: both providers publish it on their own directory profiles, Headway
 * lists it FIRST for Ofoegbu, and it now appears in PROVIDERS[].treats and in
 * WHAT_WE_TREAT.conditions. A card sentence naming it no longer asserts
 * anything the rest of the site does not.
 *
 * The age terms stay, and stay for a stronger reason than before. The capture
 * did not settle the age range — it produced two platforms flatly contradicting
 * each other about the same clinician, one saying no children and the other
 * saying children. See OPEN_CLIENT_ITEMS.
 */
const BANNED = /lifespan|child|adolescent|p(a?)ediatric|geriatric/i;

/**
 * Fails the build rather than the compliance review. These are server
 * components rendered at build time, so a throw here stops `next build`.
 */
function assertSourced(slug: string, bio: string[]): string {
  const sentence = CARD_SENTENCE[slug];
  if (!sentence) {
    throw new Error(
      `Providers: no approved card sentence for "${slug}". Add one to CARD_SENTENCE.`
    );
  }
  /* Joined, because `bio` is now one entry per paragraph and an approved
     sentence may live in any of them. */
  if (!bio.join(' ').includes(sentence)) {
    throw new Error(
      `Providers: the approved card sentence for "${slug}" is no longer present verbatim in that provider's content.ts bio. Re-approve it against the bio before shipping.`
    );
  }
  if (BANNED.test(sentence)) {
    throw new Error(
      `Providers: the card sentence for "${slug}" asserts an unconfirmed age range or service line.`
    );
  }
  return sentence;
}

/**
 * PORTRAIT CARDS, 4:5, SERVED AT NATIVE RESOLUTION (client request, 2026-10-19).
 *
 * One file per provider, at exactly the pixels supplied, encoded lossless, so
 * what the card shows is what the client sent: no crop-and-upscale, no lossy
 * re-encode, no srcset of smaller copies. Both files were checked
 * pixel-for-pixel against their originals when they were made.
 *
 *   funmilayo-whitaker  1122x1402  the studio portrait as sent, uncropped
 *   anastasia-ofoegbu    910x1137  her original 1137x1138 selfie cut to 4:5,
 *                                  native pixels (design-research/assets/
 *                                  providers/source/)
 *
 * The cost is bytes: about 1.4 MB and 0.7 MB. Both load lazily and the section
 * sits well below the fold, so neither touches LCP.
 *
 * HEAD SIZE IS NOT MATCHED ANY MORE, and cannot be without upscaling: Anastasia's
 * is a close-range selfie, Funmilayo's a head-and-shoulders studio frame. The
 * reshoot in OPEN_CLIENT_ITEMS is what closes that gap.
 *
 * The files and their pixel sizes live in PROVIDERS[].image.portrait in
 * lib/content.ts, which the provider pages read too.
 */

/**
 * Bottom scrim. Nothing at all until 70% down the card, then ramps to solid
 * --color-np-blue-700, which is the blue the panel is showing behind the cards.
 *
 * Stops are written bottom-up (`to top`, 0% = the card's bottom edge), so "70%
 * down the card" is the 30% stop here. Above it the photograph is completely
 * untouched: the top 70% of the frame carries no tint of any kind, which is
 * what keeps each provider's mouth and chin fully visible rather than sitting
 * under a wash. It only renders from lg, where the text overlays the photo;
 * below lg the text sits under the photo instead.
 *
 * This gradient is now the COSMETIC half of the treatment only. It no longer
 * has to reach solid before the text, because TEXT_SCRIM below is what actually
 * guarantees the contrast, and that one is anchored to the text instead of to a
 * percentage of the card.
 */
const CARD_SCRIM =
  'linear-gradient(to top,' +
  ' var(--color-np-royal-deep) 0%,' +
  ' var(--color-np-royal-deep) 18%,' +
  ' color-mix(in srgb, var(--color-np-royal-deep) 70%, transparent) 24%,' +
  ' transparent 30%)';

/**
 * Backing for the text block itself, on top of CARD_SCRIM.
 *
 * CARD_SCRIM is a PERCENTAGE of the card, so it only guarantees solid blue
 * under the text when the text occupies roughly the bottom third. It does not
 * at narrow widths: at 390px the role line sat at about 48% of the card, up in
 * the fade, over Anastasia's bright white background - measured 2.48:1, under
 * AA, at default text size. (Below lg the text now sits under the photo, so
 * that case no longer arises, but this is still what backs the text at lg.) Enlarging text makes it worse (1.0:1 at a 20px
 * root), because the block grows upward while the scrim stays put.
 *
 * This one is anchored to the TEXT rather than the card: solid everywhere the
 * text actually is, fading out across the TEXT_FADE_PX of padding above the first line,
 * so it scales with the block at any size. It is the only thing the role and
 * bio contrast figures depend on - CARD_SCRIM above is now purely cosmetic and
 * is transparent across the whole top 70% of the card - so this gradient must
 * stay solid behind every line of text at every text size.
 */
const TEXT_FADE_PX = 32;

/**
 * One number, used twice: it is both the padding above the first line and the
 * height of the gradient's fade. They MUST stay equal - that equality is what
 * puts the solid/fade boundary exactly at the text's top edge at any block
 * height - so they are derived from the same constant rather than written out
 * separately in a class and a template literal.
 *
 * 32 rather than the previous 72 because this constant, not CARD_SCRIM, is what
 * decides how far up the card ANY tint reaches. The text block is bottom-
 * anchored, so shortening the fade moves the whole treatment down twice over:
 * the block's top edge drops by 40px AND the ramp above it gets 40px shorter.
 * Measured by diffing a scrim-on against a scrim-off render, the first tinted
 * row moves from 48.8% to 68.1% of the card at 1440 - i.e. onto the 70% line
 * this section is specified to start at - and from 27.5% to 48.6% at 390.
 *
 * 390 cannot reach 70% and that is geometry, not a bug: the name, role and
 * two-line bio occupy the bottom ~45% of a phone-width 4:5 card, so "solid
 * behind the text" necessarily begins near halfway. The desktop card is wide
 * enough for the text to sit in roughly its bottom quarter.
 */
const TEXT_SCRIM =
  'linear-gradient(to top,' +
  ' var(--color-np-royal-deep) 0%,' +
  ` var(--color-np-royal-deep) calc(100% - ${TEXT_FADE_PX}px),` +
  ' transparent 100%)';

/**
 * Royal into cyan, the Mail-icon gradient (client request, 2026-10-22; it was
 * navy into a grey slate and read as dull). 160deg rather than straight down so
 * the heading and intro at the top sit on royal-deep (8.26:1 for white) and the
 * cyan only reaches the bottom-right corner, below the cards, where no type is.
 * Every card carries its own royal-deep scrim behind its text, so the
 * lighter end of the panel never sits behind a glyph.
 */
const PANEL_GRADIENT =
  'linear-gradient(160deg,' +
  ' var(--color-np-royal-deep) 0%,' +
  ' var(--color-np-royal) 45%,' +
  ' var(--color-np-royal-bright) 72%,' +
  ' var(--color-np-cyan) 100%)';

export function Providers() {
  /*
   * Bottom padding is pb-9 md:pb-14 (36px, 56px), not the py-24 md:py-32 the
   * top still carries. It is one of exactly two contributors to the gap between
   * this panel and <WhatToExpect /> below, the other being that section's own
   * top padding. The pair is split evenly to land on 72px of total separation
   * on mobile and 112px on desktop. The top is untouched and stays on the
   * site's section rhythm.
   *
   * Both halves have to move together: changing only one side leaves the total
   * off by whatever the other still contributes.
   */
  return (
    <section id="providers" className="bg-np-neutral-50 pt-24 pb-9 md:pt-32 md:pb-14">
      {/* The page column (<Container> / `page-col`, defined once in
          globals.css), the same edges as <FeaturedServices /> above. Client
          request, 2026-10-19: the panel used to run on the uncapped navbar
          gutters and was wider than the services block from 1328px up. */}
      <Container>
        {/* on-ink swaps the global focus ring to white, which is what the cards
            inside this panel need. It is scoped to the panel, not the section,
            because the section ground is now light. */}
        <div
          className={`on-ink ${outfit.variable} w-full overflow-hidden rounded-[28px] px-5 py-8 min-[960px]:rounded-[48px] min-[960px]:px-7 min-[960px]:py-12`}
          style={{ backgroundImage: PANEL_GRADIENT }}
        >
          <Reveal>
            <h2
              className="mx-auto max-w-[24ch] text-center font-medium text-white"
              style={{
                fontFamily: 'var(--font-outfit), ui-sans-serif, system-ui, sans-serif',
                // A rem term, not pure vw: between about 588 and 1412px the old
                // 3.4vw dominated its own clamp, so the heading tracked viewport
                // width and ignored the user's font-size setting entirely (48px at
                // a 16px root, 49px at 22px). 1.67vw rather than 1.4vw because
                // 1.5rem + 1.4vw renders 44px at 1440/16px, and this heading holds
                // its 48px.
                fontSize: 'clamp(2rem, 1.5rem + 1.67vw, 3rem)',
                letterSpacing: '-0.035em',
                lineHeight: 1.05,
                textWrap: 'balance',
              }}
            >
              Meet your providers
            </h2>
          </Reveal>

          {/* Measured from the rendered pixels at 1440px, worst case (lightest)
              ground behind each run: heading 10.53:1, this intro 7.73:1, and the
              card role and bio 9.68:1 each. The intro sits high on the 135deg
              gradient where it has not yet reached --color-np-sky; white at 85%
              over sky itself would only make 3.9:1, so do not move this copy
              down the panel without re-measuring. */}
          <Reveal delay={0.08}>
            <p className="text-body-l mx-auto mt-4 max-w-[720px] text-center text-white/85">
              Not a directory, and not a rotating roster. Both hold a Doctor of Nursing Practice and
              are dual board-certified in psychiatric mental health and family practice.
            </p>
          </Reveal>

          {/* role="list" is not redundant: Tailwind Preflight sets list-style:
              none, which makes WebKit drop the list semantics entirely. */}
          {/* Two columns from 1024px, where each 4:5 card is about 450px wide
              and the name, role and bio sit in its bottom third. Narrower than
              that the text block buries the face (tried at 640px: it covered
              most of a 268px card). Below 1024 it is one column, and each card
              is capped at 480px and centred, so a portrait is never taller
              than a tablet screen (uncapped it was 820x1025 at 900px). */}
          <ul role="list" className="mt-8 grid gap-6 lg:grid-cols-2">
            {PROVIDERS.map((p, i) => {
              const img = p.image.portrait;
              const bioId = `provider-bio-${p.slug}`;
              return (
                <Reveal
                  as="li"
                  key={p.slug}
                  delay={stagger(i, 0.1)}
                  className="mx-auto w-full max-w-[480px] lg:max-w-none"
                >
                  {/* The link wraps the NAME and is stretched over the card by
                      ::after, rather than wrapping the whole card. Same hit
                      area, but it keeps the anchor inside the h3, so a screen
                      reader browsing by heading hears "name, link" instead of a
                      bare heading with no hint that it goes anywhere. Same
                      technique as .cardLink in FeaturedServices.module.css.
                      The focus ring is moved to the card with has-[], so the
                      indicator outlines the real target and not just the words.

                      The card is 4:5 PORTRAIT AT EVERY WIDTH (client request,
                      2026-10-19). It was 3:2 from 700px up; the photographs are
                      portraits and are now shown as portraits.

                      TEXT OVER THE PHOTO ON DESKTOP ONLY. From lg the card is
                      about 450px wide or more and the name, role and bio fit in
                      its bottom third. Below lg they need about half of a
                      310px card, which buried both faces, so there the photo is
                      its own 4:5 row and the text sits underneath it. The -mt-8
                      (2rem, which is TEXT_FADE_PX at the default 16px root;
                      at other root sizes the overlap differs by a few pixels of
                      matching blue) pulls the text block up so its
                      fade still runs over the bottom of the photo and the card
                      reads as one piece. The ratio spacer and CARD_SCRIM are
                      lg-only for the same reason.

                      FROM lg, HEIGHT IS max(ratio, content), not the ratio alone. The
                      article is a one-cell grid; the ratio spacer and the text
                      block are both placed in that cell, so the taller of the
                      two sets the row height. At default text size the spacer
                      always wins and the card is exactly 4:5. When text needs
                      more room - a user font-size setting, a longer
                      translation, a longer approved sentence - the card grows
                      instead of clipping.

                      The previous version put the aspect on the article and the
                      text in `absolute bottom-0`, which meant nothing could
                      grow: at a 320px viewport an 18px root font (112%) already
                      clipped 61px off the TOP of the text block, taking the
                      role line and part of the bio with it. The bio is the
                      aria-describedby target, so it stayed announced to a
                      screen reader while being invisible on screen. */}
                  <article
                    id={`provider-${p.slug}`}
                    className="group bg-np-royal-deep relative grid w-full grid-cols-[minmax(0,1fr)] overflow-hidden rounded-[28px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-white"
                  >
                    {/* Decorative: the link already carries the name and role,
                        and a described portrait here would be concatenated into
                        that name. The provider page renders the same person
                        with real alt text. */}
                    {/* Plain <img>, NOT next/image, and no srcSet: the client
                        asked for the photographs at exactly the quality supplied,
                        and next/image would re-encode them lossy at whatever width
                        it picked. One lossless file per provider at its native
                        size - see PROVIDERS[].image.portrait. width/height are the real pixel
                        dimensions, so the browser reserves the right box. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.src}
                      alt=""
                      width={img.width}
                      height={img.height}
                      loading="lazy"
                      decoding="async"
                      className="ease-np-out col-start-1 row-start-1 aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] group-has-[:focus-visible]:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-has-[:focus-visible]:scale-100 lg:absolute lg:inset-0 lg:aspect-auto lg:h-full"
                      style={{ objectPosition: 'center top' }}
                    />

                    {/* Desktop only: below lg the text no longer sits on the
                        photo, so there is nothing for this to back. */}
                    <div
                      className="absolute inset-0 hidden lg:block"
                      style={{ backgroundImage: CARD_SCRIM }}
                    />

                    {/* Ratio spacer, lg only. Sets the card's MINIMUM height and
                        nothing else - it paints nothing and is out of the a11y
                        tree. From lg the photo and scrim above are absolute
                        against the article, so they fill whatever height wins:
                        a taller card shows more photograph, never a blank band.
                        Below lg the photo is its own in-flow row. */}
                    <div
                      aria-hidden="true"
                      className="col-start-1 row-start-1 hidden aspect-[4/5] lg:block"
                    />

                    {/* From lg: same grid cell as the spacer, pinned to its
                        bottom. Below lg: the row under the photo. */}
                    {/* z-10, NOT relative. Both lift this above the absolutely
                        positioned scrim, but `relative` also makes this div the
                        containing block for the link's `after:inset-0`, which
                        silently shrank the stretched hit area from the whole
                        card to just this text panel - clicking the photograph
                        stopped navigating while the hover zoom and the focus
                        ring still covered the whole card. A grid item takes
                        z-index while staying `position: static`, so the article
                        remains the containing block and the hit area is the
                        card again. */}
                    <div
                      className="z-10 col-start-1 row-start-2 -mt-8 self-end px-5 pb-5 min-[960px]:px-7 min-[960px]:pb-6 lg:row-start-1 lg:mt-0"
                      style={{ backgroundImage: TEXT_SCRIM, paddingTop: `${TEXT_FADE_PX}px` }}
                    >
                      <h3 className="flex items-center gap-3 text-white">
                        <Link
                          href={`/providers/${p.slug}`}
                          aria-label={`${p.displayName}, ${p.role}`}
                          aria-describedby={bioId}
                          className="after:absolute after:inset-0 focus-visible:outline-none"
                          style={{
                            fontFamily: 'var(--font-outfit), ui-sans-serif, system-ui, sans-serif',
                            // Down to 1.5rem on a narrow card so the name stays
                            // on one line. At 1.75rem "Funmilayo Whitaker" plus
                            // the arrow wraps at 390px, which cost the photo
                            // another 37px of card height.
                            fontSize: 'clamp(1.5rem, 1.2rem + 1.2vw, 1.75rem)',
                            fontWeight: 500,
                            letterSpacing: '-0.02em',
                            lineHeight: 1.15,
                          }}
                        >
                          {p.displayName}
                        </Link>
                        <span
                          aria-hidden="true"
                          className="ease-np-out inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/45 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-has-[:focus-visible]:translate-x-0.5 group-has-[:focus-visible]:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0 motion-reduce:group-has-[:focus-visible]:translate-x-0 motion-reduce:group-has-[:focus-visible]:translate-y-0"
                        >
                          <ArrowUpRight className="size-4" strokeWidth={1.5} />
                        </span>
                      </h3>

                      <p className="mt-1 text-[0.9375rem] leading-[1.5] text-white/90">{p.role}</p>
                      {/* aria-describedby on the link points here, so the one
                          sentence that actually differentiates the two cards
                          still reaches a screen reader even though the link's
                          accessible name is fixed at name + role. */}
                      <p id={bioId} className="mt-2 text-[0.9375rem] leading-[1.5] text-white/90">
                        {assertSourced(p.slug, p.bio)}
                      </p>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </Container>
    </section>
  );
}
