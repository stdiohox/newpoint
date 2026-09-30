import { Container } from '@/components/ui/Container';
import { ButtonWithIcon } from '@/components/ui/ButtonWithIcon';
import { Reveal } from '@/components/ui/Reveal';
import { AmbientVideo, ServicesMediaProvider, ServicesPlayToggle } from './ServicesMedia';
import type { ServicePage } from '@/lib/content';

/**
 * "How it is delivered", as a wide two-column beat below the service body:
 * text on the left, the service's own looping video on the right with the copy
 * sitting on it.
 *
 * WHY IT EXISTS AND WHAT IT REPLACED. `modality` used to render as a small
 * card in the sticky sidebar. That put the one sentence on the page that says
 * where care actually happens in the narrowest column, above the fold, for a
 * reader who by then is three sections into the prose and has scrolled the
 * sidebar out of view. The sentence is now stated here instead, once. Do not
 * restore the sidebar card on top of this — two copies of one sentence on one
 * page is the failure mode this consolidates away from, not the fix for it.
 *
 * Server component apart from the video and its pause control, matching
 * FeaturedServices: the heading, the copy and the CTA are in the static HTML,
 * which is what the SEO brief requires of indexable content.
 *
 * THE PAUSE CONTROL SITS IN THE LEFT COLUMN, ON THE LIGHT GROUND. It is the
 * FeaturedServices toggle — a white pill with a #8a8a8a border, measured at
 * 3.54:1 for SC 1.4.11 against white. Those numbers hold on the page
 * background and would not over the video, so it stays off the panel. WCAG
 * 2.2.2 wants a mechanism, not a mechanism in a particular corner.
 */
export function ServiceDelivery({
  delivery,
  modality,
  media,
}: {
  delivery: ServicePage['delivery'];
  modality: string;
  media: { video: string; poster: string };
}) {
  return (
    <section className="pb-20 md:pb-28">
      <Container>
        <ServicesMediaProvider>
          {/* items-center from md, where the source layout this came from uses
              items-start. That layout's left column is three stacked blocks
              against a 720px panel; ours is an eyebrow, one line of heading
              and one sentence, so top-aligning left a column of copy against
              half a metre of empty page. Centred, the two columns read as one
              object. Below md they stack and the alignment is moot. */}
          <div className="grid gap-8 md:grid-cols-2 md:items-center md:gap-10">
            <Reveal>
              <div className="md:pt-2 md:pr-12">
                <p className="text-caption text-np-neutral-600 tracking-[0.08em] uppercase">
                  How it is delivered
                </p>
                {/* h2 because this is a top-level section of the page, level
                    with the body's section headings. text-display-l, not
                    text-h2: the whole point of the treatment is the size step
                    against the prose above it, and the token already carries
                    the tight tracking (-0.025em) that step needs. */}
                <h2 className="text-display-l text-np-ink mt-3">{delivery.heading}</h2>
                <p className="text-body-l text-np-neutral-600 mt-5 max-w-[34ch]">{modality}</p>
                <div className="mt-8">
                  <ServicesPlayToggle />
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              {/* rounded-media (20px) rather than a raw radius: it is the
                  token every other media panel on the site uses, and a
                  one-off 24px here would read as a near-miss rather than as a
                  choice. min-h is in the region of a 4:5 panel at this column
                  width and is what gives the copy somewhere to sit without
                  the video being a strip. */}
              <div className="rounded-media relative min-h-[520px] overflow-hidden md:min-h-[600px]">
                <AmbientVideo video={media.video} poster={media.poster} />

                {/* THE SCRIM IS NOT OPTIONAL HERE, and the source this layout
                    came from says to omit it. That source put near-black text
                    on bright, flat, commissioned motion graphics. These are
                    clinical interiors with windows in them, and the copy is
                    white, so there is nothing to omit the scrim against.
                    Measured the same way as PageHero's: sampling the worst
                    pixel these posters contain, a blown window at about
                    rgb(240,243,247).

                    THE FLOOR IS 0.62, AND IT IS PageHero's NUMBER, not a new
                    one — it is the alpha that puts white at 4.99:1 over that
                    worst pixel, clearing WCAG AA for the 13px caption as well
                    as the body copy. It holds flat across the top 65%, which
                    is the whole copy block including the CTA, then falls to
                    0.20 rather than to zero: a ramp that ends leaves an edge
                    where bare footage starts, which is the seam PageHero's
                    own note is about.

                    THE FALL IS SMOOTHSTEP, 3t^2-2t^3, at 17 stops. Zero slope
                    at both ends, so it leaves the plateau and arrives at 0.20
                    with no change in rate for the eye to catch as a band. 17,
                    not 9: over a 35% run the coarser sampling put the largest
                    slope change between neighbours at 0.0069 alpha per 1% of
                    height, above the 0.004 PageHero holds itself to. At 17 it
                    is 0.0037. DO NOT HAND-EDIT THESE STOPS — regenerate them
                    from the curve or the smoothness that justifies them is
                    gone. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(16,31,69,0.62)_0%,rgba(16,31,69,0.62)_65%,rgba(16,31,69,0.615)_67.188%,rgba(16,31,69,0.602)_69.375%,rgba(16,31,69,0.581)_71.563%,rgba(16,31,69,0.554)_73.75%,rgba(16,31,69,0.523)_75.938%,rgba(16,31,69,0.487)_78.125%,rgba(16,31,69,0.449)_80.313%,rgba(16,31,69,0.41)_82.5%,rgba(16,31,69,0.371)_84.688%,rgba(16,31,69,0.333)_86.875%,rgba(16,31,69,0.297)_89.063%,rgba(16,31,69,0.266)_91.25%,rgba(16,31,69,0.239)_93.438%,rgba(16,31,69,0.218)_95.625%,rgba(16,31,69,0.205)_97.813%,rgba(16,31,69,0.2)_100%)]"
                />

                <div className="relative z-10 p-8 sm:p-10 md:p-12">
                  {/* h3 under the h2 above, so the outline does not skip. */}
                  <h3 className="text-h2 text-white">{delivery.card.heading}</h3>
                  <p className="text-body-l mt-4 max-w-[38ch] text-white/90">
                    {delivery.card.body}
                  </p>
                  <div className="mt-8">
                    {/* `glass` is the variant built for exactly this ground: a
                        translucent np-blue-900 fill over a backdrop blur,
                        whose white/40 ring is declared load-bearing for SC
                        1.4.11 and measures 3.15:1 to 3.37:1 against a scrim of
                        this weight. The `sky` default would be an untested
                        solid pill on footage. */}
                    <ButtonWithIcon href={delivery.card.cta.href} variant="glass">
                      {delivery.card.cta.label}
                    </ButtonWithIcon>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </ServicesMediaProvider>
      </Container>
    </section>
  );
}
