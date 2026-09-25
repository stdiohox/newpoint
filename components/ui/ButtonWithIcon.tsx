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
 * The focus ring is np-blue-900 in both, for the reason documented above: on
 * this fill a white ring would vanish into the white resting ring.
 */
const variants = {
  sky: {
    root: 'bg-np-sky ring-1 ring-white',
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
    root: 'bg-np-blue-900/35 backdrop-blur-md ring-1 ring-white/40 hover:bg-np-blue-900/50',
    disc: 'bg-white/90 text-np-blue-900',
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
      className={`group focus-visible:outline-np-blue-900 relative flex w-fit cursor-pointer items-center overflow-hidden rounded-full p-1 text-sm font-medium text-white transition-all duration-500 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] motion-reduce:transition-none ${v.root} ${s.root}`}
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
