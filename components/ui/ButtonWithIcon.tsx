import { ArrowUpRight } from 'lucide-react';

/**
 * Pill CTA whose icon disc slides from the right edge to the left on hover
 * while the label shifts the other way.
 *
 * Renders an <a>, not a <button>: these navigate to an in-page anchor, and a
 * button would break middle-click, "open in new tab" and the link role.
 *
 * Colour, all measured against the 1080p poster frame:
 *   fill   --color-np-sky (#527faf), client-specified
 *   disc   white, 4.19:1 against the fill
 *   arrow  --color-np-sky on that white disc, 4.19:1, so it reads as cut out
 *          of the button rather than as a second colour
 *
 * The white ring carries the component boundary in the hero at 9.23:1, which
 * matters because this fill only reaches 2.20:1 against the hero's dark
 * gradient on its own.
 *
 * CLIENT: two figures sit just under WCAG AA and are accepted design calls.
 * The white label on this fill is 4.19:1 against the 4.5:1 wanted at 14px, and
 * the white ring is 2.81:1 against the bright sky behind the navbar, against
 * the 3:1 WCAG 1.4.11 wants. Both are close misses; #4a76a4 would clear the
 * label at 4.75:1.
 *
 * The focus ring stays np-blue-900 rather than white: it is clearly visible on
 * this fill, where a white focus ring would vanish into the white resting ring.
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
      className={`group bg-np-sky focus-visible:outline-np-blue-900 relative flex w-fit cursor-pointer items-center overflow-hidden rounded-full p-1 text-sm font-medium text-white ring-1 ring-white transition-all duration-500 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 ${s.root}`}
    >
      <span className="relative z-10 transition-all duration-500">{children}</span>
      <span
        aria-hidden="true"
        className={`text-np-sky absolute right-1 flex items-center justify-center rounded-full bg-white transition-all duration-500 group-hover:rotate-45 ${s.disc}`}
      >
        <ArrowUpRight size={s.icon} />
      </span>
    </a>
  );
}
