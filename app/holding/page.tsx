import type { Metadata } from 'next';
import Image from 'next/image';
import { BUSINESS, CRISIS, FOOTER, PROVIDERS } from '@/lib/content';

/**
 * The holding page, served in place of every route on the production domain
 * while MAINTENANCE_MODE=true. See middleware.ts.
 *
 * No navbar and no footer. The layout still renders the sticky <header>, and
 * globals.css hides it whenever this page's <main data-holding> is present —
 * every link in it would only rewrite back here. That rule is scoped to this
 * page, so no other route is affected and the site stays statically rendered.
 *
 * Losing the footer loses its 988 / 911 strip, which is the crisis guidance on
 * most routes. CLAUDE.md requires it wherever a distressed visitor would
 * plausibly look, and on a behavioral-health domain that is this page, so the
 * one line below carries it from CRISIS.
 *
 * Not in ROUTES, so not in the sitemap.
 */
export const metadata: Metadata = {
  title: { absolute: `${BUSINESS.legalName} | Coming soon` },
  description: `Our new website is coming soon. Call ${BUSINESS.phonePrimary} to reach ${BUSINESS.shortName}.`,
  robots: { index: false, follow: false },
  // Replaces the root layout's canonical, which would point a noindexed page
  // at the homepage.
  alternates: {},
};

const linkClass =
  'text-np-blue-600 font-medium underline-offset-4 hover:underline [overflow-wrap:anywhere]';
const crisisLinkClass =
  'text-np-blue-700 decoration-np-blue-700/40 hover:decoration-np-blue-700 font-medium underline underline-offset-4';

export default function Holding() {
  return (
    <main
      id="main"
      tabIndex={-1}
      data-holding
      className="flex min-h-dvh items-center px-4 py-16 focus:outline-none md:px-8"
    >
      <div className="mx-auto w-full max-w-xl">
        <div className="flex items-center gap-2.5">
          <Image
            src="/brand/newpoint-mark-color.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-auto"
            priority
          />
          <span className="font-display text-np-blue-600 text-xl font-semibold tracking-tight">
            {BUSINESS.shortName}
            <span className="sr-only"> {BUSINESS.legalName}</span>
          </span>
        </div>

        <h1 className="text-display-l mt-10">Our new website is coming soon</h1>

        <ul role="list" className="text-body-l mt-8 space-y-3">
          <li>
            <a href={`tel:${BUSINESS.phonePrimaryHref}`} className={linkClass}>
              {BUSINESS.phonePrimary}
            </a>
          </li>
          {/* The two provider inboxes, because there is no practice-wide one —
              the footer's resolution. `name`, not `displayName`: no credentials
              sit beside it here, which is the condition for the "Dr." prefix
              (CLAUDE.md, clinician titles). */}
          {PROVIDERS.map((p) => (
            <li key={p.email}>
              <a href={`mailto:${p.email}`} className={linkClass}>
                {p.email}
              </a>
              <span className="text-small text-np-neutral-600 block">{p.name}</span>
            </li>
          ))}
        </ul>

        {/* The footer's strip, word for word, with its labels and its resting
            underline: inline in a sentence, colour alone would not mark these
            as links (SC 1.4.1). Body size, not small — on this page it is the
            only crisis guidance there is. */}
        <p className="text-body text-np-ink border-np-neutral-200 mt-12 border-t pt-6">
          {CRISIS.body} {FOOTER.crisis.before}{' '}
          <a
            href="tel:988"
            aria-label="988, Suicide and Crisis Lifeline"
            className={crisisLinkClass}
          >
            988
          </a>
          {FOOTER.crisis.between}{' '}
          <a href="tel:911" aria-label="911, medical emergency" className={crisisLinkClass}>
            911
          </a>
          {FOOTER.crisis.after}
        </p>
      </div>
    </main>
  );
}
