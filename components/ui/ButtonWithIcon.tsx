import { ArrowUpRight } from 'lucide-react';

/**
 * Pill CTA whose icon disc slides from the right edge to the left on hover
 * while the label shifts the other way.
 *
 * Renders an <a>, not a <button>: these navigate to an in-page anchor, and a
 * button would break middle-click, "open in new tab" and the link role.
 *
 * Colour, all measured against the poster frame:
 *   fill   --color-np-cloud (#7baad5), sampled from the footage's cloud band
 *   label  np-blue-900 on that fill = 6.56:1
 *   disc   np-blue-900 with a white arrow = 6.56:1 and 16.10:1
 *
 * The ring is load-bearing, not decoration, and the two placements need it for
 * opposite reasons. In the hero the fill alone clears the 3:1 that WCAG 1.4.11
 * wants for a component boundary (3.71:1 against the dark gradient). In the
 * navbar the background is bright sky, where the fill manages only 1.15:1, and
 * the np-blue-900 ring supplies the boundary instead at 5.70:1. One ring
 * colour therefore serves both, because whichever of the two fails, the other
 * carries it.
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

export function ButtonWithIcon({
  href,
  children,
  size = 'md',
}: {
  href: string;
  children: React.ReactNode;
  size?: keyof typeof sizes;
}) {
  const s = sizes[size];
  return (
    <a
      href={href}
      className={`group bg-np-cloud text-np-blue-900 ring-np-blue-900 focus-visible:outline-np-blue-900 relative flex w-fit cursor-pointer items-center overflow-hidden rounded-full p-1 text-sm font-medium ring-1 transition-all duration-500 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 ${s.root}`}
    >
      <span className="relative z-10 transition-all duration-500">{children}</span>
      <span
        aria-hidden="true"
        className={`bg-np-blue-900 absolute right-1 flex items-center justify-center rounded-full text-white transition-all duration-500 group-hover:rotate-45 ${s.disc}`}
      >
        <ArrowUpRight size={s.icon} />
      </span>
    </a>
  );
}
