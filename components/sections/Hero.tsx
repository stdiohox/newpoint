import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { stagger } from '@/lib/motion';
import { ProviderPortrait } from '@/components/ui/ProviderPortrait';
import { HERO, CTA, PROVIDERS, BUSINESS } from '@/lib/content';

/**
 * Layout family: asymmetric split. Copy left, the two providers right.
 *
 * Hero discipline: 3 text elements (headline, subtext, CTA), no eyebrow, no
 * trust micro-strip, no scroll cue, no tagline under the CTA. Top padding is
 * capped so the content does not float down the viewport.
 *
 * The providers appear here as identity and again in section 3 as full cards
 * with bios and conditions. Different role, different density, not a repeat.
 *
 * CLIENT: no practice or office photography exists. If real photography is
 * supplied later it belongs here, and the portrait duo moves down to section 3 only.
 */
export function Hero() {
  return (
    <section className="pt-16 pb-20 md:pt-24 md:pb-32">
      <Container>
        <div className="grid items-center gap-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-7">
            <Reveal>
              <h1 className="text-display-xl text-np-ink">{HERO.headline}</h1>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="text-body-l text-np-neutral-600 mt-6 max-w-[52ch]">{HERO.subtext}</p>
            </Reveal>
            <Reveal delay={0.16}>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Button href={CTA.href} size="lg">
                  {CTA.label}
                </Button>
                {/* Canonical CTA pair, adapted from Grove AI: filled primary beside an
                    outlined ghost. Distinct intents (book vs call), so this is not a
                    duplicate CTA. The outlined variant also gives the phone number a
                    real tap target on mobile, which a bare text link did not. */}
                <Button href={`tel:${BUSINESS.phonePrimaryHref}`} variant="quiet" size="lg">
                  {BUSINESS.phonePrimary}
                </Button>
              </div>
            </Reveal>
          </div>

          <div className="md:col-span-5">
            <Reveal delay={0.24}>
              <ul className="flex gap-4 sm:gap-6">
                {PROVIDERS.map((p, i) => (
                  <li key={p.slug} className="flex-1">
                    <Reveal delay={0.24 + stagger(i, 0.08)}>
                      <ProviderPortrait
                        provider={p}
                        sizes="(min-width: 768px) 240px, 44vw"
                        className="w-full shadow-[var(--shadow-np-card)]"
                      />
                      <p className="font-display text-small text-np-ink mt-3 font-semibold">
                        {p.name}
                      </p>
                      <p className="text-caption text-np-neutral-500">{p.credentials}</p>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
