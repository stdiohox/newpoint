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
  copyMaxWidth,
  copyAlign = 'left',
  align = 'bottom',
  showCta = true,
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
    /**
     * Alt text. Omitted, the photograph renders decorative with `alt=""`,
     * which is what the H1 beside it makes correct for a page hero. Supply one
     * only where the picture is meant to be described as well as seen.
     */
    alt?: string;
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
    /**
     * Passed straight to next/image. Omitted, the optimiser uses its default of
     * 75, which on /services meant a q75 re-encode of an already-lossy q90
     * webp master: two generations of loss for a hero that is the LCP element.
     * The homepage sets 88 for the same reason.
     */
    quality?: number;
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
   *
   * `home` IS THE HOMEPAGE'S OVERLAY VERBATIM — the two gradient layers from
   * components/sections/Hero.tsx, copied stop for stop with nothing added and
   * nothing retuned. Requested for /services/medication-management so that hero
   * matches the homepage exactly.
   *
   * `edge` IS ONE GRADIENT AND NOTHING ELSE: a single left-to-right ramp,
   * darkest at the left edge where left-aligned copy sits, easing to a floor on
   * the right so the photograph still reads as a photograph. It exists for the
   * provider pages, where the four-layer `hero` scrim put a visible vertical
   * seam near the middle of the frame — four overlapping shapes, each smooth on
   * its own, whose combined alpha is not monotonic across the width. One ramp
   * cannot do that.
   *
   * Its stops are smoothstep-sampled, 3t^2 - 2t^3 at nine points, for the
   * reason the `hero` note gives: zero slope at both ends, so the eye has no
   * change in RATE to catch. DO NOT HAND-EDIT THEM — regenerate from the curve.
   *
   * READ THE LONG NOTE ON THE SCRIM LAYERS BELOW BEFORE REUSING IT. Those exact
   * ramps were already carried in this component once and were replaced,
   * because they are shaped for a 100vh section whose copy is short and
   * bottom-left, and this header is ~560-670px with copy that fills it. The
   * measured failures are recorded there. This branch exists because it was
   * asked for on one page; it is not a safe default, and any page added to it
   * needs its own glyph-level measurement first.
   */
  scrim?: 'poster' | 'hero' | 'home' | 'edge';
  /**
   * Hard caps on the copy's measure, in any CSS length. Omitted, the h1 keeps
   * `max-w-[18ch]` and the intro `max-w-[56ch]`, which is what the other five
   * callers get.
   *
   * It exists for the photographic case: a ch-based measure is set by the type
   * size, and knows nothing about where the subject of the photograph behind it
   * is standing. On /services the 56ch intro ran far enough right to close on
   * her shoulder at 1440. These are applied as inline styles rather than
   * classes because the values are per-page and arbitrary, and Tailwind's
   * scanner only sees class strings it can read literally in the source.
   */
  copyMaxWidth?: { title?: string; intro?: string };
  /**
   * Horizontal alignment of the copy column. `left` is the default and what the
   * other five callers get.
   *
   * `center` IS lg AND UP ONLY, and the breakpoint is doing real work rather
   * than hedging.
   *
   * Below lg the crop is tight enough that the subject fills almost the whole
   * frame: at 390 the visible window is 35% of the source width and she spans
   * 19% to 98% of it. A centred heading lands across her face, where the
   * left-aligned one sat clear of it. The intro is also eight lines at that
   * width, and centring eight lines gives every line a different starting x,
   * which is worse to read whatever is behind it. Centring earns its keep on a
   * short heading in a wide frame and costs on a tall mobile paragraph.
   *
   * It is not just text-align either. The scrim switches with it, because the
   * `hero` scrim's shape is built around where the copy sits: the left ramp
   * stays below lg where the copy is left-aligned, and is dropped at lg where
   * it would darken the empty margin and leave the text on the bright middle.
   */
  copyAlign?: 'left' | 'center';
  /**
   * Where the copy sits in the hero. `bottom` is the default and what the other
   * five callers get: a single column anchored to the foot of the frame, which
   * is what the scrim's bottom ramp is shaped around.
   *
   * `center` puts it in the middle of the area BELOW THE NAV, not the middle of
   * the header. The header pulls itself up by --nav-h so the photograph runs
   * behind the sticky bar, so its own centre is about 54px higher than the
   * centre of what a reader can actually see. Centring on the header would
   * tuck the heading under the pill, which is the complaint this fixes.
   *
   * The padding is asymmetric for that reason: `--nav-h + 4rem` on top against
   * `4rem` underneath. A centring box of [nav-h + X, height - X] has its centre
   * at (height + nav-h) / 2, which is exactly the centre of [nav-h, height] —
   * so the block is genuinely centred below the nav while the extra top padding
   * still guarantees clearance when the copy grows tall enough to fill.
   */
  align?: 'bottom' | 'center';
  /**
   * Whether the hero carries the appointment button.
   *
   * Defaults to true, so the routes that do not pass it are untouched. The
   * callers that pass false are the three service pages (through
   * `hideHeroCta`), both provider pages, /providers, /faq, /contact and
   * /insurance: the client asked for that button to come off each of them
   * in turn, starting with /services/psychiatric-evaluation on 2026-09-30.
   *
   * THE PAGE STILL HAS AN APPOINTMENT ROUTE, which is what makes this safe to
   * honour rather than a conversion path quietly deleted. Three remain: the
   * navbar button, which is sticky and therefore reachable from anywhere on the
   * page; PageCta's "Request an appointment" and its phone button; and the
   * footer's. What goes is the above-the-fold one, not the ability to book.
   */
  showCta?: boolean;
}) {
  const centred = copyAlign === 'center';

  return (
    /* No `on-ink` here, unlike Footer, PageCta and Providers. That class only
       swaps the focus-ring colour, it was carried solely for the breadcrumb
       links, and the CTA — the only focusable thing left in this header when it
       renders at all — fixes its own ring inside ButtonWithIcon with a utility
       that beats the base layer `on-ink` lives in anyway. With `showCta` false
       the header has nothing focusable in it, so there is still nothing here
       for `on-ink` to do. */
    <header className="bg-np-blue-900 relative -mt-[var(--nav-h)] flex min-h-[50dvh] flex-col text-white md:min-h-[60vh]">
      {image ? (
        <Image
          src={image.src}
          /* DECORATIVE BY DEFAULT, DESCRIBED ONLY IF A CALLER ASKS.
             The H1 beside it already names the page, so an empty alt is the
             right answer for the five callers that pass none and they are
             unchanged. A caller that supplies one gets it. */
          alt={image.alt ?? ''}
          fill
          priority
          /* priority preloads it; fetchPriority tells the browser it is the
             LCP element rather than leaving it to infer that after layout.
             It is competing with four font preloads and a blocking
             cross-origin stylesheet, so being explicit is worth the attribute. */
          fetchPriority="high"
          sizes={image.sizes ?? '100vw'}
          quality={image.quality}
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

          A THIRD CASE, scrim="hero", IS A TINTED PHOTOGRAPH RATHER THAN A
          SCRIMMED ONE, and it is three layers, not two. It is an opt-in and not
          the default for photographs, for the reason the floor exists above —
          over the posters a scrim that goes near-transparent anywhere lands on
          a blown window.

          IT REPLACES A PAIR OF PLATEAU-AND-FADE RAMPS COPIED FROM THE HOMEPAGE,
          WHICH CUT THE FRAME IN HALF. Each was a plateau running into a linear
          fade, and a linear fade has a slope discontinuity at both ends: the eye
          reads a sudden change in RATE as an edge, even though the alpha itself
          is continuous. On this photograph the left ramp's discontinuity landed
          near the middle of the frame, which is where the wall is brightest and
          flattest — the worst place to put one, and why it read as a hard
          vertical seam rather than as light.

          THE SHAPE THAT FIXES IT IS SMOOTHSTEP, 3t^2 - 2t^3, sampled at nine
          stops. Its defining property is zero slope at BOTH ends, so it leaves
          its start value and arrives at its end value with no change in rate to
          catch. Between stops the browser interpolates linearly, so the curve
          is really nine short segments; the largest slope change between
          neighbours is 0.004 alpha per 1% of width, well below where a Mach
          band becomes visible. DO NOT HAND-EDIT THESE NUMBERS — regenerate them
          from the curve, or the smoothness that justifies them is gone.

          The four layers, all np-blue-900, in declaration order:
            tint    a flat 0.10 over the whole frame. This is what makes the two
                    halves read as one exposure: without it the right side is
                    untouched photograph, and no amount of easing on the left
                    can match an untinted right.
            bottom  0.62 easing to 0 by 92% of the height; 0.55 to 0 by 70% at
                    lg. Still two shapes, because below lg the copy fills the
                    frame and at lg it sits in the bottom third.
            left    0.70 at the far edge, easing to 0.15 by 75% of the width and
                    holding 0.15 to the right edge. It never reaches zero, so
                    there is no point across the width where the gradient stops
                    and bare photograph starts.
            radial  0.48 behind the copy block only, flat across its inner half
                    and easing out. This is the layer that carries the text; the
                    three above are the picture. See its own note below.

          ORDER DOES NOT MATTER, and these are not stacked in any meaningful
          sense. All four are the same colour, and compositing a colour over
          itself commutes: the result is that colour at 1-Pi(1-ai) whatever the
          sequence. They are separate elements only for legibility.

          WHAT THE OLD RAMPS WERE SOLVING still has to hold, and it is why the
          left layer is wide rather than polite. Measured on the rendered page,
          sampling only pixels a glyph actually covers — a whole-bounding-box
          sample overstates the worst case badly, because at 390 the H1's
          max-w-[18ch] box is mostly empty and its brightest pixel is where no
          letter lands. The homepage's own stops failed here twice:

            390  H1     2.10:1 against 3:1     over a sunlit curtain
            1024 intro  2.46:1 against 4.5:1   over the sunlit wall

          The cause is geometry, not colour. The homepage ramp is shaped for a
          100vh section whose copy is short, bottom-anchored, and confined to
          one column of a two-column grid. This hero is ~560-670px tall and its
          copy fills it: at 390 the H1 sits 73% of the way UP the frame, well
          into the bottom ramp's transparent zone, and at lg the 56ch intro runs
          to 59% across, past the point where the left ramp has faded out.

          A ramp that stops before the copy does fails, however smooth it is.
          The left layer therefore still holds 0.15 at the right-hand edge and
          the bottom layer still reaches 92% of the height below lg, and neither
          number is decoration.

          THE LEFT LAYER WAS BRIEFLY NARROWED in an earlier revision, to keep it
          off her face. Do not narrow it again without re-measuring 320 and 390
          at 200% text: those are the two shapes where the copy block is tallest
          relative to the frame, they are WCAG 1.4.10 and 1.4.4 obligations in
          their own right, and they failed at 2.86:1 and 2.65:1 when it was.

          Measured contrast lives in app/services/page.tsx, beside the crop it
          depends on, because the two are only meaningful together.

          The CTA's white/40 ring, which ButtonWithIcon declares load-bearing
          for SC 1.4.11, measures 3.15:1 to 3.37:1 against the scrim behind it
          across 320 to 1440 — sampling only pixels the ring fully covers, since
          its anti-aliased edges are mostly backdrop and read as ~1.1:1. */}
      {/* LAYER 1 of the `hero` scrim: the flat tint. Nothing else in this
          component has one, which is why the other two branches are unchanged
          plateau-and-fade ramps and look it. */}
      {image && scrim === 'hero' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[rgba(16,31,69,0.1)]"
        />
      )}

      {/* THE `home` SCRIM: components/sections/Hero.tsx's overlay, verbatim.
          Two layers, which is all the homepage has — no flat tint and no
          radial, so the `hero` branch's layers 1, 3 and 4 stay switched off and
          layer 2 below is skipped for this branch rather than added to.

          BOTH className STRINGS ARE COPIED CHARACTER FOR CHARACTER from
          Hero.tsx, as are aria-hidden and pointer-events-none. No stop, colour,
          position or breakpoint has been changed, and nothing has been added.
          If the homepage overlay is ever retuned, these are a copy and will not
          follow it — update both or neither.

          WHAT THE SECOND LAYER ASSUMES. The left ramp is `hidden lg:block`, and
          on the homepage it exists because at lg that layout turns two-column
          and the copy moves bottom-LEFT. This header centres its copy at lg
          (copyAlign="center"), so from lg up the heaviest alpha sits on the
          empty left margin and the lightest sits under the text. That is a
          property of the copy, not of this overlay, and it is left exactly as
          asked rather than adapted. The measured consequence is recorded in
          app/services/[slug]/page.tsx beside the scrim choice. */}
      {image && scrim === 'home' && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(16,31,69,0.78)_0%,rgba(16,31,69,0.78)_52%,rgba(16,31,69,0.45)_64%,rgba(16,31,69,0)_80%)] lg:bg-[linear-gradient(to_top,rgba(16,31,69,0.72)_0%,rgba(16,31,69,0.72)_18%,rgba(16,31,69,0)_42%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden lg:block lg:bg-[linear-gradient(to_right,rgba(16,31,69,0.72)_0%,rgba(16,31,69,0.72)_40%,rgba(16,31,69,0.45)_55%,rgba(16,31,69,0)_74%)]"
          />
        </>
      )}

      {/* THE `edge` SCRIM: one left-to-right gradient over the full-bleed
          image, and the only layer this branch draws.

          Two shapes, because the copy's width changes. From lg the text sits in
          roughly the left half, so the ramp holds 0.80 to 46% and eases to a
          0.18 floor — enough to carry white text on the left while the right of
          the frame keeps its light. Below lg the copy fills the width, so the
          ramp holds 0.84 to 40% and only eases to 0.66; a desktop-shaped ramp
          would leave the end of every wrapped line on bare photograph.

          THAT 0.66 FLOOR IS MEASURED, NOT CHOSEN. At 0.46 the intro on
          Ofoegbu's frame came out at 3.27:1 against a 4.5:1 floor — her room is
          bright to the right edge and at 390 the wrapped lines run into it.
          0.66 puts the worst glyph on that page at 5.0:1. The two frames differ
          enough that the shallower ramp passed on one and failed on the other,
          which is the whole reason this is a measured value.

          The floor is deliberately not zero at either width. A ramp that
          reaches full transparency has an end, and an end is the seam this
          replaces. */}
      {image && scrim === 'edge' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(16,31,69,0.84)_0%,rgba(16,31,69,0.84)_40%,rgba(16,31,69,0.832)_47.5%,rgba(16,31,69,0.812)_55%,rgba(16,31,69,0.783)_62.5%,rgba(16,31,69,0.75)_70%,rgba(16,31,69,0.717)_77.5%,rgba(16,31,69,0.688)_85%,rgba(16,31,69,0.668)_92.5%,rgba(16,31,69,0.66)_100%)] lg:bg-[linear-gradient(to_right,rgba(16,31,69,0.8)_0%,rgba(16,31,69,0.8)_46%,rgba(16,31,69,0.773)_52.25%,rgba(16,31,69,0.703)_58.5%,rgba(16,31,69,0.604)_64.75%,rgba(16,31,69,0.49)_71%,rgba(16,31,69,0.376)_77.25%,rgba(16,31,69,0.277)_83.5%,rgba(16,31,69,0.207)_89.75%,rgba(16,31,69,0.18)_96%)]"
        />
      )}

      {/* LAYER 2: the bottom gradient. The `hero` branch is the smoothstep
          curve; the other two are the original ramps and are untouched.
          Skipped entirely under `home`, which brings its own pair above. */}
      {scrim !== 'home' && scrim !== 'edge' && (
      <div
        aria-hidden="true"
        className={
          image
            ? scrim === 'hero'
              ? 'pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(16,31,69,0.62)_0%,rgba(16,31,69,0.593)_11.5%,rgba(16,31,69,0.523)_23%,rgba(16,31,69,0.424)_34.5%,rgba(16,31,69,0.31)_46%,rgba(16,31,69,0.196)_57.5%,rgba(16,31,69,0.097)_69%,rgba(16,31,69,0.027)_80.5%,rgba(16,31,69,0)_92%)] lg:bg-[linear-gradient(to_top,rgba(16,31,69,0.55)_0%,rgba(16,31,69,0.526)_8.75%,rgba(16,31,69,0.464)_17.5%,rgba(16,31,69,0.376)_26.25%,rgba(16,31,69,0.275)_35%,rgba(16,31,69,0.174)_43.75%,rgba(16,31,69,0.086)_52.5%,rgba(16,31,69,0.024)_61.25%,rgba(16,31,69,0)_70%)]'
              : 'pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(16,31,69,0.85)_0%,rgba(16,31,69,0.66)_60%,rgba(16,31,69,0.62)_100%)]'
            : 'pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(16,31,69,0.78)_0%,rgba(16,31,69,0.78)_52%,rgba(16,31,69,0.45)_64%,rgba(16,31,69,0)_80%)]'
        }
      />
      )}

      {/* LAYER 3: the left gradient, one curve at every width. The final stop
          repeats 0.15 at 100% deliberately — that flat tail is what stops the
          gradient having an end, and it meets the curve where the curve's own
          slope is already zero, so the join is invisible.

          LEFT-ALIGNED COPY ONLY. Under a centred block this layer works against
          the composition: it puts its heaviest alpha on the empty left margin
          and its lightest on the middle, which is exactly where the text now
          is. The flat tint on layer 1 still guarantees the frame is never fully
          transparent anywhere, which is the property this layer was originally
          added to protect, so dropping it here costs nothing. */}
      {image && scrim === 'hero' && (
        <div
          aria-hidden="true"
          /* THE SPACE AFTER THE TERNARY IS OUTSIDE THE STRING ON PURPOSE, and
             it has to stay there.

             This read `${centred ? 'lg:hidden' : ''}bg-[...]`, with no
             separator, so on a centred hero the emitted class was the single
             token `lg:hiddenbg-[linear-gradient(...)]`. Tailwind generated
             neither utility: verified in the built output as two occurrences
             in the HTML and zero matches in the CSS bundle. The left ramp was
             therefore absent at every width on every centred hero, including
             this page and /services, and the contrast figures in the comment
             below assume it is present.

             Putting the space INSIDE the ternary does not survive: this repo
             runs prettier-plugin-tailwindcss, which treats the string as a
             class list and trims the trailing space, which is almost certainly
             how the bug arrived in the first place. Outside the braces it is
             literal template text and the plugin leaves it alone. */
          className={`pointer-events-none absolute inset-0 ${centred ? 'lg:hidden' : ''} bg-[linear-gradient(to_right,rgba(16,31,69,0.7)_0%,rgba(16,31,69,0.676)_9.38%,rgba(16,31,69,0.614)_18.75%,rgba(16,31,69,0.526)_28.13%,rgba(16,31,69,0.425)_37.5%,rgba(16,31,69,0.324)_46.88%,rgba(16,31,69,0.236)_56.25%,rgba(16,31,69,0.174)_65.63%,rgba(16,31,69,0.15)_75%,rgba(16,31,69,0.15)_100%)]`}
        />
      )}

      {/* LAYER 4: a soft radial behind the copy, and ONLY behind the copy.
          The three layers above are what make the frame read as one tinted
          photograph, and they are deliberately too light to carry 18px white
          text — measured on them alone the intro fell to 2.4:1 to 3.6:1
          against a 4.5:1 floor at every width. The fix belongs behind the text,
          not on the left half: widening or deepening the left layer to close
          that gap is what produced the seam this revision removes.

          IT HAS A FLAT CORE, and that is the whole trick. The worst pixel is
          never at the centre of the text block — it is at the END of the
          intro's longest line, at the block's edge. A conventional peaked
          radial delivers only about half its peak there, so reaching 4.5:1 at
          the edge needs a centre so dark it reads as a spotlight. Holding 0.48
          flat across the inner half of the ellipse, then easing out, puts full
          strength on every glyph and spends the falloff on empty frame. The
          plateau meets smoothstep where smoothstep's slope is zero, so the core
          boundary is C1-continuous and there is no ring.

          Two geometries, because the block's shape changes. At lg it is a
          bottom-left column reaching about 60% across, so the ellipse is 62% x
          70% at 28% 56%. Below lg the copy fills the frame — the intro wraps to
          eight lines and runs to 95% across — so it widens to 95% x 72% at
          46% 58%, which is most of the frame by then because most of the frame
          is text. */}
      {image && scrim === 'hero' && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ${
            copyAlign === 'center'
              ? 'bg-[radial-gradient(ellipse_95%_72%_at_46%_58%,rgba(16,31,69,0.54)_0%,rgba(16,31,69,0.54)_50%,rgba(16,31,69,0.51)_57.1%,rgba(16,31,69,0.433)_64.3%,rgba(16,31,69,0.327)_71.4%,rgba(16,31,69,0.213)_78.6%,rgba(16,31,69,0.107)_85.7%,rgba(16,31,69,0.03)_92.9%,rgba(16,31,69,0)_100.0%)] lg:bg-[radial-gradient(ellipse_58%_64%_at_50%_58%,rgba(16,31,69,0.58)_0%,rgba(16,31,69,0.58)_50.0%,rgba(16,31,69,0.548)_57.1%,rgba(16,31,69,0.465)_64.3%,rgba(16,31,69,0.352)_71.4%,rgba(16,31,69,0.228)_78.6%,rgba(16,31,69,0.115)_85.7%,rgba(16,31,69,0.032)_92.9%,rgba(16,31,69,0)_100.0%)]'
              : 'bg-[radial-gradient(ellipse_95%_72%_at_46%_58%,rgba(16,31,69,0.48)_0%,rgba(16,31,69,0.48)_50%,rgba(16,31,69,0.453)_57.1%,rgba(16,31,69,0.385)_64.3%,rgba(16,31,69,0.291)_71.4%,rgba(16,31,69,0.189)_78.6%,rgba(16,31,69,0.095)_85.7%,rgba(16,31,69,0.027)_92.9%,rgba(16,31,69,0)_100%)] lg:bg-[radial-gradient(ellipse_62%_70%_at_28%_56%,rgba(16,31,69,0.48)_0%,rgba(16,31,69,0.48)_50%,rgba(16,31,69,0.453)_57.1%,rgba(16,31,69,0.385)_64.3%,rgba(16,31,69,0.291)_71.4%,rgba(16,31,69,0.189)_78.6%,rgba(16,31,69,0.095)_85.7%,rgba(16,31,69,0.027)_92.9%,rgba(16,31,69,0)_100%)]'
          }`}
        />
      )}

      {/* pt clears the sticky navbar the section has just pulled itself under.
          Deliberately NOT wrapped in <Reveal />: this is above the fold at
          load, so there is nothing to reveal, and it keeps the LCP element off
          the JavaScript critical path. */}
      <div
        className={
          align === 'center'
            ? 'relative flex flex-1 flex-col justify-center pt-[calc(var(--nav-h)+4rem)] pb-16'
            : 'relative flex flex-1 flex-col justify-end pt-[calc(var(--nav-h)+3rem)] pb-12 md:pb-16'
        }
      >
        <Container>
          {/* `mx-auto` on each block, not just text-center on the wrapper.
              These carry max-widths, so centring the text inside a box that is
              still pinned to the left edge would centre the words within a
              column sitting off to one side, which looks like a mistake rather
              than a centred composition. */}
          <div className={centred ? 'lg:text-center' : undefined}>
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
                centred ? 'lg:mx-auto' : ''
              } ${eyebrow ? 'mt-4' : ''}`}
              style={{ maxWidth: copyMaxWidth?.title }}
            >
              {title}
            </h1>

            <p
              className={`text-body-l mt-5 max-w-[56ch] text-white/90 ${centred ? 'lg:mx-auto' : ''}`}
              style={{ maxWidth: copyMaxWidth?.intro }}
            >
              {intro}
            </p>

            {showCta && (
              <div className={`mt-8 ${centred ? 'lg:flex lg:justify-center' : ''}`}>
                <ButtonWithIcon href={CTA.href} variant="glass">
                  {CTA.label}
                </ButtonWithIcon>
              </div>
            )}
          </div>
        </Container>
      </div>
    </header>
  );
}
