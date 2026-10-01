# Newpoint — Project Brief

This file is auto-loaded every session. It is the permanent brief for this project.

## Skills — MANDATORY

**Before any design or build work, consult and USE the relevant skills installed in `~/.claude/skills`. This is not optional.**

At the start of a task: check which installed skills apply, then **state which ones you are using** before you write code. Never build UI from scratch while ignoring these.

High-value skills for this project:

| Skill | Use it for |
|---|---|
| `design-taste-frontend` | Default for any page, layout, or component work — anti-generic frontend |
| `apple-design` | Motion, gesture, depth, type, and interaction foundations |
| `high-end-visual-design` | Making it feel expensive: spacing, shadows, type scale, cards |
| `minimalist-ui` | Clean editorial direction — appropriate for a clinical/health brand |
| `brandkit` | Brand system, identity board, logo/visual-world work |
| `redesign-existing-projects` | Auditing and lifting the existing newpointnp.com design |
| `image-to-code` | Generate design images first, analyze, then implement to match |
| `animation-vocabulary` | Naming a motion effect precisely before building it |
| `find-animation-opportunities` | Locating where motion is missing (read-only) |
| `improve-animations` | Auditing/planning motion across the codebase (read-only) |
| `review-animations` | Reviewing animation code in a diff |

Healthcare context does not mean visually dull. It means restrained and trustworthy — use the taste skills to hit that, not to skip it.

## Project

**Newpoint is a two-provider outpatient PSYCHIATRIC / behavioral-health nurse-practitioner practice** serving **New Jersey and Pennsylvania** — psychiatric assessment, medication management, and telehealth. (The appointment is an *assessment*, not an *evaluation* — see "Terminology and service names" below.)

**It is NOT a home-health agency.** The "Healthcare Services" in the name misleads; do not benchmark against, or write copy for, home health / visiting nurses / elder care. Benchmark against outpatient behavioral-health and psychiatry practices.

**Providers:**
- **Funmilayo Whitaker**, DNP, FNP-BC, PMHNP-BC
- **Anastasia Ofoegbu**, DNP, FNP-BC, PMHNP-BC

**Source of truth: [`research/`](research/)** — a full crawl and audit of the current site (`newpointnp.com`, captured 2026-08-27). Treat it as authoritative. Start with [`research/audit-summary.md`](research/audit-summary.md); [`research/newpoint-data.json`](research/newpoint-data.json) is the consolidated machine-readable version. Do not contradict it, and do not re-research what it already answers.

## Stack

- **Next.js (App Router) + TypeScript**, deployed on **Vercel**.
- **SEO/GEO is a core deliverable, not a finishing touch:**
  - Static or server rendering — never client-only for indexable content.
  - Per-page `metadata` (unique title + description; the current site has duplicate, over-length, self-contradicting titles — see [`research/seo-technical.md`](research/seo-technical.md)).
  - **schema.org markup on every relevant page**: `MedicalClinic` (`medicalSpecialty: Psychiatric`) for the practice, and `Person` (jobTitle: Psychiatric-Mental Health Nurse Practitioner) per provider, `worksFor` the MedicalClinic. **Never `Physician`: both providers are APNs and NJ/PA have title-protection statutes.** See "Clinician titles" below for the full rule. The current site has only a generic `WebSite` block — this is a real, achievable win.
  - Schema rules that are easy to break by accident:
    - `medicalSpecialty` belongs on the **clinic only**. It is not a valid property of `Person`; a provider's specialty is carried by `jobTitle` + `hasOccupation` + `knowsAbout`.
    - Licensure geography goes on `hasOccupation.occupationalLocation`. `areaServed` is **not** valid on `Person`.
    - `honorificSuffix` is copied verbatim from `research/people-trust.md`. `hasCredential` and `identifier` (NPI) stay omitted until the certifying body and numbers are supplied.
    - A `{"@id": …}` stub only resolves if the **full node is in the same page's markup**. Engines evaluate structured data per document, so every page that references the clinic must also emit it.
    - `MedicalClinic` is a `LocalBusiness` subtype, so Google expects `address`. Leave it omitted and accept the validator warning. **Never synthesise an address to satisfy the type.**
  - Semantic HTML, real `alt` text on every image, correct heading order.

