import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

/**
 * Radius rule: buttons are pills. Contrast verified in design-tokens.md 1.6,
 * white on --color-np-blue-600 measures 8.8:1 (AAA).
 * Press feedback is instant per the Apple response principle.
 */
const base =
  'inline-flex items-center justify-center gap-2 rounded-pill whitespace-nowrap font-medium ' +
  'transition-[background-color,transform,box-shadow] duration-[180ms] ease-np-out ' +
  'active:scale-[0.98] active:duration-[100ms] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2';

const sizes = {
  md: 'px-5 py-2.5 text-small',
  lg: 'px-7 py-3.5 text-body',
};

/** With the arrow disc the right padding collapses so the disc sits on the edge. */
const arrowSizes = {
  md: 'ps-5 pe-1.5 py-1.5 text-small',
  lg: 'ps-7 pe-2 py-2 text-body',
};

const variants = {
  primary: 'bg-np-blue-600 text-white hover:bg-np-blue-700 focus-visible:outline-np-blue-900',
  onInk: 'bg-white text-np-ink hover:bg-np-neutral-100 focus-visible:outline-np-blue-900',
  /**
   * The secondary action on a light ground.
   *
   * THE RING WAS ink/12 AND DID NOT MEET SC 1.4.11. The fill is transparent, so
   * the ring is the whole component boundary and it needs 3:1. Measured against
   * np-blue-100, the ground PageCta now uses: ink/12 gives 1.27:1, ink/20 gives
   * 1.51:1, ink/40 still only reaches 2.46:1. No alpha of ink clears it on a
   * pale ground. np-blue-600 does, at 7.32:1, and it doubles as the label
   * colour so the button reads as one object.
   *
   * Changed rather than added because `variant="quiet"` had no call sites in the
   * repo when this was written, so nothing else moves.
   *
   * `border border-transparent` alongside the ring is for forced-colors mode.
   * A Tailwind ring is a box-shadow, and Windows High Contrast drops shadows;
   * with a transparent fill that would leave this button with no resting
   * boundary at all. A zero-colour border survives, because forced-colors
   * repaints border-color with a system colour rather than removing it. It costs
   * nothing visually: border-box sizing means no layout shift.
   */
  quiet:
    'bg-transparent text-np-blue-600 border border-transparent ring-1 ring-np-blue-600 hover:bg-np-blue-50 focus-visible:outline-np-blue-900',
  /**
   * The hero CTA's colour, so a page can carry that button without reaching for
   * <ButtonWithIcon />, which is a separate component with its own hover
   * choreography. White on --color-np-sky (#4a76a4) measures 4.75:1, clear of
   * the 4.5:1 AA floor for normal text.
   *
   * The focus ring is np-blue-900, not globals.css's np-blue-600: on this fill
   * blue-600 sits too close to the fill to read. Same call ButtonWithIcon.tsx
   * documents for the same reason.
   */
  sky: 'bg-np-sky text-white hover:bg-np-blue-700 focus-visible:outline-np-blue-900',
};

const discSizes = {
  md: { box: 'h-8 w-8', icon: 14 },
  lg: { box: 'h-10 w-10', icon: 16 },
};

export function Button({
  children,
  href,
  type,
  variant = 'primary',
  size = 'md',
  withArrow = false,
  className = '',
}: {
  children: ReactNode;
  href?: string;
  type?: 'button' | 'submit';
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  /** Renders the hero CTA's arrow disc after the label. Decorative. */
  withArrow?: boolean;
  className?: string;
}) {
  const cls = `${base} ${withArrow ? arrowSizes[size] : sizes[size]} ${variants[variant]} ${className}`;
  const disc = discSizes[size];
  const body = (
    <>
      {children}
      {withArrow && (
        <span
          aria-hidden="true"
          className={`text-np-sky ml-1 inline-flex shrink-0 items-center justify-center rounded-full bg-white ${disc.box}`}
        >
          <ArrowUpRight size={disc.icon} />
        </span>
      )}
    </>
  );

  if (href) {
    /**
     * next/link for in-app routes only. This component is also called with
     * `tel:` hrefs (app/contact/page.tsx), which Link should not wrap: there is
     * no route to prefetch and no client navigation to perform.
     */
    const internal = href.startsWith('/') || href.startsWith('#');
    if (internal) {
      return (
        <Link href={href} className={cls}>
          {body}
        </Link>
      );
    }
    return (
      <a href={href} className={cls}>
        {body}
      </a>
    );
  }
  return (
    <button type={type ?? 'button'} className={cls}>
      {body}
    </button>
  );
}
