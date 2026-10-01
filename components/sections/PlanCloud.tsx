'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useHydrated } from '@/lib/useHydrated';

/**
 * The payer wall as a cloud of typographic tiles.
 *
 * ADAPTED FROM LogoCloudSwap, NOT PORTED, and the two headline features of
 * that pattern are both deliberately absent:
 *
 *   NO LOGOS. The source is a logo cloud; this renders plan NAMES as type.
 *   Insurer marks are trademarks the practice has no permission to use, and
 *   OPEN_CLIENT_ITEMS carries that permission as an optional upgrade rather
 *   than a gap. The names are also the thing a patient scans for.
 *
 *   NO SWAP. The source rotates its logos on an interval, which is what the
 *   "Swap" in its name is. An indefinite loop beside a list someone is reading
 *   to find their own plan is a moving target, and on a behavioral-health site
 *   it is motion for its own sake. This wipes in ONCE, on entry, and stops.
 *
 * WHAT IS TAKEN is the composition: a wrapped field of equal-weight tiles that
 * reads as one wall rather than as a table, and a staggered entrance that
 * moves across that field instead of appearing all at once.
 *
 * THE HIDDEN STATE IS NOT IN THE SERVER HTML — the house rule for every
 * entrance animation here. Until this hydrates, each tile is a plain <li>
 * carrying data-enter="wipe", and the clip comes from the .js-gated,
 * no-preference-gated block in app/globals.css. No JS, or reduced motion, and
 * the plans are simply there. See lib/useHydrated.ts for the full argument;
 * on this page in particular, a plan list that fails to appear is a patient
 * who concludes their insurer is not accepted.
 *
 * NO CONTENT IMPORTS. This is a client component, so it takes its names as
 * props: importing lib/content.ts here would ship every string on the site to
 * the browser, including the payer names that are deliberately not published.
 * See the boundary note at the head of lib/nav.ts.
 */
export function PlanCloud({
  plans,
  labelledBy,
}: {
  /** Plan names, already filtered for what may be published. Rendered verbatim. */
  plans: readonly string[];
  /** id of the group heading this list belongs to. */
  labelledBy: string;
}) {
  const reduce = useReducedMotion();
  const hydrated = useHydrated();

  /* 2 columns at phone widths, wrapped rows from sm up. The grid is what
     stops two short names and one long one from making ragged half-rows on a
     narrow screen; the flex wrap is what makes it read as a cloud rather than
     a table once there is room. */
  const listClass = 'mt-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-3';

  /* NO TRUNCATION ANYWHERE. "Independence Blue Cross Pennsylvania (Virtual
     National Network)" is 63 characters and wraps to four lines in a 320
     column; a plan name cut off at an ellipsis is a plan a patient cannot
     identify. `text-balance` evens the wrapped lines and the tile grows to
     whatever height it needs.

     `min-w-0` with `break-words` IS THE PAIR THAT MATTERS, and it is the flex
     row that needs it. `overflow-wrap: break-word` does not reduce an item's
     min-content width, and a flex item's min-width is min-content by default,
     so a single token wider than the row would push the row rather than wrap.
     The grid path is already safe — `grid-cols-2` tracks are minmax(0,1fr) —
     but the sm:flex path is not without this. */
  const tileClass =
    'bg-np-surface rounded-card text-body text-np-ink ring-np-neutral-200 flex h-full min-w-0 items-center ' +
    'px-4 py-3.5 text-balance ring-1 break-words sm:px-5';

  if (!hydrated) {
    return (
      /* role="list" IS LOAD-BEARING, not redundant. Tailwind's preflight sets
         list-style: none on every ul, and WebKit drops list semantics from a
         list styled that way — so VoiceOver stops announcing "list, N items"
         and the item positions. On a wall someone is scanning for their own
         insurer, the count is the useful part. The markup this replaced
         carried it for the same reason. */
      <ul role="list" aria-labelledby={labelledBy} className={listClass}>
        {plans.map((name) => (
          <li key={name} data-enter="wipe" className={tileClass}>
            {name}
          </li>
        ))}
      </ul>
    );
  }

  /* Reduced motion: the plain list, with NO data-enter at all, exactly as
     Reveal does it. The CSS that would hide a tile is already behind a
     no-preference query, so this is belt and braces rather than the gate — but
     it keeps the DOM honest about what is animating, and it means a tile
     cannot be left clipped if that query is ever relaxed.

     A SEPARATE BRANCH FROM THE ONE ABOVE, not a ternary inside it. Both render
     the same markup, and the first client render must match the server's
     byte for byte, which is why `hydrated` is checked before `reduce` —
     useReducedMotion() resolves to null on the server and to a real boolean on
     the client, so reading it any earlier would make the two disagree. */
  if (reduce) {
    return (
      <ul role="list" aria-labelledby={labelledBy} className={listClass}>
        {plans.map((name) => (
          <li key={name} className={tileClass}>
            {name}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <motion.ul
      role="list"
      aria-labelledby={labelledBy}
      className={listClass}
      initial="hidden"
      whileInView="shown"
      /* amount 'some', not Reveal's 0.3 default: this list runs past 600px at
         320 with nine tiles in it, and a threshold that tall content cannot
         meet leaves it hidden for good. The measurement is in Reveal.tsx. */
      viewport={{ once: true, amount: 'some' }}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.05 } } }}
    >
      {plans.map((name) => (
        <motion.li
          key={name}
          data-enter="wipe"
          className={tileClass}
          variants={{
            /* THE WIPE. inset() from the left edge, which is the direction the
               names are read in. It pairs with opacity because a clip alone
               makes the first letter arrive at full strength while the last is
               still absent, and that reads as a glitch rather than an entrance.
               Values identical to the CSS in globals.css so the handover from
               the pre-hydration state does not flash.

               THE -4px ON THE OTHER THREE SIDES IS NOT PADDING, IT KEEPS THE
               RING. `ring-1` is a box-shadow and box-shadows paint OUTSIDE the
               border box, which is exactly what inset() clips to — so a wipe
               ending at `inset(0)` leaves the tile permanently ringless, since
               Motion keeps the end value as an inline style. The tiles would
               then differ from the reduced-motion and no-JS paths, which never
               clip at all. Negative insets expand the clip rect past the border
               box, so the 1px ring survives with room to spare. */
            hidden: { opacity: 0, clipPath: 'inset(-4px 100% -4px -4px)' },
            shown: {
              opacity: 1,
              clipPath: 'inset(-4px -4px -4px -4px)',
              transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
            },
          }}
        >
          {name}
        </motion.li>
      ))}
    </motion.ul>
  );
}
