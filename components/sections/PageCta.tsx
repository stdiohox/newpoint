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
 * THE SECOND LINE SAYS "Telehealth in", AND DROPPING THOSE TWO WORDS IS A
 * REGULATED MISTAKE, NOT A TRIM. It first read "New Jersey and Pennsylvania",
 * which sat a few lines under a badge saying "In person or by telehealth" and
 * let the pair be read as in-person care in both states. CLAUDE.md is explicit:
 * state telehealth across both states freely, but state in-person care WITHOUT
 * attaching it to a state until the client confirms where, because the only
 * place-level evidence anywhere is Lawrence Township, NJ. The naming is what
 * keeps a Pennsylvania reader from driving to an office nobody has confirmed.
 *
 * Deliberately NOT here: response times, availability, "accepting new patients".
 * All three are the kind of thing a reader would act on and none is sourced.
 */
const assurances = [
  { icon: ShieldCheck, label: 'No health details needed' },
  { icon: MapPin, label: 'Telehealth in New Jersey and Pennsylvania' },
];

/**
 * Closing block for interior pages.
 *
 * THE CRISIS PANEL IS NO LONGER HERE, and the reason it was safe to remove is
 * specific: components/Footer.tsx carries a dedicated crisis strip with tappable
 * 988 and 911, it renders on every route, and it sits immediately below this
 * section. The panel was restating, a few hundred pixels higher, what the footer
 * says anyway. CLAUDE.md asks for crisis guidance where a distressed visitor
 * would plausibly look; the footer strip is that, and it was deliberately placed
 * above the footer's bottom row for the same reason.
 *
 * ONE PAGE LOST SOMETHING REAL, THOUGH. app/services/[slug] puts this block
 * above RelatedLinks precisely so 988 came before a "keep reading" grid on pages
 * that name PTSD, psychosis and schizophrenia. With the panel gone the nearest
 * 988 on those routes is the footer, which is BELOW that grid. See the note at
 * that call site. Putting <CrisisPanel /> on the service detail pages is the fix
 * if that matters.
 *
 * NO np-ink BAND. The deep navy was doing the work of separating this block from
 * the page, and it is a heavy device for a closing CTA that already sits above a
 * navy footer: the old sequence ran light page, navy CTA, navy footer, so the
 * CTA and the footer merged into one dark mass. np-blue-100 separates it by HUE
 * instead. Against the warm np-neutral-50 page it is only 1.16:1 in luminance,
 * which sounds like nothing and reads clearly, because the shift the eye
 * actually registers here is warm to cool, not light to dark.
 *
 * CENTRED COLUMN, NOT THE 7/5 SPLIT IT REPLACED. With the panel gone there is no
 * second column to balance, and the request reads as a single moment.
 *
 * THE PHONE NUMBER IS A BUTTON. It was a bare underlined link next to a filled
 * button, so the two routes to the same practice looked like a primary action
 * and an afterthought. Calling is the faster route for anyone in distress, and
 * it should not be the quieter one.
 */
export function PageCta({
  heading = 'Ready when you are',
  body = 'Send us your contact details and we will get back to you about an appointment. Please keep health information out of the form.',
}: {
  heading?: string;
  body?: string;
}) {
  return (
    <section className="bg-np-blue-100 py-20 md:py-28">
      <Container>
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <Reveal>
            {/* Two nested plates rather than one filled tile, so the mark reads
                as an object on the band rather than a sticker on it. The plates
                are only 1.21:1 and 1.10:1 apart, which is the point: this is a
                quiet raised tile, not a badge competing with the CTA below it.
                Decorative, and the h2 below says what this is. */}
            <div className="relative flex size-20 items-center justify-center">
              <div
                aria-hidden="true"
                className="rounded-card bg-np-surface absolute inset-0 ring-1 ring-[var(--np-alpha-ink-08)]"
              />
              <div aria-hidden="true" className="bg-np-blue-50 absolute inset-1 rounded-[10px]" />
              <CalendarCheck
                aria-hidden="true"
                size={30}
                strokeWidth={1.75}
                className="text-np-blue-600 relative"
              />
            </div>
          </Reveal>

          {/* A fact, not a label. An eyebrow reading "Next step" above a heading
              that already says "Ready when you are" would be the templated move;
              the modality is the thing a reader actually needs here and it is
              confirmed content.

              Overridden off the `secondary` variant rather than using it: that
              variant's np-neutral-200 fill measures 1.05:1 on this band and the
              chip would have disappeared. A white chip is 1.21:1, still quiet,
              and the np-blue-700 label carries it at 11.9:1. The chip is not an
              interactive control, so the boundary is not held to 3:1 the way the
              buttons below are. */}
          <Reveal delay={0.06}>
            <Badge className="bg-np-surface text-np-blue-700 mt-6 border-[var(--np-alpha-ink-08)]">
              In person or by telehealth
            </Badge>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="text-h2 text-np-ink mt-5">{heading}</h2>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="text-body-l text-np-neutral-600 mt-4">{body}</p>
          </Reveal>

          <Reveal delay={0.22}>
            {/* Stacked below sm so neither label wraps on a phone: "Request an
                appointment" is 24 characters and does not survive a half-width
                pill at 320. */}
            <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
              <Button href={CTA.href} variant="primary" size="lg">
                {CTA.label}
              </Button>
              <Button href={`tel:${BUSINESS.phonePrimaryHref}`} variant="quiet" size="lg">
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
                <li key={label} className="text-small text-np-neutral-600 flex items-center gap-2">
                  <Icon aria-hidden="true" size={16} strokeWidth={1.75} className="shrink-0" />
                  {label}
                </li>
              ))}
            </ul>
          </Reveal>
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
