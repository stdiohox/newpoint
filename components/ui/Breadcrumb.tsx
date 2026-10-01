import Link from 'next/link';
import { breadcrumbTrail, type Crumb } from '@/lib/schema';
import { Container } from '@/components/ui/Container';

/**
 * The visible breadcrumb trail.
 *
 * ONE ARRAY FEEDS THIS AND THE SCHEMA. Both this component and
 * `breadcrumbSchema()` call `breadcrumbTrail()` on the page's own `crumbs`, so
 * the labels, their order and the home crumb are identical in the markup and in
 * the BreadcrumbList by construction. Google cross-checks the two and flags a
 * leaf whose visible label differs from the structured one, so the shared helper
 * is the point — do not inline a label here to make the trail read differently
 * from what the page emits.
 *
 * THE LEAF LABEL IS THEREFORE service.nav, "Psychiatric assessment", NOT
 * "Psychiatric evaluation". That is the schema's own leaf, and it is also what
 * CLAUDE.md's owner-confirmed terminology section requires: "evaluation" is
 * retained in exactly four places and none of them names the appointment. A
 * visible crumb reading "Psychiatric evaluation" would be a fifth, would use the
 * word as the appointment's name, and would break the schema match at the same
 * time. The slug stays `/services/psychiatric-evaluation` — the crumb's href is
 * the URL, its text is the appointment's name, and those are allowed to differ.
 *
 * WHY IT SITS BELOW THE HERO AND NOT ABOVE THE H1. PageHero's own note records
 * that a trail over the photograph "read as a second, older navigation bar
 * sitting under the real one", which is why it was pulled. That objection was to
 * the placement, not to the breadcrumb: on the page surface, below the hero and
 * above the body, it is page furniture rather than a competing navbar. Putting it
 * back over the hero re-creates the problem that removed it.
 *
 * `<ol>` with role="list" per the note at the top of app/globals.css: Preflight
 * strips list-style and WebKit then drops the implicit role.
 */
export function Breadcrumb({ trail }: { trail: Crumb[] }) {
  const all = breadcrumbTrail(trail);

  return (
    <Container className="pt-8 md:pt-10">
      <nav aria-label="Breadcrumb">
        <ol role="list" className="text-small flex flex-wrap items-center gap-x-2 gap-y-1">
          {all.map((crumb, i) => {
            const isLast = i === all.length - 1;

            return (
              <li key={crumb.path} className="flex items-center gap-x-2">
                {isLast ? (
                  /* The current page is not a link to itself, and aria-current
                     is what tells a screen reader which crumb it is standing
                     on. np-ink against the page, where the ancestors are
                     np-neutral-600, so the trail reads as leading here. */
                  <span aria-current="page" className="text-np-ink font-medium">
                    {crumb.name}
                  </span>
                ) : (
                  <Link
                    href={crumb.path}
                    className="text-np-neutral-600 hover:text-np-blue-700 ease-np-out underline-offset-4 transition-colors duration-[180ms] hover:underline focus-visible:underline motion-reduce:transition-none"
                  >
                    {crumb.name}
                  </Link>
                )}

                {/* aria-hidden: the list structure already separates the
                    crumbs, so announcing a chevron between each pair adds
                    noise. Inside the <li> rather than between them so the
                    separator cannot end up as a list item of its own.

                    np-neutral-500, NOT np-neutral-400, and aria-hidden is why
                    this needed checking rather than why it did not. Hiding the
                    glyph from the accessibility tree does nothing for SC 1.4.3
                    or 1.4.11, which test what is on screen. The "pure
                    decoration" exemption does not cover it either: the links
                    carry no underline at rest, so this chevron is the only
                    visible thing separating one crumb from the next, and a
                    low-vision reader can reasonably be relying on it.
                    Measured on np-neutral-50 (#fbfaf8): neutral-400 (#a8a399)
                    is 2.4:1 and under the floor; neutral-500 (#7c776d) is
                    4.3:1. */}
                {!isLast && (
                  <span aria-hidden="true" className="text-np-neutral-500">
                    ›
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </Container>
  );
}
