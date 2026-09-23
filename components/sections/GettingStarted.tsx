import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { stagger } from '@/lib/motion';
import { GETTING_STARTED } from '@/lib/content';

/**
 * Layout family: numbered process sequence, hairline separated.
 *
 * Placed after trust is established, matching where Two Chairs and Meru put
 * process. Addresses the audit finding that no intake process is documented
 * anywhere on the current site.
 *
 * Numerals are the label. No "Step 1 / Stage 1" prefixes.
 * CLIENT: hours of operation are not published, so no scheduling window is claimed.
 */
export function GettingStarted() {
  return (
    <section id="getting-started" className="bg-np-neutral-100 scroll-mt-24 py-24 md:py-32">
      <Container>
        <div className="grid gap-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-4">
            <Reveal>
              <h2 className="text-h2">{GETTING_STARTED.heading}</h2>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="text-body text-np-neutral-600 mt-4 max-w-[36ch]">
                {GETTING_STARTED.body}
              </p>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="text-body mt-6">
                <Link
                  href="/new-patients"
                  className="text-np-blue-600 font-medium underline-offset-4 hover:underline"
                >
                  Read the new patient guide
                  <span aria-hidden="true"> →</span>
                </Link>
              </p>
            </Reveal>
          </div>

          <ol className="md:col-span-8">
            {GETTING_STARTED.steps.map((step, i) => (
              <Reveal as="li" key={step.title} delay={stagger(i, 0.08)}>
                <div className="border-np-neutral-300 flex gap-6 border-b py-7 first:pt-0 last:border-b-0 last:pb-0">
                  <span
                    aria-hidden="true"
                    className="font-display text-h3 text-np-amber-500 tabular-nums"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-h3">{step.title}</h3>
                    <p className="text-body text-np-neutral-600 mt-2 max-w-[58ch]">{step.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
