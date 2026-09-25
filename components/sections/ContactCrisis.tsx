import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { OnboardingForm } from '@/components/ui/onboarding-form';
import { CONTACT, CRISIS, BUSINESS } from '@/lib/content';

/**
 * Layout family: contained form beside a crisis panel.
 *
 * Crisis guidance is styled calm and clearly readable, deliberately not as an
 * alarm banner. The audit flags its total absence on the current site as a gap
 * on a behavioral-health site, and CLAUDE.md requires it.
 *
 * The section closes on a human beat rather than another CTA.
 *
 * THE GROUND IS A GRADIENT, not the flat np-neutral-100 it used to be: the
 * form is a white/70 glass card now, and glass over a flat fill is just a
 * lighter flat fill. blue-50 → white gives the blur something to pick up at
 * the top of the card and lets it resolve to plain white by the bottom.
 *
 * The heading and intro moved INTO the card, which is where the block puts
 * them. The crisis panel and the practice phone line are untouched.
 */
export function ContactCrisis() {
  return (
    <section
      id="contact"
      className="from-np-blue-50 bg-gradient-to-b to-white py-24 md:py-32"
    >
      <Container>
        <div className="grid gap-14 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-7">
            {/* No <Reveal> wrapper: the card runs its own staggered entrance
                on whileInView, and nesting the two would fade the card in
                twice over. */}
            <OnboardingForm
              className="max-w-xl"
              imageSrc="/images/what-to-expect/request.webp"
              title={CONTACT.heading}
              description={CONTACT.body}
              buttonText="Send"
              reasons={CONTACT.reasons}
              privacyNote={CONTACT.privacyNote}
            />
          </div>

          <div className="md:col-span-5">
            <Reveal delay={0.12}>
              <aside className="rounded-card border-np-blue-600 bg-np-surface border-l-2 p-6 ring-1 ring-[var(--np-alpha-ink-08)] md:p-8">
                <h3 className="text-h3">{CRISIS.heading}</h3>
                <p className="text-small text-np-neutral-600 mt-3">{CRISIS.body}</p>
                <ul role="list" className="mt-6 space-y-5">
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
