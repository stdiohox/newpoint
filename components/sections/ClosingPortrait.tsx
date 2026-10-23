import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { CLOSING_PORTRAIT, PROVIDERS } from '@/lib/content';

/**
 * The last section on the homepage: both providers, together, under the
 * client's tag. See CLOSING_PORTRAIT in lib/content.ts for the sourcing.
 *
 * ONE FLAT CARD, copy left and photograph right from md, photograph first on a
 * phone so the faces lead. The ring and radius are the ones the /services
 * cards use, so it reads as part of the same system rather than a banner.
 *
 * "Dr." RENDERS WITH THE CREDENTIALS ON THE NEXT LINE OF THE SAME ITEM, which
 * is CLAUDE.md's condition on the prefix. Do not split the two into separate
 * blocks.
 *
 * A plain <img>, not next/image: the file is served at the exact pixels
 * supplied, which is the client's rule for provider photographs.
 */
export function ClosingPortrait() {
  const { tag, image } = CLOSING_PORTRAIT;

  return (
    <section aria-labelledby="closing-portrait-heading" className="py-20 md:py-28">
      <Container>
        <div className="bg-np-surface rounded-card grid items-center gap-8 overflow-hidden p-5 ring-1 ring-[var(--np-alpha-ink-08)] sm:p-8 md:grid-cols-12 md:gap-12 lg:gap-16 lg:p-10">
          <Reveal className="md:order-2 md:col-span-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.src}
              width={image.width}
              height={image.height}
              alt={image.alt}
              loading="lazy"
              decoding="async"
              className="rounded-media h-auto w-full"
            />
          </Reveal>

          <div className="md:order-1 md:col-span-6">
            <Reveal>
              <h2
                id="closing-portrait-heading"
                className="font-display text-np-ink font-medium"
                style={{
                  fontSize: 'clamp(2.5rem, 1.75rem + 3vw, 4.5rem)',
                  letterSpacing: '-0.035em',
                  lineHeight: 1.02,
                  textWrap: 'balance',
                }}
              >
                {tag}
              </h2>
            </Reveal>

            <Reveal delay={0.08}>
              <ul role="list" className="border-np-neutral-200 mt-8 space-y-4 border-t pt-8">
                {PROVIDERS.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/providers/${p.slug}`}
                      className="group block focus-visible:outline-offset-4"
                    >
                      <span className="text-h3 text-np-blue-600 group-hover:text-np-blue-800 group-focus-visible:text-np-blue-800 ease-np-out inline-flex items-center gap-2 transition-colors duration-[180ms]">
                        {p.displayName}
                        <span
                          aria-hidden="true"
                          className="ease-np-out transition-transform duration-[180ms] group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none"
                        >
                          →
                        </span>
                      </span>
                      <span className="sr-only">, </span>
                      <span className="font-display text-small text-np-neutral-600 mt-0.5 block font-medium">
                        {p.credentials}
                      </span>
                    </Link>
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