## Content

Generate professional marketing, service, and bio copy from `research/`.

**Never invent verifiable regulated facts.** Leave these as clearly-marked placeholders:

```html
<!-- CLIENT: NPI number for Funmilayo Whitaker -->
```

Applies to — license numbers, NPI numbers, DEA registration, street address / suite / ZIP, certifying or accrediting bodies, testimonials and patient quotes, hours of operation, and specific years of experience. If it could be checked against a registry or would embarrass the client if wrong, it is a placeholder.

The open items are enumerated in [`research/audit-summary.md`](research/audit-summary.md) under "What we still need from the client."

### Clinician titles — a regulated fact, not a style choice

Both providers are **advanced practice nurses**, not physicians. New Jersey and Pennsylvania
both have title-protection statutes. Treat the title as belonging in the list above.

- **Never** `physician`, `psychiatrist`, or `Dr.` for either provider — in copy, metadata,
  `alt` text, or schema. **(`Dr.` in VISIBLE COPY is overridden below, as of 2026-10-01,
  subject to a condition. Metadata, `alt` text and the `Physician` prohibition are NOT
  overridden and still read exactly as written here.)** In schema that also means never `Physician`, `IndividualPhysician`,
  or `PhysiciansOffice`.
- **"Doctor" written in full is permitted only as the degree**: "Doctor of Nursing Practice",
  "doctorate-prepared". Never as a title before a name.
- The canonical role string, used identically in copy and in schema `jobTitle`, is
  **"Psychiatric-Mental Health Nurse Practitioner"** (hyphenated, the ANCC form).

> **Trap:** the live site calls both providers "Dr. Funmilayo Whitaker" and
> "Dr. Anastasia Ofoegbu" — see [`research/content/contact.md`](research/content/contact.md).
> `research/` is authoritative for **facts**, not for this. **HISTORICAL as of 2026-10-01:**
> the client has since asked for "Dr." in visible copy, so the live site's usage is no
> longer the thing to avoid — the override below governs, and its condition is what the
> live site does not satisfy on its own.

#### OVERRIDDEN SITEWIDE BY THE CLIENT, 2026-10-01

**The client asked for "Dr." before both names everywhere a provider is named in
visible copy, was shown the rule above and its reasoning, and reaffirmed.** This
supersedes the 2026-09-30 override, which applied it to the `/services` cards only.

**READ THE PERMISSION AS CONDITIONAL, NOT AS A DEFAULT.** A surface renders `displayName`
only once the qualifier below is confirmed present in the same visual block; anything
else keeps `name`. Phrased the other way round — title everywhere, check afterwards — a
new surface silently acquires the prefix and the burden falls on whoever notices.

**IT IS A SEPARATE FIELD, NOT A PREFIX WRITTEN INTO `PROVIDERS[].name`.** `name` is the
legal name and is what every machine-readable surface reads; `displayName` carries the
title and is what pages render. Do not collapse the two.

**THE CONDITION ON USING IT — this is the whole guardrail, and it is the client's own:**

> Wherever "Dr." appears, the credentials (`DNP, FNP-BC, PMHNP-BC`) or the words "nurse
> practitioner" must be visible beside it.

A surface that cannot show one of those keeps `name`. The footer's provider-inbox list is
the one that currently falls back — a name under an email address, with no room for a
role — and it should stay plain rather than grow a role line so the title can be added.
It is not, however, the only place the condition has to be checked: every new surface
needs checking, including accessible names.

**AN `aria-label`, a `title` attribute or any other accessible name is a surface.** It is
a serialised string with no "beside", so the qualifier has to be inside it. `/providers`
names its card button "View full profile for Dr. Funmilayo Whitaker, DNP, FNP-BC,
PMHNP-BC" for exactly this reason.

