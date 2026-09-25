import Image from 'next/image';
import { CTA, HERO, INSURANCE } from '@/lib/content';
import { FadeIn } from '@/components/ui/FadeIn';
import { AnimatedHeading } from '@/components/ui/AnimatedHeading';
import { ButtonWithIcon } from '@/components/ui/ButtonWithIcon';
import { HeroNav } from '@/components/ui/HeroNav';

/**
 * Full-viewport photographic hero.
 *
 * THE VIDEO IS GONE, replaced by a still. That also closes a WCAG 2.2.2 gap
 * ServicesMedia.tsx documents: the hero autoplayed a loop for longer than five
 * seconds with no pause mechanism at all. A still needs none.
 *
 * Two non-interactive layers sit between the image and the content: a
 * cloud-blue tint across the whole frame, and a bottom-up gradient that buys
 * the heading and subheading their contrast. Both are unchanged. The meadow is
 * bright and busy in exactly the lower-left corner the copy occupies, so white
 * text on the raw frame does not reach WCAG AA on its own.
 *
 * OBJECT-POSITION is responsive because the subject is off-centre, at 48% to
 * 79% across the frame, and the crop swings hard with viewport shape. The
 * source is 4:3 (1.34); a phone in portrait is about 0.46, so cover scales by
 * height and shows barely a third of the width. Centred, that cuts her in half.
 * Each step below is the value that keeps the whole of her inside the crop
 * window at that shape, measured rather than judged by eye.
 *
 * Inter is scoped to this section only. It is declared inline here rather than
 * on `body`, so the rest of the site keeps Cabinet Grotesk + Switzer. The
 * heading repeats it inline because the base layer sets a font-family directly
 * on `h1`, which would otherwise beat inheritance from this wrapper.
 *
 * This section also carries the site's primary navigation, in <HeroNav />.
 */

const INTER = "'Inter', sans-serif";

export function Hero() {
  return (
    <section
      className="relative min-h-screen bg-black text-white"
      style={{
        fontFamily: INTER,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}
    >
      <Image
        src="/images/hero/hero-meadow-2560.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[72%_50%] md:object-[64%_50%] lg:object-[50%_50%]"
      />

      {/* Layer 1, the cloud-blue tint, unchanged. */}
      <div className="pointer-events-none absolute inset-0 bg-[#5B7FA8]/30" />
      {/* Layer 2, the bottom-up gradient. Strengthened from /75 and /25: the
          photograph is far brighter than the footage it replaces, and measured
          against the worst pixel behind each block the heading reached only
          2.25:1 at 1440 where large text needs 3:1. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1F3B5C]/85 via-[#1F3B5C]/45 to-transparent" />
      {/* Layer 3 is new, and it is a LEFT scrim rather than more darkness
          everywhere. The copy sits bottom-left and the subject stands on the
          right, so weighting the fix to the left buys the text its contrast
          while leaving her in clear air. Its midpoint is /40 rather than /25
          because the badge pill sits higher than the heading, above where the
          bottom gradient has much strength, and measured 4.33:1 at 390 with
          the shallower ramp. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#1F3B5C]/70 via-[#1F3B5C]/40 to-transparent" />

      <div className="relative flex min-h-screen flex-col">
        <HeroNav />

        {/* pt matches --nav-h: the bar is fixed now, so it no longer reserves
            its own space in this column. */}
        <div className="flex flex-1 flex-col justify-end px-6 pt-[var(--nav-h)] pb-12 md:px-12 lg:grid lg:grid-cols-2 lg:items-end lg:px-16 lg:pb-16">
          <div>
            <FadeIn delay={100} duration={1000} className="mb-4">
              <span className="inline-block rounded-full border border-white/30 px-4 py-2 text-sm text-white">
                {INSURANCE.heading}
              </span>
            </FadeIn>

            <AnimatedHeading
              text={HERO.headlineLines}
              className="mb-4 text-4xl font-normal text-white md:text-5xl lg:text-6xl xl:text-7xl"
              style={{ letterSpacing: '-0.04em', fontFamily: INTER }}
            />

            <FadeIn delay={800} duration={1000}>
              <p className="mb-5 text-sm text-white/90 md:text-base">{HERO.subtext}</p>
            </FadeIn>

            <FadeIn delay={1200} duration={1000}>
              <div className="flex flex-wrap gap-4">
                <ButtonWithIcon href={CTA.href}>{CTA.label}</ButtonWithIcon>
              </div>
            </FadeIn>
          </div>

          <div className="flex items-end justify-start lg:justify-end">
            <FadeIn delay={1400} duration={1000}>
              <span className="text-base font-light md:text-lg lg:text-xl">{HERO.tag}</span>
            </FadeIn>
          </div>
        </div>
      </div>

      {/* The navbar measures this to decide when to take its solid fill. Marking
          the hero's real bottom edge rather than assuming a viewport height keeps
          it correct when the hero grows past min-h-screen or the window resizes.
          Its absence is also how <HeroNav /> detects a page with no hero. */}
      <div id="hero-end" aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px" />
    </section>
  );
}
