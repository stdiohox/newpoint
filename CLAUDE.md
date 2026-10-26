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

**Newpoint is a two-provider outpatient PSYCHIATRIC / behavioral-health nurse-practitioner practice** serving **New Jersey and Pennsylvania** — psychiatric evaluation and medication management, in person or by telehealth. (The appointment is a *psychiatric evaluation* — see "Terminology and service names" below.)

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
It states the role already in `PROVIDERS[].role` and asserts nothing new. (That page was
removed on 2026-10-19; the rule it illustrates still applies to any new prose mention.)

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

> **SUPERSEDED, 2026-10-02 — THE CLIENT ATTACHED BOTH STATES TO BOTH MODES.** The rule in
> the paragraph above is no longer what the site does. The client confirmed this delivery
> line and asked for it wherever the site summarises how and where care is delivered:
>
> > **In person or telehealth services across New Jersey and Pennsylvania**
>
> It lives in one place, `DELIVERY_LINE` in `lib/content.ts`. As of 2026-10-03 it feeds the
> footer, the closing CTA band's **meta row**, the contact page's intro and its "Where we
> see patients" paragraph, the appointment form, the assessment page's modality label, two
> FAQ answers (which carry it into `FAQPage` JSON-LD), the `/services` hero, the
> `/new-patients` expectation, both JSON-LD descriptions and the provider pages.
> **Edit that constant, not the call sites.**
>
> The band's **pill** takes `DELIVERY_SHORT` — "In person or by telehealth" — because the
> pill and the meta row sit about 300px apart and carried the same 66-character sentence
> twice for a day. One statement per block: the pill says the mode, the meta row says the
> mode and the states. The short form is a constant too, for the same reason the long one
> is.
>
> **The schedule claim did not move with it.** "An expanded schedule including weekends,
> evenings, and holidays by request" stays bound to **telehealth** everywhere it appears.
> The client's decision was about where and how care is delivered, not when; hours remain an
> open item.
>
> **What this means for the restriction above:** it is lifted, by client decision, for this
> sentence. The evidence did not change — the Pennsylvania signal is still one platform,
> one provider, and the street address is still unconfirmed — so the two open rows in the
> table remain open and `OPEN_CLIENT_ITEMS` still carries them. What changed is who is
> making the claim: the practice is, in writing.
>
> **Do not "fix" this back.** A reviewer who flags "in person" beside two state names is
> applying the paragraph above, which this note supersedes. Flag the conflict here instead,
> as the service-furniture rule asks.

> **HISTORICAL, 2026-09-29. Read the SUPERSEDED block above first — this note predates it
> and its instruction has been overtaken.** It is kept because its evidence is still the
> evidence, and because the licensure question it closes is still closed.
>
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
> **WHAT ACTUALLY HAPPENED, 2026-10-02:** the client lifted it themselves, by confirming
> the delivery line, without the Pennsylvania office being confirmed. So the sentence
> immediately above is spent: the copy restriction is gone and is not coming back on this
> evidence. The two open rows in the table — which states in-person covers, and the street
> address — survive as **evidence gaps behind a published claim**, which is a sharper thing
> than they were when they were gaps behind a hedge. They stay in `OPEN_CLIENT_ITEMS`.
>
> **A licensure question that file raised is now closed.** Headway's structured licensure
> field gives Ofoegbu **New Jersey only**, which put the site's two-state claim for her in
> doubt. **The client confirmed on 2026-09-29 that both providers are licensed in both
> states**, so the site may keep reasoning from it and no copy changed. Recorded
> as the client's confirmation, not as a register check — PA's licensee search sits behind
> reCAPTCHA and was not queried. Her licence numbers are still outstanding.

### Telehealth is a delivery mode, not a service — CLIENT INSTRUCTION, 2026-10-19

**The client asked for telehealth to be removed from the services**, because every
patient who comes in already has telehealth as an option. Telehealth is **how** the
services are delivered, not a service of its own. So:

- **Removed:** the `/services/telehealth` page (its `SERVICE_PAGES` entry, the `grid`
  layout and `components/sections/ServiceGrid.tsx` that only it used, its photographs
  and its homepage video), the homepage "Telehealth" card, its `WHAT_WE_TREAT.services`
  row, and its entries in the services menu, footer, sitemap, provider pages and
  JSON-LD, which all derive from `SERVICE_PAGES`. The hero tag and the meta descriptions
  no longer list it beside the services.
- **Kept, unchanged:** `DELIVERY_LINE` and `DELIVERY_SHORT`, and every sentence that
  says care is "in person or by telehealth". Telehealth is still offered, so the
  delivery mode still appears wherever the site says how care is delivered.