**What is still binding, unchanged:**

- no `Physician`, `IndividualPhysician` or `PhysiciansOffice` in schema, ever;
- **no `Dr.` in `alt` text or in page metadata** — `metaTitle` and `metaDescription` on
  `/providers/[slug]` use `name`;
- `jobTitle` stays "Psychiatric-Mental Health Nurse Practitioner";
- "Doctor" written in full is still only the degree, never a title before a name.

**In structured data the title belongs in `honorificPrefix: "Dr."`.** `Person.name` stays
the legal name, the type stays `Person`, and `jobTitle` and `hasOccupation` continue to
describe a nurse practitioner, so a consumer reads "Dr." as a form of address beside an
occupation stated correctly rather than as a claim about the occupation.

**THAT IS NOT THE ONLY PATH THE TITLE CAN TAKE INTO STRUCTURED DATA, and assuming it is
has already been wrong once.** Two others exist and both carry prose verbatim:

- `FAQPage` → `Answer.text`, from `FAQ.groups` via `app/faq/page.tsx`. A provider named in
  an FAQ answer ships the title into a node Google quotes verbatim in rich results.
- `Person.description`, which is `PROVIDERS[].bio` joined — see the bio rule below.

The condition applies to both: a provider may be titled there only where that same string
carries the qualifier. The FAQ answer that names both providers does; keep it that way.

**One prose mention needed a clause before the prefix could be used.** The telehealth
page's "Both states, both providers" body named both providers with no role nearby, so
"both psychiatric-mental health nurse practitioners" was added to satisfy the condition.
It states the role already in `PROVIDERS[].role` and asserts nothing new.

**Neither provider's bio is touched.** `PROVIDERS[].bio` is each provider's own
first-person text, reproduced verbatim at the client's request; inserting a title into
someone's own words is a different act from labelling them in ours.

<!-- CLIENT: the exposure this carries is unchanged and is now sitewide rather than on
     one section. CLAUDE.md has recorded since 2026-09-30 that counsel's view on NJ/PA
     title protection for DNP-prepared APNs has not been obtained. That is still open,
     and it is the one thing that would settle whether the condition above is a
     sufficient mitigation. -->

### Verified badge — CLIENT DECISION, 2026-09-30

**A "Verified" tick renders on each provider's avatar on the `/services` cards.** The
client asked for it, was told the site cannot currently substantiate a verification
claim, and reaffirmed. Applied.

**What it does not change.** The badge is presentational markup on one section. It adds
nothing to structured data, and the schema rules above are untouched: `hasCredential`
and `identifier` (NPI) **stay omitted** until the certifying body and numbers are
supplied. A visible tick is not a machine-readable credential and must not become one.

**What is still open, and what makes it open.** "Verified" does not say verified *by
whom, of what*. The obvious readings — board certification, licensure, identity — are
not equally supported:

| Reading | Status |
|---|---|
| Licensed in NJ and PA | Confirmed by the client, 2026-09-29, and already stated on the card |
| Board certified | The claim appears in source copy, but **the certifying body is still unknown** — the open item that keeps `hasCredential` omitted |
| Identity / platform verification | Not a thing this site does |

<!-- CLIENT: confirm what "Verified" is asserting. If it means licensure, the label
     should say so ("Licensed in NJ and PA") and it is then a confirmed fact. If it
     means board certification, supply the certifying body first — that unblocks
     hasCredential in schema as well. If it is decorative, say so, and it should
     probably lose the screen-reader label rather than assert something to one
     audience only. -->



### Care modality — CONFIRMED BY CLIENT, 2026-09-23

**The practice delivers care both in person and by telehealth.** Confirmed verbally by
the client on 2026-09-23 and recorded here because `research/` predates it.

