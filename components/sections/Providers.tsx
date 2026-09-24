import Link from 'next/link';
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
 * Portraits are the enhanced card crops (matched exposure, white balance and
 * head size; see design-research/enhanced-preview/). The originals under
 * image.webp560 / image.webp1120 are untouched and still serve the provider
 * pages, which frame them square rather than portrait.
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
 * Funmilayo's is her first sentence. Anastasia's is her second, not her first:
 * her first is near word-for-word identical to Funmilayo's, and the two cards
 * sit side by side under a role line that already says Psychiatric-Mental
 * Health Nurse Practitioner.
 */
const CARD_SENTENCE: Record<string, string> = {
  'funmilayo-whitaker':
    'Funmilayo is dual board-certified as a psychiatric mental health nurse practitioner and a family nurse practitioner.',
  'anastasia-ofoegbu':
    'She provides psychiatric evaluations, medication management, and supportive counseling.',
};

/**
 * Claims the cards must never carry. Age range and substance-use treatment are
 * both unconfirmed (see OPEN_CLIENT_ITEMS), so a sentence asserting either is a
 * regulated-fact leak regardless of how it got here.
 */
const BANNED = /lifespan|child|adolescent|p(a?)ediatric|geriatric|substance|addiction/i;

/**
 * Fails the build rather than the compliance review. These are server
 * components rendered at build time, so a throw here stops `next build`.
 */
