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
  /**
   * "Mental and behavioral care", not "Psychiatric care" — the owners' wording,
   * 2026-09-29. It widens the door: a lot of people who would never search for
   * a psychiatrist will search for mental health help, and "behavioral health"
   * is the term their insurer uses on the benefit they are trying to spend.
   *
   * WHAT THIS COSTS, stated honestly: "psychiatric" is now in no heading on the
   * homepage at all. It was in the H1 and it is not in any H2 — checked against
   * the rendered page, not assumed. What still carries it is the title tag
   * ("Psychiatric Nurse Practitioners in NJ and PA"), `subtext` immediately
   * below, and WHAT_WE_TREAT.body's opening sentence.
   *
   * That is judged acceptable rather than ideal, and it is the owners' call.
   * If the term needs a heading back, the honest place is an H2 — NOT this
   * headline, which they specified. Watch Search Console after launch for
   * Google rewriting the homepage title toward the H1, which it does when the
   * two diverge this much.
   */
  headline: 'Mental and behavioral care across New Jersey and Pennsylvania',
  /**
   * The same headline, broken into two lines. The literal \n is the split point
   * for the hero's per-character entrance animation. No wording differs from
   * `headline` above.
   *
   * THE \n DOES NOT CONTROL THE RENDERED LINE COUNT, and never did. The copy
   * occupies one half of a two-column grid at lg — about 656px at 1440 — and
   * xl:text-7xl overruns that well before either of these lines ends, so both
   * wrap again on their own. Measured at 1440: the old "Psychiatric care
   * across / New Jersey and Pennsylvania" rendered as four lines, and this
   * longer headline renders as five. That is the design as it shipped, not a
   * regression introduced with the new wording.
   *
   * So treat the \n as what AnimatedHeading actually uses it for: the boundary
   * that restarts the character stagger. Re-splitting it does not change the
   * rag. Changing the rag means changing the type scale or the column, and
   * neither has been asked for.
   */
  headlineLines: 'Mental and behavioral care across\nNew Jersey and Pennsylvania',
  subtext:
    'Assessment, medication management, and telehealth from two doctorate-prepared psychiatric nurse practitioners. Most major insurance accepted.',
  /**
   * Three service names for the hero's glass tag, word-for-word as `subtext`
   * already names them. No new service is claimed here.
   */
  tag: 'Assessment. Medication management. Telehealth.',
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
  /**
   * Homepage grid only. Medicare and NJ Medicaid each get a card there and
   * neither had a line of its own, so both use this one.
   *
   * It asserts nothing new. Acceptance of both plans is already recorded in
   * `payers` above and in INSURANCE_PAGE.faqs ("Yes. We accept Medicare, and
   * NJ Medicaid"), and the coverage-check promise is `body`'s, which already
   * covers every plan in the list. This states it against a named plan rather
   * than inventing a claim about either one.
   */
  coverageCheckNote:
    'Tell us your plan details and we will check your coverage before your first appointment.',
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
  /**
   * Degree-granting institutions. NOT the certifying body for the
   * "board-certified" claim, which is still unknown and must not be inferred
   * from a university — see OPEN_CLIENT_ITEMS and CLAUDE.md's schema rules,
   * where `hasCredential` stays omitted for exactly this reason.
   */
  education: string;
  /** Languages the provider sees patients in. */
  languages: string;
  bio: string;
  treats: string[];
  email: string;
};

