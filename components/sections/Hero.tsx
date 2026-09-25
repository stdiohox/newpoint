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
        src="/images/hero/hero-meadow-2400.webp"
        alt=""
        fill
        priority
        quality={88}
        sizes="100vw"
        className="object-cover object-[72%_50%] md:object-[64%_50%] lg:object-[50%_50%]"
      />

      {/* SCRIM, NOT AN OVERALL OVERLAY. Two gradients that darken only where
          the copy is, so the photograph keeps its light and her face stays in
          clear air. np-blue-900 (#101f45), written as rgba because a gradient
          needs stop positions as well as a colour.

          THE RAMPS ARE DEEPER THAN THE BRIEF'S 55% / 45%, and measurably had
          to be. Those are peak values at the very edge of each gradient, and
          the copy sits in the middle of the fade, where they deliver only
          0.25-0.30 alpha. Against the worst pixel behind the text, rgb(238,
          241,249) of blown sky, that is 1.1 to 2.0:1. Reaching the 4.5:1 the
          same brief asks for needs about 0.58 alpha AT THE TEXT, which is what
          these ramps give. The shape is unchanged: left plus bottom, nothing
          across the whole frame.

          IT SWITCHES AT lg BECAUSE THE LAYOUT DOES. Below lg the copy is one
          full-width column at the bottom, so a single taller bottom ramp
          covers it and leaves her, who sits upper-right, untouched. At lg the
          layout goes two-column and the copy moves bottom-left, so the left
          ramp takes over and the bottom one can be shallower.

          EACH ONE PLATEAUS BEFORE IT FADES, rather than ramping from the edge.
          A single linear ramp cannot do this: the copy at 390 reaches 54% up
          the frame, and holding 0.58 alpha that high from a bottom-anchored
          ramp needs a peak above 1.0. Holding full strength across the copy
          and then falling to zero just below her face is the only shape that
          satisfies both halves of the brief.

          EACH CARRIES A MID STOP as well, so the fade is two-segment rather
          than one. A plateau running straight into a linear fade leaves a
          visible vertical seam across the photograph where the slope changes;
          the extra stop rounds it off. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(16,31,69,0.78)_0%,rgba(16,31,69,0.78)_52%,rgba(16,31,69,0.45)_64%,rgba(16,31,69,0)_80%)] lg:bg-[linear-gradient(to_top,rgba(16,31,69,0.72)_0%,rgba(16,31,69,0.72)_18%,rgba(16,31,69,0)_42%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden lg:block lg:bg-[linear-gradient(to_right,rgba(16,31,69,0.72)_0%,rgba(16,31,69,0.72)_40%,rgba(16,31,69,0.45)_55%,rgba(16,31,69,0)_74%)]"
      />

      <div className="relative flex min-h-screen flex-col">
        <HeroNav />

        {/* pt matches --nav-h: the bar is fixed now, so it no longer reserves
            its own space in this column. */}
        <div className="flex flex-1 flex-col justify-end px-6 pt-[var(--nav-h)] pb-12 md:px-12 lg:grid lg:grid-cols-2 lg:items-end lg:px-16 lg:pb-16">
          <div>
            <FadeIn delay={100} duration={1000} className="mb-4">
              <span className="inline-block rounded-full border border-white/30 px-4 py-2 text-sm text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.25)]">
                {INSURANCE.heading}
              </span>
            </FadeIn>

            <AnimatedHeading
              text={HERO.headlineLines}
              className="mb-4 text-4xl font-normal text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.25)] md:text-5xl lg:text-6xl xl:text-7xl"
              style={{ letterSpacing: '-0.04em', fontFamily: INTER }}
            />

            <FadeIn delay={800} duration={1000}>
              <p className="mb-5 text-sm text-white/90 [text-shadow:0_1px_12px_rgba(0,0,0,0.25)] md:text-base">
                {HERO.subtext}
              </p>
            </FadeIn>

            <FadeIn delay={1200} duration={1000}>
              <div className="flex flex-wrap gap-4">
                <ButtonWithIcon href={CTA.href} variant="glass">
                  {CTA.label}
                </ButtonWithIcon>
              </div>
            </FadeIn>
          </div>

          <div className="flex items-end justify-start lg:justify-end">
            <FadeIn delay={1400} duration={1000}>
              <span className="text-base font-light [text-shadow:0_1px_12px_rgba(0,0,0,0.25)] md:text-lg lg:text-xl">
                {HERO.tag}
              </span>
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
