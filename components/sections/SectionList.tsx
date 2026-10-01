/**
 * A service section's list and the line that qualifies it.
 *
 * WHY THIS EXISTS. Until 2026-10-01 the qualifying line lived in `bullets`,
 * which only two of the four layouts render — so "Conditions we prescribe for"
 * would have shipped ten diagnoses with no hedge if that service's `layout`
 * were ever flipped to the prose fallback, which renders `list` and ignores
 * `bullets`. The line now lives in `listNote` beside the list it qualifies,
 * every layout renders it, and forgetting to is a build failure rather than a
 * silent omission.
 *
 * THREE EXPORTS, AND THE LAYOUTS USE DIFFERENT ONES ON PURPOSE:
 *
 *   SectionList   chips plus the note. The card and grid layouts use it,
 *                 because both already render a list as chips.
 *   ListNote      the note alone, for a layout with its own list markup —
 *                 ServiceBody draws a check-marked column, and turning that
 *                 into chips would restyle the assessment page.
 *   assertHedged  the guard both of the above run, for a layout to call
 *                 beside its own list.
 *
 * THE GUARD THROWS RATHER THAN LETTING A BARE PRESCRIBING LIST RENDER. These
 * pages are statically generated, so a render-time throw is a build failure —
 * the device `assertSourced()` in components/sections/Providers.tsx uses. Its
 * content-side twin, assertPrescribingHedged() in lib/content.ts, catches the
 * same mistake one step earlier, in the data. Two checks, because they fail on
 * different mistakes: the data one on a section written without a note, this
 * one on a layout that renders the list and forgets to render it.
 *
 * THE NOTE RENDERS AFTER THE LIST, never before: it says "this list", which
 * has no referent until the list is on screen.
 */

/**
 * Which lists must carry a qualifying line.
 *
 * Matched on the heading rather than on a flag in the data, because a flag is
 * something an editor can forget to set on a NEW section — and a section
 * somebody adds later is exactly the one this is here for. "Prescrib" covers
 * "Conditions we prescribe for" and any rephrasing of it.
 */
export function requiresNote(heading: string) {
  return /prescrib/i.test(heading);
}

/** Throws if a prescribing list is about to render without its note. */
export function assertHedged(heading: string, list?: readonly string[], note?: string) {
  if (!list || list.length === 0) return;
  if (!requiresNote(heading)) return;
  if (note?.trim()) return;
  throw new Error(
    `SectionList: "${heading}" renders a list of ${list.length} item(s) with no listNote. ` +
      `A prescribing list without its qualifying line reads as a promise about every item ` +
      `on it. Add listNote to that section in lib/content.ts — do not delete this check.`
  );
}

/** The qualifying line on its own, for a layout that draws its own list. */
export function ListNote({ note }: { note?: string }) {
  if (!note) return null;
  return <p className="text-small text-np-neutral-700 mt-4 max-w-[62ch]">{note}</p>;
}

/** Chips plus the note. The card and grid layouts render lists this way. */
export function SectionList({
  heading,
  list,
  note,
}: {
  /** The section's heading. Used only to decide whether a note is required. */
  heading: string;
  list?: readonly string[];
  note?: string;
}) {
  assertHedged(heading, list, note);
  if (!list || list.length === 0) return null;

  return (
    <>
      {/* role="list" per the note at the top of app/globals.css: Preflight
          strips list-style and WebKit then drops the implicit role. */}
      <ul role="list" className="mt-6 flex flex-wrap gap-2.5">
        {list.map((item) => (
          <li
            key={item}
            className="rounded-chip bg-np-blue-50 text-small text-np-blue-700 px-3 py-1.5"
          >
            {item}
          </li>
        ))}
      </ul>
      <ListNote note={note} />
    </>
  );
}
