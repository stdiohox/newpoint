/**
 * All site copy in one place.
 *
 * SOURCING RULE (per CLAUDE.md): marketing, service, and bio copy is generated
 * from /research. Verifiable regulated facts are never invented. Anything not
 * confirmed in /research is listed in `OPEN_CLIENT_ITEMS` below and marked at
 * its point of use with a `CLIENT:` comment.
 */

export const BUSINESS = {
  /**
   * Canonical name per CLAUDE.md. The live site spells this four different ways.
   * CLIENT: confirm exact legal name from the LLC formation documents,
   * "Newpoint" (one word) vs "New Point" (two words), before any GBP or citation work.
   */
  legalName: 'Newpoint Healthcare Services, LLC',
  shortName: 'Newpoint',
  tagline: 'Your Health is our Priority',
  domain: 'https://www.newpointnp.com',

  // Confirmed in /research/business-nap.md
  phonePrimary: '(609) 527-9438',
  phonePrimaryHref: '+16095279438',
  phoneAlt: ['(215) 526-4153', '(215) 987-2847'],
  fax: '(609) 527-9437',

  /**
   * No practice-wide inbox exists; only the two named provider addresses.
   * CLIENT: supply a general inbox (info@ or contact@) for the contact form.
   */
  emails: {
    whitaker: 'fwhitaker@newpointnp.com',
    ofoegbu: 'aofoegbu@newpointnp.com',
  },

  /**
   * In-person care IS confirmed by the client (see CLAUDE.md, "Care modality").
   * What is still missing is the street address, and which states in-person care
   * covers. Geography is therefore framed as service area only.
   * CLIENT: supply the practice address and the in-person service states.
   */
  serviceArea: ['New Jersey', 'Pennsylvania'],
  serviceAreaNote: 'Lawrence Township, New Jersey',
  /** The town alone. schema.org's City node takes the state via containedInPlace. */
  serviceAreaTown: 'Lawrence Township',
} as const;

/**
 * Primary navigation.
 *
 * Every href is root-relative, never a bare `#anchor`, because the nav now
 * renders on interior routes as well as the homepage. A bare `#providers` on
 * /insurance would resolve against /insurance and go nowhere.
 */
export const NAV = [
  { label: 'Services', href: '/services' },
  { label: 'Providers', href: '/#providers' },
  { label: 'Insurance', href: '/insurance' },
  { label: 'New patients', href: '/new-patients' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'Contact', href: '/contact' },
] as const;

/** Single CTA intent across the entire site. Never a second label for this action. */
export const CTA = {
  label: 'Request an appointment',
  href: '/#contact',
} as const;

export const HERO = {
  headline: 'Psychiatric care across New Jersey and Pennsylvania',
  /**
   * The same headline, broken into two lines. The literal \n is the split point
   * for the hero's per-character entrance animation. No wording differs from
   * `headline` above.
   */
  headlineLines: 'Psychiatric care across\nNew Jersey and Pennsylvania',
  subtext:
    'Evaluation, medication management, and telehealth from two doctorate-prepared psychiatric nurse practitioners. Most major insurance accepted.',
  /**
   * Three service names for the hero's glass tag, word-for-word as `subtext`
   * already names them. No new service is claimed here.
   */
  tag: 'Evaluation. Medication management. Telehealth.',
} as const;

/**
 * Compact practice facts. Adapted from Grove AI's proof-point formula, with the
 * big-number treatment and small-caps labels deliberately removed. See
 * references/disposition.md for the reasoning.
 *
 * Every line restates something already confirmed in /research/people-trust.md.
 * No figure is invented and no certifying body is named, because none is stated
 * anywhere in the source material.
 */
export const PRACTICE_FACTS = [
  { fact: 'Two providers', detail: 'Both hold a Doctor of Nursing Practice' },
  { fact: 'Dual-certified', detail: 'PMHNP-BC and FNP-BC, both providers' },
  { fact: 'Two states', detail: 'Licensed in New Jersey and Pennsylvania' },
] as const;

export const INSURANCE = {
  /**
   * "Accept", never "in network". The research records only "Accepted Insurance
   * Plans" — a practice can accept a plan and still bill out of network, so
   * asserting network participation states a contract we have not seen.
   * CLIENT: confirm in-network participation per payer if the practice wants to
   * make that stronger claim.
   */
  heading: 'We accept most major plans',
  body: 'We accept the plans below. If yours is not listed, ask us and we will check your coverage before your first appointment.',
  // Confirmed in /research/business-nap.md and /research/services-analysis.md
  payers: [
    'Aetna',
    'Optum',
    'Cigna Evernorth',
    'United Healthcare',
    'Medicare',
    'NJ Medicaid',
    'Blue Cross Blue Shield Horizon NJ',
  ],
  selfPay:
    'A session fee and a sliding scale are available for patients paying without insurance. We accept all major credit and debit cards and cash.',
} as const;

export type Provider = {
  slug: string;
  name: string;
  credentials: string;
  role: string;
  image: { webp560: string; webp1120: string; jpg560: string; jpg1120: string; alt: string };
  licensed: string;
  experience: string;
  approach: string;
  bio: string;
  treats: string[];
  email: string;
};

