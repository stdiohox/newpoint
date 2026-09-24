import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Container } from '@/components/ui/Container';
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
 * 1068 is the widest framing available without upscaling either source - the
 * template is bounded by Anastasia's 1137x1138 original, which is the tighter
 * of the two. Cut at 7:6 to match the card, which also buys a smaller head in
 * frame (26.6% of the width against 30.6% at the old portrait aspect) and an
 * eye-line at 35.5% rather than 44.5%, so the face sits higher above the text.
 */
function cardImage(slug: string) {
  return {
    w560: `/images/providers/${slug}-card-560.webp`,
    w1068: `/images/providers/${slug}-card-1068.webp`,
  };
}

/**
 * Bottom scrim. Transparent until 45% down the card, then ramps to solid
 * --color-np-blue-700, which is the blue the panel is showing behind the cards.
 * It is fully opaque well before the text block starts, so the role and bio sit
 * on flat blue rather than on whatever the photograph happens to be doing - the
 * two backgrounds are a warm grey wall and a bright white interior, and the
 * text has to clear AA over both.
 */
const CARD_SCRIM =
  'linear-gradient(to top,' +
  ' var(--color-np-blue-700) 0%,' +
  ' var(--color-np-blue-700) 30%,' +
  ' color-mix(in srgb, var(--color-np-blue-700) 70%, transparent) 42%,' +
  ' transparent 55%)';

/** Soft diagonal, dark top-left to --color-np-sky bottom-right. All tokens. */
const PANEL_GRADIENT =
  'linear-gradient(135deg,' +
  ' var(--color-np-blue-900) 0%,' +
  ' var(--color-np-blue-700) 52%,' +
  ' var(--color-np-sky) 100%)';

export function Providers() {
  return (
    <section id="providers" className="bg-np-neutral-50 py-24 md:py-32">
      <Container>
        {/* on-ink swaps the global focus ring to white, which is what the cards
            inside this panel need. It is scoped to the panel, not the section,
            because the section ground is now light. */}
        <div
          className={`on-ink ${outfit.variable} overflow-hidden rounded-[28px] px-5 py-14 min-[769px]:rounded-[48px] min-[769px]:px-12 min-[769px]:py-20`}
          style={{ backgroundImage: PANEL_GRADIENT }}
        >
          <Reveal>
            <h2
              className="mx-auto max-w-[20ch] text-center font-medium text-white"
              style={{
                fontFamily: 'var(--font-outfit), ui-sans-serif, system-ui, sans-serif',
                fontSize: 'clamp(2rem, 4.4vw, 3.5rem)',
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
            <p className="text-body-l mx-auto mt-5 max-w-[620px] text-center text-white/85">
              Not a directory, and not a rotating roster. Both hold a Doctor of Nursing Practice and
              are dual-certified in psychiatric mental health and family practice.
            </p>
          </Reveal>

          {/* role="list" is not redundant: Tailwind Preflight sets list-style:
              none, which makes WebKit drop the list semantics entirely. */}
          <ul
            role="list"
            className="mt-12 flex flex-col items-center gap-6 min-[769px]:flex-row min-[769px]:items-stretch min-[769px]:justify-center min-[769px]:gap-6"
          >
            {PROVIDERS.map((p, i) => {
              const img = cardImage(p.slug);
              const bioId = `provider-bio-${p.slug}`;
              return (
                <Reveal
                  as="li"
                  key={p.slug}
                  delay={stagger(i, 0.1)}
                  className="w-full max-w-[420px] min-[769px]:max-w-[500px]"
                >
                  {/* The link wraps the NAME and is stretched over the card by
                      ::after, rather than wrapping the whole card. Same hit
                      area, but it keeps the anchor inside the h3, so a screen
                      reader browsing by heading hears "name, link" instead of a
                      bare heading with no hint that it goes anywhere. Same
                      technique as .cardLink in FeaturedServices.module.css.
                      The focus ring is moved to the card with has-[], so the
                      indicator outlines the real target and not just the words.

                      The card is wide and short from 769px up, where the panel
                      has spare horizontal room the old 420px portrait cards
                      left empty. Mobile only goes square, not 7:6: there is no
                      spare width there to trade for the height, and the text
                      block needs what is left. */}
                  <article
                    id={`provider-${p.slug}`}
                    className="group bg-np-blue-900 relative aspect-square w-full overflow-hidden rounded-[28px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-white min-[769px]:aspect-[7/6]"
                  >
                    {/* Decorative: the link already carries the name and role,
                        and a described portrait here would be concatenated into
                        that name. The provider page renders the same person
                        with real alt text. */}
                    {/* Plain <img>, same call as ProviderPortrait: these assets
                        are pre-cropped and pre-optimised at exactly 560 and 928,
                        so re-optimising through next/image would only degrade
                        work already done at a known, capped size. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.w560}
                      srcSet={`${img.w560} 560w, ${img.w1068} 1068w`}
                      sizes="(min-width: 769px) 500px, 100vw"
                      alt=""
                      width={1068}
                      height={916}
                      loading="lazy"
                      decoding="async"
                      className="ease-np-out absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] group-has-[:focus-visible]:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-has-[:focus-visible]:scale-100"
                      style={{ objectPosition: 'center 38%' }}
                    />

                    <div className="absolute inset-0" style={{ backgroundImage: CARD_SCRIM }} />

                    <div className="absolute inset-x-0 bottom-0 p-5 min-[769px]:p-7">
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

                      <p className="mt-2 text-[0.9375rem] leading-[1.5] text-white/90">{p.role}</p>
                      {/* aria-describedby on the link points here, so the one
                          sentence that actually differentiates the two cards
                          still reaches a screen reader even though the link's
                          accessible name is fixed at name + role. */}
                      <p id={bioId} className="mt-3 text-[0.9375rem] leading-[1.5] text-white/90">
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
