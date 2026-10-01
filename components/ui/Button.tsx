import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

/**
 * Radius rule: buttons are pills. Contrast verified in design-tokens.md 1.6,
 * white on --color-np-blue-600 measures 8.8:1 (AAA).
 * Press feedback is instant per the Apple response principle.
 *
 * `border border-transparent` IS ON EVERY VARIANT, AND THE FILLED ONES NEED IT
 * MOST. In forced-colors mode the browser replaces background-color with Canvas
 * and drops box-shadows, which is what a Tailwind ring is. A filled pill then
 * has no fill and no ring, and because these render as an anchor rather than a
 * button there is no UA chrome to fall back on: the white pill becomes bare
 * LinkText on Canvas with nothing marking it as a control. A zero-colour border
 * survives, because forced-colors repaints border-color with a system colour
 * instead of removing it.
 *
 * It lives here rather than on the two outline variants, where it started,
 * because `primary`, `onInk` and `sky` have the same gap and it is not
 * variant-specific. Note it DOES add 2px to width and height: these are
 * auto-sized, so border-box does not absorb it. Harmless in the flex rows they
 * sit in, where heights stretch anyway.
 */
const base =
  'inline-flex items-center justify-center gap-2 rounded-pill whitespace-nowrap font-medium ' +
  'border border-transparent ' +
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
  /**
   * The filled action on a dark ground.
   *
   * FOCUS RING IS WHITE, AND np-blue-900 WAS WRONG HERE. outline-offset draws
   * the ring onto the ground behind the button, not onto the white fill, so it
   * is measured against the section. np-blue-900 came out at 1.82:1 on the blue
   * ground this was caught on, under the 3:1 SC 1.4.11 asks of a focus
   * indicator. White is at least 9.79:1 on PageCta's navy panel and 17.03:1 on
   * np-ink.
   *
   * globals.css has an `.on-ink :focus-visible` rule meant to catch exactly
   * this, but it sits in @layer base and Tailwind utilities land in a later
   * layer, so the utility on this variant wins and the class cannot rescue it.
   * A variant named onInk has to carry its own light ring.
   */
  onInk: 'bg-white text-np-ink hover:bg-np-neutral-100 focus-visible:outline-white',
  /**
   * The secondary action on a light ground.
   *
   * THE RING WAS ink/12 AND DID NOT MEET SC 1.4.11. The fill is transparent, so
   * the ring is the whole component boundary and it needs 3:1. Measured on
   * np-blue-100, a pale ground this was trialled on: ink/12 gives 1.27:1,
   * ink/20 gives 1.51:1, ink/40 still only reaches 2.46:1. No alpha of ink
   * clears it on a pale ground. np-blue-600 does, at 7.32:1, and it doubles as
   * the label colour so the button reads as one object.
   *
   * Changed rather than added because `variant="quiet"` had no call sites in the
   * repo when this was written, so nothing else moves. It has none again now
   * that PageCta is back on a dark ground and uses `onInkQuiet`.
   */
  quiet:
    'bg-transparent text-np-blue-600 ring-1 ring-np-blue-600 hover:bg-np-blue-50 focus-visible:outline-np-blue-900',
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
  /**
   * The secondary action on a dark ground, where `quiet` cannot go: its
   * np-blue-600 label and ring are built for light grounds and both vanish.
   *
   * THE RING IS white/50 AND THE ALPHA IS GROUND-DEPENDENT, which is the part
   * worth remembering. The fill is transparent, so the ring is the whole
   * component boundary and SC 1.4.11 wants 3:1.
   *
   * On PageCta's navy panel it measures 3.74:1 at the gradient's lightest point
   * and about 4.5:1 at the darkest, and the buttons sit between the two. An
   * earlier version used white/40, measured against np-ink where it gives
   * 3.78:1; on the np-blue-600 ground trialled in between, that same white/40
   * fell to 2.76:1. Re-measure before putting this on a third ground. The alpha
   * does not travel.
   *
   * Focus ring is white, not np-blue-900: outline-offset draws it onto the
   * ground behind the button, where a dark blue outline is nearly the ground.
   */
  onInkQuiet:
    'bg-transparent text-white ring-1 ring-white/50 hover:bg-[var(--np-alpha-white-14)] focus-visible:outline-white',
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
  ariaLabel,
}: {
  children: ReactNode;
  href?: string;
  type?: 'button' | 'submit';
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  /** Renders the hero CTA's arrow disc after the label. Decorative. */
  withArrow?: boolean;
  className?: string;
  /**
   * Overrides the accessible name where the visible label is not enough on its
   * own — /providers renders two "View full profile" buttons, which in a links
   * list say nothing about whose profile.
   *
   * SC 2.5.3 Label in Name is the constraint: whatever is passed here MUST
   * CONTAIN the visible label, in the same order, or speech input stops being
   * able to activate the control by what it says on screen.
   */
  ariaLabel?: string;
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
        <Link href={href} className={cls} aria-label={ariaLabel}>
          {body}
        </Link>
      );
    }
    return (
      <a href={href} className={cls} aria-label={ariaLabel}>
        {body}
      </a>
    );
  }
  return (
    <button type={type ?? 'button'} className={cls} aria-label={ariaLabel}>
      {body}
    </button>
  );
}
