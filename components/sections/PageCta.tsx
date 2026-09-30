import Link from 'next/link';
import { CalendarCheck, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { BUSINESS, CTA } from '@/lib/content';

/**
 * Two things a patient wants to know at the moment of deciding to make contact,
 * and neither is a new claim. "No health details needed" restates the body copy
 * directly above it, which already asks people to keep health information out of
 * the form; saying it as a reassurance rather than an instruction is the point.
 * The states are the confirmed telehealth footprint, per CLAUDE.md's
 * care-modality note.
 *
 * Deliberately NOT here: response times, availability, "accepting new patients".
 * All three are the kind of thing a reader would act on and none is sourced.
 */
const assurances = [
  { icon: ShieldCheck, label: 'No health details needed' },
  { icon: MapPin, label: 'New Jersey and Pennsylvania' },
];

/**
 * Closing block for interior pages.
 *
 * One CTA intent, matching the homepage's. The crisis line is repeated on every
 * page rather than living only on the homepage: someone arriving on a service
 * page directly from a search result may never see the homepage at all, and
 * CLAUDE.md requires crisis guidance where a distressed visitor would look.
 *
 * CENTRED COLUMN, NOT THE 7/5 SPLIT IT REPLACED. The split put the crisis panel
 * in a side column at roughly 40% width, which read as a footnote to the CTA. It
 * is now full width under the copy, which is more prominent, not less, and it
 * lets the request itself be a single centred moment instead of competing with
 * a panel beside it.
 *
 * THE PHONE NUMBER IS A BUTTON NOW. It was a bare underlined link next to a
 * filled button, so the two routes to the same practice looked like a primary
 * action and an afterthought. Calling is the faster route for anyone in
 * distress, and it should not be the quieter one.
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
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <Reveal>
            {/* Two nested plates rather than one filled tile, so the mark reads
                as an object on the ink rather than a sticker on it. The inner
                plate is np-ink, the section's own ground, which is what gives
                the edge its depth. Decorative: the h2 below says what this is. */}
            <div className="relative flex size-20 items-center justify-center">
              <div
                aria-hidden="true"
                className="rounded-card absolute inset-0 bg-[var(--np-alpha-white-08)] ring-1 ring-white/15"
              />
              <div
                aria-hidden="true"
                className="bg-np-ink absolute inset-1 rounded-[10px] ring-1 ring-white/10"
              />
              <CalendarCheck
                aria-hidden="true"
                size={30}
                strokeWidth={1.75}
                className="relative text-white"
              />
            </div>
          </Reveal>

          {/* A fact, not a label. An eyebrow reading "Next step" above a heading
              that already says "Ready when you are" would be the templated move;
              the modality is the thing a reader actually needs here and it is
              confirmed content. White on this fill measures 12.73:1. */}
          <Reveal delay={0.06}>
            <Badge className="mt-6 border-white/20 bg-[var(--np-alpha-white-14)] text-white">
              In person or by telehealth
            </Badge>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="text-h2 mt-5 text-white">{heading}</h2>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="text-body-l text-np-blue-300 mt-4">{body}</p>
          </Reveal>

          <Reveal delay={0.22}>
            {/* Stacked below sm so neither label wraps on a phone: "Request an
                appointment" is 24 characters and does not survive a half-width
                pill at 320. */}
            <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
              <Button href={CTA.href} variant="onInk" size="lg">
                {CTA.label}
              </Button>
              <Button href={`tel:${BUSINESS.phonePrimaryHref}`} variant="onInkQuiet" size="lg">
                <Phone aria-hidden="true" size={18} strokeWidth={1.75} />
                {BUSINESS.phonePrimary}
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.28}>
            <ul
              role="list"
              className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
            >
              {assurances.map(({ icon: Icon, label }) => (
                <li key={label} className="text-small flex items-center gap-2 text-white/70">
                  <Icon aria-hidden="true" size={16} strokeWidth={1.75} className="shrink-0" />
                  {label}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* Left rule kept, and it is the one thing that stays asymmetric in a
            centred block. It is how this panel is marked as a different kind of
            thing from the request above it, and it is the same treatment the
            shared CrisisPanel carries. */}
        <Reveal delay={0.34}>
          <div className="rounded-card border-np-blue-300 mx-auto mt-14 max-w-2xl border-l-2 bg-[var(--np-alpha-white-08)] p-6 text-left md:mt-16 md:p-8">
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
