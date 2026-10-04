'use client';

import Image from 'next/image';
import { ReactNode, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useHydrated } from '@/lib/useHydrated';

/**
 * The two moving parts of the parallax footer, and nothing else.
 *
 * ISOLATED CLIENT LEAVES. `useScroll` needs the browser, so this file carries
 * 'use client' — and only this file. Footer.tsx stays a server component and
 * passes the copy in, which is the boundary rule lib/nav.ts's header sets out
 * and the one frontend-patterns asks for: static layout on the server,
 * interactivity in a leaf.
 *
 * MOTION VALUES, NOT STATE. The parallax reads scroll through `useScroll` and
 * maps it with `useTransform`, so the translate is written straight to the
 * style without a React render per frame. A `useState` tracking scroll would
 * re-render this subtree on every scroll event and drop frames on a phone.
 */

/**
 * Where the band comes to rest, in pixels, once the footer is fully on screen.
 *
 * THE INPUT RANGE STOPS AT 0.5, NOT 1, AND THAT IS NOT A ROUNDING CHOICE. This
 * footer is the last element on the page, so `scrollYProgress` — which runs
 * from "the top edge enters the viewport" to "the bottom edge leaves it" —
 * cannot pass about 0.5: the page stops scrolling while the footer still fills
 * the screen. Mapping [0, 1] meant the back half of the curve was unreachable
 * and the band never arrived anywhere; it stopped wherever the page ran out.
 * Caught by react-reviewer. The travel is the same 200px as before, spent
 * entirely in the half of the range a visitor can actually reach.
 */
const REST_Y = 50;

/**
 * The flower band: a cut-out that drifts against the photograph behind it.
 *
 * THE LAYER IS ANCHORED BELOW THE EDGE SO NO GAP CAN OPEN. Moving the band UP
 * is the only thing that would expose the photograph under it, and
 * `-bottom-16` (64px) is more than the 50px of upward travel, so the frame's
 * bottom edge is covered at every scroll position.
 *
 * `offset: ['start end', 'end start']` measures the footer from the moment its
 * top enters the viewport to the moment its bottom leaves. On a last-element
 * footer the second half of that never happens — see REST_Y above.
 *
 * REDUCED MOTION GETS THE PICTURE, NOT THE MOVEMENT. `useReducedMotion()`
 * returns a real boolean only on the client, so the parallax is gated on
 * `hydrated` too — reading it earlier would make the first client render
 * disagree with the server HTML. Until then, and for anyone who asked for less
 * movement, the band renders in its resting position with no transform.
 */
export function FooterFlowers({ src, width, height }: { src: string; width: number; height: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const hydrated = useHydrated();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 0.5], [-50, REST_Y]);

  const animate = hydrated && !reduce;

  return (
    /* The measuring element is the full-height wrapper; the band inside it is
       what moves. pointer-events-none on both: this is scenery, and a 1500px
       transparent PNG over the card would otherwise eat clicks on the links. */
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
      {/* THE BAND IS GIVEN A HEIGHT, NOT LEFT AT ITS NATURAL ONE, and that is
          what keeps it off the card. At its own aspect ratio a 2752x1536 strip
          drawn full-bleed is 804px tall at 1440 — anchored to the bottom of a
          900px scene it starts 160px down and covers the entire card. A
          fraction of the scene height with object-cover and object-bottom
          keeps the flower heads and crops the stems, which is the half of the
          picture that can be lost without anyone noticing: the band is a
          repeating meadow and its bottom is foliage. The sides crop for the
          same reason.

          A FIXED HEIGHT, NOT A FRACTION OF THE SCENE, and the geometry is
          worth writing out. The card is in flow, so the section grows with it;
          a percentage band would grow too, its top tracking the card down the
          page and never clearing it. Anchored at -bottom-16 the band's top
          sits at sectionHeight + 64 - bandHeight, while the card's last line
          sits at sectionHeight minus the wrapper's bottom padding. A fixed
          band under a bottom padding larger than it is the only pair that
          clears at every card height, text size and viewport.

          38vw IS THE BAND'S OWN ASPECT RATIO, so object-cover crops nothing at
          desktop widths. The asset is pre-cropped to the flowers: the keyed
          frame was 2752x1536 with the first flower pixel 507 rows down, i.e. a
          third of it transparent sky, and the file shipped here is the 1036
          rows below that. 1036/2752 = 0.376, hence 38vw.

          BOTH NUMBERS MATTER TOGETHER. A box shorter than the band's ratio
          crops into the flower heads and the crop edge reads as a hard
          horizontal rule across the picture — which is exactly what a fixed
          360px box did before this. A taller one pulls empty transparency into
          the layout and pushes the card up for nothing.

          The 280px floor is for phones, where 37vw is only ~145px: there the
          band scales up and crops its sides instead, which a repeating meadow
          survives. */}
      <motion.div
        className="absolute inset-x-0 -bottom-16 h-[max(280px,38vw)]"
        /* NOT `undefined` WHEN THE PARALLAX IS OFF. A reader with reduced
           motion, or one with no JavaScript, should see the composition the
           animated one comes to rest in — not one 50px higher. It also means
           that if the OS preference flips mid-session the band snaps to the
           resting offset instead of keeping whatever transform it had. */
        style={{ y: animate ? y : REST_Y }}
      >
        <Image
          src={src}
          alt=""
          width={width}
          height={height}
          /* Below the fold on every route by definition — it is the footer. */
          loading="lazy"
          quality={88}
          /* Full-bleed at every width, and the band is drawn wider than the
             viewport once it is scaled by height, so the srcset is sized for
             the widest case rather than for the box. */
          sizes="100vw"
          className="h-full w-full object-cover object-bottom select-none"
        />
      </motion.div>
    </div>
  );
}

/**
 * The card's entrance: a fade with a short drop.
 *
 * ease-out, NOT ease-in-out, and the curve is explicit. improve-animations'
 * catalogue puts entrances on a strong ease-out — cubic-bezier(0.23, 1, 0.32,
 * 1) — because an entrance that starts slow delays the exact frame the reader
 * is watching. 500ms rather than the sub-300ms UI budget: this is a marketing
 * surface entering once on scroll, not a control responding to a click.
 *
 * THE HIDDEN STATE IS NOT IN THE SERVER HTML. Until this hydrates it renders a
 * plain div carrying data-enter="down", and the start state comes from the
 * .js-gated, no-preference-gated block in app/globals.css. No JavaScript, or
 * reduced motion, and the card is simply there — which is the only acceptable
 * failure mode for the element holding the crisis numbers. See
 * lib/useHydrated.ts for the full argument; components/ui/Reveal.tsx is the
 * same pattern, and this exists beside it only because Reveal enters upward.
 */
export function FooterCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <div data-enter="down" className={className}>
        {children}
      </div>
    );
  }

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      data-enter="down"
      className={className}
      initial={{ opacity: 0, y: -10 }}
      whileInView={{ opacity: 1, y: 0 }}
      /* `amount: 'some'` because this card is most of a viewport tall at 390:
         a threshold the element cannot physically meet never fires, and the
         card would stay at opacity 0 for good. Reveal.tsx carries the
         measurement behind that. */
      viewport={{ once: true, amount: 'some' }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}
