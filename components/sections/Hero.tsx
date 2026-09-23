import { CTA, HERO, INSURANCE } from '@/lib/content';
import { FadeIn } from '@/components/ui/FadeIn';
import { AnimatedHeading } from '@/components/ui/AnimatedHeading';
import { ButtonWithIcon } from '@/components/ui/ButtonWithIcon';
import { HeroNav } from '@/components/ui/HeroNav';

/**
 * Full-viewport video hero.
 *
 * Two non-interactive layers sit between the video and the content: a
 * cloud-blue tint across the whole frame, and a bottom-up gradient that buys
 * the heading and subheading their contrast. The meadow footage is bright and
 * busy in exactly the lower-left corner the copy occupies, so white text on the
 * raw frame did not reach WCAG AA.
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
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="/video/newpoint-hero-poster.jpg"
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/video/newpoint-hero.mp4" type="video/mp4" />
      </video>

      <div className="pointer-events-none absolute inset-0 bg-[#5B7FA8]/30" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1F3B5C]/75 via-[#1F3B5C]/25 to-transparent" />

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