/**
 * Facts here come from /research/people-trust.md (the practice's own site,
 * crawled 2026-08-27) and, since 2026-09-29, from
 * /research/provider-directories.md — the providers' own profiles on Grow
 * Therapy, Headway, U.S. News and Doximity.
 *
 * The directory capture is self-entered by the providers and in several places
 * self-contradictory, so only two classes of fact were taken from it:
 * corroborated ones, and ones that are not regulated. Applied below: education
 * (three sources agree on the doctorate), languages, and additions to `treats`
 * that BOTH providers publish on at least one platform each.
 *
 * Deliberately NOT applied, and still open: licence numbers, NPI, the street
 * address, years of experience (Grow says 15 for Whitaker, Headway says 10,
 * and CLAUDE.md makes it a regulated fact), ages served (the two platforms
 * directly contradict each other), named therapy modalities (four candidates,
 * no two agreeing), and anything from the patient reviews.
 */
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
    /**
     * UNCHANGED at "more than 10", although the directories now offer two other
     * numbers: Headway says 10 years, Grow Therapy says 15. CLAUDE.md makes
     * specific years of experience a regulated fact, this is the version the
     * practice itself published, and it is the only one of the three that is
     * true whichever of the others is right. CLIENT: 10 or 15?
     */
    experience: 'More than 10 years of direct patient care',
    approach: 'Warm, empathic, non-judgmental, and collaborative',
    /* Doximity, Headway and U.S. News independently give the doctorate as
       University of North Florida, which is as corroborated as anything in the
       directory capture gets. The master's is Headway only. */
    education: 'DNP, University of North Florida · MSN, Tennessee State University',
    /* Headway lists Yoruba; U.S. News records "Speaks English". */
    languages: 'English and Yoruba',
    /**
     * "ACROSS THE LIFESPAN" IS GONE from the second sentence, deliberately.
     * It was an age-range claim the practice's own site made and that
     * OPEN_CLIENT_ITEMS has always flagged as unconfirmed — and the directory
     * capture makes it worse rather than better: Grow Therapy says she serves
     * adults 18-64 and elders 65+ with no children, Headway says adults,
     * adolescents AND children. Two platforms, one clinician, opposite answers.
     * The sentence says what she does without saying who to.
     *
     * The first sentence is reproduced verbatim on the homepage cards and is
     * asserted at build time by assertSourced() in components/sections/
     * Providers.tsx. Do not reword it here without updating CARD_SENTENCE.
     */
    bio: 'Funmilayo is dual board-certified as a psychiatric mental health nurse practitioner and a family nurse practitioner. She holds a Doctor of Nursing Practice from the University of North Florida and a Master of Science in Nursing from Tennessee State University, and has practiced in group practice, community settings, and telehealth. She provides medication management for a wide range of psychiatric conditions, and sees patients in English and Yoruba.',
    /**
     * The last three are new on 2026-09-29, from her own directory profiles.
     * ADHD and substance use are each published by her on BOTH Grow Therapy
     * and Headway; insomnia comes from Grow and from U.S. News, which names
     * "insomnia and sleep apnea" among her areas of expertise.
     *
     * Both were live CLIENT questions — OPEN_CLIENT_ITEMS asked whether ADHD's
     * absence was "an omission rather than a deliberate exclusion", and whether
     * substance use is an active service line. Her own published profiles
     * answer both, and they are a better source than the practice site these
     * lists were originally built from, because they are more recent and she
     * maintains them herself.
     *
     * NOTE they are NOT added to SERVICE_PAGES' "Conditions we prescribe for"
     * list on the medication-management page. Treating a condition and
     * prescribing for it are different claims, and for ADHD the prescribing
     * claim implies controlled substances and a DEA registration that CLAUDE.md
     * lists as a regulated fact we do not hold. CLIENT: confirm prescribing
     * scope for ADHD before that list changes.
     */
    treats: [
      'Depression',
      'Anxiety',
      'Bipolar disorder',
      'Panic attacks',
      'OCD',
      'PTSD',
      'Schizophrenia',
      'ADHD',
      'Insomnia and sleep problems',
      'Substance use and addiction',
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
    /**
     * UNCHANGED, AND UNDER ACTIVE DOUBT. Headway's structured licensure field
     * gives her New Jersey ONLY, while this line, her bio on the practice site,
     * and her own free text on that same Headway page all say both states.
     * Whitaker's profile lists both states in that same field, so it holds two
     * when two are entered.
     *
     * Not weakened here, because a directory field is not a primary source and
     * quietly dropping Pennsylvania would be as unsourced as keeping it. But
     * this is the top item in OPEN_CLIENT_ITEMS and it is a real booking risk:
     * the telehealth page currently tells a Pennsylvania patient that either
     * provider can see them. Verify against the PA Department of State
     * licensee search before launch.
     */
    licensed: 'Licensed in New Jersey and Pennsylvania',
    /* Headway's own field says "8 years of experience", contradicting her bio
       on the same page. This keeps the bio's framing, which the practice site
       also uses. CLIENT: confirm. */
    experience: '14 years in nursing, the last 11 focused on mental health and addiction',
    approach: 'Evidence-based and patient-centered',
    /* Headway: DNP at University of North Florida, plus La Salle University
       with the degree unspecified — so La Salle is deliberately not named here
       rather than guessed at. CLIENT: which degree, and in what? */
    education: 'DNP, University of North Florida',
    languages: 'English, Igbo, and Yoruba',
    /**
     * The second sentence is reproduced verbatim on the homepage cards and
     * asserted at build time by assertSourced() in components/sections/
     * Providers.tsx. Do not reword it without updating CARD_SENTENCE.
     */
    bio: 'Anastasia is dual-certified as a psychiatric mental health nurse practitioner and a family nurse practitioner, and holds a Doctor of Nursing Practice from the University of North Florida. She provides psychiatric assessments, medication management, and supportive counseling. She sees patients in English, Igbo, and Yoruba. Outside of practice she enjoys traveling, reading, and spending time with her family.',
    /**
     * Expanded 2026-09-29 from her Headway profile, which lists all of these as
     * her specialties. Substance use is listed FIRST there, which together with
     * her existing experience line ("the last 11 focused on mental health and
     * addiction") is what moves it from a hint to a stated service.
     *
     * Same carve-out as Whitaker: treated, not claimed as prescribed. See the
     * note on her `treats` above.
     */
    treats: [
      'Depression',
      'Anxiety and panic attacks',
      'Bipolar disorder',
      'Mood disorders',
      'Psychotic disorders',
      'ADHD',
      'OCD',
      'PTSD',
      'Sleep problems',
      'Anger management',
      'Substance use and addiction',
    ],
    email: BUSINESS.emails.ofoegbu,
  },
];

