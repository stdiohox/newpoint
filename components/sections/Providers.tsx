import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { stagger } from '@/lib/motion';
import { ProviderPortrait } from '@/components/ui/ProviderPortrait';
import { PROVIDERS } from '@/lib/content';

/**
 * Layout family: two-card grid on the ink ground.
 *
 * This is the page's single colour-block moment and it appears exactly once.
 * It is not a theme flip: the page stays light, this section is a deliberate
 * dark anchor for the thing that matters most.
 *
 * CARD SCALE, per the design-synthesis.md Part 4 revision. The hero-scale
 * full-bleed portrait treatment and the arch mask are both deferred until
 * portraits with headroom at 2000px or more exist.
 *
 * With portraiture constrained, the credential typography carries more of the
 * section's weight and is set deliberately larger than a caption.
 */
export function Providers() {
  return (
    <section id="providers" className="bg-np-ink scroll-mt-24 py-24 md:py-32">
      <Container>
        <Reveal>
          <h2 className="text-display-l max-w-[18ch] text-white">
            You will see one of two providers. Here they are.
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="text-body-l text-np-blue-300 mt-5 max-w-[58ch]">
            Not a directory, and not a rotating roster. Both hold a Doctor of Nursing Practice and
            are dual-certified in psychiatric mental health and family practice.
          </p>
        </Reveal>

        <ul className="mt-14 grid gap-6 md:grid-cols-2 md:gap-8">
          {PROVIDERS.map((p, i) => (
            <Reveal as="li" key={p.slug} delay={stagger(i, 0.1)}>
              <article
                id={`provider-${p.slug}`}
                className="rounded-card h-full scroll-mt-24 bg-[var(--np-alpha-white-08)] p-6 ring-1 ring-[var(--np-alpha-white-14)] md:p-8"
              >
                <div className="flex items-start gap-5">
                  <ProviderPortrait
                    provider={p}
                    sizes="(min-width: 768px) 160px, 120px"
                    className="w-[104px] shrink-0 md:w-[136px]"
                  />
                  <div className="min-w-0">
                    <h3 className="text-h3 text-white">{p.name}</h3>
                    {/* Credentials set as a typographic element, not shrunk into caption text. */}
                    <p className="font-display text-body text-np-amber-500 mt-1 font-medium tracking-[-0.01em]">
                      {p.credentials}
                    </p>
                    <p className="text-small text-np-blue-300 mt-2">{p.role}</p>
                  </div>
                </div>

                <p className="text-body mt-6 text-white/80">{p.bio}</p>

                <dl className="mt-6 space-y-3 border-t border-[var(--np-alpha-white-14)] pt-6">
                  <div>
                    <dt className="text-caption text-np-blue-300">Experience</dt>
                    <dd className="text-small text-white/90">{p.experience}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-np-blue-300">Licensure</dt>
                    <dd className="text-small text-white/90">{p.licensed}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-np-blue-300">Approach</dt>
                    <dd className="text-small text-white/90">{p.approach}</dd>
                  </div>
                </dl>
                {/* CLIENT: state licence numbers and NPI numbers are not published anywhere.
                    Add them as a fourth <div> here, or confirm the practice prefers not to. */}

                <ul className="mt-6 flex flex-wrap gap-2">
                  {p.treats.map((t) => (
                    <li
                      key={t}
                      className="rounded-chip text-caption bg-[var(--np-alpha-white-08)] px-2.5 py-1 text-white/85"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
