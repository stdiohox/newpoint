/**
 * schema.org JSON-LD.
 *
 * Only confirmed data is emitted. Address and license/NPI identifiers are
 * deliberately omitted rather than fabricated: an incorrect `address` or
 * `identifier` on a MedicalBusiness is worse than an absent one, and both are
 * listed in OPEN_CLIENT_ITEMS.
 *
 * `@id` values are stable and cross-referenced, so the organization, the two
 * providers, and each service page describe one connected graph rather than
 * three unrelated blobs.
 *
 * Note on scope: search engines evaluate structured data per document, not
 * across a site. An `{'@id': ...}` stub only resolves if the full node is in
 * the SAME page's markup. So the homepage emits the full Physician and
 * MedicalTherapy nodes alongside the organization, and each interior page
 * re-emits the node it is about. The shared `@id` is what lets engines
 * reconcile them as one entity across URLs.
 */
import {
  BUSINESS,
  PROVIDERS,
  INSURANCE,
  WHAT_WE_TREAT,
  SERVICE_PAGES,
  type Provider,
  type ServicePage,
} from './content';

const ORG_ID = `${BUSINESS.domain}/#organization`;

export const providerId = (slug: string) => `${BUSINESS.domain}/providers/${slug}#physician`;
export const serviceId = (slug: string) => `${BUSINESS.domain}/services/${slug}#service`;

export function medicalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalBusiness',
    '@id': ORG_ID,
    name: BUSINESS.legalName,
    alternateName: BUSINESS.shortName,
    url: BUSINESS.domain,
    slogan: BUSINESS.tagline,
    description:
      'Outpatient psychiatric and behavioral health nurse practitioner practice serving New Jersey and Pennsylvania. Psychiatric evaluation, medication management, and telehealth.',
    medicalSpecialty: 'Psychiatric',
    telephone: BUSINESS.phonePrimary,
    faxNumber: BUSINESS.fax,
    logo: `${BUSINESS.domain}/icon.png`,
    image: `${BUSINESS.domain}/opengraph-image`,
    // CLIENT: `address` intentionally omitted. No street address is published or
    // confirmed. Add PostalAddress once the client supplies it, or keep
    // areaServed alone if this is confirmed service-area only.
    //
    // The town is included as a served City, not as an address. The live site
    // names Lawrence Township on every page and it is the only place-level
    // signal the practice has; dropping it entirely alongside the address would
    // give up local relevance the practice already holds.
    areaServed: [
      ...BUSINESS.serviceArea.map((s) => ({ '@type': 'State', name: s })),
      { '@type': 'City', name: BUSINESS.serviceAreaNote },
    ],
    availableService: SERVICE_PAGES.map((s) => ({ '@id': serviceId(s.slug) })),
    // CLIENT: confirm insurer relationships before treating these as formal
    // network claims. Sourced from the practice's own published list.
    paymentAccepted: 'Cash, Credit Card, Debit Card, Insurance',
    currenciesAccepted: 'USD',
    employee: PROVIDERS.map((p) => ({ '@id': providerId(p.slug) })),
    knowsAbout: [...WHAT_WE_TREAT.conditions],
    // CLIENT: `isAcceptingNewPatients` omitted. Nothing in the source material
    // states the practice is open to new patients, and it is a machine-readable
    // operational claim that goes stale the day a panel closes. Add it back once
    // confirmed.
    // CLIENT: `openingHoursSpecification` omitted, hours are not published anywhere.
  };
}

/**
 * The organization's core identity, without the `employee` and
 * `availableService` cross-reference arrays.
 *
 * Interior pages emit this. Their primary entity (a provider, a service) points
 * at the organization via `worksFor` / `provider`, and a reference whose target
 * is not in the same document resolves to nothing — so the organization has to
 * be present wherever it is referenced. The relationship arrays are left to the
 * homepage, which carries the full nodes they point at.
 */
export function organizationRef() {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalBusiness',
    '@id': ORG_ID,
    name: BUSINESS.legalName,
    alternateName: BUSINESS.shortName,
    url: BUSINESS.domain,
    medicalSpecialty: 'Psychiatric',
    telephone: BUSINESS.phonePrimary,
    logo: `${BUSINESS.domain}/icon.png`,
    areaServed: [
      ...BUSINESS.serviceArea.map((s) => ({ '@type': 'State', name: s })),
      { '@type': 'City', name: BUSINESS.serviceAreaNote },
    ],
  };
}

/**
 * One provider, fully described. Emitted on that provider's own page.
 *
 * `@type: 'Physician'` is what this repo's CLAUDE.md specifies. Worth the
 * client knowing: both providers are nurse practitioners, not physicians, and
 * schema.org's `Physician` descends from Organization rather than Person.
 * `jobTitle` and `hasOccupation` below state the actual role so the markup does
 * not imply a credential neither holds. Changing the type is a client decision,
 * not a unilateral one.
 *
 * `givenName`/`familyName` are deliberately not set: they are Person
 * properties and are not valid on an Organization-hierarchy type.
 */
export function physicianSchemaFor(p: Provider) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    '@id': providerId(p.slug),
    url: `${BUSINESS.domain}/providers/${p.slug}`,
    name: `${p.name}, ${p.credentials}`,
    jobTitle: p.role,
    hasOccupation: {
      '@type': 'Occupation',
      name: 'Psychiatric Mental Health Nurse Practitioner',
    },
    medicalSpecialty: 'Psychiatric',
    description: p.bio,
    image: `${BUSINESS.domain}${p.image.jpg1120}`,
    email: p.email,
    telephone: BUSINESS.phonePrimary,
    worksFor: { '@id': ORG_ID },
    areaServed: BUSINESS.serviceArea.map((s) => ({ '@type': 'State', name: s })),
    knowsAbout: p.treats,
    // CLIENT: `identifier` (NPI) and license numbers omitted, not published.
    // CLIENT: `hasCredential` omitted, the certifying body is not stated anywhere.
  };
}

/** Both providers. Used on the homepage, which lists them both. */
export function physicianSchema() {
  return PROVIDERS.map(physicianSchemaFor);
}

/**
 * One service page, as a service offered by the practice.
 *
 * The type varies per service rather than being MedicalTherapy across the
 * board: an evaluation is diagnostic, not therapeutic, and telehealth is a
 * delivery modality rather than a treatment. See `schemaType` in content.ts.
 */
export function serviceSchemaFor(s: ServicePage) {
  return {
    '@context': 'https://schema.org',
    '@type': s.schemaType,
    '@id': serviceId(s.slug),
    url: `${BUSINESS.domain}/services/${s.slug}`,
    name: s.title,
    description: s.intro,
    provider: { '@id': ORG_ID },
    availableIn: BUSINESS.serviceArea.map((state) => ({ '@type': 'State', name: state })),
  };
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

/** FAQ blocks on interior pages, which carry a flat list rather than groups. */
export function faqSchemaFlat(items: readonly { q: string; a: string }[]) {
  return faqSchema([{ items }]);
}

/**
 * Breadcrumbs. Emitted on every page below the root so search results show the
 * site's hierarchy rather than a bare URL.
 *
 * `trail` excludes the home crumb, which is prepended here.
 */
export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  const all = [{ name: 'Home', path: '/' }, ...trail];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: all.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: `${BUSINESS.domain}${crumb.path === '/' ? '' : crumb.path}`,
    })),
  };
}

export function insuranceNote() {
  return INSURANCE.payers;
}
