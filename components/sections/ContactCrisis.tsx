import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { ContactForm } from '@/components/ui/ContactForm';
import { CONTACT, CRISIS, BUSINESS } from '@/lib/content';

/**
 * Layout family: contained form beside a crisis panel.
 *
 * Crisis guidance is styled calm and clearly readable, deliberately not as an
 * alarm banner. The audit flags its total absence on the current site as a gap
 * on a behavioral-health site, and CLAUDE.md requires it.
 *
 * The section closes on a human beat rather than another CTA.
 */
export function ContactCrisis() {
  return (
    <section id="contact" className="bg-np-neutral-100 py-24 md:py-32">
      <Container>
        <div className="grid gap-14 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-7">
            <Reveal>
              <h2 className="text-h2">{CONTACT.heading}</h2>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="text-body text-np-neutral-600 mt-4 max-w-[52ch]">{CONTACT.body}</p>
            </Reveal>
            <Reveal delay={0.16}>
              <div className="mt-9">
                <ContactForm />
              </div>
            </Reveal>
          </div>

          <div className="md:col-span-5">
            <Reveal delay={0.12}>
              <aside className="rounded-card border-np-blue-600 bg-np-surface border-l-2 p-6 ring-1 ring-[var(--np-alpha-ink-08)] md:p-8">
                <h3 className="text-h3">{CRISIS.heading}</h3>
                <p className="text-small text-np-neutral-600 mt-3">{CRISIS.body}</p>
                <ul className="mt-6 space-y-5">
                  {CRISIS.items.map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        className="font-display text-h3 text-np-blue-600 ease-np-out hover:text-np-blue-700 underline-offset-4 transition-colors duration-[180ms] hover:underline"
                      >
                        {item.label}
                      </a>
                      <p className="text-small text-np-ink mt-1 font-medium">{item.title}</p>
                      <p className="text-small text-np-neutral-600 mt-1 max-w-[40ch]">
                        {item.body}
                      </p>
                    </li>
                  ))}
                </ul>
              </aside>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="mt-8 space-y-2 px-1">
                <p className="text-small text-np-neutral-600">
                  Call the practice:{' '}
                  <a
                    href={`tel:${BUSINESS.phonePrimaryHref}`}
                    className="text-np-blue-600 font-medium underline-offset-4 hover:underline"
                  >
                    {BUSINESS.phonePrimary}
                  </a>
                </p>
                <p className="text-small text-np-neutral-600">
                  Telehealth across {BUSINESS.serviceArea.join(' and ')}, and in-person care.
                </p>
              </div>
            </Reveal>
          </div>
        </div>

        <Reveal delay={0.1}>
          <p className="text-body-l text-np-neutral-600 mt-20 max-w-[46ch]">
            If you have read this far, that is already a step. We will take the next one with you.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