/** Every fact below is drawn from /research/people-trust.md. Nothing is added. */
export const PROVIDERS: Provider[] = [
  {
    slug: 'funmilayo-whitaker',
    name: 'Funmilayo Whitaker',
    credentials: 'DNP, FNP-BC, PMHNP-BC',
    role: 'Psychiatric-Mental Health Nurse Practitioner',
    image: {
      webp560: '/images/providers/funmilayo-whitaker-560.webp',
      webp1120: '/images/providers/funmilayo-whitaker-1120.webp',
      jpg560: '/images/providers/funmilayo-whitaker-560.jpg',
      jpg1120: '/images/providers/funmilayo-whitaker-1120.jpg',
      alt: 'Funmilayo Whitaker, DNP, FNP-BC, PMHNP-BC, psychiatric mental health nurse practitioner at Newpoint',
    },
    licensed: 'Licensed in New Jersey and Pennsylvania',
    experience: 'More than 10 years of direct patient care',
    approach: 'Warm, empathic, non-judgmental, and collaborative',
    bio: 'Funmilayo is dual board-certified as a psychiatric mental health nurse practitioner and a family nurse practitioner. She has practiced in group practice, community settings, and telehealth, and provides medication management for individuals across the lifespan living with a wide range of psychiatric conditions.',
    treats: [
      'Depression',
      'Anxiety',
      'Bipolar disorder',
      'Panic attacks',
      'OCD',
      'PTSD',
      'Schizophrenia',
    ],
    email: BUSINESS.emails.whitaker,
  },
  {
    slug: 'anastasia-ofoegbu',
    name: 'Anastasia O. Ofoegbu',
    credentials: 'DNP, FNP-BC, PMHNP-BC',
    role: 'Psychiatric-Mental Health Nurse Practitioner',
    image: {
      webp560: '/images/providers/anastasia-ofoegbu-560.webp',
      webp1120: '/images/providers/anastasia-ofoegbu-1120.webp',
      jpg560: '/images/providers/anastasia-ofoegbu-560.jpg',
      jpg1120: '/images/providers/anastasia-ofoegbu-1120.jpg',
      alt: 'Anastasia O. Ofoegbu, DNP, FNP-BC, PMHNP-BC, psychiatric mental health nurse practitioner at Newpoint',
    },
    licensed: 'Licensed in New Jersey and Pennsylvania',
    experience: '14 years in nursing, the last 11 focused on mental health and addiction',
    approach: 'Evidence-based and patient-centered',
    bio: 'Anastasia is dual-certified as a psychiatric mental health nurse practitioner and a family nurse practitioner. She provides psychiatric evaluations, medication management, and supportive counseling. Outside of practice she enjoys traveling, reading, and spending time with her family.',
    treats: [
      'Depression',
      'Anxiety and panic attacks',
      'Bipolar disorder',
      'Mood disorders',
      'Psychotic disorders',
    ],
    email: BUSINESS.emails.ofoegbu,
  },
];

export const WHAT_WE_TREAT = {
  heading: 'What we treat, and how',
  body: 'Care begins with a comprehensive psychiatric evaluation and a treatment plan built around it. From there we manage medication, monitor progress with standardized clinical measures, and adjust as your needs change.',
  /** Conditions aggregated in /research/services-analysis.md */
  conditions: [
    'Depression',
    'Anxiety',
    'Bipolar disorder',
    'Panic attacks',
    'OCD',
    'PTSD',
    'Schizophrenia',
    'Mood disorders',
    'Psychosis',
    'Irritability and anger',
    'Stress and burnout',
  ],
  /**
   * Treatment options named on the live site.
   *
   * `href` points at the service's own page where one exists. The fourth entry
   * has none: the source material describes counseling and referral in a single
   * line, which is not enough to carry a page without invention.
   */
  services: [
    {
      title: 'Comprehensive psychiatric evaluation',
      body: 'A full assessment that identifies risk factors, establishes a diagnosis, and produces a treatment plan.',
      href: '/services/psychiatric-evaluation',
    },
    {
      title: 'Medication management',
      body: 'Ongoing prescribing and review, with standardized rating scales used to track progress and catch changes early.',
      href: '/services/medication-management',
    },
    {
      title: 'Telehealth',
      body: 'Appointments by video on an expanded schedule, including weekends, evenings, and holidays by request.',
      href: '/services/telehealth',
    },
    {
      title: 'Individual counseling and referral',
      body: 'Supportive counseling alongside medication care, plus referral to follow-up services and coordination with your other clinicians.',
      href: null,
    },
  ],
} as const;

/**
 * Long-form service pages.
 *
 * Each one is an indexable destination targeting a single query cluster, rather
 * than another anchor on the homepage. The homepage `WHAT_WE_TREAT.services`
 * cards stay as the overview and link down into these.
 *
 * SOURCING: every clinical claim below restates something confirmed in
 * /research/services-analysis.md or /research/content/services.md. The practice
 * describes its own process in detail on the live Services page, which is what
 * makes these pages possible without invention. Where the source is silent —
 * session length, appointment frequency, named modalities, age range, hours —
 * the page stays silent too and the gap is marked CLIENT.
 */
export type ServicePage = {
  slug: string;
  nav: string;
  /**
   * schema.org type for this service. Not MedicalTherapy across the board: an
   * evaluation is a diagnostic procedure, and telehealth is how care is
   * delivered rather than a treatment in itself.
   */
  schemaType: 'MedicalProcedure' | 'MedicalTherapy' | 'Service';
  /** H1. */
  title: string;
  /** The `%s` in the layout's title template. Keep under ~50 characters. */
  metaTitle: string;
  metaDescription: string;
  intro: string;
  sections: { heading: string; body: string; list?: string[] }[];
  faqs: { q: string; a: string }[];
};

