import { CTA, HERO, INSURANCE } from '@/lib/content';
import { FadeIn } from '@/components/ui/FadeIn';
import { AnimatedHeading } from '@/components/ui/AnimatedHeading';
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

        <div className="flex flex-1 flex-col justify-end px-6 pb-12 md:px-12 lg:grid lg:grid-cols-2 lg:items-end lg:px-16 lg:pb-16">
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
                <a
                  href={CTA.href}
                  className="rounded-lg bg-white px-8 py-3 font-medium text-black"
                >
                  {CTA.label}
                </a>
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
    </section>
  );
}
