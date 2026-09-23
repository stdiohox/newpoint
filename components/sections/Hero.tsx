import { NAV, CTA, HERO, BUSINESS } from '@/lib/content';
import { FadeIn } from '@/components/ui/FadeIn';
import { AnimatedHeading } from '@/components/ui/AnimatedHeading';

/**
 * Full-viewport video hero, built to the supplied spec.
 *
 * The video plays raw: there is no overlay, gradient, scrim or dimming layer of
 * any kind between it and the content. Every surface that sits over it is a
 * .liquid-glass element with its own background.
 *
 * Inter is scoped to this section only. It is declared inline here rather than
 * on `body`, so the rest of the site keeps Cabinet Grotesk + Switzer. The
 * heading repeats it inline because the base layer sets a font-family directly
 * on `h1`, which would otherwise beat inheritance from this wrapper.
 *
 * This section also carries the site's primary navigation.
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
        <source src="/video/newpoint-hero.webm" type="video/webm" />
        <source src="/video/newpoint-hero.mp4" type="video/mp4" />
      </video>

      <div className="relative flex min-h-screen flex-col">
        <div className="px-6 pt-6 md:px-12 lg:px-16">
          <div className="liquid-glass flex items-center justify-between rounded-xl px-4 py-2">
            <span className="text-2xl font-semibold tracking-tight">{BUSINESS.shortName}</span>

            <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-sm transition-colors hover:text-gray-300"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <a
              href={CTA.href}
              className="rounded-lg bg-white px-6 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-100"
            >
              {CTA.label}
            </a>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-end px-6 pb-12 md:px-12 lg:grid lg:grid-cols-2 lg:items-end lg:px-16 lg:pb-16">
          <div>
            <AnimatedHeading
              text={HERO.headlineLines}
              className="mb-4 text-4xl font-normal text-white md:text-5xl lg:text-6xl xl:text-7xl"
              style={{ letterSpacing: '-0.04em', fontFamily: INTER }}
            />

            <FadeIn delay={800} duration={1000}>
              <p className="mb-5 text-base text-gray-300 md:text-lg">{HERO.subtext}</p>
            </FadeIn>

            <FadeIn delay={1200} duration={1000}>
              <div className="flex flex-wrap gap-4">
                <a
                  href={CTA.href}
                  className="rounded-lg bg-white px-8 py-3 font-medium text-black"
                >
                  {CTA.label}
                </a>
                <a
                  href={`tel:${BUSINESS.phonePrimaryHref}`}
                  className="liquid-glass rounded-lg border border-white/20 px-8 py-3 font-medium text-white transition-colors hover:bg-white hover:text-black"
                >
                  {BUSINESS.phonePrimary}
                </a>
              </div>
            </FadeIn>
          </div>

          <div className="flex items-end justify-start lg:justify-end">
            <FadeIn delay={1400} duration={1000}>
              <div className="liquid-glass rounded-xl border border-white/20 px-6 py-3">
                <span className="text-lg font-light md:text-xl lg:text-2xl">{HERO.tag}</span>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