export const SERVICE_PAGES: ServicePage[] = [
  {
    slug: 'psychiatric-evaluation',
    nav: 'Psychiatric evaluation',
    schemaType: 'MedicalProcedure',
    title: 'Comprehensive psychiatric evaluation',
    metaTitle: 'Psychiatric Evaluation in NJ and PA',
    metaDescription:
      'What happens at a comprehensive psychiatric evaluation in New Jersey and Pennsylvania: full history, rating scales, a diagnosis, and a treatment plan.',
    intro:
      'Every patient at Newpoint starts here. A comprehensive psychiatric evaluation is the appointment where we take a full history, understand what brought you in, and finish with a diagnosis and a treatment plan built around it. It is the foundation everything else is built on.',
    sections: [
      {
        heading: 'What the evaluation covers',
        body: 'The evaluation is structured rather than conversational-only, so nothing important gets missed. We work through your history and current symptoms, and we identify the risk factors that may be affecting your mental health — the things that make a condition harder to manage, or easier to miss.',
      },
      {
        heading: 'The tools we use',
        body: 'Structured instruments sit alongside the clinical conversation. They give us a baseline to measure against later, which is what makes it possible to tell real progress from a good week.',
        list: [
          'A comprehensive psychiatric evaluation questionnaire',
          'Standardized clinical rating scales, recorded at baseline',
          'Screening tests, both to identify conditions and to rule others out',
        ],
      },
      {
        heading: 'Reaching a diagnosis',
        body: 'A diagnosis is determined through assessment, not assumption. We tell you what we have found and what it means, in plain language. If the picture is not yet clear, we say that too rather than reaching for a label that might not fit.',
      },
      {
        heading: 'Your treatment plan',
        // "A treatment plan", not "a written treatment plan you have agreed to":
        // the source says a plan of care is determined, not that it is written
        // down or countersigned. CLIENT: confirm if patients receive it in writing.
        body: 'The plan that comes out of the evaluation combines psychotherapy approaches and psychopharmacology, matched to your diagnosis and your circumstances. Where other clinicians are already involved in your care, we collaborate with them to establish the therapy regimen and the medication protocol together rather than in parallel.',
      },
      {
        heading: 'What happens after',
        body: 'The plan is not the end of it. We evaluate your progress on an ongoing basis, and provide support and education as you go. Follow-up care is usually medication management, in person or by telehealth.',
      },
    ],
    faqs: [
      {
        q: 'Is the first appointment always an evaluation?',
        a: 'Yes. Every new patient begins with a comprehensive psychiatric evaluation, because the treatment plan depends on it.',
      },
      {
        q: 'Can the evaluation be done by telehealth?',
        a: 'Yes. The evaluation is available by telehealth to patients across New Jersey and Pennsylvania, and in person. Ask us when you get in touch and we will confirm what works for your situation.',
      },
      {
        q: 'What do I leave with?',
        a: 'A diagnosis where one can be established, and a treatment plan combining psychotherapy approaches and medication where appropriate.',
      },
    ],
  },
  {
    slug: 'medication-management',
    nav: 'Medication management',
    schemaType: 'MedicalTherapy',
    title: 'Medication management',
    metaTitle: 'Medication Management in NJ and PA',
    metaDescription:
      'Ongoing psychiatric medication management in New Jersey and Pennsylvania, with standardized rating scales used to track how you are responding.',
    intro:
      'Medication management is the ongoing part of psychiatric care: prescribing, reviewing, and adjusting treatment as your response becomes clear. Both of our providers are psychiatric mental health nurse practitioners, so the person prescribing your medication is the same person tracking how it is working.',
    sections: [
      {
        heading: 'Prescribing that follows the plan',
        body: 'Medication is prescribed as part of the treatment plan established at your comprehensive psychiatric evaluation, not in isolation from it. Psychopharmacology is combined with psychotherapy approaches where both are indicated.',
      },
      {
        heading: 'Measured, not guessed',
        body: 'We use standardized clinical rating scales to monitor your progress against the baseline taken at your evaluation. The same measures also help catch decompensation early — a change in the wrong direction is easier to act on when it shows up as a number and not only as a feeling.',
      },
      {
        heading: 'Adjusting as things change',
        body: 'Psychiatric medication rarely lands perfectly the first time. Follow-up appointments exist to review how you are responding, what side effects you are living with, and what needs to change. Your progress is evaluated on an ongoing basis, with support and education alongside it.',
      },
      {
        heading: 'Working with your other clinicians',
        body: 'Where you are already working with a therapist, a primary care provider, or another specialist, we collaborate with them to establish medication protocols that fit the rest of your care rather than cutting across it. Referral to follow-up services is available where something falls outside what we provide.',
      },
      {
        heading: 'Conditions we prescribe for',
        body: 'Medication management is available across the diagnoses we treat.',
        /**
         * Deliberately NOT a spread of WHAT_WE_TREAT.conditions. That list also
         * carries "Irritability and anger" and "Stress and burnout", which the
         * live site names as things the practice helps with, not as prescribing
         * indications. Listing them under this heading would assert
         * pharmacotherapy for non-diagnostic states.
         */
        list: [
          'Depression',
          'Anxiety',
          'Bipolar disorder',
          'Panic attacks',
          'OCD',
          'PTSD',
          'Schizophrenia',
          'Mood disorders',
          'Psychosis',
        ],
      },
    ],
    faqs: [
      {
        q: 'Can I get medication management without an evaluation first?',
        a: 'No. The comprehensive psychiatric evaluation establishes the diagnosis and the baseline measurements that medication management depends on.',
      },
      {
        q: 'How often are follow-up appointments?',
        a: 'That depends on your treatment plan and how you are responding. We will agree a schedule with you at your evaluation.',
      },
      /**
       * CLIENT: the age range served is not stated as a practice policy
       * anywhere. An earlier draft answered a "do you prescribe for children"
       * question with "our providers care for patients across a range of ages",
       * which extrapolated one clinician's bio into a practice-wide scope claim
       * for paediatric psychiatric prescribing. Removed. Restore a real answer
       * once the client confirms the age range.
       */
    ],
  },
  {
    slug: 'telehealth',
    nav: 'Telehealth',
    schemaType: 'Service',
    title: 'Telehealth psychiatry in New Jersey and Pennsylvania',
    metaTitle: 'Telehealth Psychiatry in NJ and PA',
    metaDescription:
      'Psychiatric appointments by video across New Jersey and Pennsylvania, on an expanded schedule including weekends, evenings, and holidays by request.',
    intro:
      'Both of our providers are licensed in New Jersey and Pennsylvania, and both see patients by telehealth. For a lot of people it is the difference between keeping psychiatric care going and quietly letting it lapse.',
    sections: [
      {
        heading: 'An expanded schedule',
        body: 'Telehealth appointments are offered on an expanded schedule, including weekends, evenings, and holidays by request. If the standard working day is the reason you have not started treatment, say so when you get in touch.',
      },
      {
        heading: 'Both states, both providers',
        body: 'Funmilayo Whitaker and Anastasia O. Ofoegbu are both licensed in New Jersey and Pennsylvania, so telehealth is available across our whole service area rather than in one state only. You need to be physically located in a state where your provider is licensed at the time of your appointment.',
      },
      {
        heading: 'What telehealth is good for',
        body: 'Follow-up medication management works particularly well by video: the appointment is a structured review of how you are responding, which does not depend on being in the same room. Comprehensive psychiatric evaluations can also be arranged by telehealth — ask us and we will confirm what suits your situation.',
      },
      {
        heading: 'When telehealth is not the right call',
        body: 'Telehealth is not for emergencies. If you are in crisis, call or text 988 for the Suicide and Crisis Lifeline. If you or someone else is in immediate danger, call 911 or go to your nearest emergency room. This practice is not monitored around the clock.',
      },
    ],
    faqs: [
      {
        q: 'Do you offer evening and weekend telehealth appointments?',
        a: 'Yes. Telehealth runs on an expanded schedule that includes weekends, evenings, and holidays by request.',
      },
      {
        q: 'Can I be seen if I live in Pennsylvania?',
        a: 'Yes, by telehealth. Both providers are licensed in Pennsylvania as well as New Jersey.',
      },
      {
        q: 'What do I need for a telehealth appointment?',
        // CLIENT: the telehealth platform is not named anywhere in the source
        // material, so no joining process is described here.
        a: 'A private space and a device with a camera and a reliable connection. Ask us how to join when you book.',
      },
    ],
  },
];

