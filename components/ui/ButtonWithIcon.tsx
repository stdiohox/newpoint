import { ArrowUpRight } from 'lucide-react';

/**
 * Pill CTA whose icon disc slides from the right edge to the left on hover
 * while the label shifts the other way.
 *
 * Renders an <a>, not a <button>: this is navigation to an in-page anchor, and
 * turning it into a button would break middle-click, "open in new tab" and the
 * link role for assistive tech.
 *
 * Colour: --color-np-blue-600 (#234598), the brand blue globals.css marks as
 * preserved equity. White on it measures 8.84:1 (AAA), matching the primary
 * variant in Button.tsx. The white ring is load-bearing, not decoration: over
 * the hero's #1F3B5C gradient the fill alone sits at 1.03:1 against its
 * background, so the button's edge would vanish. The ring restores the 3:1
 * boundary WCAG 1.4.11 asks for, measuring 4.47:1.
 */
export function ButtonWithIcon({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="group relative flex h-12 w-fit cursor-pointer items-center overflow-hidden rounded-full bg-np-blue-600 p-1 ps-6 pe-14 text-sm font-medium text-white ring-1 ring-white/60 transition-all duration-500 hover:bg-np-blue-700 hover:ps-14 hover:pe-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <span className="relative z-10 transition-all duration-500">{children}</span>
      <span
        aria-hidden="true"
        className="absolute right-1 flex h-10 w-10 items-center justify-center rounded-full bg-white text-np-blue-600 transition-all duration-500 group-hover:right-[calc(100%-44px)] group-hover:rotate-45"
      >
        <ArrowUpRight size={16} />
      </span>
    </a>
  );
}
