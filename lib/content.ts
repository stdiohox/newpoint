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
   * No street address is published anywhere and it is unconfirmed whether a
   * public office exists. Geography is framed as service area only.
   * CLIENT: supply practice address, or confirm this is service-area only.
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
        a: 'Telehealth is available to patients in New Jersey and Pennsylvania. Ask us when you get in touch and we will confirm what works for your situation.',
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
        a: 'Yes. Both providers are licensed in Pennsylvania as well as New Jersey.',
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
          a: 'We serve patients in New Jersey and Pennsylvania, with telehealth available across both states.',
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
      heading: 'Follow-up appointments are available by video',
      body: 'Telehealth runs on an expanded schedule including weekends, evenings, and holidays by request, across both New Jersey and Pennsylvania.',
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
  ...PROVIDERS.map((p) => ({ path: `/providers/${p.slug}`, priority: 0.7 })),
];

/**
 * Every regulated fact still missing. Keep this list current: it is the
 * single place to check what is still owed by the client before launch.
 */
export const OPEN_CLIENT_ITEMS = [
  'Exact legal business name from the LLC formation documents ("Newpoint" vs "New Point")',
  'Street address, suite, and ZIP, or written confirmation that the practice is service-area only with no public office',
  'State nursing license numbers for both providers, or confirmation they prefer not to publish them',
  'NPI numbers for both providers, or confirmation they prefer not to publish them',
  'Certifying body for the "board-certified" claim (the post-nominals imply one, but it is not stated anywhere and must not be assumed)',
  'Hours of operation, including what the "expanded schedule" for telehealth actually covers',
  'Confirmed age range served (adults only, or across the lifespan as a practice policy)',
  'Whether substance use and addiction treatment is an active service line',
  'Named therapy modalities offered (CBT, DBT, and similar), if any',
  'Whether ADHD is treated. It is one of the highest-volume queries for a psychiatric NP practice and appears nowhere in the source material, so it is not claimed — but it may be an omission rather than a deliberate exclusion',
  'Whether the practice holds in-network contracts with the listed payers, or accepts them while billing out of network. The site says "accept" throughout, which is the weaker and safer claim',
  'Exact payer plan names and any sub-plans, confirmed against the practice records. The list was scraped from an unseparated string on the live site',
  'Whether patients receive their treatment plan in writing',
  "Public profile URLs for each provider (Psychology Today, LinkedIn, NPI registry, hospital or association listing). These would populate `sameAs` on each provider's Person schema, which is the main signal search engines use to tie a name on this site to the same person elsewhere. Nothing is guessed, so `sameAs` is currently absent",
  'Whether a public office exists and in which state. UNRESOLVED CONTRADICTION: the provider pages promise telehealth only, while the footer, the contact section, the services page and two copy strings still say "in person and by telehealth". research/services-analysis.md does describe in-office care, but no address is confirmed anywhere. Confirm premises, then make all of it say the same thing',
  'A general practice inbox address for the contact form, since only named provider addresses exist',
  'Self-pay session fee and the sliding scale criteria',
  'Original logo file, vector preferred',
  'Optional upgrade only, no longer a gap: written permission or brand assets for insurer logos, if the practice ever wants payer marks instead of the typographic wall',
  'Patient testimonials with documented consent, if the practice wants them later',
  'Reshoot of both provider portraits at 2000px or more with headroom, to unlock the deferred hero treatment',
] as const;
