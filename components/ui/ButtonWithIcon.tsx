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
 *   disc   np-blue-900 with a white arrow = 6.56:1 and 16.10:1
 *
 * CLIENT: the white label and white ring are an explicit design decision and
 * both fall short of WCAG AA on this fill. White on #7baad5 measures 2.46:1
 * against the 4.5:1 required for 14px text, and the white ring measures 2.82:1
 * against the bright sky behind the navbar, just under the 3:1 WCAG 1.4.11
 * wants for a component boundary. In the hero the fill itself still carries the
 * boundary at 3.71:1. Darkening --color-np-cloud to about #2f5f8f would put the
 * white label over 4.5:1 while keeping a sky-blue hue.
 *
 * The focus ring stays np-blue-900 rather than white: at 6.56:1 on this fill it
 * is actually visible, where a white focus ring would vanish into the white
 * resting ring.
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
      className={`group bg-np-cloud focus-visible:outline-np-blue-900 relative flex w-fit cursor-pointer items-center overflow-hidden rounded-full p-1 text-sm font-medium text-white ring-1 ring-white transition-all duration-500 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 ${s.root}`}
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
