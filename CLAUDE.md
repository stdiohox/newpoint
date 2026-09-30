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
  `alt` text, or schema. In schema that also means never `Physician`, `IndividualPhysician`,
  or `PhysiciansOffice`.
- **"Doctor" written in full is permitted only as the degree**: "Doctor of Nursing Practice",
  "doctorate-prepared". Never as a title before a name.
- The canonical role string, used identically in copy and in schema `jobTitle`, is
  **"Psychiatric-Mental Health Nurse Practitioner"** (hyphenated, the ANCC form).

> **Trap:** the live site calls both providers "Dr. Funmilayo Whitaker" and
> "Dr. Anastasia Ofoegbu" — see [`research/content/contact.md`](research/content/contact.md).
> `research/` is authoritative for **facts**, not for this. Do not port those titles forward.

#### OVERRIDDEN IN ONE PLACE BY THE CLIENT, 2026-09-30

**The client asked for "Dr." before both names on the `/services` "Providers you will
see" cards, was shown the rule above and its reasoning, and reaffirmed.** It is applied
there and is rendered as a display prefix in `app/services/page.tsx`, not written into
`PROVIDERS[].name`.

**That distinction is the whole of the override, so do not collapse it.** `name` feeds
schema.org `Person`, the page metadata and the portrait `alt` text. What the client
overturned was the visible copy on one section. Everything else in this section stands
unchanged and is still binding:

- no `Physician`, `IndividualPhysician` or `PhysiciansOffice` in schema, ever;
- no `Dr.` in metadata, `alt` text or structured data;
- `jobTitle` stays "Psychiatric-Mental Health Nurse Practitioner".

So the site now says "Dr." in one visible place while its machine-readable markup
continues to describe two advanced practice nurses. That is deliberate and is the
narrowest way to honour the request.

<!-- CLIENT: if "Dr." should appear beyond those cards, it needs a decision per
     surface — visible copy is one question, and schema/metadata is a separate one
     with the title-protection exposure attached. Confirm which, and whether the
     practice has counsel's view on NJ/PA title protection for DNP-prepared APNs. -->

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

## Compliance

**HIPAA-aware.** The v1 contact/intake flow **must NOT collect any health information**.

- **Allowed:** name, email, phone, general reason for contact.
- **Not allowed in v1:** symptoms, diagnoses, medications, insurance ID or member numbers, date of birth, SSN, free-text boxes inviting clinical detail, file uploads.
- Do not add a patient portal, intake questionnaire, or appointment form that captures PHI without an explicit decision and a BAA-covered processor.
- Reason-for-contact should be a short constrained set (e.g. "New patient inquiry", "Existing patient", "Billing/insurance", "Other") — not an open clinical prompt.
- Include crisis guidance (988 / 911) where a distressed visitor would plausibly look. This is expected on a behavioral-health site and is currently absent.

## Working rule

**End every task by committing and pushing with a clear message.**