- **Kept, unchanged:** the expanded-schedule sentence bound to telehealth (contact page,
  FAQ). It never depended on the service page.

**Do not re-add a telehealth service page or card** without a new client instruction.

**What went with the page**, kept here so nobody has to rediscover it: the line that a
patient must be physically located in a state where their provider is licensed at
the time of the appointment, and that page's own 988 / 911 section. The footer's crisis
strip still renders sitewide.

<!-- CLIENT: no redirect was added for /services/telehealth because the site is still
     pre-launch (holding mode), so the URL has no search history to protect. If it was
     ever shared publicly, add a 301 to /services in next.config.ts. -->

### Homepage provider cards — CLIENT REQUEST, 2026-10-19

- **Portrait (4:5) at every width**, with each photo at the **exact pixels supplied**:
  one lossless WebP per provider, no srcset, no next/image, checked pixel-for-pixel
  against the original. The files and pixel sizes are `PROVIDERS[].image.portrait`
  in `lib/content.ts`, which the provider pages (`TeamMemberCard`) use as well.
  Do not "optimise" these into lossy or downsized copies; that is what the client
  asked to undo.
- **The panel shares the services column**: 1200px max, 20px side padding, the same
  edges as `<FeaturedServices />` above it. It used to run on the wider navbar gutters.
- Text sits over the photo from `lg` up and **below** the photo under `lg`, where it
  would otherwise cover the face.

### Summary line, consultation and brochure — CLIENT INSTRUCTIONS, 2026-10-19

- **The practice summary line is the client's wording, verbatim** (amended by
  the client on 2026-10-22: "behavioral health management" became **"weight
  management"** in this sentence, the hero tag and every meta description that
  carries it): "Psychiatric
  assessment, medication management, and behavioral health management from two
  doctorate-prepared psychiatric and family nurse practitioners serving New
  Jersey and Pennsylvania." It is the Open Graph and Twitter description
  (`app/layout.tsx`, the link-preview "second line" the client was looking at)
  and, minus the "serving…" tail the headline already says, the hero subtext.
  The plain meta description is the same sentence reordered so the two states
  come before Google's ~155-character cut, on the SEO review's advice. **Telehealth is not in that list**; it follows as the
  client's own sentence, "We see patients in person and also by telehealth."
- **Free 15-minute consultation.** Offered, per the client. How it works is
  open (see `OPEN_CLIENT_ITEMS`); never describe who takes it or what happens
  in it until that is answered.
- **The brochure** ("we can use this but cannot display it word for word")
  lists: psychiatric evaluation and diagnosis, psychotherapy and counseling,
  medication management, telehealth, in-person care. Reflect it in paraphrase,
  never verbatim, and keep "assessment" for the appointment's name. It is the
  source for psychotherapy and counseling being a service of its own; which
  modalities, and who delivers them, are still open.

### Page width — ONE COLUMN, 2026-10-19

Every section's content sits in the page column: `--page-max` (1200px) and
`--page-gutter` (`clamp(1.25rem, 4vw, 2rem)`, 20px on phones to 32px) in the
`@theme static` block of `app/globals.css`, applied by the `page-col` utility,
which **is** `<Container>`. The navbar pill and the footer card are capped to
the same column, so the top and bottom frames line up with every section.
`npm run lint` runs `scripts/check-widths.mjs`, which fails on a hand-written
page width.

- **New sections use `<Container>`.** Never hand-write a `max-w-[…]` + padding
  wrapper or the old uncapped `px-6 md:px-12 lg:px-16` gutters: that is how three
  homepage sections ended up ~200px wider a side than the rest.
- Full-bleed bands (hero, footer, coloured section grounds) go outside the
  column and put their content inside it.
- To change the site's width, change the two tokens. Nothing else.

### Terminology and service names — CONFIRMED BY OWNERS, 2026-09-29; APPOINTMENT NAME REVERSED 2026-10-25

Agreed in a meeting with the owners. Like the care-modality note above, this
postdates `research/` and supersedes it on wording. **Do not edit the crawl
findings** — they remain an accurate record of the site as it stood 2026-08-27.

| Say this | Not this |
|---|---|
| **evaluation** — "comprehensive psychiatric evaluation" | "psychiatric assessment" as the name of the appointment |
| **mental and behavioral care** in the homepage hero | "psychiatric care" as the hero headline |
| "from the first contact" | "from the first message" |

Notes on the terminology, all deliberate:

