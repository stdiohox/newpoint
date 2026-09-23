import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { stagger } from '@/lib/motion';
import { WHAT_WE_TREAT } from '@/lib/content';

/**
 * Layout family: service grid over a conditions chip field.
 *
 * Carries the SEO weight for condition and service queries. Conditions are
 * named in clinical terms because that is what people search, and the service
 * cards above them explain what actually happens.
 *
 * CLIENT: no specific therapy modalities (CBT, DBT and similar) are named
 * anywhere in the source material, and none are invented here.
 * CLIENT: age range served is not stated as a practice policy, so no claim is made.
 */
export function WhatWeTreat() {
  return (
    <section id="what-we-treat" className="scroll-mt-24 py-24 md:py-32">
      <Container>
        <Reveal>
          <h2 className="text-h2 max-w-[20ch]">{WHAT_WE_TREAT.heading}</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="text-body-l text-np-neutral-600 mt-5 max-w-[62ch]">{WHAT_WE_TREAT.body}</p>
        </Reveal>

        <ul className="mt-14 grid gap-6 sm:grid-cols-2">
          {WHAT_WE_TREAT.services.map((s, i) => (
            <Reveal as="li" key={s.title} delay={stagger(i, 0.07)}>
              <article className="rounded-card bg-np-surface ease-np-out focus-within:outline-np-blue-600 group relative h-full p-6 ring-1 ring-[var(--np-alpha-ink-08)] transition-shadow duration-[180ms] focus-within:outline-2 focus-within:outline-offset-2 hover:shadow-[var(--shadow-np-card)] md:p-8">
                <h3 className="text-h3">
                  {s.href ? (
                    /* Whole-card target via ::after, so the link text stays the
                       service name rather than a bare "read more". */
                    <Link
                      href={s.href}
                      className="group-hover:text-np-blue-600 ease-np-out transition-colors duration-[180ms] after:absolute after:inset-0 focus-visible:outline-none"
                    >
                      {s.title}
                    </Link>
                  ) : (
                    s.title
                  )}
                </h3>
                <p className="text-body text-np-neutral-600 mt-3">{s.body}</p>
              </article>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={0.1}>
          <p className="text-body mt-8">
            <Link
              href="/services"
              className="text-np-blue-600 font-medium underline-offset-4 hover:underline"
            >
              All services in detail
              <span aria-hidden="true"> →</span>
            </Link>
          </p>
        </Reveal>

        <div className="border-np-neutral-200 mt-16 border-t pt-10">
          <Reveal>
            <h3 className="text-h3">Conditions we treat</h3>
          </Reveal>
          <ul className="mt-6 flex flex-wrap gap-2.5">
            {WHAT_WE_TREAT.conditions.map((c, i) => (
              <Reveal as="li" key={c} delay={stagger(i, 0.03)}>
                <span className="rounded-chip bg-np-blue-50 text-small text-np-blue-700 inline-block px-3 py-1.5">
                  {c}
                </span>
              </Reveal>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