This supersedes the open question in
[`research/business-nap.md`](research/business-nap.md) ("confirm this is a
telehealth/service-area-only practice with no public office"),
[`research/audit-summary.md`](research/audit-summary.md) item 2, and
[`research/people-trust.md`](research/people-trust.md) ("if there is a physical office
(currently unconfirmed)"). **Do not edit those crawl findings** — they are an accurate
record of the site as it stood on 2026-08-27. They are simply no longer the live answer.

Two things are confirmed and two are still open, and the distinction matters:

| | Status |
|---|---|
| Telehealth across **both** NJ and PA | Confirmed — both providers licensed in both |
| In-person care exists | Confirmed by the client |
| **Which states** in-person covers | **Open.** The only place-level evidence anywhere in `research/` is Lawrence Township, **NJ**. There is no Pennsylvania location signal at all |
| Street address | **Open, and now the highest-value item** — see `OPEN_CLIENT_ITEMS` |

So: state telehealth across both states freely. State in-person care **without attaching
it to a state**, until the client confirms where. Writing "in person across New Jersey and
Pennsylvania" sends a PA patient to a location that is not known to exist.

> **Update, 2026-09-29 — the rule above still stands, but its premise has weakened.**
> [`research/provider-directories.md`](research/provider-directories.md) captures the
> providers' own third-party listings. Three platforms independently give the NJ address as
> **6 Colonial Lake Drive, Suite D, Lawrence Township, NJ 08648**, and U.S. News pairs it
> with the practice's own main phone number — so the address is effectively confirmed. More
> importantly, Headway lists a **second, Pennsylvania office** for Whitaker (803 West
> Trenton Avenue Ste 3, Morrisville, PA 19067, "Location 1 of 2"). The sentence above
> — "there is no Pennsylvania location signal at all" — was true of the 2026-08-27 crawl and
> is no longer true of everything we hold.
>
> **Do not relax the rule on that alone.** One platform, one provider, and it may be a
> Headway location rather than a Newpoint office. Get the client to confirm, then this
> restriction can be lifted and the site can claim in-person care in both states.
>
> **A licensure question that file raised is now closed.** Headway's structured licensure
> field gives Ofoegbu **New Jersey only**, which put the site's two-state claim for her in
> doubt. **The client confirmed on 2026-09-29 that both providers are licensed in both
> states**, so the telehealth page may keep reasoning from it and no copy changed. Recorded
> as the client's confirmation, not as a register check — PA's licensee search sits behind
> reCAPTCHA and was not queried. Her licence numbers are still outstanding.

### Terminology and service names — CONFIRMED BY OWNERS, 2026-09-29

Agreed in a meeting with the owners. Like the care-modality note above, this
postdates `research/` and supersedes it on wording. **Do not edit the crawl
findings** — they remain an accurate record of the site as it stood 2026-08-27.

| Say this | Not this |
|---|---|
| **assessment** — "comprehensive psychiatric assessment" | "evaluation" as the name of the appointment |
| **mental and behavioral care** in the homepage hero | "psychiatric care" as the hero headline |
| "from the first contact" | "from the first message" |

Three things this does **not** change, all deliberate:

- **"Psychiatric" is not banned.** It is still the practice's clinical head term
  and still carries the title tags, the provider role strings and the service
  page H1s. Only the hero headline widened.
- **"Evaluation" survives in exactly four places**, none of them as the
  appointment's name. In descending order of value:
  1. the assessment page's **`metaDescription`** ("also called a psychiatric
     evaluation") — the only one a patient actually reads, in the search result
     that brought them;
  2. one sentence of **body copy** on that page, telling a referred patient the
     two words mean the same appointment;
  3. the **`/services/psychiatric-evaluation` slug**;
  4. one **`keywords`** entry in `app/layout.tsx`, which ranks for nothing and
     is kept only to document the vocabulary.

  It is the higher-volume US query, so the site answers to it without using it.
  Each of the four carries a comment saying so — read that comment before
  removing one. **1 and 2 are the ones with patient-facing value**; deleting
  either to satisfy a "no evaluation anywhere" sweep is the mistake this list
  exists to prevent.
- **The slug did not change**, and the reason is query coverage, not URL history.
  The site has not launched, so `/services/psychiatric-evaluation` has no equity
  to protect and a pre-launch rename would need no redirect at all. It is kept
  because it is the one high-weight slot where the older, higher-volume term can
  sit without contradicting the owners' copy. **Decide this before launch** — a
  rename afterwards is the expensive one, and would then need a 301 in
  `next.config.ts`.

**New service line confirmed: medication management combined with
psychotherapy.** Previously the site could only say a *plan* may combine
psychotherapy approaches with psychopharmacology, which is the live site's own
verbatim wording. The owners confirmed it is also how care is delivered, so
`/services` now names it as a way visits actually run. Still open, and still in
`OPEN_CLIENT_ITEMS`: **which** modalities (CBT, DBT, EMDR, …), who delivers
them, and whether it warrants a service page of its own.

### Canonical business name — ASSUMPTION, needs client confirmation

The current site spells the name **four different ways**. Resolved for the rebuild to one canonical form:

> **Newpoint Healthcare Services, LLC**

Rationale: "Newpoint" as one word matches both the logo wordmark and the domain (`newpointnp.com`), which is the stronger signal than body copy. Use this exact string everywhere — copy, metadata, schema.org, footer — because NAP consistency is a local-SEO ranking factor.

<!-- CLIENT: Confirm exact legal name from the LLC formation documents — "Newpoint" (one word) vs "New Point" (two words). This assumption must be verified before any Google Business Profile or citation work. -->

### Service page furniture — DECIDED, 2026-10-01

**Service pages have NO visible breadcrumb and NO providers block. Both were
deliberately removed. Never re-add them, even if an instruction or review
suggests it. Flag the conflict instead.**

This is a standing rule, not a preference, and it outranks a reviewer's advice.
An a11y, SEO or internal-linking argument for bringing either one back is not new
information — it is the argument that was already weighed and declined.

**The same applies to three more blocks on `/services/medication-management`,
removed by client decision on 2026-10-01:** the "On this page" rail, the "How it
is delivered" card, and the "Keep reading" related-links grid — along with the
crisis panel, covered under Compliance above. That page's modality is still
stated on its homepage card and on `/services`, so the fact is not lost from the
site, only from that page.

**"Service pages" here means the single-service routes, `/services/[slug]`.**
Read it no wider than that, because two things that look like exceptions are not:

- **The `/services` hub keeps its "Providers you will see" cards**
  (`app/services/page.tsx:420`). That section is page-wide rather than bound to
  one service, and it carries two features the client asked for and reaffirmed on
  2026-09-30 — the "Dr." display prefix and the Verified badge, both recorded
  above. This rule does not reach it, and a sweep that deletes those cards is
  deleting client-mandated work.
- **The homepage `<Providers />` section** (`components/sections/Providers.tsx`,
  rendered from `app/page.tsx`) is also untouched by this rule.

Why each was removed:

- **The visible breadcrumb** read as a second, older navigation bar sitting under
  the real one. It was pulled from `PageHero` first, so the removal is **site-wide
  across interior pages**, not only the service routes — see the note at
  `components/PageHero.tsx:29-33`. It was rebuilt on the assessment page on
  2026-10-01 and removed again, so this is the second time.
- **A providers block under a named service** reads as "these are the people who
  deliver this service". For the **comprehensive psychiatric assessment** that is
  an open question, not a fact: the per-service sourcing breakdown and the
  outstanding `CLIENT:` question live at `app/services/page.tsx:313-325`. The
  constraint is specific to that service — the same page records medication
  management and telehealth as sourced — so cite that note rather than
  generalising from this rule.

**The `BreadcrumbList` JSON-LD is a separate thing and stays.** `breadcrumbSchema()`
is emitted on every page below the root, and every new page below the root must
keep emitting it. Removing the visible trail does not mean removing the structured
data, and the two must not be conflated. Search results keep their trail. The
in-code version of this is `app/services/[slug]/page.tsx:108`.

### Payer list — CLIENT INSTRUCTION, 2026-10-01

**Nine insurance plans are published on `/insurance` that the practice has not
confirmed. This is a deliberate client instruction, not an oversight, and it is a
narrow exception to "never invent verifiable regulated facts" above — a payer
contract is checkable against the payer's own directory, so it sits squarely
inside that rule.**

They are: Oscar, Oxford, Carelon Behavioral Health, Capital Blue Cross
Pennsylvania, Highmark Blue Cross Blue Shield Pennsylvania, Independence Blue
Cross Pennsylvania (Virtual National Network), Geisinger, Blue Cross Blue Shield
of Massachusetts and The Health Plan. The source the client gave is Dr.
Whitaker's Headway profile, `https://care.headway.co/providers/funmilayo-whitaker-2`.

**The exception is bounded, and the boundary is enforced in code.** Each of the
nine carries a `review` note in `PAYER_GROUPS` (`lib/content.ts`), and `review`
publishes a name **on the insurance page only**. `INSURANCE.payers` — which feeds
the homepage card, its "and N more" count and the JSON-LD — still derives from
`confirmed` alone, so **no machine-readable claim asserts any of the nine**. Keep
it that way: moving one to `confirmed: true` is what the practice confirming it
looks like, and nothing else should do it.

**Do not sweep these names out** on the strength of the rule above, and do not
widen the `review` mechanism to any other regulated fact. Both are decisions that
were already weighed. If a review flags the nine, that is the known state of them
— `OPEN_CLIENT_ITEMS` carries what the practice has to confirm, name by name.

**One thing is still open and is the client's to decide:** whether the page says
visibly that some plans are being confirmed. It does not today — all sixteen
names render identically under "We accept the plans below". That hedge was not
added unilaterally because it softens the instruction itself.

## Compliance

**HIPAA-aware.** The v1 contact/intake flow **must NOT collect any health information**.

- **Allowed:** name, email, phone, general reason for contact.
- **Not allowed in v1:** symptoms, diagnoses, medications, insurance ID or member numbers, date of birth, SSN, free-text boxes inviting clinical detail, file uploads.
- Do not add a patient portal, intake questionnaire, or appointment form that captures PHI without an explicit decision and a BAA-covered processor.
- Reason-for-contact should be a short constrained set (e.g. "New patient inquiry", "Existing patient", "Billing/insurance", "Other") — not an open clinical prompt.
- Include crisis guidance (988 / 911) where a distressed visitor would plausibly look. This is expected on a behavioral-health site and is currently absent.
  - **The in-page "If you need help now" panel was removed from the assessment and medication-management pages by client decision (2026-09-30 and 2026-10-01). The footer's 988 / 911 strip is the crisis guidance on those routes, and it renders sitewide.** Both pages also drop the "Keep reading" grid, and the two removals are what make each other safe: with no card grid between the CTA and the footer, the strip is the next content a reader meets. What is lost on them is `CRISIS.body` — "not for emergencies and is not monitored around the clock" — which survives only as footer fine print. **If "Keep reading" ever returns to any of these layouts, the crisis panel has to return with it.**

  - **Updated 2026-10-01: `/services/telehealth` dropped both as well, by client decision, so NO service page now renders the in-page crisis panel.** On that route the crisis guidance is the footer strip plus the page's own fourth section, "When telehealth is not the right call", whose body carries the full 988 / 911 instruction in the practice's own words — which is why that section is the one place on the site where the guidance is still above the footer. **Do not add bullet points to that section, and do not reword its body.** A healthcare review of 2026-10-01 rejected three points proposed for it: a bullet saying to call when unsure of urgency has no named number and competes with the navbar's practice phone two sentences after the body says the practice is not monitored around the clock; and a bullet pairing "988 and 911" flattens a distinction `CRISIS` says must be checked rather than guessed.
  - <!-- CLIENT: on that section the 988 and 911 numbers are plain text, not `tel:` links, where `CRISIS.items` makes them tappable. Now that the in-page panel is gone from every service page, this is the weakest remaining crisis affordance above the footer and is worth making tappable. -->


## Working rule

**End every task by committing and pushing with a clear message.**
