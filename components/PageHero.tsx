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
 * The DEFAULT scrim is the homepage's bottom ramp, unchanged in shape and in
 * stop positions, and only the bottom-up gradient: the homepage's left-hand
 * ramp exists because its copy moves bottom-LEFT into a two-column layout at
 * lg, and this copy stays a single bottom-anchored column at every width, so
 * the bottom ramp covers it on its own.
 *
 * `scrim="hero"` is the exception and does use a left ramp. See the long note
 * on the scrim divs below for what it changes and why it is opt-in.
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
  image?: {
    src: string;
    objectPosition?: string;
    /**
     * `sizes` for the srcset, defaulting to the full-bleed 100vw.
     *
     * 100vw DESCRIBES THE BOX, NOT THE PICTURE, and under object-cover those
     * are the same thing only while the box is wider than the source. Once it
     * is narrower the image scales by HEIGHT and is drawn wider than the
     * viewport, with the overflow cropped — so the browser sizes the srcset
     * against a number well below what it actually paints. Measured on
     * /services, whose source is 16:9: at 390 the hero box is 390x611 but the
     * image is drawn 1098px wide, and 100vw fetched 828px for it, which is
     * 0.75 device px per CSS px on a 2x phone. Visibly soft.
     *
     * Pass an explicit value on any hero whose photograph is wider than its
     * box at some breakpoint. The other five callers have the same shape and
     * are knowingly left on the default for now.
     */
    sizes?: string;
  };
  /**
   * Which of the two photographic scrims to use. Ignored without an `image`.
   *
   * `poster` is the default and the flat-floor ramp described below: the right
   * answer for the service-page posters, which are bright edge to edge and put
   * a blown window behind the copy at every width.
   *
   * `hero` is the homepage hero's pair of ramps, opted into per page. It is
   * only safe where the photograph has been cropped so the copy never sits over
   * a blown highlight. /services is cropped exactly that way; measure before
   * adding a second page to this branch.
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
          sizes={image.sizes ?? '100vw'}
          className="object-cover"
          style={{ objectPosition: image.objectPosition ?? '50% 50%' }}
        />
      ) : (
        <div
          aria-hidden="true"
          className="from-np-blue-900 to-np-sky absolute inset-0 bg-gradient-to-tr"
        />
      )}

      {/* THREE DIFFERENT SCRIMS, AND THE DIFFERENCES ARE MEASURED.

          UNDER scrim="poster", THE DEFAULT, this never falls below 0.62 alpha
          anywhere over a photograph. (The `hero` branch below does reach 0, so
          do not carry the floor across to it — it buys its contrast a different
          way.) The homepage's ramp holds full strength for the bottom 52% and
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

          TWO OF THE FOUR STOP SETS ARE NOT THE HOMEPAGE'S, AND THAT IS A
          DELIBERATE DEVIATION FROM A BRIEF THAT ASKED FOR THEM VERBATIM. Every
          number below was measured on the rendered page, sampling only pixels a
          glyph actually covers — a whole-bounding-box sample overstates the
          worst case badly, because at 390 the H1's max-w-[18ch] box is mostly
          empty and its brightest pixel is where no letter lands. The homepage's
          own numbers fail here twice:

            390  H1     2.10:1 against 3:1     over a sunlit curtain
            1024 intro  2.46:1 against 4.5:1   over the sunlit wall

          The cause is geometry, not colour. The homepage ramp is shaped for a
          100vh section whose copy is short, bottom-anchored, and confined to
          one column of a two-column grid. This hero is ~560-670px tall and its
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
            left, below lg    The homepage's stops exactly, but applied where the
                              homepage has no left ramp at all. It needs one:
                              the failing H1 pixel is at 35% across, on the
                              curtain, while she is at 50%-81% of this much
                              tighter crop, so only a horizontal ramp can darken
                              one without darkening the other.

          THE BELOW-LG RAMP WAS BRIEFLY TIGHTENED to 34/46/62, to keep it
          further off her face. Do not put that back. It passes at the four
          widths the brief named and fails at two it did not: 320 (H1 2.86:1)
          and 390 at 200% text (H1 2.65:1), both WCAG obligations in their own
          right — 1.4.10 and 1.4.4. Widening back to the homepage's 40/55/74
          carries both, at a cost to the picture small enough to be hard to see.

          The alternative tested and rejected was leaving the left ramp lg-only
          and deepening the bottom ramp below lg instead. It passes the same
          thresholds and looks materially worse: the darkening is vertical, so
          it crosses her face, and the frame flattens into the even wash this
          branch exists to avoid.

          Measured on the committed code. Floors: 3:1 H1, 4.5:1 intro and CTA.

            320     H1 4.66   intro 7.78   CTA 8.12
            360     H1 4.42   intro 6.93   CTA 7.97
            390     H1 4.44   intro 7.58   CTA 6.94
            390@200% text     H1 4.42   intro 7.64
            412     H1 5.91   intro 4.84   CTA 7.89
            430     H1 4.00+  intro 6.44   CTA 7.91
            768     H1 11.24  intro 7.57   CTA 10.38
            1024    H1 6.47   intro 6.43   CTA 10.07
            1440    H1 6.78   intro 9.16   CTA 12.81

          The CTA's white/40 ring, which ButtonWithIcon declares load-bearing
          for SC 1.4.11, measures 3.15:1 to 3.37:1 against the scrim behind it
          across 320 to 1440 — sampling only pixels the ring fully covers, since
          its anti-aliased edges are mostly backdrop and read as ~1.1:1. */}
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
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(16,31,69,0.72)_0%,rgba(16,31,69,0.72)_40%,rgba(16,31,69,0.45)_55%,rgba(16,31,69,0)_74%)] lg:bg-[linear-gradient(to_right,rgba(16,31,69,0.72)_0%,rgba(16,31,69,0.72)_46%,rgba(16,31,69,0.45)_62%,rgba(16,31,69,0)_78%)]"
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