- **"Psychiatric" is not banned.** It is still the practice's clinical head term
  and still carries the title tags, the provider role strings and the service
  page H1s. Only the hero headline widened.
- **The appointment is a psychiatric evaluation (client instruction, 2026-10-25).**
  This reverses the 2026-09-29 "assessment" rule. Every "psychiatric assessment"
  in site copy, metadata and the automation prompts became "psychiatric
  evaluation", and the social/SEO content rule that flagged "evaluation" was
  removed. "Psychiatric assessment" survives only as the evaluation page's
  `alternateName` and a `keywords` entry in `app/layout.tsx`, as the synonym.
  Bare "assessment" (e.g. "The assessment follows a set structure") was not
  swept and still appears in body copy.
- **The slug is `/services/psychiatric-evaluation`** and now matches the page name.

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

- **The `/services` hub keeps its "Providers you’ll see" cards**
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
  deliver this service". For the **comprehensive psychiatric evaluation** that is
  an open question, not a fact: the per-service sourcing breakdown and the
  outstanding `CLIENT:` question live at `app/services/page.tsx:313-325`. The
  constraint is specific to that service — the same page records medication
  management as sourced — so cite that note rather than
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

### ADHD prescribing line — CLIENT INSTRUCTION, 2026-10-01

**`/services/medication-management` names ADHD under "Conditions we prescribe for"
because the client asked for it on 2026-10-01. The repo previously carried an
explicit note against that, and it was not removed lightly.**

That note argued the prescribing claim implies stimulants, and therefore a DEA
registration, which the rule above lists as a regulated fact nobody has confirmed.
**The argument was half right.** Treating a condition and prescribing for it are
different claims — but ADHD pharmacotherapy is not exclusively controlled, so a
nurse practitioner with prescriptive authority can prescribe for ADHD with no DEA
registration at all. The published line therefore asserts nothing the practice has
not confirmed, and both providers already publish ADHD among what they treat.

**The boundary, and none of it is decoration:**

- **No medication and no drug class is named anywhere on that page** — not
  "stimulant", not a brand, not a molecule. Do not add one. The line is safe
  because of this.
- **ADHD only.** Insomnia and substance use stay out of the prescribing list.
  They are in `WHAT_WE_TREAT.conditions` as treating claims and were not asked for.
- **The list is not a spread of `WHAT_WE_TREAT.conditions`** and must never become
  one. That list carries "Irritability and anger" and "Stress and burnout", which
  are not prescribing indications.
- **The hedge stays.** "Appearing on this list does not mean medication is the
  answer in every case" lives in that section's `bullets`, which only the `cards`
  layout renders. Changing that service's `layout` without moving the
  hedge into `body` ships the chip list unhedged.
- **It reaches no structured data.** `serviceSchemaFor()` emits the section intro
  only, so the list is page copy and nothing else.

**Two questions are still open and both are in `OPEN_CLIENT_ITEMS`:** the
stimulant/DEA/telehealth scope question, and the age range — ADHD is the
highest-paediatric-volume condition on that list, and the site still cannot say
whether it serves children.

### Medical weight management — CLIENT INSTRUCTION, 2026-10-06

> **RENAMED 2026-10-22: the service is now "Weight management"**, client
> instruction ("just put weight management"). "Medical" came off the H1, the
> first section heading (anchor `what-weight-management-involves`), the intro,
> `alternateName` ("Weight loss care") and the meta strings. Everything below
> still governs the page; read "medical weight management" as "weight
> management".

A fourth service line, briefed as "add weight loss" with a competitor's printed
flyer as the reference: *doctor-supervised, weekly injections (semaglutide &
tirzepatide), 10% off your first month*. Built as `/services/weight-management`.
The long note at the head of that entry in `lib/content.ts` carries the full
reasoning; this is the part that governs future edits.

**Three of the flyer's four lines were not adopted, and none of the three is a
style preference.**

| The flyer says | The site says | Why |
|---|---|---|
| "Doctor-Supervised" | the FNP-BC credential, named | **There is no physician at Newpoint.** Both providers are DNP, FNP-BC, PMHNP-BC. In weight-loss advertising "doctor-supervised" is read as *physician*-supervised, and asserting it is exactly the regulated-fact invention this file forbids. FNP-BC — the certification covering general medical care rather than psychiatric care alone — is the more specific claim and the true one. |
| "Weight Loss Solutions" | "Medical weight management" | That is the **trading name of the practice on the flyer**, 134 Franklin Corner Road, Lawrenceville — the same town the open address item places Newpoint in. Taking a direct competitor's name in its own market is not a copy decision. |
| "10% off your first month" | nothing about money | Declined by the client on 2026-10-06. A discount implies a monthly price, a term and an interaction with insurance billing, none of which anyone has stated. |

