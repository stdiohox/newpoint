import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { Button } from '@/components/ui/Button';
import { BUSINESS, CTA } from '@/lib/content';

/**
 * Closing block for interior pages.
 *
 * One CTA intent, matching the homepage's. The crisis line is repeated on every
 * page rather than living only on the homepage: someone arriving on a service
 * page directly from a search result may never see the homepage at all, and
 * CLAUDE.md requires crisis guidance where a distressed visitor would look.
 */
export function PageCta({
  heading = 'Ready when you are',
  body = 'Send us your contact details and we will get back to you about an appointment. Please keep health information out of the form.',
}: {
  heading?: string;
  body?: string;
}) {
  return (
    <section className="bg-np-ink on-ink py-20 md:py-28">
      <Container>
        <div className="grid gap-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-7">
            <Reveal>
              <h2 className="text-h2 max-w-[18ch] text-white">{heading}</h2>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="text-body-l text-np-blue-300 mt-5 max-w-[52ch]">{body}</p>
            </Reveal>
            <Reveal delay={0.16}>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Button href={CTA.href} variant="onInk" size="lg">
                  {CTA.label}
                </Button>
                <a
                  href={`tel:${BUSINESS.phonePrimaryHref}`}
                  className="text-body text-np-blue-300 font-medium underline-offset-4 hover:text-white hover:underline"
                >
                  {BUSINESS.phonePrimary}
                </a>
              </div>
            </Reveal>
          </div>

          <div className="md:col-span-5">
            <Reveal delay={0.12}>
              <div className="rounded-card border-np-blue-300 border-l-2 bg-[var(--np-alpha-white-08)] p-6 md:p-8">
                <h3 className="text-h3 text-white">If you need help now</h3>
                <p className="text-small mt-3 text-white/70">
                  This website is not for emergencies and is not monitored around the clock.
                </p>
                <p className="text-small mt-4 text-white/85">
                  Call or text{' '}
                  <a
                    href="tel:988"
                    className="text-np-blue-300 font-medium underline-offset-4 hover:underline"
                  >
                    988
                  </a>{' '}
                  for the Suicide and Crisis Lifeline, any time. In an emergency, call{' '}
                  <a
                    href="tel:911"
                    className="text-np-blue-300 font-medium underline-offset-4 hover:underline"
                  >
                    911
                  </a>{' '}
                  or go to your nearest emergency room.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}

/**
 * Internal link cluster. Every interior page ends with links to its siblings,
 * which is how link equity reaches pages that the homepage does not link to
 * directly and how a reader gets from one service to the next without the nav.
 */
export function RelatedLinks({
  heading = 'Keep reading',
  links,
}: {
  heading?: string;
  links: { label: string; description: string; href: string }[];
}) {
  if (links.length === 0) return null;

  return (
    <section className="border-np-neutral-200 border-t py-16 md:py-20">
      <Container>
        <Reveal>
          <h2 className="text-h3 text-np-neutral-600">{heading}</h2>
        </Reveal>
        <ul role="list" className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link, i) => (
            <Reveal as="li" key={link.href} delay={i * 0.06}>
              <Link
                href={link.href}
                className="rounded-card bg-np-surface ease-np-out group block h-full p-6 ring-1 ring-[var(--np-alpha-ink-08)] transition-shadow duration-[180ms] hover:shadow-[var(--shadow-np-card)]"
              >
                <h3 className="text-h3 group-hover:text-np-blue-600 ease-np-out transition-colors duration-[180ms]">
                  {link.label}
                </h3>
                <p className="text-small text-np-neutral-600 mt-2">{link.description}</p>
              </Link>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