export const GETTING_STARTED = {
  heading: 'Getting started',
  body: 'Three steps from first contact to ongoing care.',
  steps: [
    {
      title: 'Reach out',
      body: 'Send the form below or call us. Tell us how to reach you and, in general terms, what you are looking for. Please do not send health details through the form.',
    },
    {
      title: 'Comprehensive psychiatric evaluation',
      body: 'Your first appointment is a full psychiatric evaluation. We review your history, identify risk factors, reach a diagnosis, and build a treatment plan with you.',
    },
    {
      title: 'Ongoing care',
      body: 'Follow-up appointments manage medication and track progress, in person or by telehealth, on a schedule that fits your life.',
    },
  ],
} as const;

/**
 * Homepage "What to expect", the four-step patient journey.
 *
 * This is the homepage's process section. It replaces <GettingStarted /> on the
 * homepage, which said the same thing in three steps; that export stays because
 * /new-patients still renders it, and FEATURED_SERVICES still quotes its body.
 *
 * SOURCING: the whole sequence comes from one verbatim passage on the live
 * Services page, recorded at /research/content/services.md line 18:
 *
 *   "The initial visit involves completing a comprehensive psychiatric
 *   evaluation, which identifies risk factors that may impact a patient's
 *   mental health. Mental illness diagnoses are made based on assessments, and
 *   then an effective plan of care is determined using psychotherapy modalities
 *   and psychopharmacology for the individual. The treatment plan involves
 *   collaborating with other professionals to set a regimen of therapy and
 *   prescription medication to improve the person's mental health. As we
 *   evaluate progress, we will continue to provide support and education as
 *   needed."
 *
 * Step 1 is the exception, and comes from /research/content/contact.md instead:
 * contact is phone, email, or the form, and the research explicitly records
 * that there is NO online scheduling widget. "Request an appointment" is the
 * CTA label, not a booking tool, and the copy must not imply one.
 *
 * What is deliberately NOT said here, because no source states it:
 * - How long any step takes, or how long until you are seen. No timings exist
 *   anywhere in /research, and "no invented timings" is the rule for this list.
 * - That the treatment plan is given to you in writing. The source says a plan
 *   of care is "determined", not recorded or countersigned. Still open, see
 *   OPEN_CLIENT_ITEMS.
 * - Named therapy modalities. The source says "psychotherapy modalities"
 *   generically and never names one, so neither does this.
 * - Appointment length, frequency, or cost.
 */
