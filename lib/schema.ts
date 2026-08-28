/**
 * schema.org JSON-LD.
 *
 * Only confirmed data is emitted. Address and license/NPI identifiers are
 * deliberately omitted rather than fabricated: an incorrect `address` or
 * `identifier` on a MedicalBusiness is worse than an absent one, and both are
 * listed in OPEN_CLIENT_ITEMS.
 */
import { BUSINESS, PROVIDERS, INSURANCE, WHAT_WE_TREAT } from './content';

const PHYSICIAN_IDS = PROVIDERS.map((p) => `${BUSINESS.domain}/#provider-${p.slug}`);

export function medicalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalBusiness',
    '@id': `${BUSINESS.domain}/#organization`,
    name: BUSINESS.legalName,
    alternateName: BUSINESS.shortName,
    url: BUSINESS.domain,
    slogan: BUSINESS.tagline,
    description:
      'Outpatient psychiatric and behavioral health nurse practitioner practice serving New Jersey and Pennsylvania. Psychiatric evaluation, medication management, and telehealth.',
    medicalSpecialty: 'Psychiatric',
    telephone: BUSINESS.phonePrimary,
    faxNumber: BUSINESS.fax,
    // CLIENT: `address` intentionally omitted. No street address is published or
    // confirmed. Add PostalAddress once the client supplies it, or keep
    // areaServed alone if this is confirmed service-area only.
    areaServed: BUSINESS.serviceArea.map((s) => ({
      '@type': 'State',
      name: s,
    })),
    availableService: WHAT_WE_TREAT.services.map((s) => ({
      '@type': 'MedicalTherapy',
      name: s.title,
      description: s.body,
    })),
    // CLIENT: confirm insurer relationships before treating these as formal
    // network claims. Sourced from the practice's own published list.
    paymentAccepted: 'Cash, Credit Card, Debit Card, Insurance',
    currenciesAccepted: 'USD',
    employee: PHYSICIAN_IDS.map((id) => ({ '@id': id })),
    knowsAbout: [...WHAT_WE_TREAT.conditions],
    isAcceptingNewPatients: true,
    // CLIENT: `openingHoursSpecification` omitted, hours are not published anywhere.
  };
}

export function physicianSchema() {
  return PROVIDERS.map((p) => ({
    '@context': 'https://schema.org',
    '@type': 'Physician',
    '@id': `${BUSINESS.domain}/#provider-${p.slug}`,
    name: `${p.name}, ${p.credentials}`,
    givenName: p.name.split(' ')[0],
    familyName: p.name.split(' ').slice(-1)[0],
    jobTitle: p.role,
    medicalSpecialty: 'Psychiatric',
    description: p.bio,
    image: `${BUSINESS.domain}${p.image.jpg1120}`,
    email: p.email,
    telephone: BUSINESS.phonePrimary,
    worksFor: { '@id': `${BUSINESS.domain}/#organization` },
    areaServed: BUSINESS.serviceArea.map((s) => ({ '@type': 'State', name: s })),
    knowsAbout: p.treats,
    // CLIENT: `identifier` (NPI) and license numbers omitted, not published.
    // CLIENT: `hasCredential` omitted, the certifying body is not stated anywhere.
  }));
}

export function faqSchema(groups: readonly { items: readonly { q: string; a: string }[] }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: groups.flatMap((g) =>
      g.items.map((i) => ({
        '@type': 'Question',
        name: i.q,
        acceptedAnswer: { '@type': 'Answer', text: i.a },
      }))
    ),
  };
}

export function insuranceNote() {
  return INSURANCE.payers;
}
