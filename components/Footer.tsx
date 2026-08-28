import { Container } from '@/components/ui/Container';
import { BUSINESS, NAV, PROVIDERS } from '@/lib/content';

/**
 * CLIENT: no street address is published or confirmed, so no address block
 * exists here by design. Geography is stated as service area only. Add a
 * PostalAddress here and in lib/schema.ts together, once confirmed.
 * CLIENT: hours of operation are not published, so no hours block is shown.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-np-ink py-16 text-white/70">
      <Container>
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-display text-body-l font-semibold text-white">
              {BUSINESS.legalName}
            </p>
            <p className="text-small mt-2 max-w-[38ch]">
              Outpatient psychiatric and behavioral health care for{' '}
              {BUSINESS.serviceArea.join(' and ')}, in person and by telehealth.
            </p>
            <p className="text-small mt-4">
              <a
                href={`tel:${BUSINESS.phonePrimaryHref}`}
                className="text-np-blue-300 underline-offset-4 hover:underline"
              >
                {BUSINESS.phonePrimary}
              </a>
              <span className="mx-2 text-white/30">/</span>
              <span>Fax {BUSINESS.fax}</span>
            </p>
          </div>

          <nav aria-label="Footer" className="md:col-span-3">
            <h2 className="text-caption text-white/50">Explore</h2>
            <ul className="mt-3 space-y-2">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="text-small hover:text-white">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-4">
            <h2 className="text-caption text-white/50">Providers</h2>
            <ul className="mt-3 space-y-2">
              {PROVIDERS.map((p) => (
                <li key={p.slug} className="text-small">
                  <span className="text-white">{p.name}</span>
                  <span className="text-white/50">, {p.credentials}</span>
                </li>
              ))}
            </ul>
            <p className="text-small mt-5">
              In a crisis, call or text{' '}
              <a href="tel:988" className="text-np-blue-300 underline-offset-4 hover:underline">
                988
              </a>
              . In an emergency, call{' '}
              <a href="tel:911" className="text-np-blue-300 underline-offset-4 hover:underline">
                911
              </a>
              .
            </p>
          </div>
        </div>

        <div className="mt-14 border-t border-[var(--np-alpha-white-14)] pt-6">
          <p className="text-caption text-white/50">
            {year} {BUSINESS.legalName}. This website is for general information and is not medical
            advice, and it is not monitored around the clock.
          </p>
        </div>
      </Container>
    </footer>
  );
}