export const WHAT_TO_EXPECT = {
  /**
   * The section's eyebrow pill. Deliberately NOT `heading`: the two were the
   * same string when the bento grid first landed, so the page rendered "What to
   * expect" twice, once as the pill and once as the h2. This names what the
   * section does instead of repeating its title.
   */
  badge: 'How it works',
  heading: 'What to expect',
  body: 'Four steps, from the first message to ongoing care. Every new patient starts with the same comprehensive psychiatric evaluation.',
  steps: [
    {
      title: 'Request an appointment',
      /**
       * Form or phone, never "book online": /research/services-analysis.md
       * records that intake is phone, email, or contact form only. The health
       * details warning is the same HIPAA-aware line as CONTACT.privacyNote.
       */
      /**
       * "through the form", never a bare "out of it". The sentence before this
       * one offers two channels, so an unscoped pronoun reads as covering the
       * phone call too, and telling a psychiatric patient to withhold clinical
       * detail from a call with the practice is the opposite of the rule. The
       * v1 no-PHI prohibition in CLAUDE.md is scoped to the contact flow, not
       * to speaking to a provider. Phrasing matches GETTING_STARTED's, which
       * already had this right, and carries NEW_PATIENTS_PAGE.privacyBody's
       * reassurance clause so the patient knows where the detail does go.
       */
      body: 'Send the form or call us. Tell us how to reach you and why you are getting in touch. Please do not send health details through the form; we will take the clinical details directly.',
    },
    {
      title: 'Comprehensive psychiatric evaluation',
      /**
       * "may be affecting", matching SERVICE_PAGES and the source verbatim
       * ("identifies risk factors that MAY impact a patient's mental health").
       * Dropping the hedge asserts to every reader that risk factors are
       * affecting them, before anyone has assessed them.
       */
      body: 'Your first appointment. We take a full history, identify the risk factors that may be affecting your mental health, and use structured questionnaires and rating scales to set a baseline.',
    },
    {
      title: 'Your treatment plan',
      /**
       * "where both are indicated" is not padding. Without it this promises
       * that every plan includes medication, which is a stronger claim than
       * the source makes ("for the individual") and contradicts this file's
       * own sourced copy in SERVICE_PAGES, two clicks away. It also tells a
       * patient who does not want to be prescribed that this practice will
       * prescribe regardless.
       */
      body: 'A diagnosis is reached through assessment, then a plan of care combining psychotherapy approaches and medication where both are indicated. If other clinicians are already involved, we set the regimen with them.',
    },
    {
      title: 'Follow-up care',
      body: 'Follow-up appointments manage medication and track your progress against that baseline, in person or by telehealth. We adjust as your response becomes clear.',
    },
  ],
} as const;

/**
 * Featured services, for the homepage services section.
 *
 * Titles and descriptions are the existing service copy — WHAT_WE_TREAT.services
 * for the three service slots. The fourth took GETTING_STARTED.body until
 * <WhatToExpect /> arrived above this section with a different step count; it
 * now carries its own literal description, for the reason recorded on that
 * entry. Nothing new is claimed in either case; this is a presentation layer
 * over content that already existed and was already sourced from /research.
 *
 * `footerText` states the care modality exactly as the site states it elsewhere.
 * Telehealth's slot says telehealth only, because that is what that service is.
 * In-person care is never paired with a state — see CLAUDE.md, "Care modality":
 * telehealth is evidenced in both NJ and PA, but the only place-level evidence
 * anywhere in /research is Lawrence Township, New Jersey.
 *
 * `categoryColor` values are existing brand tokens. White 11px/600 on each
 * measures: blue-600 8.84:1, blue-700 11.55:1, sky 4.75:1, success 5.04:1 —
 * all clear of the 4.5:1 WCAG AA asks of small text.
 */
export type FeaturedService = {
  type: 'featured' | 'card';
  badge: string | null;
  title: string;
  description: string;
  footerText: string | null;
  category: string;
  categoryColor: string;
  video: string;
  poster: string;
  href: string;
  displayOrder: number;
};

