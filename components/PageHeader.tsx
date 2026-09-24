import Link from 'next/link';
import { Container } from '@/components/ui/Container';

export type Crumb = { name: string; path: string };

/**
 * Interior page header.
 *
 * The homepage opens on a full-bleed video hero; interior pages deliberately do
 * not. Repeating that treatment on eight pages would spend the site's single
 * expressive moment eight times over, which is exactly what design-synthesis
 * Part 1 rules out. These open quietly on the warm ground instead, with the H1
 * doing the work.
 *
 * Breadcrumbs are visible rather than schema-only: they are the only way back
 * up a level on a page reached directly from a search result.
 */
export function PageHeader({
  eyebrow,
  title,
  intro,
  crumbs,
}: {
  eyebrow?: string;
  title: string;
  intro: string;
  crumbs: Crumb[];
}) {
  return (
    <header className="border-np-neutral-200 border-b pt-10 pb-16 md:pt-14 md:pb-24">
      <Container>
        <nav aria-label="Breadcrumb">
          {/* neutral-600, not neutral-500: at 13px this is small text, and
              neutral-500 measures 4.27:1 on the warm ground, under the 4.5:1
              SC 1.4.3 requires. neutral-600 measures 6.79:1. */}
          <ol
            role="list"
            className="text-caption text-np-neutral-600 flex flex-wrap items-center gap-x-2 gap-y-1"
          >
            <li>
              <Link href="/" className="hover:text-np-blue-600 underline-offset-4 hover:underline">
                Home
              </Link>
            </li>
            {crumbs.map((crumb, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <li key={crumb.path} className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-np-neutral-400">
                    /
                  </span>
                  {isLast ? (
                    <span className="text-np-neutral-700" aria-current="page">
                      {crumb.name}
                    </span>
                  ) : (
                    <Link
                      href={crumb.path}
                      className="hover:text-np-blue-600 underline-offset-4 hover:underline"
                    >
                      {crumb.name}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Deliberately NOT wrapped in <Reveal />.
            Reveal is a *scroll* reveal: it ships its children at opacity 0 and
            animates them in when they enter the viewport. This block is already
            in the viewport at load, so there is nothing to reveal — and wrapping
            it meant the h1 and the intro shipped invisible and stayed invisible
            until motion JS hydrated. Verified in the prerendered DOM. The
            homepage hero has always rendered its h1 at full opacity for the same
            reason; this now matches it. It also keeps the LCP element off the
            JavaScript critical path. */}
        <div className="mt-10 grid gap-8 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-7">
            {eyebrow && (
              <p className="text-caption text-np-blue-600 mb-4 tracking-[0.08em] uppercase">
                {eyebrow}
              </p>
            )}
            <h1 className="text-display-l max-w-[18ch]">{title}</h1>
          </div>
          <div className="md:col-span-5 md:pt-3">
            <p className="text-body-l text-np-neutral-600 max-w-[52ch]">{intro}</p>
          </div>
        </div>
      </Container>
    </header>
  );
}
