import { LifeBuoy, Phone } from 'lucide-react';
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
 * them.
 *
 * THE CRISIS PANEL IS A CARD, NOT A FLAGGED ASIDE. It used to carry a
 * blue-600 left bar, which is the visual grammar of a warning callout. On a
 * page whose readers include people in crisis, that bar was the one element
 * raising the temperature. It is gone: the panel is now a plain white card
 * that reads as information, and the urgency lives in the size of the numbers
 * instead.
 *
 * The numbers are no longer links. Each item carries explicit buttons, so
 * "988" is read once as a number rather than twice as a duplicate tel: link,
 * and texting 988 becomes reachable at all.
 */

type CrisisItem = (typeof CRISIS.items)[number];

/**
 * Which lines accept a text message. 911 does not: text-to-911 depends on the
 * local PSAP supporting it and is not available nationwide, so offering it here
 * would promise a route that may silently go nowhere in a crisis.
 *
 * Typed against the labels in CRISIS.items rather than plain string, so that
 * renaming a line in lib/content.ts fails the build here instead of quietly
 * dropping its Text button. A line ADDED there still defaults to call-only,
 * which is the safe default but is not enforced by the type: recording the
 * capability on the item itself in content.ts would close that gap, and is
 * the better home for it if a third line is ever added.
 */
const TEXTABLE = new Set<CrisisItem['label']>(['988']);

/**
 * Buttons per crisis item. Both hrefs derive from item.href, so CRISIS.items is
 * the single source for the number itself. item.label is display copy and is
 * never parsed as a number: it only labels the button.
 */
function actionsFor(item: CrisisItem) {
  const number = item.href.replace(/^tel:/, '');
  return [
    { label: `Call ${item.label}`, href: item.href, filled: true },
    ...(TEXTABLE.has(item.label)
      ? [{ label: `Text ${item.label}`, href: `sms:${number}`, filled: false }]
      : []),
  ];
}

/**
 * Crisis buttons are local to this section rather than <Button />: they need a
 * np-blue-900 fill the shared variants do not carry, and a 44px minimum target
 * that <Button size="md"> (≈38px) does not reach. Everything else follows
 * Button.tsx — pill radius per the documented radius rule, 180ms np-out, the
 * same active press, and an explicit focus ring.
 *
 * Contrast on np-neutral-50: white on np-blue-900 is 16.1:1, np-blue-900 text
 * and its 1px ring are 15.5:1. Both clear AA with room.
 */
const actionBase =
  'inline-flex min-h-11 items-center justify-center rounded-pill px-5 text-small font-medium ' +
  'transition-colors duration-[180ms] ease-np-out active:scale-[0.98] motion-reduce:transition-none ' +
  'focus-visible:outline-np-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2';

const actionFilled = 'bg-np-blue-900 text-white hover:bg-np-blue-700';
const actionOutlined =
  'text-np-blue-900 hover:bg-np-blue-50 ring-np-blue-900 bg-transparent ring-1';

/** White card, hairline border, no elevation. Shared by both panels below. */
const card = 'bg-np-surface border-np-neutral-200 rounded-2xl border';

export function ContactCrisis() {
  return (
    <section id="contact" className="from-np-blue-50 bg-gradient-to-b to-white py-24 md:py-32">
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
          </div>

          {/* Sticky from md up so the numbers stay reachable for the whole
              length of the form, which is the taller column. self-start stops
              the grid stretching the item to the row height, without which it
              has no slack to stick in. The offset is --nav-h plus the same
              1.5rem globals.css gives scroll-padding-top, so a stuck panel
              clears the navbar by the same margin an anchored section does.
              Below md the column is simply the second block in source order,
              which stacks it under the form. */}
          <div className="md:sticky md:top-[calc(var(--nav-h)+1.5rem)] md:col-span-5 md:self-start">
            <Reveal delay={0.12}>
              {/* Named landmark, matching app/contact/page.tsx. An unnamed
                  <aside> is announced as a bare "complementary" in the rotor,
                  and landmark navigation is a plausible route to 988. */}
              <aside aria-labelledby="crisis-heading" className={`${card} p-8`}>
                <div className="flex items-start gap-4">
                  <span className="bg-np-blue-50 text-np-blue-900 flex size-10 shrink-0 items-center justify-center rounded-full">
                    <LifeBuoy aria-hidden="true" size={20} strokeWidth={1.75} />
                  </span>
                  <div>
                    {/* 24px, carrying the h3 token's weight and tracking at a
                        size the scale does not define. */}
                    <h3
                      id="crisis-heading"
                      className="font-display text-np-ink text-2xl leading-tight font-[550] tracking-[-0.01em]"
                    >
                      {CRISIS.heading}
                    </h3>
                    <p className="text-small text-np-neutral-600 mt-2">{CRISIS.body}</p>
                  </div>
                </div>

                <ul role="list" className="mt-6 space-y-4">
                  {CRISIS.items.map((item) => (
                    <li key={item.label} className="bg-np-neutral-50 rounded-xl p-5">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="font-display text-np-blue-900 text-[2.5rem] leading-none font-[550] tracking-[-0.02em]">
                          {item.label}
                        </span>
                        <p className="text-np-ink font-medium">{item.title}</p>
                      </div>
                      <p className="text-small text-np-neutral-600 mt-3">{item.body}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {actionsFor(item).map((action) => (
                          <a
                            key={action.label}
                            href={action.href}
                            /* The visible label is just "Call 988". The service
                               it reaches is the part a screen-reader user needs
                               before committing to a phone call. */
                            aria-label={`${action.label}, ${item.title}`}
                            className={`${actionBase} ${action.filled ? actionFilled : actionOutlined}`}
                          >
                            {action.label}
                          </a>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </aside>
            </Reveal>

            <Reveal delay={0.2}>
              <div className={`${card} mt-6 flex items-start gap-3 p-5`}>
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
                  {/* U+2011 non-breaking hyphen in "in-person": at the narrow
                      end of this column the line was breaking after "in-",
                      which leaves a dangling prefix mid-sentence. */}
                  <p className="text-small text-np-neutral-600">
                    Telehealth across {BUSINESS.serviceArea.join(' and ')}, and in‑person care.
                  </p>
                </div>
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
