import { ArrowUpRight } from 'lucide-react';

/**
 * Pill CTA whose icon disc slides from the right edge to the left on hover
 * while the label shifts the other way.
 *
 * Renders an <a>, not a <button>: these navigate to an in-page anchor, and a
 * button would break middle-click, "open in new tab" and the link role.
 *
 * Colour, all measured against the 1080p poster frame:
 *   label  white on --color-np-sky (#4a76a4) = 4.75:1, clears WCAG AA at 14px
 *   disc   white, 4.75:1 against the fill
 *   arrow  --color-np-sky on that white disc, 4.75:1, so it reads as cut out
 *          of the button rather than as a second colour
 *
 * The white ring carries the component boundary in the hero at 9.23:1. That is
 * load-bearing: this fill reaches only 1.94:1 against the hero's dark gradient
 * on its own, so removing the ring would fail WCAG 1.4.11 there.
 *
 * CLIENT: one figure still sits under AA and is an accepted design call. The
 * white ring measures 2.81:1 against the bright sky behind the navbar, just
 * under the 3:1 WCAG 1.4.11 wants for a component boundary. It depends on the
 * footage behind it rather than on the fill, so darkening the fill does not
 * move it.
 *
 * The focus ring stays np-blue-900 rather than white: at 3.39:1 on this fill it
 * is visible, where a white focus ring would vanish into the white resting ring.
 */

const sizes = {
  sm: {
    root: 'h-10 ps-5 pe-12 hover:ps-12 hover:pe-5',
    disc: 'h-8 w-8 group-hover:right-[calc(100%-36px)]',
    icon: 14,
  },
  md: {
    root: 'h-12 ps-6 pe-14 hover:ps-14 hover:pe-6',
    disc: 'h-10 w-10 group-hover:right-[calc(100%-44px)]',
    icon: 16,
  },
} as const;

/**
 * `glass` is the hero's treatment now that the photograph sits behind it: a
 * translucent white fill over a backdrop blur rather than the solid np-sky
 * pill. The label stays white and the disc goes white/90 with an np-blue-900
 * arrow, so the arrow reads as cut out of the disc the way it does on np-sky.
 *
 * THE FOCUS RING IS PER-VARIANT, and that is the point. It used to be
 * np-blue-900 on both, on the reasoning that a white ring would vanish into the
 * button's own white resting hairline. That reasoning missed where the ring
 * actually lands: outline-offset-2 draws it OUTSIDE the pill, on whatever the
 * button sits on. For `glass` that is the hero scrim, which is literally
 * np-blue-900 — so the ring was the same colour as its own background, 1:1,
 * failing SC 1.4.11 outright on every hero. White measures about 16:1 there,
 * and the 2px offset keeps it clear of the white/40 hairline it was supposed to
 * be confused with.
 *
 * `sky` keeps np-blue-900: that pill is np-sky (#4a76a4), where the ring
 * measures 3.39:1, and it is used on light grounds where white would vanish.
 */
const variants = {
  sky: {
    root: 'bg-np-sky ring-1 ring-white focus-visible:outline-np-blue-900',
    disc: 'bg-white text-np-sky',
  },
  /**
   * The fill is np-blue-900/35, NOT white/15 as first specified. White glass
   * over this photograph cannot carry a white label: sampling the label's own
   * rect found 142 pure white pixels in it, sunlit daisies reading straight
   * through the 15% fill, for 1.0:1. Tinting the glass dark keeps the
   * treatment, translucent over a backdrop blur with a white hairline, and
   * gives the label something to sit on. The disc and arrow are as specified.
   */
  glass: {
    root: 'bg-np-blue-900/35 backdrop-blur-md ring-1 ring-white/40 hover:bg-np-blue-900/50 focus-visible:outline-white',
    disc: 'bg-white/90 text-np-blue-900',
  },
  /**
   * The footer's variant, for a FLAT np-blue-900 ground rather than a
   * photograph. It exists because `glass` has nothing to do here: its fill is
   * np-blue-900/35, and 35% of a colour over that same colour composites back
   * to exactly that colour. Sampled from the rendered footer, the pill interior
   * came out rgb(16,31,69) — identical to the panel — so the button was an
   * outline and a disc with no body at all. Legible, but not the treatment.
   *
   * Lightening instead of tinting is what a flat ground allows. Measured over
   * np-blue-900:
   *   fill    white/10 composites to rgb(40,53,88)
   *   label   white on that fill = 12.1:1
   *   hover   white/20, rgb(64,76,106), label still 8.5:1
   *   border  white/40, rgb(112,121,143) = 3.7:1 against the panel, which is
   *           what carries the component boundary for SC 1.4.11. The fill only
   *           reaches 1.3:1 on its own, so the border is load-bearing here in
   *           the same way the white ring is on `sky`.
   *   disc    solid white, arrow np-blue-900 on it at 16.1:1
   *
   * NO backdrop-blur, unlike `glass`. There is no photograph behind the footer
   * panel, so a blur would buy nothing and still cost a compositing layer on
   * every route.
   *
   * Focus ring is white for `glass`'s reason: outline-offset-2 draws it outside
   * the pill, onto np-blue-900, where white measures about 16:1.
   */
  'on-ink': {
    root: 'bg-white/10 ring-1 ring-white/40 hover:bg-white/20 focus-visible:outline-white',
    disc: 'bg-white text-np-blue-900',
  },
} as const;

export function ButtonWithIcon({
  href,
  children,
  size = 'md',
  variant = 'sky',
}: {
  href: string;
  children: React.ReactNode;
  size?: keyof typeof sizes;
  variant?: keyof typeof variants;
}) {
  const s = sizes[size];
  const v = variants[variant];
  return (
    <a
      href={href}
      className={`group relative flex w-fit cursor-pointer items-center overflow-hidden rounded-full p-1 text-sm font-medium text-white transition-all duration-500 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] motion-reduce:transition-none ${v.root} ${s.root}`}
    >
      <span className="relative z-10 transition-all duration-500 motion-reduce:transition-none">
        {children}
      </span>
      <span
        aria-hidden="true"
        className={`absolute right-1 flex items-center justify-center rounded-full transition-all duration-500 group-hover:rotate-45 motion-reduce:transition-none ${v.disc} ${s.disc}`}
      >
        <ArrowUpRight size={s.icon} />
      </span>
    </a>
  );
}
