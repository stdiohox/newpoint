import { Phone } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { CrisisPanel } from '@/components/ui/CrisisPanel';
import { OnboardingForm } from '@/components/ui/onboarding-form';
import type { IntakeForm as IntakeFormType } from '@/components/ui/intake-form';
import { CONTACT, BUSINESS, DELIVERY_LINE, SMS_CONSENT } from '@/lib/content';

/*
 * The live intake form ships only when BOTH are set at build time. Unset (the default,
 * and the only correct state until the PHI zone and its BAAs are live), the section
 * renders OnboardingForm exactly as before.
 */
const INTAKE_URL = process.env.NEXT_PUBLIC_INTAKE_URL;
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
/*
 * A build-time dead branch, not next/dynamic (which still preloads the chunk): Next
 * inlines NEXT_PUBLIC_* at build, so with the flag unset webpack drops this require and
 * the intake form never enters the page's bundle at all.
 */
const IntakeForm: typeof IntakeFormType | null =
  process.env.NEXT_PUBLIC_INTAKE_URL && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('@/components/ui/intake-form') as typeof import('@/components/ui/intake-form')).IntakeForm
    : null;

/**
 * Layout family: contained form beside a crisis panel.
 *
 * The section closes on a human beat rather than another CTA.
 *
 * THE GROUND IS A GRADIENT, not the flat np-neutral-100 it used to be: the
 * form is a white/70 glass card now, and glass over a flat fill is just a
 * lighter flat fill. blue-50 → white gives the blur something to pick up at
 * the top of the card and lets it resolve to plain white by the bottom.
 *
 * The heading and intro moved INTO the card, which is where the block puts
 * them.
 *
 * The crisis panel itself lives in components/ui/CrisisPanel.tsx and is shared
 * with /contact, so the two cannot drift apart again.
 */
export function ContactCrisis() {
  return (
    <section id="contact" className="from-np-blue-50 bg-gradient-to-b to-white py-24 md:py-32">
      <Container>
        <div className="grid gap-14 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-7">
            {/* No <Reveal> wrapper: the card runs its own staggered entrance
                on whileInView, and nesting the two would fade the card in
                twice over. */}
            {IntakeForm && INTAKE_URL && TURNSTILE_SITE_KEY ? (
              <IntakeForm
                className="max-w-xl"
                intakeUrl={INTAKE_URL}
                turnstileSiteKey={TURNSTILE_SITE_KEY}
                title={CONTACT.heading}
                description={CONTACT.live.body}
                buttonText="Send"
                reasons={CONTACT.reasons}
                privacyNote={CONTACT.privacyNote}
                consent={SMS_CONSENT}
                success={CONTACT.success}
                codeStep={{ heading: CONTACT.live.codeHeading, body: CONTACT.live.codeBody }}
                ageQuestion={CONTACT.live.ageQuestion}
                phone={{ label: BUSINESS.phonePrimary, href: `tel:${BUSINESS.phonePrimaryHref}` }}
              />
            ) : (
            <OnboardingForm
              className="max-w-xl"
              imageSrc="/images/what-to-expect/request.webp"
              title={CONTACT.heading}
              description={CONTACT.body}
              buttonText="Send"
              reasons={CONTACT.reasons}
              privacyNote={CONTACT.privacyNote}
              /* Composed here rather than in content.ts so the copy stays
                 strings and the hrefs stay derived from BUSINESS, which is the
                 single source for the practice's NAP data. Both provider
                 addresses, because there is no practice-wide inbox — same
                 resolution app/contact/page.tsx already reached. */
              unavailable={{
                ...CONTACT.unavailable,
                phone: {
                  label: BUSINESS.phonePrimary,
                  href: `tel:${BUSINESS.phonePrimaryHref}`,
                },
                emails: Object.values(BUSINESS.emails).map((address) => ({
                  label: address,
                  href: `mailto:${address}`,
                })),
              }}
            />
            )}
          </div>

          {/* order-first below md, matching app/contact/page.tsx: the grid
              stacks on a phone, and left in DOM order a distressed visitor
              would scroll past the form image, four fields and the submit
              button before reaching 988.

              Sticky from md up so the numbers stay reachable for the whole
              length of the form, which is the taller column. self-start stops
              the grid stretching the item to the row height, without which it
              has no slack to stick in. The offset is --nav-h plus the same
              1.5rem globals.css gives scroll-padding-top, so a stuck panel
              clears the navbar by the same margin an anchored section does. */}
          <div className="order-first md:sticky md:top-[calc(var(--nav-h)+1.5rem)] md:order-none md:col-span-5 md:self-start">
            <Reveal delay={0.12}>
              <CrisisPanel />
            </Reveal>

            <Reveal delay={0.2}>
              <div className="bg-np-surface border-np-neutral-200 mt-6 flex items-start gap-3 rounded-2xl border p-5">
                <Phone
                  aria-hidden="true"
                  size={18}
                  strokeWidth={1.75}
                  className="text-np-blue-900 mt-0.5 shrink-0"
                />
                <div className="space-y-1">
                  <p className="text-small text-np-neutral-600">
                    Call the practice:{' '}
                    <a
                      href={`tel:${BUSINESS.phonePrimaryHref}`}
                      className="text-np-blue-600 font-medium underline-offset-4 hover:underline focus-visible:underline"
                    >
                      {BUSINESS.phonePrimary}
                    </a>
                  </p>
                  {/* DELIVERY_LINE, the client's delivery sentence, since
                      2026-10-02. The U+2011 non-breaking hyphen this line used
                      to carry went with the old wording: it stopped "in-person"
                      breaking after the hyphen at the narrow end of this
                      column, and the client's line has no hyphen in it. */}
                  <p className="text-small text-np-neutral-600">
                    {DELIVERY_LINE}.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        <Reveal delay={0.1}>
          <p className="text-body-l text-np-neutral-600 mt-20 max-w-[46ch]">
            If you’ve read this far, you’ve already taken a step. We’ll take the next one with you.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