export const WHAT_WE_TREAT = {
  heading: 'What we treat, and how',
  body: 'Care begins with a comprehensive psychiatric assessment and a treatment plan built around it. From there we manage medication, monitor progress with standardized clinical measures, and adjust as your needs change.',
  /**
   * Conditions aggregated in /research/services-analysis.md, plus three added
   * on 2026-09-29 from /research/provider-directories.md.
   *
   * The practice-wide list is the union of what the two providers treat, so a
   * condition earns a place here when it is in either `PROVIDERS[].treats`.
   * ADHD, sleep and substance use are each published by both providers on their
   * own profiles; see the notes on those arrays above for the sourcing and for
   * why none of the three is added to the medication-management page's
   * "Conditions we prescribe for" list.
   *
   * ADHD IS THE MOST VALUABLE LINE IN THIS ARRAY. OPEN_CLIENT_ITEMS has carried
   * it as one of the highest-volume queries a psychiatric NP practice can
   * answer, absent from the source material and possibly by accident. It was by
   * accident.
   */
  conditions: [
    'Depression',
    'Anxiety',
    'ADHD',
    'Bipolar disorder',
    'Panic attacks',
    'OCD',
    'PTSD',
    'Schizophrenia',
    'Mood disorders',
    'Psychosis',
    'Substance use and addiction',
    'Insomnia and sleep problems',
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
      title: 'Comprehensive psychiatric assessment',
      body: 'A structured first appointment that identifies risk factors, establishes a diagnosis, and produces a treatment plan.',
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
   * assessment is a diagnostic procedure, and telehealth is how care is
   * delivered rather than a treatment in itself.
   */
  schemaType: 'MedicalProcedure' | 'MedicalTherapy' | 'Service';
  /** H1. */
  title: string;
  /**
   * A second name the same service genuinely goes by, emitted as schema.org
   * `alternateName`. Set it ONLY when the page's own visible copy uses the
   * synonym too — it is a statement about what the service is called, not a
   * keyword slot.
   */
  alternateName?: string;
  /** The `%s` in the layout's title template. Keep under ~50 characters. */
  metaTitle: string;
  metaDescription: string;
  intro: string;
  /**
   * How this service is delivered, in one sentence.
   *
   * Deliberately NOT read off the homepage card's `footerText`. That field is
   * card chrome; promoted to a titled card on a page whose metaTitle is scoped
   * "in NJ and PA", "In person and by telehealth" reads in-person-first on a
   * state-scoped page, which is the exact composition CLAUDE.md's care-modality
   * rule exists to prevent. These put telehealth first and bind the states to
   * it, matching the phrasing the assessment FAQ already uses.
   *
   * Only psychiatric assessment carries the state scope, because only its own
   * content states it (see its "Can the assessment be done by telehealth?"
   * FAQ). Medication management says telehealth and in person without a
   * geography, because nothing in its own content scopes it.
   */
  modality: string;
  sections: { heading: string; body: string; list?: string[] }[];
  faqs: { q: string; a: string }[];
};

export const SERVICE_PAGES: ServicePage[] = [
  {
    /**
     * The URL keeps "evaluation" while every visible string on the page says
     * "assessment", and that mismatch is deliberate.
     *
     * The practice's own word is assessment (owners, 2026-09-29), so that is
     * what patients read. But "psychiatric evaluation" is the far higher-volume
     * query of the two in US search, and the slug is the one high-weight slot
     * where it can sit without contradicting the owners' copy. The synonym is
     * also stated in `metaDescription` and once in the body below, so the page
     * answers to both words.
     *
     * NOT kept for its history — it has none. The site has not launched, so
     * this path has never been indexed and a rename now would need no redirect.
     * That makes this a free decision TODAY and an expensive one after launch,
     * when it would need a 301 from the old path in next.config.ts.
     */
    slug: 'psychiatric-evaluation',
    nav: 'Psychiatric assessment',
    schemaType: 'MedicalProcedure',
    title: 'Comprehensive psychiatric assessment',
    alternateName: 'Psychiatric evaluation',
    metaTitle: 'Psychiatric Assessment in NJ and PA',
    /**
     * "also called a psychiatric evaluation" is the highest-value of the four
     * retained uses of the old word, and the one most at risk from a later
     * "remove every evaluation" sweep — it is the only one a patient reads, in
     * the search result that brought them. It survives mobile truncation: it
     * lands around characters 65-77, well inside the ~120 shown. See the slug
     * note above and CLAUDE.md's terminology section before touching it.
     */
    metaDescription:
      'A comprehensive psychiatric assessment, also called a psychiatric evaluation, in NJ and PA: full history, rating scales, a diagnosis, and a treatment plan.',
    intro:
      'Every patient at Newpoint starts here. A comprehensive psychiatric assessment is the appointment where we take a full history, understand what brought you in, and finish with a diagnosis and a treatment plan built around it. It is the foundation everything else is built on.',
    modality: 'By telehealth across New Jersey and Pennsylvania, and in person.',
    sections: [
      {
        heading: 'What the assessment covers',
        /**
         * The closing sentence is the page's one deliberate use of the older
         * word. A patient referred here by a GP or a plan will almost always
         * have been told "psychiatric evaluation", and the two names for one
         * appointment is exactly the thing that makes someone hesitate to book.
         * It doubles as the page's synonym coverage — see the slug note above.
         */
        body: 'The assessment is structured rather than conversational-only, so nothing important gets missed. We work through your history and current symptoms, and we identify the risk factors that may be affecting your mental health — the things that make a condition harder to manage, or easier to miss. If you were referred for a psychiatric evaluation, this is the same appointment under the name we use for it.',
      },
      {
        heading: 'The tools we use',
        body: 'Structured instruments sit alongside the clinical conversation. They give us a baseline to measure against later, which is what makes it possible to tell real progress from a good week.',
        list: [
          'A comprehensive psychiatric assessment questionnaire',
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
        body: 'The plan that comes out of the assessment combines psychotherapy approaches and psychopharmacology, matched to your diagnosis and your circumstances. Where other clinicians are already involved in your care, we collaborate with them to establish the therapy regimen and the medication protocol together rather than in parallel.',
      },
      {
        heading: 'What happens after',
        body: 'The plan is not the end of it. We evaluate your progress on an ongoing basis, and provide support and education as you go. Follow-up care is usually medication management, in person or by telehealth.',
      },
    ],
    faqs: [
      {
        q: 'Is the first appointment always an assessment?',
        a: 'Yes. Every new patient begins with a comprehensive psychiatric assessment, because the treatment plan depends on it.',
      },
      {
        q: 'Can the assessment be done by telehealth?',
        a: 'Yes. The assessment is available by telehealth to patients across New Jersey and Pennsylvania, and in person. Ask us when you get in touch and we will confirm what works for your situation.',
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
    modality: 'By telehealth and in person.',
    sections: [
      {
        heading: 'Prescribing that follows the plan',
        body: 'Medication is prescribed as part of the treatment plan established at your comprehensive psychiatric assessment, not in isolation from it. Psychopharmacology is combined with psychotherapy approaches where both are indicated.',
      },
      {
        heading: 'Measured, not guessed',
        body: 'We use standardized clinical rating scales to monitor your progress against the baseline taken at your assessment. The same measures also help catch decompensation early — a change in the wrong direction is easier to act on when it shows up as a number and not only as a feeling.',
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
        q: 'Can I get medication management without an assessment first?',
        a: 'No. The comprehensive psychiatric assessment establishes the diagnosis and the baseline measurements that medication management depends on.',
      },
      {
        q: 'How often are follow-up appointments?',
        a: 'That depends on your treatment plan and how you are responding. We will agree a schedule with you at your assessment.',
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
    modality: 'By telehealth across New Jersey and Pennsylvania.',
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
        body: 'Follow-up medication management works particularly well by video: the appointment is a structured review of how you are responding, which does not depend on being in the same room. Comprehensive psychiatric assessments can also be arranged by telehealth — ask us and we will confirm what suits your situation.',
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
      title: 'Comprehensive psychiatric assessment',
      body: 'Your first appointment is a full psychiatric assessment. We review your history, identify risk factors, reach a diagnosis, and build a treatment plan with you.',
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
  body: 'Four steps, from the first contact to ongoing care. Every new patient starts with the same comprehensive psychiatric assessment.',
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
      title: 'Comprehensive psychiatric assessment',
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
    title: 'Comprehensive psychiatric assessment',
    description:
      'A structured first appointment that identifies risk factors, establishes a diagnosis, and produces a treatment plan.',
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
    description:
      'How to get in touch, what the first appointment covers, and how ongoing care works.',
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

/**
 * The homepage card image for a route, so an interior page's hero and the card
 * that links to it show the same frame. Returns the poster rather than the
 * video: a hero is a still, and the poster is the frame the card shows at rest
 * anyway. Undefined for any route with no card, which is the signal to fall
 * back to the gradient.
 */
export function cardPosterFor(href: string): string | undefined {
  return FEATURED_SERVICES.find((service) => service.href === href)?.poster;
}

export const FAQ = {
  /**
   * The section's eyebrow. A label for the block, not a claim.
   */
  eyebrow: 'FAQ',
  heading: 'Questions before you book',
  /**
   * The only new string in this block, and deliberately not a fact: it
   * restates the invitation the answers below already make ("ask us", in
   * `groups`, and INSURANCE.body's "If yours is not listed, ask us"). Nothing
   * here asserts anything verifiable about the practice.
   */
  intro:
    'If your question is not here, ask us when you get in touch and we will answer it before you book.',
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
          a: 'A comprehensive psychiatric assessment. We take a full history, identify risk factors, use standardized screening and rating scales where helpful, and finish with a diagnosis and a treatment plan.',
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
  /**
   * NOT RENDERED. Kept for the day a backend is connected.
   *
   * This is the real success message, and it is deliberately unused: nothing
   * receives submissions yet, so showing it would tell a prospective patient
   * their request had been received when it had not. A psychiatric practice
   * is the worst place to make that claim — someone who believes they are on
   * a waiting list does not call. `unavailable` below is what renders instead.
   *
   * Restore this as the `submitted` branch in components/ui/onboarding-form.tsx
   * at the same time as the form's POST target, not before.
   */
  success: {
    heading: 'Thank you',
    body: 'We have your details and will be in touch about an appointment. If you need to reach us sooner, please call the practice.',
  },
  /**
   * What a valid submit actually shows today.
   *
   * The sentence is split around its links rather than stored whole because
   * the phone and both addresses have to be real `tel:`/`mailto:` targets —
   * the point of this message is that it hands over a channel that works.
   *
   * TWO addresses, not one. There is no practice-wide inbox: BUSINESS.emails
   * carries only the two named provider addresses, and the CLIENT note there
   * asks for an info@ or contact@. app/contact/page.tsx already resolved the
   * same question the same way — list both rather than invent a general one,
   * or route every stranger into one clinician's personal inbox. Collapse
   * this to a single address when the client supplies one.
   */
  unavailable: {
    heading: 'Online requests aren’t active yet',
    before: 'Please call',
    between: 'or email',
    after: 'to request an appointment.',
  },
} as const;

/**
 * `textable` records whether the line accepts SMS, and is a clinical fact, not
 * a presentation flag — which is why it lives here beside the number rather
 * than in whichever component happens to render it.
 *
 * 988 accepts text nationwide. 911 does not: text-to-911 depends on the local
 * PSAP supporting it and is not available everywhere, so offering a Text
 * button would promise a route that can silently go nowhere in an emergency.
 * Any line added here must have this checked, not guessed.
 */
export const CRISIS = {
  heading: 'If you need help now',
  body: 'This website is not for emergencies and is not monitored around the clock.',
  items: [
    {
      label: '988',
      href: 'tel:988',
      textable: true,
      title: 'Suicide and Crisis Lifeline',
      body: 'Call or text 988, any time, for free and confidential support in a crisis.',
    },
    {
      label: '911',
      href: 'tel:911',
      textable: false,
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
    'What to expect as a new patient at Newpoint: how to get in touch, your first psychiatric assessment, and how ongoing care works in NJ and PA.',
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
      body: 'It is a comprehensive psychiatric assessment: a full history, a review of risk factors, structured questionnaires and rating scales, and a diagnosis and treatment plan at the end of it.',
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
 *
 * MANY OF THESE NOW HAVE A CANDIDATE ANSWER, and none of them has a confirmed
 * one. `research/provider-directories.md` (captured 2026-09-29) reconciles what
 * the providers have published about themselves on Grow Therapy, Headway, U.S.
 * News and Doximity. It supplies a street address corroborated three ways, an
 * NPI, both state licence numbers, a Pennsylvania office, and candidate answers
 * on ADHD, substance use, age range and therapy modalities.
 *
 * A directory profile is not a primary source and nothing from it has been
 * applied to copy. Items below say where the evidence now sits; they stay open
 * until the client confirms. That file also opens ONE NEW ITEM, listed last and
 * the most urgent thing in this array: the site currently claims a Pennsylvania
 * licence for Ofoegbu that her own Headway licensure field does not support.
 */
export const OPEN_CLIENT_ITEMS = [
  'Exact legal business name from the LLC formation documents ("Newpoint" vs "New Point")',
  'Street address, suite and ZIP for the practice. NOW THE HIGHEST-VALUE OPEN ITEM: the client has confirmed care is delivered in person as well as by telehealth, so the site claims in-person care and the organization is marked up as a MedicalClinic. Google expects an address on that type, a patient told they can be seen in person has nowhere to go, and Local Pack and Maps eligibility are blocked until it exists. The former "or confirm service-area only" alternative is closed — in-person care is confirmed. EVIDENCE NOW EXISTS: 6 Colonial Lake Drive, Suite D, Lawrence Township (Lawrenceville), NJ 08648 — named by Grow Therapy, Headway and U.S. News, across BOTH providers, and U.S. News pairs it with (609) 527-9438, which is already BUSINESS.phonePrimary. Needs the client to confirm in writing, and to confirm the suite format, before it ships',
  'Which states in-person care covers. A SECOND ADDRESS HAS SURFACED: Headway lists 803 West Trenton Avenue Ste 3, Morrisville, PA 19067 for Whitaker as "Location 1 of 2". This is the first Pennsylvania place-level signal in any Newpoint research and would relax CLAUDE.md\'s rule that in-person care is stated without a state. One platform, one provider, unconfirmed — it may be a Headway location rather than a Newpoint office',
  'State nursing license numbers for both providers, or confirmation they prefer not to publish them. CANDIDATES for Whitaker: NJ 26NJ00646400 (APN) and PA SP016195 (CRNP), per Grow Therapy and Headway. Note the two states use different regulatory titles for the same role — APN in New Jersey, CRNP in Pennsylvania — so publish each number with the right one. Nothing found for Ofoegbu',
  'NPI numbers for both providers, or confirmation they prefer not to publish them. CANDIDATE for Whitaker: 1760719512, per U.S. News. Nothing found for Ofoegbu',
  'Certifying body for the "board-certified" claim (the post-nominals imply one, but it is not stated anywhere and must not be assumed)',
  'Hours of operation, including what the "expanded schedule" for telehealth actually covers. Still nothing: the directories repeat "weekends, evenings and holidays by request" verbatim and name no actual hours',
  'Confirmed age range served (adults only, or across the lifespan as a practice policy). STILL OPEN, AND THE EVIDENCE NOW CONFLICTS: Grow Therapy says Whitaker serves adults 18-64 and elders 65+ with NO children, while Headway says she serves adults, adolescents AND children. Same clinician, two platforms, opposite answers. Paediatric psychiatric prescribing is not a claim to resolve from a directory field',
  'Whether substance use and addiction treatment is an active service line. THE DIRECTORIES SAY YES: Grow lists addiction for Whitaker, and Headway lists "Substance use / addiction" as Ofoegbu\'s FIRST specialty. Her existing bio already says her last 11 years were in mental health and addiction. This also bears on the new "Mental and behavioral care" hero — in US payer language behavioral health includes SUD, so the headline already implies a door the conditions list does not open',
  'Named therapy modalities offered (CBT, DBT, EMDR, and similar), if any. RAISED IN PRIORITY: the owners confirmed on 2026-09-29 that medication management is delivered combined with psychotherapy, and /services now names that as a way visits run — so the site asserts psychotherapy happens while still being unable to say what kind, who delivers it, or whether it is a visit of its own. It is also the obvious fourth service page. FOUR CANDIDATES NOW EXIST AND THEY DISAGREE: Grow says Compassion Focused for Whitaker; Headway says Motivational Interviewing, Behavior Modification and Cognitive Behavioral Family Therapy for her. Headway does corroborate the owners on delivery — it lists "individual therapy" and "family therapy" as care types — but ONLY for Whitaker. Ofoegbu\'s care type there is medication management alone, which is directly relevant to the CLIENT question in app/services/page.tsx about binding providers to services',
  'Whether ADHD is treated. It is one of the highest-volume queries for a psychiatric NP practice and appears nowhere in the source material, so it is not claimed — but it may be an omission rather than a deliberate exclusion. THE DIRECTORIES SAY IT IS AN OMISSION: Grow lists ADHD for Whitaker and Headway lists ADD/ADHD for BOTH providers. Highest-value content addition available from the 2026-09-29 capture. Insomnia/sleep is in the same position — Grow, Headway and U.S. News all carry it and WHAT_WE_TREAT.conditions does not',
  'Whether the practice holds in-network contracts with the listed payers, or accepts them while billing out of network. The site says "accept" throughout, which is the weaker and safer claim',
  'Exact payer plan names and any sub-plans, confirmed against the practice records. The list was scraped from an unseparated string on the live site',
  'Whether patients receive their treatment plan in writing',
  "Public profile URLs for each provider (Psychology Today, LinkedIn, NPI registry, hospital or association listing). These would populate `sameAs` on each provider's Person schema, which is the main signal search engines use to tie a name on this site to the same person elsewhere. Nothing is guessed, so `sameAs` is currently absent. FIVE URLS ARE NOW IN HAND — the Grow Therapy, Headway (both providers), U.S. News and Doximity profiles listed in research/provider-directories.md. This is the cheapest remaining SEO win in the list and needs only the client's okay, since linking to a competing marketplace's profile is a business decision, not a technical one",
  'A general practice inbox address for the contact form, since only named provider addresses exist',
  "Self-pay session fee and the sliding scale criteria. Grow Therapy lists $150 per session for Whitaker, but that is the marketplace's rate for her time on that platform and is not Newpoint's fee",
  "Ofoegbu's Pennsylvania licence number — or confirmation that she does not hold one. THE MOST URGENT ITEM IN THIS LIST, and the only one where the site may currently be making a claim it cannot support. PROVIDERS[].licensed and the telehealth service page both state that BOTH providers are licensed in New Jersey and Pennsylvania, sourced from her bio on the practice's own site, and her free-text Headway bio repeats it. But Headway's STRUCTURED licensure fields give her New Jersey only, where Whitaker's give both states — so the field can hold two and was not left blank by accident. Stale free text is common; a licensure field the platform routes bookings on is not. If the PA licence has lapsed or never existed, the site is telling a Pennsylvania patient that either provider can see them. Verify against the PA Department of State licensee search or get the number from the client BEFORE this branch ships",
  'Original logo file, vector preferred',
  'Service-section footage. Every card on the homepage services section currently reuses the hero clip, which shows a person in a meadow. On a behavioral-health service tile that reads as an implied treatment outcome, which is the same category as a testimonial. Replacement clips must not depict a patient or imply an outcome',
  'Optional upgrade only, no longer a gap: written permission or brand assets for insurer logos, if the practice ever wants payer marks instead of the typographic wall',
  'Patient testimonials with documented consent, if the practice wants them later',
  'Reshoot of both provider portraits at 2000px or more with headroom, to unlock the deferred hero treatment',
] as const;
