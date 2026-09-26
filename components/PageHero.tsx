import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { ButtonWithIcon } from '@/components/ui/ButtonWithIcon';
import { CTA } from '@/lib/content';

export type Crumb = { name: string; path: string };

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
 * The breadcrumb stays visible rather than schema-only, as it was before: it is
 * the only way back up a level on a page reached directly from a search result.
 */
export function PageHero({
  eyebrow,
  title,
  intro,
  crumbs,
  image,
}: {
  eyebrow?: string;
  title: string;
  intro: string;
  crumbs: Crumb[];
  /**
   * The page's own photograph. Decorative: the H1 beside it already names the
   * page, so it renders with an empty alt and is not described twice.
   * Omit it to get the gradient.
   */
  image?: { src: string; objectPosition?: string };
}) {
  return (
    /* on-ink: every focus ring in here would otherwise fall back to the
       global np-blue-600 outline, which globals.css itself measures at 1.93:1
       against np-blue-900 — the colour this hero's scrim is built from. The
       class swaps it for white, the same way Footer and Providers do.
       It fixes the breadcrumb links only. The CTA carries its own
       focus-visible utility, and utilities beat the base layer this class
       lives in, so that one is fixed inside ButtonWithIcon instead. */
    <header className="on-ink bg-np-blue-900 relative -mt-[var(--nav-h)] flex min-h-[50dvh] flex-col text-white md:min-h-[60vh]">
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
          60vh and the copy fills it: the breadcrumb lands about a quarter of
          the way down, which on that ramp is the fully transparent part. Shot
          and measured, the breadcrumb came out at 1.3:1 over a bright window.
          0.62 is the floor that puts 13px white at 4.99:1 against the worst
          pixel in these posters (a blown window, about rgb(240,243,247)); it
          still ramps to 0.85 at the bottom so the frame keeps some depth.

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
          <nav aria-label="Breadcrumb">
            <ol
              role="list"
              /* Full white, not white/85. Measured against the brightest of these
                 posters (a blown window behind the psychiatric-evaluation frame)
                 85% white came out at 4.41:1, just under the floor for 13px.
                 Full white measures 5.37:1 there. The separator stays dimmer:
                 it is aria-hidden decoration, not information. */
              className="text-caption flex flex-wrap items-center gap-x-2 gap-y-1 text-white"
            >
              <li>
                <Link href="/" className="underline-offset-4 hover:text-white hover:underline">
                  Home
                </Link>
              </li>
              {crumbs.map((crumb, i) => {
                const isLast = i === crumbs.length - 1;
                return (
                  <li key={crumb.path} className="flex items-center gap-2">
                    <span aria-hidden="true" className="text-white/50">
                      /
                    </span>
                    {isLast ? (
                      <span className="text-white" aria-current="page">
                        {crumb.name}
                      </span>
                    ) : (
                      <Link
                        href={crumb.path}
                        className="underline-offset-4 hover:text-white hover:underline"
                      >
                        {crumb.name}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          {eyebrow && (
            <p className="text-caption mt-6 tracking-[0.08em] text-white uppercase">{eyebrow}</p>
          )}

          <h1 className="text-display-l mt-4 max-w-[18ch] text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.25)]">
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