**No outcome is claimed anywhere on that page** — no pounds, no percentages, no
timeframe, no before-and-after — and the page says so in a section of its own
rather than staying quiet. Weight-loss advertising is policed hardest on exactly
that claim. **Do not add one**, and do not add a brand name: Wegovy, Ozempic,
Zepbound and Mounjaro appear nowhere on this site, because naming generic
molecules is true whether the product is manufactured or compounded and naming
a brand is not.

**It is the only service page that renders the in-page crisis panel**, because
it is the only one on the shared prose layout. That is deliberate, not a
leftover: a behavioural-health practice advertising weight loss will be read by
people with eating disorders. The page also asks about eating-disorder history
in its own copy — it **asks**, at an appointment; it does not screen, name a
criterion, or invite anyone to type a history into the contact form, which the
HIPAA rule below forbids.

**Six facts are still open and all six are in `OPEN_CLIENT_ITEMS`** as one item:
whether it is open to new patients or existing ones only; brand or compounded;
in-office or self-administered injections; price and terms; insurance or
cash-pay; and whether it holds for both providers — adding the service has
already asserted that it does, since both provider pages list every entry in
`SERVICE_PAGES`.

## Compliance

**HIPAA-aware.** The v1 contact/intake flow **must NOT collect any health information**.

- **Allowed:** name, email, phone, general reason for contact.
- **Not allowed in v1:** symptoms, diagnoses, medications, insurance ID or member numbers, date of birth, SSN, free-text boxes inviting clinical detail, file uploads.
- Do not add a patient portal, intake questionnaire, or appointment form that captures PHI without an explicit decision and a BAA-covered processor.
- Reason-for-contact should be a short constrained set (e.g. "New patient inquiry", "Existing patient", "Billing/insurance", "Other") — not an open clinical prompt.
- Include crisis guidance (988 / 911) where a distressed visitor would plausibly look. This is expected on a behavioral-health site and is currently absent.
  - **The in-page "If you need help now" panel was removed from the assessment and medication-management pages by client decision (2026-09-30 and 2026-10-01). The footer's 988 / 911 strip is the crisis guidance on those routes, and it renders sitewide.** Both pages also drop the "Keep reading" grid, and the two removals are what make each other safe: with no card grid between the CTA and the footer, the strip is the next content a reader meets. What is lost on them is `CRISIS.body` — "not for emergencies and is not monitored around the clock" — which survives only as footer fine print. **If "Keep reading" ever returns to any of these layouts, the crisis panel has to return with it.**

  - **The telehealth service page is gone (2026-10-19, see "Telehealth is a delivery mode, not a service" above).** It was the one route whose own body copy carried the 988 / 911 instruction above the footer, in its "When telehealth is not the right call" section. That section went with the page, so on every service route the crisis guidance is now the footer strip alone: all three remaining services name a layout (`feature` or `cards`), and only the prose layout renders the in-page panel. **Updated 2026-10-22:** `/services/substance-use-and-addiction` is on the `cards` layout like its siblings (client: "like the other pages"), so it has no in-page crisis panel. Instead its fifth section, "If you need help now", falls through below the cards and carries 988, 911 and the SAMHSA National Helpline above the FAQ. **Keep that section, and keep it fifth.**

### Substance use and addiction management — CLIENT INSTRUCTION, 2026-10-22

A new service line, at `/services/substance-use-and-addiction`. It closes the
open item on whether substance use is an active service line. The note at the
head of its `SERVICE_PAGES` entry governs edits. In short:

- **No medication and no drug class is named as something the practice
  prescribes for addiction.** Medication management is claimed only for the
  co-occurring mental health conditions. Whether the practice prescribes for SUD
  itself (buprenorphine is Schedule III: DEA registration and telemedicine
  rules) is open in `OPEN_CLIENT_ITEMS`.
- **Outpatient only.** No detox, withdrawal management, IOP or residential care
  is claimed. An FAQ warns against stopping alcohol or some medications suddenly,
  for patient safety. Keep it.
- **No outcome claims, and nothing invites a substance history into the contact
  form.** 42 CFR Part 2 may apply to a practice that holds itself out as
  providing SUD treatment; that is a counsel question, tracked in
  `OPEN_CLIENT_ITEMS`.
- **No providers section on the page** (furniture rule above).
- **Photography delivered 2026-10-22** from the prompts in
  `design-research/image-prompts-substance-use.md`. No alcohol, medication or
  paraphernalia may appear in any frame. `addiction-call.webp` was cropped to
  remove a bottle that read as wine. In every Newpoint photo, the person across
  from the patient is a woman (both providers are women).

