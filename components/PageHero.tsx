import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { ButtonWithIcon } from '@/components/ui/ButtonWithIcon';
import { CTA } from '@/lib/content';

/**
 * Interior page hero, in the homepage's treatment.
 *
 * This REPLACES the quiet <PageHeader /> that opened every interior page. That
 * component's own note argued the opposite — that repeating the hero on eight
 * pages spends the site's single expressive moment eight times over, citing
 * design-synthesis Part 1. That call has been reversed deliberately: the
 * interior pages are the ones people reach from search, and they were arriving
 * on a markedly cheaper page than the homepage.
 *
 * The scrim is the homepage's bottom ramp, unchanged in shape and in stop
 * positions. Only the bottom-up gradient is used, not the homepage's lg
 * left-hand ramp: that one exists because the homepage copy moves bottom-LEFT
 * into a two-column layout at lg, and this copy stays a single bottom-anchored
 * column at every width, so the bottom ramp covers it on its own.
 *
 * Pages with no photograph of their own get an np-blue-900 → np-sky gradient
 * running to the top right, so the deep end sits under the copy and the scrim
 * reinforces it rather than muddying the light end.
 *
 * The breadcrumb is schema-only. It used to render above the H1 as a visible
 * "Home / Services" trail; that read as a second, older navigation bar sitting
 * under the real one. `breadcrumbSchema()` still runs on every page below the
 * root, so search results keep their trail, and the sticky navbar carries every
 * top-level destination for getting back up a level.
 */
export function PageHero({
  eyebrow,
  title,
  intro,
  image,
}: {
  eyebrow?: string;
  title: string;
  intro: string;
  /**
   * The page's own photograph. Decorative: the H1 beside it already names the
   * page, so it renders with an empty alt and is not described twice.
   * Omit it to get the gradient.
   */
  image?: { src: string; objectPosition?: string };
}) {
  return (
    /* No `on-ink` here, unlike Footer, PageCta and Providers. That class only
       swaps the focus-ring colour, it was carried solely for the breadcrumb
       links, and the CTA — now the one focusable thing in this header — fixes
       its own ring inside ButtonWithIcon with a utility that beats the base
       layer `on-ink` lives in anyway. */
    <header className="bg-np-blue-900 relative -mt-[var(--nav-h)] flex min-h-[50dvh] flex-col text-white md:min-h-[60vh]">
      {image ? (
        <Image
          src={image.src}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: image.objectPosition ?? '50% 50%' }}
        />
      ) : (
        <div
          aria-hidden="true"
          className="from-np-blue-900 to-np-sky absolute inset-0 bg-gradient-to-tr"
        />
      )}

      {/* TWO DIFFERENT SCRIMS, AND THE DIFFERENCE IS MEASURED.

          Over a photograph this NEVER falls below 0.62 alpha anywhere in the
          frame. The homepage's ramp holds full strength for the bottom 52% and
          fades out above it, which works there because that hero is a full
          viewport with its copy anchored in the bottom corner. Here the hero is
          60vh and the copy fills it: the eyebrow sits high enough to land in
          that ramp's fully transparent part, where it was shot and measured at
          1.3:1 over a bright window. 0.62 is the floor that puts 13px white at
          4.99:1 against the worst pixel in these posters (a blown window, about
          rgb(240,243,247)); it still ramps to 0.85 at the bottom so the frame
          keeps some depth. The floor is kept now that the breadcrumb above the
          eyebrow is gone: the copy block simply starts one line lower, and
          nothing about the posters got darker.

          The gradient pages keep the lighter ramp. They have no photograph to
          fight, measure between 5.3:1 and 14.3:1 as they are, and flattening
          np-blue-900 → np-sky under a heavy tint would throw the gradient away
          to fix a problem it does not have. */}
      <div
        aria-hidden="true"
        className={
          image
            ? 'pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(16,31,69,0.85)_0%,rgba(16,31,69,0.66)_60%,rgba(16,31,69,0.62)_100%)]'
            : 'pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(16,31,69,0.78)_0%,rgba(16,31,69,0.78)_52%,rgba(16,31,69,0.45)_64%,rgba(16,31,69,0)_80%)]'
        }
      />

      {/* pt clears the sticky navbar the section has just pulled itself under.
          Deliberately NOT wrapped in <Reveal />: this is above the fold at
          load, so there is nothing to reveal, and it keeps the LCP element off
          the JavaScript critical path. */}
      <div className="relative flex flex-1 flex-col justify-end pt-[calc(var(--nav-h)+3rem)] pb-12 md:pb-16">
        <Container>
          {/* Full white, not white/85. Measured against the brightest of these
              posters (a blown window behind the psychiatric-evaluation frame)
              85% white came out at 4.41:1, just under the floor for 13px. Full
              white measures 5.37:1 there. */}
          {eyebrow && (
            <p className="text-caption tracking-[0.08em] text-white uppercase">{eyebrow}</p>
          )}

          {/* mt only under an eyebrow. With the breadcrumb removed the H1 is
              the first thing in this column on the pages that have no eyebrow,
              and a top margin there would only pad the block against the
              navbar clearance above it. */}
          <h1
            className={`text-display-l max-w-[18ch] text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.25)] ${
              eyebrow ? 'mt-4' : ''
            }`}
          >
            {title}
          </h1>

          <p className="text-body-l mt-5 max-w-[56ch] text-white/90">{intro}</p>

          <div className="mt-8">
            <ButtonWithIcon href={CTA.href} variant="glass">
              {CTA.label}
            </ButtonWithIcon>
          </div>
        </Container>
      </div>
    </header>
  );
}