export const FEATURED_SERVICES: FeaturedService[] = [
  {
    type: 'featured',
    badge: 'Start here',
    title: 'Comprehensive psychiatric evaluation',
    description:
      'A full assessment that identifies risk factors, establishes a diagnosis, and produces a treatment plan.',
    footerText: 'In person and by telehealth',
    category: 'Assessment',
    categoryColor: 'var(--color-np-blue-600)',
    // This footage depicts a person and must not imply a treatment outcome.
    video: '/video/services/evaluation.mp4',
    poster: '/video/services/evaluation-poster.webp',
    href: '/services/psychiatric-evaluation',
    displayOrder: 1,
  },
  {
    type: 'card',
    badge: null,
    title: 'Medication management',
    description:
      'Ongoing prescribing and review, with standardized rating scales used to track progress and catch changes early.',
    footerText: 'In person and by telehealth',
    category: 'Ongoing care',
    categoryColor: 'var(--color-np-blue-700)',
    // This footage depicts a person and must not imply a treatment outcome.
    video: '/video/services/medication-management.mp4',
    poster: '/video/services/medication-management-poster.webp',
    href: '/services/medication-management',
    displayOrder: 2,
  },
  {
    type: 'card',
    badge: null,
    title: 'Telehealth',
    description:
      'Appointments by video on an expanded schedule, including weekends, evenings, and holidays by request.',
    // This slot is telehealth, so it says telehealth. Both providers are
    // licensed in both states, which is what makes the reach claim safe here.
    footerText: 'By telehealth across New Jersey and Pennsylvania',
    category: 'Virtual care',
    categoryColor: 'var(--color-np-sky)',
    // This footage depicts a person and must not imply a treatment outcome.
    video: '/video/services/telehealth.mp4',
    poster: '/video/services/telehealth-poster.webp',
    href: '/services/telehealth',
    displayOrder: 3,
  },
  {
    type: 'card',
    badge: null,
    title: 'New patients',
    /**
     * A literal string, no longer GETTING_STARTED.body, and deliberately with
     * no step count in it.
     *
     * GETTING_STARTED.body says "Three steps from first contact to ongoing
     * care." That is still true of /new-patients, which lists exactly three and
     * is where this card links. It stopped being true of the HOMEPAGE when
     * <WhatToExpect /> landed directly above this section counting four: a
     * visitor scrolled past four numbered steps and then read a card telling
     * them the process is three, one screen apart. Self-contradiction on a
     * single page is the specific failure the audit records against the live
     * site, so the count comes out of the card rather than out of either
     * section.
     *
     * Edited HERE and not at GETTING_STARTED.body on purpose: that constant is
     * also rendered on /new-patients, above the three-step list it introduces,
     * where "three steps" is the correct and useful thing to say.
     */
    description: 'How to get in touch, what the first appointment covers, and how ongoing care works.',
    /**
     * No modality line on this slot. The other three describe how CARE is
     * delivered; this one is a process, and "In person and by telehealth" next
     * to "New patients" reads as "you can start by walking in" — which, with
     * the street address still an open item, is the exact impression the
     * care-modality rule in CLAUDE.md exists to prevent. GETTING_STARTED.steps
     * begins with the form or a phone call, not a visit.
     */
    footerText: null,
    category: 'Getting started',
    categoryColor: 'var(--color-np-success)',
    // This footage depicts a person and must not imply a treatment outcome.
    video: '/video/services/new-patients.mp4',
    poster: '/video/services/new-patients-poster.webp',
    href: '/new-patients',
    displayOrder: 4,
  },
];

export const FAQ = {
  heading: 'Questions before you book',
  groups: [
    {
      title: 'Getting started',
      items: [
        {
          q: 'Who will I see?',
          a: 'One of our two providers, Funmilayo Whitaker or Anastasia O. Ofoegbu. Both hold a Doctor of Nursing Practice and are dual-certified as psychiatric mental health and family nurse practitioners, and both are licensed in New Jersey and Pennsylvania.',
        },
        {
          q: 'What happens at the first appointment?',
          a: 'A comprehensive psychiatric evaluation. We take a full history, identify risk factors, use standardized screening and rating scales where helpful, and finish with a diagnosis and a treatment plan.',
        },
        {
          q: 'Do you offer telehealth?',
          a: 'Yes. Telehealth is available on an expanded schedule, including weekends, evenings, and holidays by request.',
        },
        {
          q: 'Do I need a referral?',
          a: 'You can contact us directly to ask about an appointment. If your insurance plan requires a referral for behavioral health, check with your plan first.',
        },
        {
          q: 'Where do you practice?',
          a: 'Telehealth is available to patients across New Jersey and Pennsylvania. We also see patients in person — ask us when you get in touch and we will confirm what is available to you.',
        },
      ],
    },
    {
      title: 'Insurance and costs',
      items: [
        {
          q: 'Which insurance do you accept?',
          a: 'Aetna, Optum, Cigna Evernorth, United Healthcare, Medicare, NJ Medicaid, and Blue Cross Blue Shield Horizon NJ. If your plan is not listed, ask us and we will check.',
        },
        {
          q: 'What if I do not have insurance?',
          a: 'A session fee applies, and a sliding scale is available. Ask us about it when you get in touch.',
        },
        {
          q: 'How can I pay?',
          a: 'We accept all major credit and debit cards, and cash.',
        },
      ],
    },
  ],
} as const;

export const CONTACT = {
  heading: 'Get in touch',
  body: 'Send us your contact details and we will get back to you about an appointment.',
  /**
   * HIPAA-aware v1 per CLAUDE.md: name, email, phone, and a constrained
   * reason-for-contact only. No symptoms, diagnoses, medications, insurance ID,
   * date of birth, free-text clinical prompt, or file upload.
   */
  privacyNote:
    'Please do not include any health information, medical history, or insurance ID numbers in this form. This form is not secure for medical details and is not monitored around the clock.',
  reasons: [
    'New patient inquiry',
    'Existing patient',
    'Insurance or billing question',
    'Something else',
  ],
} as const;

export const CRISIS = {
  heading: 'If you need help now',
  body: 'This website is not for emergencies and is not monitored around the clock.',
  items: [
    {
      label: '988',
      href: 'tel:988',
      title: 'Suicide and Crisis Lifeline',
      body: 'Call or text 988, any time, for free and confidential support in a crisis.',
    },
    {
      label: '911',
      href: 'tel:911',
      title: 'Medical emergency',
      body: 'Call 911 or go to your nearest emergency room if you or someone else is in immediate danger.',
    },
  ],
} as const;

/**
 * Insurance and billing as its own destination.
 *
 * The audit flags that coverage information is currently buried at the bottom
 * of the live Services page. Cost is the first objection most people arrive
 * with, and "does Newpoint take Aetna" is a query that needs a page to land on.
 *
 * Payer list, session fee, sliding scale, and accepted payment methods are all
 * confirmed in /research/services-analysis.md. Nothing else is claimed: no
 * copay figures, no self-pay rate, no sliding-scale criteria.
 */