function assertSourced(slug: string, bio: string): string {
  const sentence = CARD_SENTENCE[slug];
  if (!sentence) {
    throw new Error(`Providers: no approved card sentence for "${slug}". Add one to CARD_SENTENCE.`);
  }
  if (!bio.includes(sentence)) {
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
 * The enhanced card crops live beside the square portraits under the same slug.
 * Cut at 5:4 to match the card exactly, so the card does no cover-cropping of
 * its own on desktop, with the eye-line placed at 32% of height and head size
 * matched between the two at 26.6% of frame width.
 *
 * What these crops CANNOT do is show the top of the head. Measured off a
 * percentage grid on the originals, the crown-to-eye distance is 37% of
 * Funmilayo's whole source frame and 40% of Anastasia's - these are close-range
 * selfies. Putting the eyes at 32% of a 5:4 frame therefore cuts 229px off one
 * crown and 164px off the other. Framing them to keep the crown instead drops
 * the eye-line to about 51%, which pushes MORE of the face behind the text
 * block and breaks the matched head size. Neither is fixable by cropping; it
 * needs the reshoot already listed in OPEN_CLIENT_ITEMS.
 */
function cardImage(slug: string) {
  return {
    w560: `/images/providers/${slug}-card-560.webp`,
    w1120: `/images/providers/${slug}-card-1120.webp`,
  };
}

/**
 * Bottom scrim. Transparent until 55% down the card, then ramps to solid
 * --color-np-blue-700, which is the blue the panel is showing behind the cards.
 * It is fully opaque well before the text block starts, so the role and bio sit
 * on flat blue rather than on whatever the photograph happens to be doing - the
 * two backgrounds are a warm grey wall and a bright white interior, and the
 * text has to clear AA over both.
 */
const CARD_SCRIM =
  'linear-gradient(to top,' +
  ' var(--color-np-blue-700) 0%,' +
  ' var(--color-np-blue-700) 32%,' +
  ' color-mix(in srgb, var(--color-np-blue-700) 70%, transparent) 38%,' +
  ' transparent 45%)';

/**
 * Backing for the text block itself, on top of CARD_SCRIM.
 *
 * CARD_SCRIM is a PERCENTAGE of the card, so it only guarantees solid blue
 * under the text when the text occupies roughly the bottom third. It does not
 * at narrow widths: at 390px the role line sits at about 48% of the card, up in
 * the fade, over Anastasia's bright white background - measured 2.48:1, under
 * AA, at default text size. Enlarging text makes it worse (1.0:1 at a 20px
 * root), because the block grows upward while the scrim stays put.
 *
 * This one is anchored to the TEXT rather than the card: solid everywhere the
 * text actually is, fading out across the 72px of padding above the first line,
 * so it scales with the block at any size. At desktop default it lands almost
 * exactly where CARD_SCRIM had already gone solid, so the card looks unchanged.
 */
const TEXT_SCRIM =
  'linear-gradient(to top,' +
  ' var(--color-np-blue-700) 0%,' +
  ' var(--color-np-blue-700) calc(100% - 72px),' +
  ' transparent 100%)';

/** Soft diagonal, dark top-left to --color-np-sky bottom-right. All tokens. */
const PANEL_GRADIENT =
  'linear-gradient(135deg,' +
  ' var(--color-np-blue-900) 0%,' +
  ' var(--color-np-blue-700) 52%,' +
  ' var(--color-np-sky) 100%)';

export function Providers() {
  return (
    <section id="providers" className="bg-np-neutral-50 py-24 md:py-32">
      {/* Not <Container>: that caps content at 1200 and then eats 32px of it as
          gutters, so the panel came out 1136 wide. FeaturedServices sets its own
          max-width: 1200px with 20px gutters, so the panel is given the same
          1200 cap with the gutters OUTSIDE it. The panel is therefore a true
          1200 from 1240px up, and lines up with the services block below it. */}
      <div className="px-5">
        {/* on-ink swaps the global focus ring to white, which is what the cards
            inside this panel need. It is scoped to the panel, not the section,
            because the section ground is now light. */}
        <div
          className={`on-ink ${outfit.variable} mx-auto w-full max-w-[1200px] overflow-hidden rounded-[28px] px-5 py-10 min-[960px]:rounded-[48px] min-[960px]:px-7 min-[960px]:py-16`}
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
              You will see one of two providers. Here they are.
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
              are dual-certified in psychiatric mental health and family practice.
            </p>
          </Reveal>

          {/* role="list" is not redundant: Tailwind Preflight sets list-style:
              none, which makes WebKit drop the list semantics entirely. */}
          <ul
            role="list"
            className="mt-10 grid gap-6 min-[960px]:grid-cols-2"
          >
            {PROVIDERS.map((p, i) => {
              const img = cardImage(p.slug);
              const bioId = `provider-bio-${p.slug}`;
              return (
                <Reveal
                  as="li"
                  key={p.slug}
                  delay={stagger(i, 0.1)}
                  className="w-full"
                >
                  {/* The link wraps the NAME and is stretched over the card by
                      ::after, rather than wrapping the whole card. Same hit
                      area, but it keeps the anchor inside the h3, so a screen
                      reader browsing by heading hears "name, link" instead of a
                      bare heading with no hint that it goes anywhere. Same
                      technique as .cardLink in FeaturedServices.module.css.
                      The focus ring is moved to the card with has-[], so the
                      indicator outlines the real target and not just the words.

                      The card is 5:4 from 700px up. Below that it goes portrait
                      instead: 5:4 is a function of the card's WIDTH, so on a
                      310px-wide phone card it resolves to 248px of height while
                      the text block alone needs 223px, which buries the photo
                      almost completely. 700px is where the card is wide enough
                      (about 620px) for the text to sit under half the card.

                      HEIGHT IS max(ratio, content), not the ratio alone. The
                      article is a one-cell grid; the ratio spacer and the text
                      block are both placed in that cell, so the taller of the
                      two sets the row height. At default text size the spacer
                      always wins and the card is exactly its 4:5 / 5:4 size.
                      When text needs more room - a user font-size setting, a
                      longer translation, a longer approved sentence - the card
                      grows instead of clipping.

                      The previous version put the aspect on the article and the
                      text in `absolute bottom-0`, which meant nothing could
                      grow: at a 320px viewport an 18px root font (112%) already
                      clipped 61px off the TOP of the text block, taking the
                      role line and part of the bio with it. The bio is the
                      aria-describedby target, so it stayed announced to a
                      screen reader while being invisible on screen. */}
                  <article
                    id={`provider-${p.slug}`}
                    className="group bg-np-blue-900 relative grid w-full grid-cols-[minmax(0,1fr)] overflow-hidden rounded-[28px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-white"
                  >
                    {/* Decorative: the link already carries the name and role,
                        and a described portrait here would be concatenated into
                        that name. The provider page renders the same person
                        with real alt text. */}
                    {/* Plain <img>, same call as ProviderPortrait: these assets
                        are pre-cropped and pre-optimised at exactly 560 and 1120,
                        so re-optimising through next/image would only degrade
                        work already done at a known, capped size. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.w560}
                      srcSet={`${img.w560} 560w, ${img.w1120} 1120w`}
                      sizes="(min-width: 960px) 560px, 100vw"
                      alt=""
                      width={1120}
                      height={896}
                      loading="lazy"
                      decoding="async"
                      className="ease-np-out absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] group-has-[:focus-visible]:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-has-[:focus-visible]:scale-100"
                      style={{ objectPosition: 'center 32%' }}
                    />

                    <div className="absolute inset-0" style={{ backgroundImage: CARD_SCRIM }} />

                    {/* Ratio spacer. Sets the card's MINIMUM height and nothing
                        else - it paints nothing and is out of the a11y tree.
                        The photo and scrim above are absolute against the
                        article, so they fill whatever height wins: a taller
                        card shows more photograph, never a blank band. */}
                    <div
                      aria-hidden="true"
                      className="col-start-1 row-start-1 aspect-[4/5] min-[700px]:aspect-[5/4]"
                    />

                    {/* Same grid cell as the spacer, pinned to its bottom.
                        `relative` is load-bearing: the scrim is positioned, so
                        static content would paint underneath it. */}
                    <div
                      className="relative col-start-1 row-start-1 self-end px-5 pt-[72px] pb-5 min-[960px]:px-7 min-[960px]:pb-6"
                      style={{ backgroundImage: TEXT_SCRIM }}
                    >
                      <h3 className="flex items-center gap-3 text-white">
                        <Link
                          href={`/providers/${p.slug}`}
                          aria-label={`${p.name}, ${p.role}`}
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
                          {p.name}
                        </Link>
                        <span
                          aria-hidden="true"
                          className="ease-np-out inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/45 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-has-[:focus-visible]:-translate-y-0.5 group-has-[:focus-visible]:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0 motion-reduce:group-has-[:focus-visible]:translate-x-0 motion-reduce:group-has-[:focus-visible]:translate-y-0"
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
      </div>
    </section>
  );
}
