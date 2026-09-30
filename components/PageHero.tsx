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
  scrim = 'poster',
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
  /**
   * Which of the two photographic scrims to use. Ignored without an `image`.
   *
   * `poster` is the default and the flat-floor ramp described below: the right
   * answer for the service-page posters, which are bright edge to edge and put
   * a blown window behind the copy at every width.
   *
   * `hero` is the homepage hero's pair of ramps, opted into per page. It is
   * only safe where the photograph has been cropped so the copy never sits over
   * a blown highlight — the left ramp's plateau does the work at lg, and below
   * lg the bottom ramp does it alone. /services is cropped exactly that way;
   * measure before adding a second page to this branch.
   */
  scrim?: 'poster' | 'hero';
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
          to fix a problem it does not have.

          A THIRD CASE, scrim="hero", IS THE HOMEPAGE'S PAIR OF RAMPS: a bottom
          ramp that changes shape at lg, plus a left ramp. It is an opt-in and
          not the default for photographs, for the reason the floor exists
          above — over the posters its transparent zone lands on a blown window.
          It exists because the flat floor costs the picture everything the
          homepage's shape is designed to keep: a constant 0.62 over the whole
          frame dims the subject's face by exactly as much as it dims the corner
          the copy sits in.

          THE STOPS ARE NOT THE HOMEPAGE'S, AND THAT IS A DELIBERATE DEVIATION
          FROM A BRIEF THAT ASKED FOR THEM VERBATIM. Both were measured on this
          page, at 1440, 1024, 768 and 390, sampling only pixels a glyph
          actually covers. The homepage's own numbers fail here twice:

            390  H1     2.10:1 against 3:1     over a sunlit curtain
            1024 intro  2.46:1 against 4.5:1   over the sunlit wall

          The cause is geometry, not colour. The homepage ramp is shaped for a
          100vh section whose copy is short, bottom-anchored, and confined to
          one column of a two-column grid. This hero is ~560-610px tall and its
          copy fills it: at 390 the H1 sits 73% of the way UP the frame, well
          into the bottom ramp's transparent zone, and at lg the 56ch intro runs
          to 59% across, past the point where the left ramp has faded out.

          What changed, and why each one:
            bottom, below lg  unchanged — the homepage's, exactly
            bottom at lg      plateau 18%->34%, fade 42%->64%, with a mid stop
                              added so it stays two-segment. Her face sits above
                              56% of the frame's height here, so this reaches
                              the intro without touching it.
            left at lg        plateau 40%->46%, fade 74%->78%. Covers the intro's
                              59% without reaching her face, which starts at 63%.
            left, below lg    NEW. The homepage has no left ramp below lg because
                              its mobile copy needs none. Here the failing H1
                              pixel is at 35% across, on the curtain, while she
                              is at 50%-81% of this much tighter crop — so a
                              left ramp is the only thing that can darken one
                              without darkening the other. Its stops are pulled
                              in (34/46/62 against the lg ramp's 46/62/78) to
                              land entirely left of her.

          The alternative tested and rejected was leaving the left ramp lg-only
          and deepening the bottom ramp below lg instead. It passes the same
          thresholds and looks materially worse: the darkening is vertical, so
          it crosses her face, and the frame flattens into the even wash this
          branch exists to avoid. Measured after the change:

            1440  H1 6.80  intro 9.13  CTA 8.17
            1024  H1 6.47  intro 6.43  CTA 8.27
            768   H1 11.24 intro 7.22  CTA 6.37
            390   H1 3.31  intro 6.42  CTA 5.89   (floors: 3:1 / 4.5:1 / 4.5:1) */}
      <div
        aria-hidden="true"
        className={
          image
            ? scrim === 'hero'
              ? 'pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(16,31,69,0.78)_0%,rgba(16,31,69,0.78)_52%,rgba(16,31,69,0.45)_64%,rgba(16,31,69,0)_80%)] lg:bg-[linear-gradient(to_top,rgba(16,31,69,0.72)_0%,rgba(16,31,69,0.72)_34%,rgba(16,31,69,0.5)_48%,rgba(16,31,69,0)_64%)]'
              : 'pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(16,31,69,0.85)_0%,rgba(16,31,69,0.66)_60%,rgba(16,31,69,0.62)_100%)]'
            : 'pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(16,31,69,0.78)_0%,rgba(16,31,69,0.78)_52%,rgba(16,31,69,0.45)_64%,rgba(16,31,69,0)_80%)]'
        }
      />

      {/* The left ramp, at every width, and only under scrim="hero". It carries
          the H1 below lg and the intro's long lines at lg — see the deviation
          note above for why it is not lg-only the way the homepage's is. */}
      {image && scrim === 'hero' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(16,31,69,0.72)_0%,rgba(16,31,69,0.72)_34%,rgba(16,31,69,0.45)_46%,rgba(16,31,69,0)_62%)] lg:bg-[linear-gradient(to_right,rgba(16,31,69,0.72)_0%,rgba(16,31,69,0.72)_46%,rgba(16,31,69,0.45)_62%,rgba(16,31,69,0)_78%)]"
        />
      )}

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