export const INSURANCE_PAGE = {
  title: 'Insurance and payment',
  metaTitle: 'Insurance Accepted | Psychiatric Care NJ and PA',
  // Payer names are written exactly as the practice publishes them, here and
  // everywhere else. An abbreviation in a meta description is still a second
  // spelling of a verifiable name, and NAP-style consistency applies to payers
  // as much as to the practice name.
  metaDescription:
    'Newpoint accepts Aetna, Optum, Cigna Evernorth, United Healthcare, Medicare, NJ Medicaid, and Blue Cross Blue Shield Horizon NJ.',
  intro:
    'We accept most major plans in New Jersey and Pennsylvania, and there is a sliding scale for people paying without insurance. If cost is the reason you have been putting this off, read this page first and then ask us.',
  sections: [
    {
      heading: 'Plans we accept',
      body: 'If your plan is not on this list, ask us anyway. We can check your coverage before your first appointment rather than leaving you to find out afterwards.',
    },
    {
      heading: 'Paying without insurance',
      body: 'A session fee applies to patients paying out of pocket, and a sliding scale is available. Ask us what your appointment would cost before you book it.',
      // CLIENT: the self-pay session fee and the sliding-scale criteria are not
      // published anywhere. Publishing both is a meaningful conversion win and a
      // strong signal for "psychiatrist cost" queries. Supply figures to add here.
    },
    {
      heading: 'How you can pay',
      body: 'We accept all major credit and debit cards, and cash.',
    },
    {
      heading: 'Before your first appointment',
      body: 'Have your insurance details to hand when you get in touch so we can verify coverage. Please do not send insurance ID or member numbers through the contact form — it is not a secure channel for them. We will take those details directly.',
    },
  ],
  faqs: [
    {
      q: 'Do you take Medicare?',
      a: 'Yes. We accept Medicare, and NJ Medicaid.',
    },
    {
      q: 'What if my plan is not listed?',
      a: 'Ask us. We will check your coverage before your first appointment, and tell you what it would cost if you are out of network.',
    },
    {
      q: 'Do I need a referral?',
      a: 'You can contact us directly. If your plan requires a referral for behavioral health, check with your plan first.',
    },
    {
      q: 'Is there a sliding scale?',
      a: 'Yes, for patients paying without insurance. Ask us about it when you get in touch.',
    },
  ],
} as const;

/**
 * New patient page. Expands GETTING_STARTED into a destination that can rank
 * for "how to start psychiatric treatment" style queries and carry the HIPAA
 * and crisis guidance where a new patient will actually read it.
 */
export const NEW_PATIENTS_PAGE = {
  title: 'Starting care at Newpoint',
  metaTitle: 'New Patients | Starting Psychiatric Care',
  metaDescription:
    'What to expect as a new patient at Newpoint: how to get in touch, your first psychiatric evaluation, and how ongoing care works in NJ and PA.',
  intro:
    'Starting psychiatric care is an awkward thing to do from a standing start, so here is the whole process written down. Three steps, no surprises, and nothing you need to prepare beyond being willing to talk.',
  expectations: [
    {
      heading: 'You will see a provider, not a queue',
      body: 'There are two of us. You will see Funmilayo Whitaker or Anastasia O. Ofoegbu, both of whom hold a Doctor of Nursing Practice and are dual-certified in psychiatric mental health and family practice.',
    },
    {
      // Scope, not duration: session length is not published anywhere, so no
      // relative claim about appointment length is made.
      heading: 'Your first appointment covers more ground than the ones after it',
      body: 'It is a comprehensive psychiatric evaluation: a full history, a review of risk factors, structured questionnaires and rating scales, and a diagnosis and treatment plan at the end of it.',
    },
    {
      heading: 'Follow-up appointments can be in person or by video',
      body: 'Telehealth runs across New Jersey and Pennsylvania on an expanded schedule including weekends, evenings, and holidays by request. In-person appointments are available too — ask us which suits you.',
    },
  ],
  // CLIENT: no "what to bring" checklist is published anywhere and none is
  // invented here. A short list (photo ID, insurance card, current medication
  // list, pharmacy details) is standard and would strengthen this page — confirm
  // what the practice actually asks for before adding it.
  privacyHeading: 'What not to send us',
  privacyBody:
    'Please keep health details out of the contact form and out of email. Symptoms, diagnoses, medications, insurance ID numbers, and dates of birth are not safe to send that way, and the form is not monitored around the clock. Tell us how to reach you and we will take the clinical details directly.',
  /**
   * This aside is exactly where someone realising they cannot get help through
   * the form is looking, so the crisis numbers belong in it rather than only in
   * the page's closing block.
   */
  privacyCrisis:
    'If you need help now, call or text 988 for the Suicide and Crisis Lifeline. In an emergency, call 911 or go to your nearest emergency room.',
} as const;

/**
 * Contact page copy.
 *
 * Every fact is already in BUSINESS above or in /research/content/contact.md.
 * Nothing new is introduced: no hours, no address, no general inbox, and no
 * booking link — the research confirms the live site has no online scheduling
 * widget, so the page routes to the existing appointment form, the phone
 * numbers and the two provider inboxes.
 */
