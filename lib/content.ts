/**
 * All site copy in one place.
 *
 * SOURCING RULE (per CLAUDE.md): marketing, service, and bio copy is generated
 * from /research. Verifiable regulated facts are never invented. Anything not
 * confirmed in /research is listed in `OPEN_CLIENT_ITEMS` below and marked at
 * its point of use with a `CLIENT:` comment.
 *
 * SERVER ONLY, AND IT MATTERS. Nothing under a `'use client'` directive may
 * import from this file: a client component's import graph is shipped to the
 * browser, so one import here puts every bio, FAQ answer and payer name into a
 * public JS chunk. The three constants a client component legitimately needs —
 * the nav, the CTA and the practice name — live in `lib/nav.ts`, which imports
 * nothing. See the note at the top of that file.
 */

import { BRAND } from './nav';

/**
 * Re-exported so the server components that already read these from here keep
 * working. `lib/nav.ts` is the definition; this is an alias, not a copy.
 */
export { NAV, CTA } from './nav';

export const BUSINESS = {
  /**
   * Canonical name per CLAUDE.md, defined in lib/nav.ts because the navbar
   * needs it without needing the rest of this file. The live site spells it
   * four different ways.
   * CLIENT: confirm exact legal name from the LLC formation documents,
   * "Newpoint" (one word) vs "New Point" (two words), before any GBP or citation work.
   */
  legalName: BRAND.legal,
  shortName: BRAND.short,
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

/**
 * Accepted plans, grouped by where they apply. Source of truth for the flat
 * `INSURANCE.payers` below, which is derived from it.
 *
 * WHY GROUPED: the list used to be seven flat names with NOT ONE Pennsylvania
 * plan among them, on a site that sells care in two states. A Pennsylvania
 * visitor with Highmark scanned it, saw nothing from their state, and had no
 * way to tell "not listed" from "not covered". That is the single biggest
 * conversion problem this page had.
 *
 * WHERE THE NEW NAMES COME FROM, and the caveat that governs all of them:
 * research/provider-directories.md, captured 2026-09-29. Those lists are the
 * plans GROW THERAPY and HEADWAY are contracted with for these providers — a
 * patient who books through a marketplace is billed by the marketplace. That is
 * not automatically the same as Newpoint accepting a plan directly, which is
 * why only names corroborated across BOTH platforms were taken, and why every
 * one of them is flagged in OPEN_CLIENT_ITEMS for the practice to confirm
 * before launch.
 *
 * Previously excluded, now listed at the client's instruction (2026-10-01):
 * - Blue Cross Blue Shield of Massachusetts. The note here read "a Headway
 *   national-network artifact", because Massachusetts is not a state this
 *   practice serves. The client asked for it by name from Dr. Whitaker's
 *   Headway profile, so it ships under `review` rather than being dropped, and
 *   it sits under "Other plans" because its name states a state the practice
 *   does not serve.
 * Still excluded:
 * - UPMC, Amerihealth, Humana, Braven, Surest, Centivo, AvMed and the long tail
 *   of Aetna and UnitedHealthcare sub-plans. All Grow-only, i.e. one
 *   marketplace's network and nothing else, and none of them was asked for.
 *
 * "Accept", never "in network", throughout — see `heading` below.
 *
 * ---
 *
 * TWO FIELDS GATE A PAYER, AND THEY GATE DIFFERENT SURFACES. This was one
 * field until 2026-10-01; the second exists because the client asked for the
 * gated candidates to be published while they are still being confirmed.
 *
 * `confirmed`
 *   true  = the practice's own, from research/business-nap.md. Rendered on the
 *           insurance page, on the homepage card and its "and N more" count,
 *           and emitted in the JSON-LD.
 *   false = not confirmed by the practice. Never reaches `INSURANCE.payers`,
 *           so never reaches the homepage card or the schema.
 *
 * `review`
 *   A CLIENT-REVIEW note. Set on a payer the CLIENT asked to publish before
 *   the practice has confirmed it. It renders the name ON THE INSURANCE PAGE
 *   ONLY — `INSURANCE.payers` still derives from `confirmed` alone, so the
 *   homepage card, its count and the JSON-LD are untouched by it. The note
 *   says where the name came from and what has to be confirmed.
 *
 * So the page may now show a name the schema does not assert. That asymmetry
 * is deliberate and it is the narrowest way to honour the instruction: the
 * page is where the plan list is read and where the "ask us and we will check
 * your coverage" sentence sits beside it; the schema is a machine claim about
 * the business that nobody has confirmed yet.
 *
 * A name with NEITHER flag is still invisible everywhere, which is what the
 * original gate was for. When the practice confirms one, set `confirmed: true`
 * and delete its `review` note: the card, the count and the schema pick it up
 * at once. Deleting the entry instead throws away the sourcing notes and the
 * reason it was a candidate, so flip, do not delete.
 */
type Payer = {
  readonly name: string;
  readonly confirmed: boolean;
  /** CLIENT-REVIEW note. Publishes the name on /insurance only. See above. */
  readonly review?: string;
};

/**
 * The note every plan added on 2026-10-01 carries, dictated by the client.
 *
 * ONE CONSTANT, NOT NINE COPIES, so it cannot drift between entries and so a
 * grep for it returns the whole set. The source is Dr. Whitaker's Headway
 * profile: https://care.headway.co/providers/funmilayo-whitaker-2
 */
const HEADWAY_WHITAKER_REVIEW =
  "CLIENT-REVIEW: Listed on Dr. Whitaker's Headway profile; confirm practice-wide and for Dr. Ofoegbu.";

const PAYER_GROUPS: readonly { readonly scope: string; readonly payers: readonly Payer[] }[] = [
  {
    /* National carriers and Medicare: they do not vary by state, so they lead.
       Aetna, Cigna, United Healthcare and Optum are the practice's own, from
       research/business-nap.md. Oscar and Oxford are the best-evidenced
       additions in the whole capture — both providers, both platforms. Carelon
       is both providers, Headway only; it is a behavioral-health carve-out
       network rather than a plan, which is exactly the kind of thing a practice
       contracts with directly, so it is kept as a candidate rather than
       dropped. All three stay unconfirmed until the practice says otherwise. */
    scope: 'Accepted in both states',
    payers: [
      { name: 'Aetna', confirmed: true },
      { name: 'Cigna Evernorth', confirmed: true },
      { name: 'United Healthcare', confirmed: true },
      { name: 'Optum', confirmed: true },
      /* The client's 2026-10-01 list names all three, so all three now
         publish.

         THE NOTE UNDERSTATES WHAT IS BEHIND THEM, AND THE "for Dr. Ofoegbu"
         HALF IS ALREADY ANSWERED FOR ALL THREE: each appears on Ofoegbu's own
         Headway profile as well as Whitaker's
         (research/directories/headway-ofoegbu.txt). Oscar and Oxford are also
         on Grow Therapy for Whitaker; Carelon is Headway-only — the earlier
         note here claimed Grow for all three and was wrong, caught in review
         2026-10-01. The note is still carried verbatim on all nine, because
         the thing the practice has to confirm is the same for every one of
         them: that NEWPOINT bills the plan directly, rather than a
         marketplace billing it for a provider's work on that marketplace. */
      { name: 'Oscar', confirmed: false, review: HEADWAY_WHITAKER_REVIEW },
      { name: 'Oxford', confirmed: false, review: HEADWAY_WHITAKER_REVIEW },
      { name: 'Carelon Behavioral Health', confirmed: false, review: HEADWAY_WHITAKER_REVIEW },
      { name: 'Medicare', confirmed: true },
    ],
  },
  {
    /* Both the practice's own, from research/business-nap.md. Unchanged. */
    scope: 'New Jersey',
    payers: [
      { name: 'Blue Cross Blue Shield Horizon NJ', confirmed: true },
      { name: 'NJ Medicaid', confirmed: true },
    ],
  },
  {
    /* ALL FOUR WERE UNCONFIRMED AND INVISIBLE, so this group rendered the
       coverage-check invitation instead of a list. On 2026-10-01 the client
       asked for all four by name, so all four now carry `review` and the
       group renders as a list. The practice has still never published a
       Pennsylvania plan; these four come from the providers' marketplace
       profiles.

       THREE OF THE FOUR WERE RENAMED TO THE CLIENT'S SPELLING, not added
       alongside the existing entries — "Capital Blue Cross Pennsylvania",
       "Highmark Blue Cross Blue Shield Pennsylvania" and "Independence Blue
       Cross Pennsylvania (Virtual National Network)" are the same carriers
       this group already held under shorter names. Listing both spellings
       would show one insurer twice and read as two different contracts.
       Geisinger's name is identical in both lists.

       Each appears on BOTH Grow Therapy and Headway, and each is a major
       Pennsylvania carrier, which is the coverage a PA patient is actually
       looking for — so they are worth confirming rather than discarding.

       They are Whitaker-only on Headway. That is not evidence Ofoegbu does not
       take them: her entire Headway profile is configured NJ-only, including a
       licensure field the client has since confirmed understates her — she is
       licensed in both states. Per-provider marketplace configuration is not a
       practice-level payer fact either way.

       CLIENT: these four carry the most upside on the page and the most risk.
       A PA patient who saw Highmark listed and booked on that basis would have
       been told something the practice has not confirmed, which is why they are
       gated. Confirm and flip, or cut. */
    scope: 'Pennsylvania',
    payers: [
      { name: 'Capital Blue Cross Pennsylvania', confirmed: false, review: HEADWAY_WHITAKER_REVIEW },
      {
        name: 'Highmark Blue Cross Blue Shield Pennsylvania',
        confirmed: false,
        review: HEADWAY_WHITAKER_REVIEW,
      },
      {
        name: 'Independence Blue Cross Pennsylvania (Virtual National Network)',
        confirmed: false,
        review: HEADWAY_WHITAKER_REVIEW,
      },
      /* Grouped here because this group already held it, not because the name
         states a state — "Geisinger" on its own does not. */
      { name: 'Geisinger', confirmed: false, review: HEADWAY_WHITAKER_REVIEW },
    ],
  },
  {
    /* NEW GROUP, 2026-10-01, for the two plans in the client's list whose
       names place them outside New Jersey and Pennsylvania or say nothing at
       all about where they apply. The instruction was to group by what the
       plan NAMES state and to put anything unclear here.

       Blue Cross Blue Shield of Massachusetts names a state this practice
       does not serve. It is not a mistake to list it — a patient can carry a
       Massachusetts plan and be seen in New Jersey — but it is not a New
       Jersey or a Pennsylvania plan, and claiming it as one would be wrong.

       The Health Plan states nothing: no state, no carrier family, no
       network. It is a West Virginia and Ohio carrier by that exact name, but
       nothing in the string says so, so nothing here assumes it.

       PROVENANCE, since it is the one name in the client's list that no
       earlier research note ever discussed: it is on Dr. Whitaker's Headway
       profile (research/directories/headway-whitaker.txt) and nowhere else in
       the capture — not on Grow Therapy, and not on Ofoegbu's profile.
       Massachusetts is on BOTH providers' Headway profiles. */
    scope: 'Other plans',
    payers: [
      {
        name: 'Blue Cross Blue Shield of Massachusetts',
        confirmed: false,
        review: HEADWAY_WHITAKER_REVIEW,
      },
      { name: 'The Health Plan', confirmed: false, review: HEADWAY_WHITAKER_REVIEW },
    ],
  },
];

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
  groups: PAYER_GROUPS,
  /**
   * CONFIRMED PAYERS ONLY, flat, and derived so it cannot drift from the groups
   * above. This is what the homepage card and the schema emitter consume, so
   * gating happens once, here, rather than at each call site where a future
   * consumer could forget it. The card's "and N more" count follows from it.
   *
   * Anything needing the unconfirmed candidates too reads `groups` directly
   * and filters for itself. Since 2026-10-01 one surface does: the insurance
   * page renders a payer with `confirmed` OR a `review` note. This derived
   * list stays `confirmed`-only, which is what keeps the review notes off the
   * homepage card and out of the JSON-LD.
   *
   * KEEP THE @__PURE__ ANNOTATION. It is not decoration. `navbar-1.tsx` is a
   * client component and imports NAV, CTA and BUSINESS from this file, which
   * pulls the whole module into the browser bundle; tree-shaking then drops
   * whatever the client provably does not use. A bare `PAYER_GROUPS.flatMap(…)`
   * is a call expression the bundler cannot prove is side-effect free, so it
   * kept PAYER_GROUPS alive and shipped every UNCONFIRMED payer name — seven at
   * the time, nine now, each with its review note — in
   * static/chunks/app/layout-*.js — readable by anyone who opened devtools,
   * even though nothing rendered them. Measured before and after: with the
   * annotation the names are absent from the client bundle entirely.
   *
   * So the gate holds in three places, not two: the page, the schema, and the
   * bytes we serve.
   */
  payers: /* @__PURE__ */ PAYER_GROUPS.flatMap((g) =>
    g.payers.filter((p) => p.confirmed).map((p) => p.name)
  ),
  /**
   * Shown in place of a group's list while that group has nothing to publish:
   * no payer in it is `confirmed` and none carries a `review` note. No group
   * is in that state today.
   *
   * Near-identical to `coverageCheckNote` and deliberately its own string: that
   * one sits on a card about a plan we DO accept, this one stands where a list
   * would be and has to carry the absence without drawing attention to it. They
   * will diverge the moment either context changes.
   */
  unconfirmedScopeNote:
    'Tell us your plan and we will check your coverage before your first appointment.',
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

/**
 * Footer copy.
 *
 * NOTHING HERE IS NEW. `description` is the sentence the old footer already
 * carried, lifted out of the component so the copy lives where the rest of it
 * does. `modality` restates the care-modality rule verbatim, the same way
 * SERVICE_PAGES' telehealth `modality` does. No claim on this surface is made
 * that is not already made on a page.
 *
 * CLIENT: still no street address and still no hours, so the footer carries
 * neither. Geography stays service-area only. Add a PostalAddress here and in
 * lib/schema.ts together, once one is confirmed.
 */
export const FOOTER = {
  description:
    'Outpatient psychiatric and behavioral health care by telehealth across New Jersey and Pennsylvania, and in person.',
  /**
   * U+2011 NON-BREAKING HYPHEN in "in‑person", not an ordinary hyphen.
   * This sits in a narrow footer column and wraps at almost every width; an
   * ordinary hyphen lets the browser break the line after it, leaving "in-" at
   * the end of one line and "person" at the start of the next. It reads as a
   * typo rather than a line break.
   */
  modality: 'Telehealth across New Jersey and Pennsylvania, and in‑person care.',
  /** Column headings. Labels only. */
  columns: {
    services: 'Services',
    practice: 'Practice',
    contact: 'Contact',
  },
  crisis: {
    before: 'In a crisis, call or text',
    between: '. In an emergency, call',
    after: '.',
  },
  /** Not a disclaimer the practice invented; it is the one the old footer had. */
  legalNote:
    'This website is for general information and is not medical advice, and it is not monitored around the clock.',
} as const;

export type Provider = {
  slug: string;
  /**
   * The legal name, with no title.
   *
   * THIS IS WHAT MACHINES READ. schema.org `Person.name`, the breadcrumb trail,
   * every page's metadata and the portrait `alt` all use it, and none of them
   * may carry "Dr." — see CLAUDE.md's clinician-titles section. Visible copy
   * uses `displayName`.
   */
  name: string;
  /**
   * The name as it is SHOWN, with the "Dr." prefix the client asked for.
   *
   * A SEPARATE FIELD, NOT A PREFIX WRITTEN INTO `name`, and the separation is
   * the whole of the override. Structured data keeps `name` clean and carries
   * the title as `honorificPrefix`, so the markup still describes two advanced
   * practice nurses while the page says "Dr.".
   *
   * THE CONDITION ON USING IT: wherever this renders, the credentials or the
   * words "nurse practitioner" must be visible beside it. A surface that cannot
   * show one of those keeps `name` — the footer's inbox list is the one place
   * in the repo that currently does.
   */
  displayName: string;
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
  /** Languages the provider sees patients in, as prose, for the fact rows. */
  languages: string;
  /**
   * The same languages, one per entry, for the surfaces that need them
   * structured rather than as a sentence: `knowsLanguage` in the Person
   * JSON-LD and the Languages line on the /providers card.
   *
   * OPTIONAL, AND SET ON ONE PROVIDER. The client asked on 2026-10-01 for
   * Dr. Whitaker's languages specifically, sourced to her Headway profile, and
   * asked explicitly that no language be added for Dr. Ofoegbu. So the two
   * surfaces that read this field show it for Whitaker and show nothing for
   * Ofoegbu — not because her prose `languages` is in doubt, but because the
   * instruction named one provider. Her own page's Languages row is unchanged
   * and still reads the prose field, as it always has.
   *
   * Set this for Ofoegbu when the client confirms hers, and both surfaces
   * pick her up with no further change.
   */
  knowsLanguage?: readonly string[];
  /**
   * The provider's own introduction, in her own voice, one entry per paragraph.
   *
   * FIRST PERSON, AND AN ARRAY, both since 2026-09-29. These are the providers'
   * own Headway bios, which the client asked for verbatim — see
   * research/provider-directories.md and the note on PROVIDERS below. The array
   * exists because Whitaker's runs to two paragraphs; the provider page uses
   * [0] as the hero standfirst and renders the rest as body copy.
   */
  bio: string[];
  /** Her own answer to "My approach to therapy". First person. */
  approachFull: string;
  /** Her own answer to "What you can expect from me". First person. */
  expect: string;
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
 *
 * ---
 *
 * BIOS ARE THE PROVIDERS' OWN HEADWAY PROFILES, VERBATIM, at the client's
 * request (2026-09-29). `bio`, `approachFull` and `expect` map one-to-one onto
 * Headway's "Great to meet you!", "My approach to therapy" and "What you can
 * expect from me" blocks. They are reproduced as written, in the first person,
 * with four classes of exception and no others:
 *
 * 1. THE APPOINTMENT IS AN ASSESSMENT, NOT AN EVALUATION. Both providers wrote
 *    "evaluation"; the owners instructed on the same day that the site says
 *    "assessment". The owners' rule is the more recent and the more specific to
 *    this site, so it wins here — but it IS a deviation from verbatim, it is
 *    the only one that changes meaning, and CLAUDE.md's terminology section is
 *    where to reverse it if the client would rather keep their own word.
 * 2. Objective typos are fixed: a stray full stop in "My name is Anastasia.
 *    Ofoegbu", and "reading an most of all".
 * 3. British spellings are Americanised ("travelling"), matching the rest of
 *    the site and both states served.
 * 4. Mid-sentence capitals on common nouns are lowered, and one missing article
 *    restored, in Ofoegbu's approach line. Marketplace profiles are typed into
 *    a form; a practice site is typeset.
 *
 * The unedited originals are in research/directories/headway-*.txt. Diff
 * against those before changing anything here.
 */
export const PROVIDERS: Provider[] = [
  {
    slug: 'funmilayo-whitaker',
    name: 'Funmilayo Whitaker',
    displayName: 'Dr. Funmilayo Whitaker',
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
     * CLIENT-REVIEW: English and Yoruba, confirmed against the source the
     * client named on 2026-10-01 —
     * https://care.headway.co/providers/funmilayo-whitaker-2 — which lists
     * Yoruba among the languages she practises in. Confirm with the practice
     * that she sees patients in Yoruba, since a marketplace profile is the
     * provider's own statement rather than the practice's.
     *
     * THE PROSE FIELD ABOVE ALREADY SAID THIS and is unchanged; this is the
     * same fact structured, so `knowsLanguage` can reach the JSON-LD and the
     * card without either surface parsing a sentence. The two must stay in
     * step: edit both or neither.
     */
    knowsLanguage: ['English', 'Yoruba'],
    /**
     * Verbatim from Headway, unedited. Her paragraph break is kept.
     *
     * The "across the lifespan" age claim that the practice's own site made,
     * and that OPEN_CLIENT_ITEMS has always flagged, does not appear in her own
     * bio — so adopting her wording resolves that exposure rather than
     * reintroducing it. Good, because the directory capture makes the age
     * question worse, not better: Grow says adults and elders with no children,
     * Headway says adults, adolescents AND children.
     *
     * The first paragraph is reproduced verbatim on the homepage cards and is
     * asserted at build time by assertSourced() in components/sections/
     * Providers.tsx. Do not reword it without updating CARD_SENTENCE.
     */
    bio: [
      'I am a dual board-certified Mental Health Nurse Practitioner (DNP-PMHNP) and Family Nurse Practitioner (FNP) with over ten years of direct patient care experience.',
      'I have worked in diverse roles, diagnosing and treating mental health disorders in group practice, community settings, and telehealth. I offer medication management for various mental health conditions for individuals with psychiatric disorders such as depression, anxiety, bipolar disorder, panic attacks, PTSD, schizophrenia, addiction, etc.',
    ],
    /* Verbatim. The short `approach` above is the scannable version of this
       same sentence and is what the facts list used to show; the page now
       prints her own words instead, so the two never appear together. */
    approachFull:
      'I use a warm, empathic, non-judgmental, and collaborative approach in treating individuals with mental illness.',
    /**
     * Verbatim except for ONE word: she wrote "comprehensive psychiatric
     * evaluation" and this says "assessment", per the owners' 2026-09-29
     * terminology rule. See the block comment above PROVIDERS.
     *
     * This passage is also the origin of WHAT_TO_EXPECT on the homepage — the
     * live practice site carries a near-identical version, recorded verbatim at
     * research/content/services.md. The two should stay in step.
     */
    expect:
      'The initial visit consists of completing a comprehensive psychiatric assessment and identifying risk factors that might affect an individual’s mental health. Diagnoses of mental illness are made based on assessment, and then the most effective care plan for the individual is determined. The treatment plan consists of psychotherapy modalities and psychopharmacology to improve the person’s mental health. As we evaluate progress, we will continue to provide support and education as needed.',
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
     * ADHD IS NOW ALSO IN SERVICE_PAGES' "Conditions we prescribe for" list on
     * the medication-management page, added 2026-10-01 at the client's
     * instruction. This note used to say the opposite and to ask the client to
     * confirm prescribing scope first. BE PRECISE ABOUT WHAT CHANGED: the
     * client instructed the line, which is not the same as answering the scope
     * question. Whether the practice prescribes stimulants for ADHD, and under
     * whose DEA registration, is still open and still tracked in
     * OPEN_CLIENT_ITEMS — and the line is publishable without that answer
     * because ADHD pharmacotherapy is not exclusively controlled. The
     * reasoning is recorded in full beside that list. Insomnia and substance use are NOT in
     * it — they were not asked for, and treating a condition and prescribing
     * for it remain different claims.
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
    displayName: 'Dr. Anastasia O. Ofoegbu',
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
     * CONFIRMED BY THE CLIENT, 2026-09-29. Both providers are licensed in New
     * Jersey and Pennsylvania, and the telehealth page may keep reasoning from
     * it.
     *
     * Kept here because the question was live for a few hours and the reasoning
     * is worth not repeating: Headway's structured licensure field gives her New
     * Jersey ONLY, and her whole profile there is NJ-shaped — one NJ location,
     * no PA-specific payers, where Whitaker's carries both states, a PA office
     * and five PA plans. That is a deliberate NJ-only configuration of her
     * Headway practice, not a blank field, which is why it was worth asking
     * about. It says nothing about the licence itself: a clinician can hold a
     * PA licence and simply not route one marketplace's bookings through it.
     *
     * Recorded as the client's confirmation, NOT as a register check. The PA
     * Department of State's licensee search sits behind reCAPTCHA and was not
     * queried. The licence NUMBER is still outstanding and is folded into the
     * licence-numbers item in OPEN_CLIENT_ITEMS.
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
     * Verbatim from Headway, as one paragraph, with two typo fixes and one
     * spelling change: her "My name is Anastasia. Ofoegbu" loses its stray full
     * stop, "reading an most of all" becomes "reading and, most of all", and
     * "travelling" is Americanised.
     *
     * She states her own Pennsylvania licensure here, in her own words, and the
     * client confirmed it on 2026-09-29. See `licensed` above.
     *
     * The second sentence is reproduced verbatim on the homepage cards and
     * asserted at build time by assertSourced() in components/sections/
     * Providers.tsx. Do not reword it without updating CARD_SENTENCE.
     */
    bio: [
      'My name is Anastasia Ofoegbu, a dual certified Psychiatric Mental Health (DNP-PMHNP) and Family Nurse Practitioner (FNP). I have been a nurse for 14 years with the last 11 years in Mental Health and Addiction. I am licensed in the states of New Jersey and Pennsylvania. I enjoy traveling, reading and, most of all, love spending time with my family.',
    ],
    /**
     * Verbatim except: "evaluations" becomes "assessments" per the owners'
     * terminology rule, the missing article in "I utilize Evidence-based ...
     * approach" is restored, and her mid-sentence capitals on common nouns are
     * lowered. Her sentence structure and word choices are untouched.
     */
    approachFull:
      'I utilize an evidence-based and patient-centered therapeutic approach to provide psychiatric assessments, medication management and supportive counseling for patients with depression, anxiety and panic attacks, bipolar disorder, and other psychotic and mood disorders.',
    /* Verbatim, unedited. */
    expect:
      'I am passionate about working with patients with mental health disorders to manage symptoms and improve their quality of life.',
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
   * own profiles; see the notes on those arrays above for the sourcing.
   *
   * ADHD IS THE MOST VALUABLE LINE IN THIS ARRAY. OPEN_CLIENT_ITEMS carried it
   * for weeks as one of the highest-volume queries a psychiatric NP practice
   * can answer, absent from the source material and possibly by accident. The
   * evidence says omission rather than exclusion — both providers publish it
   * on their own profiles — though nobody at the practice has said why it was
   * missing, so that is an inference and is labelled one. The client closed
   * the question on 2026-10-01: ADHD is
   * now also in the medication-management page's "Conditions we prescribe for"
   * list, and the open item has been removed. Sleep and substance use are in
   * this list only — prescribing for them has not been asked for or confirmed.
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
   * A hero photograph of this service's own, replacing the video poster the
   * page otherwise borrows from its homepage card.
   *
   * WHY THIS IS OPTIONAL AND NOT A DEFAULT. The card posters are 1280x720
   * frames pulled from the section videos, and next/image never upscales, so a
   * full-bleed hero stretches 1280px across 1440 CSS px and is soft on any
   * retina screen. A page only escapes that once a real hero asset exists for
   * it, so this is set per service as the artwork arrives rather than switched
   * on for all three.
   */
  heroImage?: {
    src: string;
    alt?: string;
    objectPosition?: string;
    sizes?: string;
    quality?: number;
  };
  /**
   * Overrides the scrim that would otherwise be derived from `heroImage`.
   *
   * The derivation in app/services/[slug]/page.tsx is: a page with a real hero
   * master gets `hero`, a page on a video poster gets `poster`. That covers two
   * of the three. `medication-management` is the third case — it has a master
   * but was asked to carry the HOMEPAGE's overlay verbatim instead, so it names
   * its scrim here rather than inheriting one.
   *
   * The hero's vertical alignment follows the scrim, not this field — see the
   * note beside the derivation — so setting this also keeps that page's copy
   * bottom-anchored, which is what `home`'s ramps are shaped for.
   */
  heroScrim?: 'poster' | 'hero' | 'home';
  /**
   * Overrides the hero's vertical alignment, which otherwise follows the scrim.
   *
   * The derivation pairs `hero` with centred copy, because that scrim's radial
   * sits behind a centred block, and leaves everything else bottom-anchored.
   * medication-management is the exception: it carries the homepage's overlay
   * but was asked for the centred treatment anyway, so it says so here rather
   * than having the scrim imply it.
   */
  heroAlign?: 'bottom' | 'center';
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
  /**
   * Which body layout this service's `sections` render in.
   *
   * Absent (the default) is the shared prose layout: a sticky contents rail
   * beside a single column of headings and paragraphs. Medication management
   * and telehealth both use it.
   *
   * `'feature'` is the assessment page's bespoke layout, and it is opt-in
   * because it makes claims the other two cannot support. It renders the first
   * two sections as image-and-copy rows, the third as a tinted statement band,
   * and hands the last two to ServiceFeature as a left column and an image
   * card. That split assumes five sections in roughly that shape; a service
   * with four, or with a list on the wrong one, will not read the way this
   * does. Check the shape before switching a third service onto it.
   *
   * IT ALSO CHANGES WHAT THE PAGE ENDS WITH. On this layout the shared crisis
   * panel and the "Keep reading" link cluster are both dropped, at the
   * client's request of 2026-09-30. See the note at the call site in
   * app/services/[slug]/page.tsx for why that is safe here and would not
   * automatically be safe elsewhere.
   *
   * Replaces the earlier `journey` and `featurePair` booleans, which were two
   * flags describing one decision.
   */
  /**
   * `'cards'` is medication-management's layout: the Feature73 arrangement,
   * adapted in components/sections/ServiceCards.tsx. The modality callout leads
   * the section, the first four sections become cards, and anything after the
   * fourth falls through to its own block below the grid — which is where
   * "Conditions we prescribe for" renders, because it carries a chip list and
   * no photograph. It drops the "On this page" rail; the section ids stay, so
   * existing deep links keep working.
   */
  /**
   * `'grid'` is telehealth's layout, in components/sections/ServiceGrid.tsx:
   * the first section as a featured card with its photograph beside the copy,
   * and the rest as a three-up grid. Like `'cards'` it drops the "On this page"
   * rail and keeps the section ids, so deep links still land.
   */
  layout?: 'feature' | 'cards' | 'grid';
  /**
   * Drop the appointment button out of this service's hero.
   *
   * Client request, 2026-09-30, for the psychiatric assessment page only. It is
   * a flag rather than a deletion in PageHero because that header is shared by
   * six routes and the other five were not part of the request.
   *
   * The page keeps three other routes to an appointment — the sticky navbar
   * button, PageCta's button and phone number, and the footer's — so this
   * removes the above-the-fold prompt, not the ability to book. If it is ever
   * extended to the other two services, check that is still true of them.
   */
  hideHeroCta?: boolean;
  /**
   * `detail` is a SECOND PARAGRAPH, rendered under `body` where the layout
   * supports it. Added 2026-09-30 when the client asked for the diagnosis and
   * treatment-plan sections to carry more than a single paragraph.
   *
   * EVERY SENTENCE IN ONE IS GENERATED FROM research/, per CLAUDE.md's
   * instruction to write marketing and service copy from that source, and
   * nothing in one is a verifiable regulated fact. Specifically absent, and
   * deliberately: appointment durations, named therapy modalities, who
   * delivers psychotherapy, the age range served, and whether the plan is
   * handed over in writing. All five are open client items, several with
   * directory evidence that actively disagrees with itself, and none of them
   * is a gap prose can close.
   */
  /**
   * `bodyLinks` turns phrases that ALREADY EXIST in `body` into internal links.
   * It adds no words: each entry names a phrase and where it should point, and
   * the renderer splits the string around it.
   *
   * WHY IT EXISTS. The "Keep reading" cluster was removed from this route at
   * the client's request, on the understanding that its six destinations were
   * all reachable from the navbar. Checked against the built HTML, that is not
   * true: the Services submenu is not in the static markup at all, so a
   * crawler sees one link to /services, and the sibling services survive only
   * through the footer. This puts contextual links back into sentences that
   * were already written, with richer anchor text than a nav label, without
   * restoring the grid the client asked to remove.
   *
   * `body` stays a plain string, so nothing downstream changes: the schema
   * derives from `intro` and the FAQ answers, never from this.
   */
  sections: {
    heading: string;
    body: string;
    detail?: string;
    list?: string[];
    bodyLinks?: { phrase: string; href: string }[];
    /**
     * "What this means for you" — short points under the section's own copy.
     *
     * RENDERED BY THE CARD LAYOUT ONLY. The prose and feature layouts ignore
     * them, so adding them to a service on either of those changes nothing.
     *
     * EVERY LINE IS EITHER SOURCED OR GENERIC, and the comment above each one
     * says which. A sourced line cites the research file it comes from. A
     * generic line is ordinary patient-education wording that makes no claim
     * about Newpoint at all — no duration, no frequency, no medication name,
     * no named rating scale, no outcome and no credential. Anything that
     * cannot be one of those two things does not go here; it goes to the
     * client as a question.
     */
    bullets?: string[];
    /** One short closing line under the bullets. Same sourcing rule. */
    highlight?: string;
  }[];
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
    /**
     * OBJECT-POSITION READS OFF THE FRAME, not off taste. Measured on the
     * master: the patient occupies x 0-48%, the clinician's hands, pen and
     * notepad sit at x 63-88%, and the wall between them is clear from 30% to
     * 62%. That clear band is what the centred copy sits on.
     *
     * The 70% only bites below about 1024, where the hero is taller than the
     * source's 16:9 and the crop starts working horizontally. At 390 it puts
     * the window on 45%-81% of the width, which holds the side table, the plant
     * and the clinician writing: the assessment itself, rather than an empty
     * corner of the room, which is what a centred 50% would have framed.
     * Above that the full width shows and only the 30% matters, which keeps
     * the patient's head off the top edge while dropping the floor.
     */
    heroImage: {
      src: '/images/services/assessment-session-2752.webp',
      objectPosition: '70% 30%',
      /* Same reasoning as /services: 100vw describes the box, and below lg
         object-cover scales this by height and draws it wider than the
         viewport. 1200px is the widest drawn width down there. */
      /* MEASURED, NOT ESTIMATED. Below lg the hero box is taller than it is
         wide and object-cover scales by height, so the image draws wider than
         the viewport. Measured drawn width across 320 to 1023: 806px at 600,
         899px at 390, 967px at 768, and a maximum of 1070px at 320, where the
         box is tallest.

         1024px covers that maximum with a small margin AND lands a DPR 2
         device on the 2048 candidate instead of 3840. The old 1200px asked for
         2400 device pixels, which is past the 2048 step, so every 2x phone
         downloaded the 3840 variant: 434 KB, for a frame whose visible portion
         is under half its width. At 1024 the same phone gets 2048.

         quality 82, not 90. The q90 reasoning in app/services/[slug]/page.tsx
         is about the 1280x720 VIDEO POSTERS, where a re-encode sits on top of
         an already-soft upscale. This is a 2752px master being downscaled, so
         the resampling dominates and the encoder setting is not the binding
         constraint. Measured on this asset: 3840w costs 434 KB at q90 and
         271 KB at q82, and 2048w costs 234 KB at q90 and 135 KB at q82. */
      sizes: '(min-width: 1024px) 100vw, 1024px',
      quality: 82,
    },
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
    /* The one service on the bespoke layout. See the field's own comment on
       the type for the shape it assumes. */
    layout: 'feature',
    /* Client asked for the hero's appointment button to come off this page. */
    hideHeroCta: true,
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
        /* ONE SENTENCE, AND IT IS THE ONLY ONE THIS SECTION HAD LEFT TO SAY.
           Sourced from research/content/services.md: "diagnoses of mental
           illness are made based on assessments, and then an effective plan of
           care is determined". Nothing else on this page states that the
           diagnosis is what the plan is built on.

           TWO EARLIER SENTENCES WERE CUT HERE, both on review.

           One claimed the diagnosis "is revisited as your response to
           treatment makes the picture clearer". Nothing in research/ says a
           diagnosis is ever reviewed or revised. The two lines that looked
           like support do not carry it: "we will continue to provide support
           and education" commits to support, not to re-examining a diagnosis,
           and rating scales that "monitor progress or decompensation" track
           severity, not the label. Do not restore it without the practice
           confirming that diagnoses are formally reviewed.

           The other explained that screening rules conditions out as well as
           in. True and sourced, but it is already a bullet two blocks above
           under "The tools we use", and the same page saying it twice is the
           thing this layout exists to avoid.

           It does not say how long any of this takes, or that a diagnosis is
           guaranteed: "where a diagnosis can be established" is the same hedge
           the FAQ uses. */
        detail:
          'Where a diagnosis can be established, it becomes the thing the rest of your care is built on.',
      },
      {
        heading: 'Your treatment plan',
        // "A treatment plan", not "a written treatment plan you have agreed to":
        // the source says a plan of care is determined, not that it is written
        // down or countersigned. CLIENT: confirm if patients receive it in writing.
        body: 'The plan that comes out of the assessment combines psychotherapy approaches and psychopharmacology, matched to your diagnosis and your circumstances. Where other clinicians are already involved in your care, we collaborate with them to establish the therapy regimen and the medication protocol together rather than in parallel.',
        /* Both halves are research/content/services.md's "as we evaluate
           progress, we will continue to provide support and education as
           needed". AS NEEDED IS LOAD-BEARING AND IS NOT A SOFTENER: it is the
           source's own clinical-judgement qualifier. This sentence previously
           ended "for as long as you are with us", which turned a qualified
           statement into an open-ended commitment a patient could hold the
           practice to. Do not drop it again.

           A first sentence was cut here as well. It opened "No two plans are
           the same" and contrasted the plan with "a standard protocol". The
           individualisation is sourced, but the absolute is a stronger and
           unfalsifiable version of it, "standard protocol" is an unsourced
           differentiator, and the section's own body copy two lines up already
           says the plan is matched to your diagnosis and your circumstances.

           No modality is named anywhere here, because which ones the practice
           offers is still open and the four candidates in the directories
           contradict each other. */
        detail:
          'The plan is reviewed as your response to treatment becomes clear, and support and education continue alongside it as needed.',
        /* THE PRACTICE'S OWN PUBLISHED LIST of treatment options, from
           research/content/services.md, and none of it has appeared on this
           page before. Three of the six are taken.

           LEFT OUT ON PURPOSE: "skill building groups" and "support groups".
           research/services-analysis.md flags both as named on the live site
           and never described anywhere — no cadence, no format, no topics — so
           putting them on a service page would advertise something the site
           cannot explain and the practice may no longer run. "Psychiatric
           consultation" is left out as well: on this page it would describe
           the appointment the reader is already on.

           CLIENT: confirm whether skill-building groups and support groups are
           still offered. If they are, they are a fourth item here and
           plausibly a section of their own, and we need format and cadence to
           describe them. */
        list: [
          'Medication treatment, where it is indicated',
          /* "Individual counseling" is the practice's own name for this option
             and it stands alone here on purpose. It previously read
             "alongside your medication care", which did two things the source
             does not: it implied Newpoint delivers the counselling, when who
             delivers psychotherapy is an open client item, and it made a
             standalone option conditional on being on medication. The live
             site's own framing is that it will "work with you to find" an
             option, which is weaker than providing it. */
          'Individual counseling',
          'Referral to follow-up services where something falls outside what we provide',
        ],
      },
      {
        heading: 'What happens after',
        body: 'The plan is not the end of it. We evaluate your progress on an ongoing basis, and provide support and education as you go. Follow-up care is usually medication management, in person or by telehealth.',
        /* Both phrases are already in the sentence above and both name a page
           of their own, so these are links this copy was asking for rather
           than links added to it. The anchor text is the service's own name,
           which is what the removed cards used to supply. */
        bodyLinks: [
          { phrase: 'medication management', href: '/services/medication-management' },
          { phrase: 'telehealth', href: '/services/telehealth' },
        ],
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
    /**
     * This page's own hero master, replacing the 1280x720 video poster it used
     * to borrow from its homepage card. 2400px wide, which is the cap the
     * artwork was supplied against; next/image resizes down from it.
     *
     * NO MEDICATION IS DEPICTED, and that is worth keeping. The frame is a man
     * at a kitchen window with a glass of water — it illustrates the ongoing,
     * at-home half of medication management without picturing pills, a bottle
     * or a label, none of which this repo could caption accurately.
     */
    heroImage: {
      src: '/images/services/medication-hero-2400.webp',
      /* Describes the photograph and stops there: no claim that this is a
         patient of the practice, and none about where he is. */
      alt: 'A man standing at a kitchen window with a glass of water, looking out, with potted herbs on the sill beside him.',
      /**
       * MEASURED OFF THE FRAME, not chosen by eye. On the master his hair
       * starts at y 4%, his eyes sit at y 20% and his chin at y 36%; his face
       * spans x 64-78%, centred on x 70%.
       *
       * THE DEFAULT 50% PUT HIS FACE UNDER THE NAVBAR. The source is 1.79:1
       * and this header is wider than that at the two desktop widths, so cover
       * scales by WIDTH and crops vertically. At 1440 the image draws 804px
       * tall into a 540px box: at y-position 50% the crop starts 132px down,
       * which lands his eyes at box y 29 — above the navbar pill's lower edge
       * at about y 83. At 1024 it put them at y 59, also behind it.
       *
       * 10% starts the crop 26px down instead, which puts his eyes at box y 134
       * at 1440 and y 103 at 1024, both clear of the bar. Below lg the box is
       * TALLER than 1.79:1, so cover scales by height, there is no vertical
       * crop at all, and his eyes fall where the frame puts them — y 123 at 768
       * and y 113 at 390. The y value does nothing at those two widths.
       *
       * x 72% is for those same two widths, where the crop works horizontally
       * instead: it holds his face at x 465-619 of 768, and x 200-341 of 390,
       * rather than letting it run off the right edge. It does nothing at 1440
       * or 1024, where the full width is shown.
       *
       * THE GLASS OF WATER IS CROPPED OUT AT 1440 and that is the trade. It
       * sits at y 78% of the frame, below the 540px window any face-clearing
       * y-position leaves. Keeping it needs a y near 50%, which is the value
       * that hid his face.
       */
      objectPosition: '72% 10%',
    },
    /* The homepage's overlay verbatim, rather than the `hero` treatment a
       master would otherwise select. See the field's note on the type. */
    heroScrim: 'home',
    /* Centred between the navbar and the hero's bottom edge, matching the fix
       on the assessment page. PageHero's `center` branch centres on the area
       BELOW THE NAV rather than on the header box, which matters because the
       header pulls itself up by --nav-h so the photograph runs behind the bar. */
    heroAlign: 'center',
    /* Feature73 card grid rather than the shared prose rail. Telehealth is
       deliberately left on the default: this layout assumes four sections that
       each want a photograph, plus a list-carrying section to close. */
    layout: 'cards',
    /* No appointment button in this hero. The page keeps the navbar's,
       PageCta's and the footer's, so the booking route is intact — the same
       reasoning the assessment page's `hideHeroCta` note records. */
    hideHeroCta: true,
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
        /* LEAD COPY, UNCHANGED. Everything below it is new and marked. */
        body: 'Medication is prescribed as part of the treatment plan established at your comprehensive psychiatric assessment, not in isolation from it. Psychopharmacology is combined with psychotherapy approaches where both are indicated.',
        bullets: [
          /* CLIENT-REVIEW — SOURCED. research/content/services.md:18: "Mental
             illness diagnoses are made based on assessments, and then an
             effective plan of care is determined using psychotherapy modalities
             and psychopharmacology for the individual." */
          'A diagnosis comes first, at your assessment, and the prescribing decision follows from it.',
          /* CLIENT-REVIEW — SOURCED. Same sentence as above: the plan of care
             names psychotherapy modalities AND psychopharmacology together. */
          'Where therapy and medication are both indicated, they are planned as one approach rather than separately.',
          /* CLIENT-REVIEW — GENERIC patient education. No claim about Newpoint,
             no medication named, nothing about how long or how often. */
          'Asking what a medicine is meant to do, and why it was chosen, is a reasonable part of the conversation.',
          /* CLIENT-REVIEW — GENERIC patient education. Standard pre-appointment
             advice; names nothing and promises nothing.
             "To hand", not "bring": this service is delivered by telehealth as
             well as in person, and "bring" quietly assumes the appointment is
             the in-person one. Raised by healthcare-reviewer, 2026-10-01. */
          'It helps to have a list of anything you already take to hand, including things bought without a prescription.',
        ],
        /* CLIENT-REVIEW — GENERIC. Restates the lead's own framing without
           adding a claim. */
        highlight: 'Medication is one part of a plan, not the whole of it.',
      },
      {
        heading: 'Measured, not guessed',
        body: 'We use standardized clinical rating scales to monitor your progress against the baseline taken at your assessment. The same measures also help catch decompensation early — a change in the wrong direction is easier to act on when it shows up as a number and not only as a feeling.',
        bullets: [
          /* CLIENT-REVIEW — SOURCED, across two places, and the split matters.
             research/content/services.md:21 gives the baseline itself: "Use of
             standardized clinical rating scales to establish individual
             baseline and to monitor progress or decompensation over time." It
             does NOT say when the baseline is taken. "At your assessment" comes
             from this page's own pre-existing body and FAQ, which already place
             it there — so the line adds no new claim, but services.md:21 alone
             does not carry it. Noted by healthcare-reviewer, 2026-10-01. */
          'A baseline is taken at your assessment, so later visits have something to compare against.',
          /* CLIENT-REVIEW — SOURCED. Same line: the same measures are used to
             monitor progress or decompensation over time. NO SCALE IS NAMED,
             here or anywhere — which instruments the practice uses is still an
             open client item. */
          'The same measures are repeated later, so a change shows up rather than being argued about.',
          /* CLIENT-REVIEW — SOURCED. research/content/services.md:21:
             "Screening tests to aid in making a diagnosis and ruling out other
             disorders". */
          'Screening tests are also used to help rule other conditions in or out.',
          /* CLIENT-REVIEW — GENERIC. Positions a score as a prompt rather than
             a verdict; makes no claim about any instrument or any result. */
          'A score is something to talk about, not a verdict on how you feel.',
        ],
      },
      {
        heading: 'Adjusting as things change',
        body: 'Psychiatric medication rarely lands perfectly the first time. Follow-up appointments exist to review how you are responding, what side effects you are living with, and what needs to change. Your progress is evaluated on an ongoing basis, with support and education alongside it.',
        bullets: [
          /* CLIENT-REVIEW — GENERIC patient education. No frequency, no
             duration, no medication named, no outcome promised. */
          'Side effects are worth mentioning even when they seem small — they often shape what changes next.',
          /* CLIENT-REVIEW — SOURCED. research/content/services.md:18: "As we
             evaluate progress, we will continue to provide support and
             education as needed." AS NEEDED IS LOAD-BEARING and is kept: it is
             the source's own clinical-judgement qualifier, not a softener. */
          'Support and education continue alongside treatment, as needed.',
          /* REMOVED BY healthcare-reviewer, 2026-10-01. The line was "Changing
             one thing at a time is what keeps it clear which change did what."
             Dressed as a general principle, but in a section about how THIS
             practice adjusts treatment it asserts a one-variable-at-a-time
             titration protocol that research/ nowhere states — and it sets an
             expectation that ordinary practice (a cross-taper, two changes at
             once) would contradict. Do not reinstate it without the client. */
          /* CLIENT-REVIEW — SOURCED. research/content/home.md:28: "Together, we
             can identify what works and what isn't working". */
          'Working out what is helping, and what is not, is something you do together.',
        ],
        /* CLIENT-REVIEW — GENERIC. Reassurance, not an outcome claim: it says
           adjustment is normal, not that treatment will succeed. */
        highlight: 'Needing an adjustment is an ordinary part of treatment, not a setback.',
      },
      {
        heading: 'Working with your other clinicians',
        body: 'Where you are already working with a therapist, a primary care provider, or another specialist, we collaborate with them to establish medication protocols that fit the rest of your care rather than cutting across it. Referral to follow-up services is available where something falls outside what we provide.',
        bullets: [
          /* CLIENT-REVIEW — SOURCED. research/content/services.md:18: "The
             treatment plan involves collaborating with other professionals to
             set a regimen of therapy and prescription medication". */
          'Collaborating with other professionals is part of how the treatment plan is set.',
          /* CLIENT-REVIEW — GENERIC patient education. Says why telling us is
             useful; claims nothing about what the practice then does. */
          'Saying who else is treating you is what makes gaps and duplication easier to avoid.',
          /* CLIENT-REVIEW — SOURCED. research/content/services.md:28-34 lists
             the practice's own treatment options, which include "Referral to
             follow-up services". */
          'Referral to follow-up services is one of the options the practice names.',
        ],
      },
      {
        heading: 'Conditions we prescribe for',
        body: 'Medication management is available across the diagnoses we treat.',
        bullets: [
          /* CLIENT-REVIEW — SOURCED. research/content/services.md:28-34, the
             practice's own "We will work with you to find the best treatment
             option available such as" list, which names psychiatric
             consultation, medication treatment, individual counseling and
             referral alongside each other — so medication is one option among
             several rather than the only one. */
          'Medication is one of the options the practice names, not the only one.',
          /* CLIENT-REVIEW — GENERIC. A statement about clinical practice in
             general, not about what Newpoint does in any given case. It is
             also the hedge that keeps the list above from reading as "every
             one of these is prescribed for". */
          'Appearing on this list does not mean medication is the answer in every case.',
          /* REWRITTEN AFTER healthcare-reviewer, 2026-10-01. The line read
             "Which of these applies to you is settled at your assessment,
             before anything is prescribed." SETTLED was the problem: it
             asserts diagnostic finality at one appointment, which
             services.md:18 does not say and which this repo's own assessment
             copy explicitly hedges — see the assessment page's "A diagnosis
             where one can be established". The "before anything is prescribed"
             half was sound and is kept.

             CLIENT-REVIEW — SOURCED. research/content/services.md:18 for the
             diagnosis-then-plan order; the "where one can be established"
             hedge is the one the assessment page already uses. */
          'A diagnosis is made at your assessment, where one can be established, before anything is prescribed.',
        ],
        /**
         * Deliberately NOT a spread of WHAT_WE_TREAT.conditions. That list also
         * carries "Irritability and anger" and "Stress and burnout", which the
         * live site names as things the practice helps with, not as prescribing
         * indications. Listing them under this heading would assert
         * pharmacotherapy for non-diagnostic states.
         *
         * ADHD WAS ADDED ON 2026-10-01 AT THE CLIENT'S INSTRUCTION, and the
         * note this file carried against doing so is superseded rather than
         * forgotten. It argued that treating a condition and prescribing for
         * it are different claims, and that for ADHD the prescribing claim
         * implies stimulants and therefore a DEA registration CLAUDE.md lists
         * as a regulated fact nobody has confirmed. BOTH HALVES STILL STAND AS
         * FACTS; what changed is that the practice, which is the only party
         * who can answer them, asked for the line. Both providers publish ADHD
         * among the conditions they treat — see PROVIDERS[].treats — so the
         * practice-wide treating claim was never the question.
         *
         * WHAT THIS LIST DOES NOT SAY, and must not be edited into saying: it
         * names no medication and no class of medication, here or anywhere on
         * the page. The hedge in `bullets` — "Appearing on this list does not
         * mean medication is the answer in every case" — is what keeps the
         * heading from reading as "every one of these is prescribed for", and
         * it is load-bearing for this entry in particular.
         *
         * THE HEDGE RENDERS AFTER THE CHIPS, NOT BEFORE THEM, and that is
         * deliberate — see the note in components/sections/ServiceCards.tsx,
         * which explains that the line has no referent until the chips are on
         * screen. It is in `bullets`, so it reaches the page only on the
         * layouts that render bullets: `cards` (this page's) and `grid`. The
         * prose fallback at app/services/[slug]/page.tsx renders heading, body
         * and list and NOT bullets, so flipping this service's `layout` would
         * publish the chip list with no hedge at all. Do not flip it without
         * moving the hedge into `body` first.
         *
         * AND IT HEDGES MODALITY, NOT SCOPE. "Medication is not always the
         * answer" does not say which medications are in scope for ADHD, which
         * is the question a transferring patient arrives with. That one is in
         * OPEN_CLIENT_ITEMS and is not answered anywhere on the site.
         */
        list: [
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
    /**
     * This page's own hero master, replacing the 1280x720 video poster it
     * borrowed from its homepage card — which next/image could not upscale, so
     * it was soft on any retina screen. 2400px wide, the cap the artwork was
     * supplied against; next/image resizes down from it.
     *
     * OBJECT-POSITION MEASURED OFF THE FRAME. Her hair starts at y 9%, her
     * eyes sit at y 28% and her chin at y 44%; her face spans x 62-78%,
     * centred on x 70%.
     *
     * The source is 1.79:1 and this header is wider than that at the desktop
     * widths, so cover crops vertically there. y 30% starts the crop 79px down
     * at 1440, which puts her eyes at box y 146, and 33px down at 1024, which
     * puts them at y 127 — both clear of the navbar pill's lower edge at about
     * y 83. At 390 the box is taller than 1.79:1, cover scales by height, there
     * is no vertical crop at all and her eyes land at y 158 whatever y says.
     *
     * x 70% is for that narrow case, where the crop works horizontally
     * instead: it holds her face at x 192-353 of 390 rather than letting it run
     * off the right edge. It does nothing at 1440 or 1024, where the full width
     * is shown.
     *
     * CONTRAST ON THIS MASTER DOES NOT MEET AA, and the overlay was required to
     * stay unchanged, so it is recorded rather than fixed. Measured on the
     * rendered page at glyph core pixels only — a whole-box sample reads the
     * brightest pixel in the box rather than one a letter covers:
     *
     *   1440  h1 2.02:1 (floor 3)   intro 2.53:1 (floor 4.5)
     *   1024  h1 2.03:1 (floor 3)   intro 3.43:1 (floor 4.5)
     *    390  h1 2.53:1 (floor 3)   intro 6.47:1 PASS
     *
     * The worst backdrop under a glyph is the sunlit curtained window behind
     * her, about rgb(177,183,194). THIS IS THE SAME FAILURE THE SCRIM NOTE IN
     * components/PageHero.tsx ALREADY RECORDS against the homepage's stops, and
     * medication-management measures the same way: those ramps are shaped for a
     * 100vh section whose copy is short, bottom-anchored and in the left column
     * of a two-column grid, and this header is ~540-610px with centred copy
     * that fills it. The remedy is not retuning these stops — that is what the
     * `hero` scrim already is — but scrim="hero", or a master whose copy area
     * is not a blown window.
     */
    heroImage: {
      src: '/images/services/tele-hero-2400.webp',
      /* Describes the photograph and stops there: no claim that this is a
         patient of the practice, and none that this is a Newpoint appointment
         — the screen is not in frame, so there is no call to describe. */
      /* Checked against the frame, 2026-10-01, and tightened: "dining table"
         was an assumption about the room, and there is a stack of books on it
         as well as the pad. The rest held. */
      alt: 'A woman sitting at a wooden table at home, smiling at an open laptop, with a mug, a notepad and a stack of books beside her and a curtained window behind.',
      objectPosition: '70% 30%',
    },
    /* The homepage's overlay verbatim, as on medication-management.
       UNCHANGED BY THE NEW MASTER: this is set explicitly rather than derived
       from heroImage, so adding the photograph did not move the page onto the
       `hero` scrim. Same for heroAlign below. */
    heroScrim: 'home',
    /* Centred between the navbar and the hero's bottom edge, matching
       medication-management and the assessment page. */
    heroAlign: 'center',
    /* No appointment button in this hero. The navbar's, PageCta's and the
       footer's all remain, so the booking route is intact. */
    hideHeroCta: true,
    /* The card-18 grid: one featured card and a three-up row. */
    layout: 'grid',
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
        /* LEAD COPY, UNCHANGED. Everything below it is new and marked. */
        body: 'Telehealth appointments are offered on an expanded schedule, including weekends, evenings, and holidays by request. If the standard working day is the reason you have not started treatment, say so when you get in touch.',
        bullets: [
          /* REWRITTEN AFTER healthcare-reviewer, 2026-10-01. The line read "A
             private space and a steady connection matter more than which
             device you use." The tail was a capability claim about this
             practice's telehealth platform — that any device works — and the
             platform is unnamed in all source material, which is why the FAQ
             below carries a CLIENT note saying no joining process may be
             described. The head of the sentence is this page's OWN APPROVED
             COPY and is what remains.

             CLIENT-REVIEW — SOURCED. The telehealth FAQ in this same entry:
             "A private space and a device with a camera and a reliable
             connection." */
          'A private space, and a device with a camera and a reliable connection.',
          /* CLIENT-REVIEW — GENERIC. Says nothing about how long anything
             takes or how often it happens. */
          'Checking your camera and microphone beforehand keeps setup out of the appointment.',
          /* CLIENT-REVIEW — GENERIC. */
          'Headphones help if other people are home.',
          /* REMOVED BY healthcare-reviewer, 2026-10-01. The line was
             "Telehealth takes the travel out of an appointment, not the
             appointment out of your week." "Out of your week" implies a
             recurring weekly slot — a frequency and time-commitment claim,
             made under the practice's own schedule heading. */
        ],
      },
      {
        heading: 'Both states, both providers',
        /* THE ROLE CLAUSE IS ADDED WITH THE TITLE, not decoration. CLAUDE.md's
           rule is that "Dr." may only appear where the credentials or the words
           "nurse practitioner" are visible beside it, and this sentence carried
           neither — it is the one prose mention that needed a qualifier before
           the prefix could be used at all. The clause states the role already in
           PROVIDERS[].role and asserts nothing new. */
        body: 'Dr. Funmilayo Whitaker and Dr. Anastasia O. Ofoegbu, both psychiatric-mental health nurse practitioners, are licensed in New Jersey and Pennsylvania, so telehealth is available across our whole service area rather than in one state only. You need to be physically located in a state where your provider is licensed at the time of your appointment.',
        bullets: [
          /* REMOVED BY healthcare-reviewer, 2026-10-01. The line was "Which
             licence applies follows where you are sitting, not where your
             provider is." The first half is right and the lead already says
             it. The second half is not: a provider physically in a third state
             can trigger that state's licensure requirements, and compacts and
             state-specific telehealth registrations shape the rest. That is a
             regulated fact stated as an absolute, which CLAUDE.md's rule on
             never inventing verifiable regulated facts exists to stop — and
             nothing on a marketing page needs to adjudicate it. */
          /* CLIENT-REVIEW — GENERIC. No claim that the practice can or cannot
             accommodate any particular case. */
          'Being out of state on the day — travelling, or working elsewhere — can affect whether an appointment can go ahead.',
          /* CLIENT-REVIEW — GENERIC scheduling advice. */
          'Upcoming travel is worth mentioning when you book.',
        ],
      },
      {
        heading: 'What telehealth is good for',
        body: 'Follow-up medication management works particularly well by video: the appointment is a structured review of how you are responding, which does not depend on being in the same room. Comprehensive psychiatric assessments can also be arranged by telehealth — ask us and we will confirm what suits your situation.',
        bullets: [
          /* CLIENT-REVIEW — GENERIC. Describes what a structured review covers
             in general terms. Names no instrument and no medication. */
          'A structured review — sleep, side effects, what has changed — carries over to video well.',
          /* CLIENT-REVIEW — GENERIC. */
          'Having your own notes or questions open on the same screen is easier from home.',
          /* CLIENT-REVIEW — GENERIC. A limitation of the medium, not of this
             practice, and it sets up the section that follows. */
          'Anything that needs a physical examination is not something video can do.',
        ],
      },
      {
        heading: 'When telehealth is not the right call',
        body: 'Telehealth is not for emergencies. If you are in crisis, call or text 988 for the Suicide and Crisis Lifeline. If you or someone else is in immediate danger, call 911 or go to your nearest emergency room. This practice is not monitored around the clock.',
        /* NO BULLETS ON THIS SECTION, AND THAT IS DELIBERATE. All three were
           removed on healthcare-reviewer's advice, 2026-10-01, and the reason
           is worth keeping so they are not reinstated:

             "If you are not sure how urgent something is, that is itself a
             reason to call." — names no number. The nearest competing
             referents on the rendered page are the practice's own phone in the
             navbar and footer, two sentences after the body says the practice
             is NOT monitored around the clock. A distressed reader can read
             "call" as "call the practice", which is a route to voicemail. It
             is also triage advice, issued by a provider's site, where the only
             instruction that belongs is the body's: crisis to 988, immediate
             danger to 911 or the ER.

             "Saving 988 and 911 in your phone now..." — presents the two as an
             undifferentiated pair, erasing the distinction the body has just
             drawn. CRISIS's own note in this file says the difference between
             them must be checked and not guessed. Flattening them is a step
             toward 911 as the behavioural-health default.

             "Crisis lines are there whether or not you are anyone's patient."
             — accurate, and removed on placement rather than content. Bullets
             render as blue ticks in lighter type, which turns the closing
             content of the crisis card into a reassurance checklist, and the
             injected hidden heading would read a screen-reader user three tips
             while the actual 988 / 911 instruction sits in the body above. A
             benefit-tick affordance is the wrong register for crisis guidance
             whatever the words say.

           THE BODY IS THIS SECTION'S WHOLE CONTENT ON PURPOSE. Do not add
           points here without putting the question to the client first. */
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
          a: 'One of our two providers, Dr. Funmilayo Whitaker or Dr. Anastasia O. Ofoegbu. Both hold a Doctor of Nursing Practice and are dual-certified as psychiatric mental health and family nurse practitioners, and both are licensed in New Jersey and Pennsylvania.',
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
      body: 'There are two of us. You will see Dr. Funmilayo Whitaker or Dr. Anastasia O. Ofoegbu, both of whom hold a Doctor of Nursing Practice and are dual-certified as psychiatric mental health and family nurse practitioners.',
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
/**
 * The /faq page.
 *
 * NO NEW BODY COPY. The questions, answers, group titles, heading and intro all
 * come from FAQ, verbatim and in source order. Only the two metadata strings
 * below are new, and metadata is where every page needs a unique pair.
 */
export const FAQ_PAGE = {
  /* CLIENT-REVIEW — metadata. Both describe what the page contains and assert
     nothing about the practice that FAQ's own answers do not already say. */
  metaTitle: 'Frequently Asked Questions',
  metaDescription:
    'Answers to common questions about starting psychiatric care at Newpoint: who you will see, how appointments work, insurance and costs.',
} as const;

/**
 * The /providers index.
 *
 * It exists because the navbar's "Providers" link pointed at `/#providers`, a
 * homepage anchor, while `/providers/[slug]` pages already existed with nothing
 * linking to them as a set. The link now has a destination of its own.
 *
 * NO NEW CLAIMS. `title` is the heading app/services/page.tsx already uses for
 * its provider section. `intro` is NEW_PATIENTS_PAGE's own sentence, reused
 * verbatim rather than rewritten — the only edit is dropping its opening
 * "There are two of us." which reads as a line in a numbered list of
 * expectations rather than as a page introduction. Everything it asserts is
 * confirmed: both providers' doctorate and dual certification are in their own
 * bios, and the two-provider count is in PRACTICE_FACTS.
 *
 * The cards themselves render nothing but PROVIDERS fields, verbatim.
 *
 * "Dr." IS IN THIS INTRO, under the sitewide override of 2026-10-01, and the
 * sentence carries "nurse practitioners" itself — which is the condition the
 * override puts on the prefix rather than an accident of phrasing. Do not trim
 * that clause without removing the titles with it.
 *
 * THE VERIFIED BADGE IS STILL /services-ONLY. The two were decided separately,
 * and the title override does not widen the badge.
 */
export const PROVIDERS_PAGE = {
  title: 'Providers you will see',
  /* CLIENT-REVIEW — metadata, composed from confirmed facts only: the
     two-provider count (PRACTICE_FACTS), the role string (CLAUDE.md's
     canonical "Psychiatric-Mental Health Nurse Practitioner", here in its
     plural common-noun form) and the licensure confirmed by the client on
     2026-09-29. No credential is claimed that a bio does not already state. */
  metaTitle: 'Our Providers',
  metaDescription:
    'The two psychiatric-mental health nurse practitioners at Newpoint, both licensed in New Jersey and Pennsylvania.',
  intro:
    'You will see Dr. Funmilayo Whitaker or Dr. Anastasia O. Ofoegbu, both of whom hold a Doctor of Nursing Practice and are dual-certified as psychiatric mental health and family nurse practitioners.',
} as const;

export const ROUTES: { path: string; priority: number }[] = [
  { path: '/', priority: 1.0 },
  { path: '/services', priority: 0.9 },
  ...SERVICE_PAGES.map((s) => ({ path: `/services/${s.slug}`, priority: 0.8 })),
  { path: '/insurance', priority: 0.8 },
  { path: '/new-patients', priority: 0.8 },
  { path: '/contact', priority: 0.9 },
  { path: '/faq', priority: 0.7 },
  /* The index sits above its own detail pages, same as /services does. */
  { path: '/providers', priority: 0.8 },
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
 * A directory profile is not a primary source. Items below say where the
 * evidence now sits; they stay open until the client confirms.
 *
 * One item the capture opened has already closed. Headway's licensure field
 * gave Ofoegbu New Jersey only, which put the site's two-state claim for her in
 * doubt; the client confirmed on 2026-09-29 that both providers are licensed in
 * both states. Her licence NUMBER is still outstanding and lives in the
 * licence-numbers item below.
 */
export const OPEN_CLIENT_ITEMS = [
  'Exact legal business name from the LLC formation documents ("Newpoint" vs "New Point")',
  'Street address, suite and ZIP for the practice. NOW THE HIGHEST-VALUE OPEN ITEM: the client has confirmed care is delivered in person as well as by telehealth, so the site claims in-person care and the organization is marked up as a MedicalClinic. Google expects an address on that type, a patient told they can be seen in person has nowhere to go, and Local Pack and Maps eligibility are blocked until it exists. The former "or confirm service-area only" alternative is closed — in-person care is confirmed. EVIDENCE NOW EXISTS: 6 Colonial Lake Drive, Suite D, Lawrence Township (Lawrenceville), NJ 08648 — named by Grow Therapy, Headway and U.S. News, across BOTH providers, and U.S. News pairs it with (609) 527-9438, which is already BUSINESS.phonePrimary. Needs the client to confirm in writing, and to confirm the suite format, before it ships',
  'Which states in-person care covers. A SECOND ADDRESS HAS SURFACED: Headway lists 803 West Trenton Avenue Ste 3, Morrisville, PA 19067 for Whitaker as "Location 1 of 2". This is the first Pennsylvania place-level signal in any Newpoint research and would relax CLAUDE.md\'s rule that in-person care is stated without a state. One platform, one provider, unconfirmed — it may be a Headway location rather than a Newpoint office',
  'State nursing license numbers for both providers, or confirmation they prefer not to publish them. CANDIDATES for Whitaker: NJ 26NJ00646400 (APN) and PA SP016195 (CRNP), per Grow Therapy and Headway. Note the two states use different regulatory titles for the same role — APN in New Jersey, CRNP in Pennsylvania — so publish each number with the right one. NOTHING FOUND FOR OFOEGBU IN EITHER STATE: the client confirmed on 2026-09-29 that she holds both, but no number for her appears on any directory, so both of hers have to come from the practice',
  'NPI numbers for both providers, or confirmation they prefer not to publish them. CANDIDATE for Whitaker: 1760719512, per U.S. News. Nothing found for Ofoegbu',
  'Certifying body for the "board-certified" claim (the post-nominals imply one, but it is not stated anywhere and must not be assumed)',
  'Hours of operation, including what the "expanded schedule" for telehealth actually covers. Still nothing: the directories repeat "weekends, evenings and holidays by request" verbatim and name no actual hours',
  'Confirmed age range served (adults only, or across the lifespan as a practice policy). STILL OPEN, AND THE EVIDENCE NOW CONFLICTS: Grow Therapy says Whitaker serves adults 18-64 and elders 65+ with NO children, while Headway says she serves adults, adolescents AND children. Same clinician, two platforms, opposite answers. Paediatric psychiatric prescribing is not a claim to resolve from a directory field. RAISED TO PRE-LAUNCH ON 2026-10-01, when ADHD was added to "Conditions we prescribe for": it is the highest-paediatric-volume condition on that list, so a parent can now read a prescribing claim on a page that says nothing about age, and the one FAQ answer that addressed it was removed for being an extrapolation. See the ADHD prescribing-scope item below',
  'Whether substance use and addiction treatment is an active service line. THE DIRECTORIES SAY YES: Grow lists addiction for Whitaker, and Headway lists "Substance use / addiction" as Ofoegbu\'s FIRST specialty. Her existing bio already says her last 11 years were in mental health and addiction. This also bears on the new "Mental and behavioral care" hero — in US payer language behavioral health includes SUD, so the headline already implies a door the conditions list does not open',
  'Named therapy modalities offered (CBT, DBT, EMDR, and similar), if any. RAISED IN PRIORITY: the owners confirmed on 2026-09-29 that medication management is delivered combined with psychotherapy, and /services now names that as a way visits run — so the site asserts psychotherapy happens while still being unable to say what kind, who delivers it, or whether it is a visit of its own. It is also the obvious fourth service page. FOUR CANDIDATES NOW EXIST AND THEY DISAGREE: Grow says Compassion Focused for Whitaker; Headway says Motivational Interviewing, Behavior Modification and Cognitive Behavioral Family Therapy for her. Headway does corroborate the owners on delivery — it lists "individual therapy" and "family therapy" as care types — but ONLY for Whitaker. Ofoegbu\'s care type there is medication management alone, which is directly relevant to the CLIENT question in app/services/page.tsx about binding providers to services',
  /* The ADHD item was REMOVED on 2026-10-01, closed rather than dropped. It
     asked whether ADHD is treated at all; both providers publish it, it has
     been in WHAT_WE_TREAT.conditions since 2026-09-29, and the client has now
     asked for it in the medication-management prescribing list as well. The
     insomnia/sleep half of that item closed with it — sleep is in
     WHAT_WE_TREAT.conditions and is not in the prescribing list, which is the
     state the client asked for. */
  'ADHD PRESCRIBING SCOPE — CLOSE THIS BEFORE LAUNCH. ADHD is named in "Conditions we prescribe for" on /services/medication-management at the client\'s instruction of 2026-10-01. The page names no medication and no drug class anywhere, so nothing on it asserts a controlled substance, and the line is publishable as it stands BECAUSE ADHD PHARMACOTHERAPY IS NOT EXCLUSIVELY CONTROLLED — atomoxetine, guanfacine and bupropion need no DEA registration. That is very likely the answer, and it is the one the practice has never given. Four parts to the question, and a no to any of them changes the page: (1) does the practice prescribe stimulants for ADHD, and under whose DEA registration; (2) if not, does it prescribe non-stimulants for ADHD, which is what keeps the line true; (3) does it hold for BOTH providers, since this list is practice-wide and Ofoegbu\'s Headway care type is medication management alone; (4) does it hold by TELEHEALTH, which is how most of this practice\'s care is delivered and the most regulated corner of controlled-substance prescribing. If the answer to (1) and (2) is no, the ADHD chip comes out of that list and stays in WHAT_WE_TREAT.conditions, where it is a treating claim both providers publish. SEE ALSO the age-range item above: ADHD is the highest-paediatric-volume condition on that list, so publishing it raises the stakes on an age range the site still cannot state',
  'Whether Dr. Whitaker sees patients in Yoruba, and whether Dr. Ofoegbu\'s "English, Igbo, and Yoruba" holds. Both come from the providers\' own Headway profiles and neither is confirmed by the practice — the repo grades both as weak single-source facts in research/provider-directories.md. IT IS NO LONGER ONLY PROSE: as of 2026-10-01 Whitaker\'s languages are structured in PROVIDERS[].knowsLanguage at the client\'s instruction and drive `knowsLanguage` on her Person JSON-LD, the Languages line on her /providers card, and her ContactPoint on /contact. Ofoegbu has no structured entry because the instruction named only Whitaker, so her card shows no Languages line while her own page still does — see the CLIENT question in components/ui/ProviderCard.tsx about whether that asymmetry should stand',
  'Whether the practice holds in-network contracts with the listed payers, or accepts them while billing out of network. The site says "accept" throughout, which is the weaker and safer claim',
  "CONFIRM THE NINE PLANS NOW PUBLISHED UNDER CLIENT-REVIEW, or cut them. THIS ITEM CHANGED ON 2026-10-01 AND IT IS NOW URGENT RATHER THAN HOUSEKEEPING. Until then these names sat in PAYER_GROUPS with `confirmed: false` and appeared nowhere a patient or a crawler could see them. The client asked for them to be published, so they now render on /insurance under a `review` note sourced to Dr. Whitaker's Headway profile (https://care.headway.co/providers/funmilayo-whitaker-2). They are: Oscar, Oxford, Carelon Behavioral Health, Capital Blue Cross Pennsylvania, Highmark Blue Cross Blue Shield Pennsylvania, Independence Blue Cross Pennsylvania (Virtual National Network), Geisinger, Blue Cross Blue Shield of Massachusetts and The Health Plan. WHAT THE PRACTICE IS BEING ASKED TO CONFIRM, for each name: that NEWPOINT accepts it directly, not that a marketplace is contracted for it — a patient who books through Headway or Grow Therapy is billed by the marketplace — and that it holds for Dr. Ofoegbu as well as Dr. Whitaker. A patient who reads one of these names, books on that basis and is then billed out of network has been told something nobody at the practice has confirmed. FOUR OF THE NINE ARE BETTER EVIDENCED THAN THE NOTE SAYS, so do not spend equal attention on all of them: Oscar, Oxford, Carelon Behavioral Health and Blue Cross Blue Shield of Massachusetts are on DR. OFOEGBU'S Headway profile as well as Dr. Whitaker's, which answers the \"and for Dr. Ofoegbu\" half for those four. The dictated note is carried verbatim on all nine anyway, because the practice-wide half is open for every one of them. To confirm one, set `confirmed: true` and delete its `review` note; the homepage card, its \"and N more\" count and the JSON-LD then pick it up too, none of which the review note touches. TO CUT ONE, IT DEPENDS WHICH: for the six that arrived with this instruction, delete the entry; for Capital Blue Cross Pennsylvania, Highmark Blue Cross Blue Shield Pennsylvania and Independence Blue Cross Pennsylvania, cutting means reverting to the repo's shorter name with `confirmed: false` and no `review`, because those three were corroborated candidates on Grow Therapy and Headway before the client's list existed and deleting them would throw that away. The seven payers from the practice's own site are unaffected",
  "The two plans in the 2026-10-01 list whose names do not place them: Blue Cross Blue Shield of Massachusetts and The Health Plan, both now under the \"Other plans\" heading on /insurance. Massachusetts is not a state this practice serves, and this repo previously excluded that name as a Headway national-network artifact; it is listed now because the client asked for it, and it is grouped apart because claiming it as a New Jersey or Pennsylvania plan would be wrong. \"The Health Plan\" states no state, carrier family or network at all — it matches a West Virginia and Ohio carrier of exactly that name, which nothing here assumes. THE RISK HERE IS LICENSURE, NOT ONLY BILLING: both providers are licensed in New Jersey and Pennsylvania only, and for telehealth the governing location is the PATIENT'S, so a Massachusetts resident who recognises their own plan on this page has been given a reason to enquire about care the practice cannot lawfully deliver to them where they are. Nothing beside the wall states the two-state limit; the only place on the page that does is the hero intro. Confirm what each plan actually is, whether either belongs on a two-state practice's list, and whether the list needs a visible scope line",
  "ONE DECISION THE CLIENT STILL OWES ON THE PUBLISHED PLANS: whether /insurance should say, visibly, that some of the plans listed are still being confirmed. As it stands all sixteen names render identically under \"We accept the plans below\", so a patient cannot tell the seven the practice confirmed from the nine it has not. Adding a hedge was NOT done unilaterally — it softens the client's own instruction to publish them, and that is their call to make. The page already owns a string for it if they want one: INSURANCE.unconfirmedScopeNote. This item closes either way, by confirming the nine or by adding the line",
  'Exact payer plan names and any sub-plans, confirmed against the practice records. The list was scraped from an unseparated string on the live site',
  'Whether patients receive their treatment plan in writing',
  "Public profile URLs for each provider (Psychology Today, LinkedIn, NPI registry, hospital or association listing). These would populate `sameAs` on each provider's Person schema, which is the main signal search engines use to tie a name on this site to the same person elsewhere. Nothing is guessed, so `sameAs` is currently absent. FIVE URLS ARE NOW IN HAND — the Grow Therapy, Headway (both providers), U.S. News and Doximity profiles listed in research/provider-directories.md. This is the cheapest remaining SEO win in the list and needs only the client's okay, since linking to a competing marketplace's profile is a business decision, not a technical one",
  'A general practice inbox address for the contact form, since only named provider addresses exist',
  "Self-pay session fee and the sliding scale criteria. Grow Therapy lists $150 per session for Whitaker, but that is the marketplace's rate for her time on that platform and is not Newpoint's fee",
  'Original logo file, vector preferred',
  'Service-section footage. Every card on the homepage services section currently reuses the hero clip, which shows a person in a meadow. On a behavioral-health service tile that reads as an implied treatment outcome, which is the same category as a testimonial. Replacement clips must not depict a patient or imply an outcome',
  'Optional upgrade only, no longer a gap: written permission or brand assets for insurer logos, if the practice ever wants payer marks instead of the typographic wall',
  'Patient testimonials with documented consent, if the practice wants them later',
  'Reshoot of both provider portraits at 2000px or more with headroom, to unlock the deferred hero treatment',
] as const;

/* ------------------------------------------------------------------------- *
 * BUILD-TIME ASSERTION: every rendered "Dr." carries its qualifier.
 * ------------------------------------------------------------------------- */

/**
 * The qualifiers that satisfy CLAUDE.md's condition on the title.
 *
 * "nurse practitioner" matches its own plural, and the two role-identifying
 * post-nominals are accepted because `credentials` is "DNP, FNP-BC, PMHNP-BC"
 * and either of those two names the role.
 *
 * `DNP` AND "Doctor of Nursing Practice" ARE DELIBERATELY NOT HERE. A degree
 * name is the very thing "Dr." is claiming, so it disambiguates nothing — put
 * next to a bare honorific it reads more physician-like, not less. Two strings
 * shipped on 2026-10-01 qualified only that way and were caught in review
 * rather than by a check; accepting it here would have let them through.
 */
const TITLE_QUALIFIER = /nurse practitioner|PMHNP-BC|FNP-BC/i;

/** The honorific, as a whole word followed by a name. */
const TITLE_PREFIX = /\bDr\.\s/;

/**
 * Collects every string under a content root, remembering where it came from
 * so a failure names the field rather than the value.
 *
 * `displayName` is SKIPPED. It is "Dr. Funmilayo Whitaker" by design: the
 * qualifier for it lives in the markup beside it — the credentials pill, the
 * dropdown's detail line, the `, ${credentials}` on the provider page heading —
 * not inside the string.
 *
 * A Payer's `review` note is SKIPPED TOO, for a different reason: it is not
 * copy at all. It is a CLIENT-REVIEW note addressed to whoever is building the
 * site, in the same category as OPEN_CLIENT_ITEMS and the sourcing comments,
 * and the only thing any surface does with it is test whether it exists. The
 * wording the client dictated names both providers without their credentials,
 * which is right for a note to the practice and would be wrong on a page — so
 * this exemption holds ONLY while nothing renders the string. If a surface
 * ever prints a review note, delete the exemption and the build will tell you.
 *
 * IT IS MATCHED BY PATH, NOT BY KEY NAME, and that is the difference between
 * an exemption and a hole. `displayName` is a bespoke key; "review" is an
 * ordinary word this content layer already uses in prose about medication
 * review, so a future object with a `review` field would have silently
 * inherited an exemption written for one gated payer list.
 *
 * Every other string is page copy that has to carry its own qualifier.
 */
const PAYER_REVIEW_PATH = /^INSURANCE\.groups\[\d+\]\.payers\[\d+\]\.review$/;

function collectStrings(node: unknown, path: string, out: [string, string][]) {
  if (typeof node === 'string') {
    if (PAYER_REVIEW_PATH.test(path)) return;
    out.push([path, node]);
  } else if (Array.isArray(node)) {
    node.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out));
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k === 'displayName') continue;
      collectStrings(v, `${path}.${k}`, out);
    }
  }
}

/**
 * Fails the build rather than the compliance review, the same way
 * `assertSourced()` in components/sections/Providers.tsx does.
 *
 * WHAT IT COVERS AND WHAT IT CANNOT. It reads the content layer, which is where
 * prose is edited and where both of the 2026-10-01 breaches were. It cannot
 * know whether a COMPONENT renders `displayName` without a qualifier nearby —
 * that is a layout question, not a string one, and the four surfaces that do
 * render it are documented in CLAUDE.md. Adding a fifth still needs a human to
 * check the markup; this stops the much likelier mistake of a copy edit.
 *
 * The roots are listed rather than swept, because OPEN_CLIENT_ITEMS and the
 * sourcing notes are addressed to whoever is building the site, not to a
 * patient, and a "Dr." inside one of those is not a claim on any page.
 */
function assertTitlesQualified() {
  const RENDERED: [string, unknown][] = [
    ['BUSINESS', BUSINESS],
    ['HERO', HERO],
    ['PRACTICE_FACTS', PRACTICE_FACTS],
    ['INSURANCE', INSURANCE],
    ['FOOTER', FOOTER],
    ['PROVIDERS', PROVIDERS],
    ['WHAT_WE_TREAT', WHAT_WE_TREAT],
    ['SERVICE_PAGES', SERVICE_PAGES],
    ['GETTING_STARTED', GETTING_STARTED],
    ['WHAT_TO_EXPECT', WHAT_TO_EXPECT],
    ['FEATURED_SERVICES', FEATURED_SERVICES],
    ['FAQ', FAQ],
    ['CONTACT', CONTACT],
    ['CRISIS', CRISIS],
    ['INSURANCE_PAGE', INSURANCE_PAGE],
    ['NEW_PATIENTS_PAGE', NEW_PATIENTS_PAGE],
    ['CONTACT_PAGE', CONTACT_PAGE],
    ['FAQ_PAGE', FAQ_PAGE],
    ['PROVIDERS_PAGE', PROVIDERS_PAGE],
  ];

  const strings: [string, string][] = [];
  for (const [name, root] of RENDERED) collectStrings(root, name, strings);

  const offenders = strings.filter(
    ([, value]) => TITLE_PREFIX.test(value) && !TITLE_QUALIFIER.test(value)
  );

  if (offenders.length > 0) {
    const detail = offenders
      .map(([path, value]) => `  ${path}\n    "${value.slice(0, 120)}"`)
      .join('\n');
    throw new Error(
      `content: ${offenders.length} string(s) use "Dr." without the qualifier CLAUDE.md requires.\n` +
        `Every rendered "Dr." must have the credentials (PMHNP-BC or FNP-BC) or the words ` +
        `"nurse practitioner" in the same string. A degree name — "DNP", "Doctor of Nursing ` +
        `Practice" — does NOT qualify: it is what the title is claiming.\n` +
        `Either add the qualifier to the copy or drop the prefix.\n${detail}`
    );
  }
}

assertTitlesQualified();