### Dr. Whitaker's role and education — CLIENT INSTRUCTION, 2026-10-22

- **Visible role:** "Psychiatric-Mental Health, Family and Addiction Nurse
  Practitioner" (client: "psych mental health, family and addiction
  practitioner"). It is `PROVIDERS[].role`, so it shows on her provider page,
  her homepage card and `/providers`. **Schema `jobTitle` is unchanged**: no
  addictions certification (e.g. CARN-AP) is on file, so no machine-readable
  claim asserts one. Dr. Ofoegbu's role is unchanged.
- **Education** gained "Family Nurse Practitioner certificate, Liberty
  University (acute care track)", as given by the client.
  <!-- CLIENT: confirm the program's exact name. FNP is a primary-care
       population and acute care is a separate certification, so "acute care
       track" beside an FNP certificate reads oddly to a clinician. -->



## Working rule

**End every task by committing and pushing with a clear message.**

### Closing portrait, "Health is wealth" — CLIENT REQUEST, 2026-10-22

The homepage ends (after the contact section, before the footer) with
`<ClosingPortrait />`: both providers in one photograph under the client's tag,
"Health is wealth." Content is `CLOSING_PORTRAIT` in `lib/content.ts`.

- **The photo is served at the exact pixels supplied, lossless**
  (`public/images/providers/providers-together.webp`, 1123x1231), the same rule
  as the provider portraits. Plain `<img>`, lazy, no next/image.
- **Whitaker is on the left, Ofoegbu on the right** (matched to Whitaker's studio
  portrait). The alt names them without "Dr."; the visible names carry "Dr." with
  the credentials directly beneath, which is the condition on the prefix.
- The client asked for the picture and the tag only. Nothing else was added.
- **The same photograph also heads `/providers`** (split header: H1 and intro
  left, photo right; it replaced the full-bleed waiting-room PageHero, whose
  white copy failed AA contrast) and **is the site's link-preview image**
  (`app/opengraph-image.tsx`, reading the JPEG copy in `assets/og/`, because
  Satori cannot decode WebP). The card shows no names and no "Dr.": it appears
  in feeds with no credentials beside it.
  <!-- CLIENT: the /providers photo is the page's main image and weighs ~1 MB
       because it is lossless at the supplied pixels. On slow mobile data that
       costs ~2 s of load time. A smaller lossless copy for that page only would
       be ~4x lighter; ask whether that is acceptable. -->

### Turquoise #00CED1, strictly — CLIENT INSTRUCTION, 2026-10-26 (supersedes the royal section below)

The royal blue "seems dark and is not good for the practice"; the client then asked for
**#00CED1, strictly**. It is the only brand colour: every coloured surface (buttons, panels,
badges, photo-hero washes, the CTA band, the share image) is exactly `#00CED1`, with **white
text and icons on it — the client's explicit preference (2026-10-26), chosen over ink after
both were shown and after being told white measures 1.95:1 there, below WCAG AA.** Do not
"fix" it back to ink without asking. Focus rings on turquoise stay ink. `#00CED1` is never
body/heading/link text on white — those are ink. Exception:
the "Newpoint" wordmark is `#00CED1` (logotype, exempt). Token names (`np-blue-*`, `np-royal*`,
`np-sky`, `np-cyan`) are kept and remapped in `app/globals.css`; `bg-np-turquoise` /
`np-turquoise-deep` (hover) are the explicit names. Older ratio comments in components describe
the royal/white pairing and are stale. The logo mark PNG is unchanged (the client's blue cross).

### Vivid royal colour — CLIENT REQUEST, 2026-10-22 (superseded 2026-10-26)

The client said the navy looked dull and asked for the colour style of Apple's Mail icon
(a royal-to-cyan gradient). Tokens and rationale: `design-research/design-tokens.md`,
"Vivid royal family". **Later the same day the client made royal dominant everywhere**: the
whole `np-blue` scale and `np-sky` were remapped onto it (table in the same doc), the photo-hero
scrims went from navy to deep royal, and the "Newpoint" wordmark turned royal. `#234598` is
no longer the brand blue.
Cyan never sits behind text (1.91:1 with white). Every surface was re-measured; the numbers
are in the comments beside each one (`PageCta.tsx`, `Providers.tsx`). The photo-hero scrims are deep royal now and were re-measured route by route.
The client's colour logo PNG (footer, favicon) is their artwork and was not recoloured.