export const CONTACT_PAGE = {
  title: 'Contact Newpoint',
  metaTitle: 'Contact | Psychiatric Care in NJ and PA',
  metaDescription:
    'Contact Newpoint for psychiatric care across New Jersey and Pennsylvania, by telehealth and in person. Call, email, or request an appointment online.',
  intro:
    'Call us, email us, or request an appointment. We see patients across New Jersey and Pennsylvania by telehealth, and in person.',
  /**
   * CLIENT: no practice-wide inbox exists, so both named provider addresses are
   * listed rather than inventing an info@ or contact@.
   * CLIENT: hours of operation are not published anywhere, so none are stated.
   * CLIENT: no street address is confirmed, so the service area is given instead.
   */
  // Verbatim roles only: research/business-nap.md records (609) 527-9438 as the
  // primary number and the other two as additional lines. It does not say which
  // is answered first, and it does not label any of them by state — the 215 area
  // code is an inference, not a published fact.
  phoneNote:
    'The main line is the best number to try first. The other two also reach the practice.',
  // Same prohibition set as CONTACT.privacyNote and NEW_PATIENTS_PAGE.privacyBody,
  // including date of birth. /contact may be a patient's only read.
  emailNote:
    'Email reaches the providers directly. Please keep symptoms, diagnoses, medications, insurance ID numbers and dates of birth out of it — it is not a secure channel for them.',
  /**
   * Telehealth is stated across both states because both providers are licensed
   * in both. In-person care is stated WITHOUT a state, because the only
   * place-level evidence anywhere in /research is Lawrence Township, New Jersey
   * — there is no Pennsylvania location signal at all. Saying "in person across
   * New Jersey and Pennsylvania" would send a PA patient somewhere that is not
   * known to exist.
   */
  areaNote:
    'Telehealth is available to patients across New Jersey and Pennsylvania, on an expanded schedule including weekends, evenings, and holidays by request. In-person appointments are available as well — ask us what works for you.',
} as const;

/**
 * Every indexable route, in one place, consumed by app/sitemap.ts. Adding a
 * page means adding it here, or it will not be submitted to search engines.
 *
 * `priority` is a hint only and search engines largely ignore it; it is kept
 * because it costs nothing and expresses the intended hierarchy.
 *
 * Not `as const`: the spread entries are computed by .map() and so are already
 * widened to { path: string; priority: number }. `as const` would only freeze
 * the one hand-written entry and read as a stronger guarantee than it gives.
 */
export const ROUTES: { path: string; priority: number }[] = [
  { path: '/', priority: 1.0 },
  { path: '/services', priority: 0.9 },
  ...SERVICE_PAGES.map((s) => ({ path: `/services/${s.slug}`, priority: 0.8 })),
  { path: '/insurance', priority: 0.8 },
  { path: '/new-patients', priority: 0.8 },
  { path: '/contact', priority: 0.9 },
  ...PROVIDERS.map((p) => ({ path: `/providers/${p.slug}`, priority: 0.7 })),
];

/**
 * Every regulated fact still missing. Keep this list current: it is the
 * single place to check what is still owed by the client before launch.
 */
export const OPEN_CLIENT_ITEMS = [
  'Exact legal business name from the LLC formation documents ("Newpoint" vs "New Point")',
  'Street address, suite and ZIP for the practice. NOW THE HIGHEST-VALUE OPEN ITEM: the client has confirmed care is delivered in person as well as by telehealth, so the site claims in-person care and the organization is marked up as a MedicalClinic. Google expects an address on that type, a patient told they can be seen in person has nowhere to go, and Local Pack and Maps eligibility are blocked until it exists. The former "or confirm service-area only" alternative is closed — in-person care is confirmed',
  'State nursing license numbers for both providers, or confirmation they prefer not to publish them',
  'NPI numbers for both providers, or confirmation they prefer not to publish them',
  'Certifying body for the "board-certified" claim (the post-nominals imply one, but it is not stated anywhere and must not be assumed)',
  'Which states and locations in-person care is actually offered in. Telehealth is evidenced in both New Jersey and Pennsylvania (both providers are licensed in both), but the only place-level signal anywhere in /research is Lawrence Township, New Jersey. The site therefore states in-person care WITHOUT attaching it to a state',
  'Hours of operation, including what the "expanded schedule" for telehealth actually covers',
  'Confirmed age range served (adults only, or across the lifespan as a practice policy)',
  'Whether substance use and addiction treatment is an active service line',
  'Named therapy modalities offered (CBT, DBT, and similar), if any',
  'Whether ADHD is treated. It is one of the highest-volume queries for a psychiatric NP practice and appears nowhere in the source material, so it is not claimed — but it may be an omission rather than a deliberate exclusion',
  'Whether the practice holds in-network contracts with the listed payers, or accepts them while billing out of network. The site says "accept" throughout, which is the weaker and safer claim',
  'Exact payer plan names and any sub-plans, confirmed against the practice records. The list was scraped from an unseparated string on the live site',
  'Whether patients receive their treatment plan in writing',
  "Public profile URLs for each provider (Psychology Today, LinkedIn, NPI registry, hospital or association listing). These would populate `sameAs` on each provider's Person schema, which is the main signal search engines use to tie a name on this site to the same person elsewhere. Nothing is guessed, so `sameAs` is currently absent",
  'A general practice inbox address for the contact form, since only named provider addresses exist',
  'Self-pay session fee and the sliding scale criteria',
  'Original logo file, vector preferred',
  'Service-section footage. Every card on the homepage services section currently reuses the hero clip, which shows a person in a meadow. On a behavioural-health service tile that reads as an implied treatment outcome, which is the same category as a testimonial. Replacement clips must not depict a patient or imply an outcome',
  'Optional upgrade only, no longer a gap: written permission or brand assets for insurer logos, if the practice ever wants payer marks instead of the typographic wall',
  'Patient testimonials with documented consent, if the practice wants them later',
  'Reshoot of both provider portraits at 2000px or more with headroom, to unlock the deferred hero treatment',
] as const;
