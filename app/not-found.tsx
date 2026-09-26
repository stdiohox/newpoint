import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { CTA, NAV } from '@/lib/content';

/**
 * 404.
 *
 * Next's default 404 renders bare, with no navigation and no footer — which on
 * this site means a mistyped URL is the one page where a distressed visitor
 * gets no crisis guidance at all. This one carries the full chrome, so 988 and
 * 911 are reachable from it like everywhere else.
 */
export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <div className="py-24 md:py-32">
          <Container>
            <p className="text-caption text-np-blue-600 tracking-[0.08em] uppercase">404</p>
            <h1 className="text-display-l mt-4 max-w-[18ch]">We could not find that page</h1>
            <p className="text-body-l text-np-neutral-600 mt-5 max-w-[52ch]">
              The link may be out of date, or the address may have a typo in it. Everything on the
              site is one click away below.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button href={CTA.href} size="lg">
                {CTA.label}
              </Button>
              <Link
                href="/"
                className="text-body text-np-blue-600 font-medium underline-offset-4 hover:underline"
              >
                Back to the homepage
              </Link>
            </div>

            <nav aria-label="Site" className="border-np-neutral-200 mt-16 border-t pt-10">
              <h2 className="text-caption text-np-neutral-600 tracking-[0.08em] uppercase">
                Where you might be going
              </h2>
              <ul role="list" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-body text-np-neutral-700 hover:text-np-blue-600 ease-np-out transition-colors duration-[180ms]"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <aside className="rounded-card border-np-blue-600 bg-np-surface mt-14 border-l-2 p-6 ring-1 ring-[var(--np-alpha-ink-08)] md:p-8">
              <h2 className="text-h3">If you need help now</h2>
              <p className="text-body text-np-neutral-600 mt-3 max-w-[60ch]">
                This website is not for emergencies and is not monitored around the clock. Call or
                text{' '}
                <a
                  href="tel:988"
                  className="text-np-blue-600 font-medium underline-offset-4 hover:underline"
                >
                  988
                </a>{' '}
                for the Suicide and Crisis Lifeline, any time. In an emergency, call{' '}
                <a
                  href="tel:911"
                  className="text-np-blue-600 font-medium underline-offset-4 hover:underline"
                >
                  911
                </a>{' '}
                or go to your nearest emergency room.
              </p>
            </aside>
          </Container>
        </div>
      </main>
      <Footer />
    </>
  );
}
