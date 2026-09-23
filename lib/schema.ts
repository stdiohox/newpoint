/**
 * schema.org JSON-LD.
 *
 * Only confirmed data is emitted. Address and license/NPI identifiers are
 * deliberately omitted rather than fabricated: an incorrect `address` or
 * `identifier` on a MedicalClinic is worse than an absent one, and both are
 * listed in OPEN_CLIENT_ITEMS.
 *
 * `@id` values are stable and cross-referenced, so the organization, the two
 * providers, and each service page describe one connected graph rather than
 * three unrelated blobs.
 *
 * Note on scope: search engines evaluate structured data per document, not
 * across a site. An `{'@id': ...}` stub only resolves if the full node is in
 * the SAME page's markup. So the homepage emits the full provider and service
 * nodes alongside the organization, and each interior page re-emits the node
 * it is about. The shared `@id` is what lets engines reconcile them as one
 * entity across URLs.
 *
 * The practice is a `MedicalClinic`; the two providers are each a `Person`
 * with a nurse-practitioner `jobTitle`. Never `Physician` — see
 * `personSchemaFor` and this repo's CLAUDE.md.
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

export const providerId = (slug: string) => `${BUSINESS.domain}/providers/${slug}#provider`;
export const serviceId = (slug: string) => `${BUSINESS.domain}/services/${slug}#service`;

/**
 * The job title both providers hold, written once.
 *
 * This is the expansion of PMHNP-BC, which is in both providers' post-nominals
 * in /research/people-trust.md. It is not a credential claim beyond what the
 * research already records.
 */
const PROVIDER_JOB_TITLE = 'Psychiatric-Mental Health Nurse Practitioner';

export function medicalClinicSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalClinic',
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
      {
        '@type': 'City',
        name: BUSINESS.serviceAreaTown,
        containedInPlace: { '@type': 'State', name: 'New Jersey' },
      },
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
    '@type': 'MedicalClinic',
    '@id': ORG_ID,
    name: BUSINESS.legalName,
    alternateName: BUSINESS.shortName,
    url: BUSINESS.domain,
    medicalSpecialty: 'Psychiatric',
    telephone: BUSINESS.phonePrimary,
    logo: `${BUSINESS.domain}/icon.png`,
    areaServed: [
      ...BUSINESS.serviceArea.map((s) => ({ '@type': 'State', name: s })),
      {
        '@type': 'City',
        name: BUSINESS.serviceAreaTown,
        containedInPlace: { '@type': 'State', name: 'New Jersey' },
      },
    ],
  };
}

/**
 * One provider, fully described. Emitted on that provider's own page.
 *
 * `Person`, never `Physician`. Both providers are advanced practice nurses, not
 * physicians, and New Jersey and Pennsylvania both have title-protection
 * statutes around "physician". A machine-readable type assertion is exactly
 * where that distinction gets flattened, because knowledge panels and answer
 * engines read the type and not the disclaimer next to it.
 *
 * `Person` is also the structurally correct choice: schema.org's `Physician`
 * descends from Organization, so the `givenName`, `familyName` and `jobTitle`
 * this node needs were never valid on it. They are valid here.
 *
 * The role is carried by `jobTitle` and `hasOccupation`; the post-nominals go
 * in `honorificSuffix` exactly as /research/people-trust.md records them.
 */
export function personSchemaFor(p: Provider) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': providerId(p.slug),
    url: `${BUSINESS.domain}/providers/${p.slug}`,
    name: p.name,
    givenName: p.name.split(' ')[0],
    familyName: p.name.split(' ').slice(-1)[0],
    // Verbatim from the research, split into the three distinct post-nominals
    // rather than one comma-joined string. No credential is added to either.
    honorificSuffix: p.credentials.split(',').map((c) => c.trim()),
    jobTitle: PROVIDER_JOB_TITLE,
    hasOccupation: {
      '@type': 'Occupation',
      name: PROVIDER_JOB_TITLE,
      /**
       * O*NET-SOC code for Nurse Practitioners. A standard occupational
       * classification, not a claim about either individual. Tagged with its
       * defining set, because a bare "29-1171.00" identifies no taxonomy.
       *
       * There is no PMHNP-specific SOC code, so this is broader than the role
       * in `name` above — broader is the safe direction.
       */
      occupationalCategory: {
        '@type': 'CategoryCode',
        codeValue: '29-1171.00',
        name: 'Nurse Practitioners',
        inDefinedTermSet: 'https://www.onetonline.org/',
      },
      /**
       * Licensure geography lives here, not in `areaServed`. `areaServed` is
       * not a valid property of Person — it was only valid on the old
       * `Physician` node because that type descends from Organization. On
       * `Occupation` this also reads as "licensed to practise in", which is
       * what is actually meant.
       */
      occupationalLocation: BUSINESS.serviceArea.map((s) => ({ '@type': 'State', name: s })),
    },
    description: p.bio,
    image: `${BUSINESS.domain}${p.image.jpg1120}`,
    email: p.email,
    telephone: BUSINESS.phonePrimary,
    worksFor: { '@id': ORG_ID },
    knowsAbout: p.treats,
    // CLIENT: `identifier` (NPI) and license numbers omitted, not published.
    // CLIENT: `hasCredential` omitted, the certifying body is not stated anywhere.
    // CLIENT: `sameAs` omitted. It is the strongest signal for tying this name
    // to the same person on Psychology Today, LinkedIn or the NPI registry, and
    // no profile URL is confirmed for either provider. Supply them and add here.
  };
}

/** Both providers. Used on the homepage, which lists them both. */
export function providersSchema() {
  return PROVIDERS.map(personSchemaFor);
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
