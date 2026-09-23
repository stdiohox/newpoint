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

**Newpoint is a two-provider outpatient PSYCHIATRIC / behavioral-health nurse-practitioner practice** serving **New Jersey and Pennsylvania** — psychiatric evaluation, medication management, and telehealth.

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
