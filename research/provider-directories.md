# Provider directory capture — third-party listings

**Captured 2026-09-29. This is a SECOND, LATER capture and is not part of the
2026-08-27 crawl of newpointnp.com.** Everything else in `/research` describes
the practice's own site. This file describes what the providers have published
about themselves on five third-party platforms, supplied by the client.

Raw captures are in [`directories/`](directories/), one file per source,
verbatim page text. Read those before quoting anything; this file is a
reconciliation, not a substitute.

## Sources

| # | Platform | URL | Subject | Capture |
|---|---|---|---|---|
| 1 | Grow Therapy | `growtherapy.com/provider/gcgyx1g6rm10/funmilayo-whitaker` | Whitaker | Full |
| 2 | Headway | `care.headway.co/providers/funmilayo-whitaker-2` | Whitaker | Full |
| 3 | Headway | `care.headway.co/providers/obianuju-ofoegbu` | Ofoegbu | Full |
| 4 | U.S. News Health | `health.usnews.com/nurse-practitioners/funmilayo-whitaker-2119468` | Whitaker | Full |
| 5 | Doximity | `doximity.com/pub/funmilayo-whitaker-np` | Whitaker | **Gated** — profile body requires a verified-clinician login. Only name, and one education row, were readable |

## How reliable is this?

Rank the evidence before using it:

- **Strong** — a fact that three independent platforms agree on, or that a
  platform cross-confirms against something already in `/research`. The street
  address is the only fact in this capture that reaches this bar.
- **Medium** — a structured field a platform collects and validates (licence
  numbers, NPI). Still self-entered by the provider, but a platform has a
  reason to check it.
- **Weak** — free-text a provider typed about themselves, especially where two
  platforms disagree. That is most of the rest of this file.

**None of it is a primary source.** A state licence lookup, the NPI registry
and the practice's own records outrank every line here. Directory profiles go
stale, are often filled in once and forgotten, and describe the provider's work
*on that platform* — which is not necessarily their work at Newpoint. Two of
these are competing telehealth marketplaces, and a profile written for Grow
Therapy is written to sell Grow Therapy sessions.

**Nothing in this file has been applied to site copy.** It is intelligence for
the client conversation, not a licence to publish.

---

## THE BIG ONE: the practice address is effectively confirmed

> **6 Colonial Lake Drive, Suite D, Lawrence Township (Lawrenceville), NJ 08648**

`OPEN_CLIENT_ITEMS` calls the street address "the highest-value open item". This
capture closes it as far as open-source evidence can:

- Grow Therapy, under Whitaker's in-person sessions: "6 Colonial Lake Dr,
  Lawrence Township, NJ 08648, D"
- Headway, under Ofoegbu's location: "6 Colonial Lake Drive D, Lawrence
  Township, NJ 08648"
- U.S. News, provider address: "6 Colonial Lake Drive, Lawrenceville, Lawrence,
  NJ, 08648"

Three platforms, two different providers, same suite. And the clincher: U.S.
News lists the phone at that address as **(609) 527-9438**, which is already
`BUSINESS.phonePrimary` in `lib/content.ts`, sourced from the practice's own
site in `business-nap.md`. An unrelated office would not share the practice's
main line.

It also settles the second half of the open item — *which* states in-person care
covers. The only NJ address is this one, and Headway gives Whitaker a **second,
Pennsylvania** location (below), which is the first Pennsylvania place-level
signal in any Newpoint research. `CLAUDE.md`'s care-modality note says flatly
"there is no Pennsylvania location signal at all". That is no longer true.

**Still get the client to confirm it in writing before it ships.** Publishing an
address turns on `MedicalClinic` address markup, Google Business Profile and
Local Pack eligibility, and a patient physically travelling somewhere. Suite "D"
appears as a trailing letter on two platforms and not at all on the third, so
confirm the suite format too.

---

## Funmilayo Whitaker

Consolidated. Where platforms disagree the conflict is named rather than
resolved.

| Field | Value | Source | Grade |
|---|---|---|---|
| Full legal name | Funmilayo Jennifer Whitaker | Doximity; U.S. News has "Funmilayo J. Whitaker" | Medium |
| **NPI** | **1760719512** | U.S. News | Medium |
| **NJ licence** | **26NJ00646400** (APN — Advanced Practice Nurse) | Grow (number), Headway (type) | Medium |
| **PA licence** | **SP016195** (CRNP — Certified Registered Nurse Practitioner) | Grow (number), Headway (type) | Medium |
| Doctorate | DNP, University of North Florida, 2021 | Doximity, Headway, U.S. News agree | Strong |
| Master's | MSN, Tennessee State University | Headway | Weak |
| Pronouns | she/her | Grow | Medium |
| Identity | Black / African American, Woman | Grow, Headway agree | Medium |
| Languages | English, Yoruba | Headway; U.S. News says "Speaks English" | Weak |
| Self-pay rate | $150 per session *(on Grow Therapy)* | Grow | Weak — platform rate, not necessarily Newpoint's |
| Patient rating | 4.7/5 (135) on Grow; 4.6/5 (13 reviews) on U.S. News | Grow, U.S. News | Do not publish — see below |

**Licence-type strings matter.** Headway records her as **APN** in New Jersey
and **CRNP** in Pennsylvania. Those are the two states' actual regulatory titles
for the same role, and they are exactly the kind of string `CLAUDE.md`'s
clinician-titles rule exists to protect. If licence numbers ever ship, ship them
with the right title per state.

### Pennsylvania location — new

Headway lists **803 West Trenton Avenue, Ste 3, Morrisville, PA 19067**, marked
"Location 1 of 2" (the second being the NJ address). Morrisville sits directly
across the Delaware from Trenton, about fifteen minutes from the Lawrenceville
office, which is a coherent two-state footprint rather than an anomaly.

This is the single most consequential new fact after the NJ address, because
`CLAUDE.md` currently instructs that in-person care must be stated **without**
attaching it to a state, on the grounds that no PA location evidence exists. If
the client confirms Morrisville, that instruction can be relaxed and the site
can say in-person care in both states — which is a materially stronger claim for
a practice whose PA story is currently telehealth-only.

**Confirm first.** One platform, one provider, and it may be a location she
works at for Headway rather than a Newpoint office.

---

## Anastasia (Obianuju) Ofoegbu

| Field | Value | Source | Grade |
|---|---|---|---|
| Name on profile | "Dr. Obianuju Ofoegbu"; her own bio opens "My name is Anastasia. Ofoegbu" | Headway | Medium |
| Doctorate | DNP, University of North Florida | Headway | Medium |
| Other training | La Salle University (degree not specified) | Headway | Weak |
| **Licence** | **APN (Advanced Practice Nurse), New Jersey — NEW JERSEY ONLY** | Headway | **See conflict 1** |
| Identity | Black or African descent, Woman | Headway | Medium |
| Languages | Igbo, Yoruba, English | Headway | Weak |
| Style | Solution Oriented, Holistic, Open Minded | Headway | Weak |
| Care types | **Medication management only** | Headway | Weak |
| Top specialty | **Substance use / addiction**, listed first | Headway | Weak |

"Obianuju" is almost certainly the legal first name and "Anastasia" the name she
practises under, which is consistent with the site's existing "Anastasia O.
Ofoegbu". Nothing here requires changing how the site names her.

---

## Conflicts — resolve these with the client, do not pick a side

### 1. Ofoegbu's Pennsylvania licensure — the serious one

- **The site says** both providers are licensed in New Jersey *and*
  Pennsylvania. `SERVICE_PAGES` telehealth page: "Funmilayo Whitaker and
  Anastasia O. Ofoegbu are both licensed in New Jersey and Pennsylvania, so
  telehealth is available across our whole service area rather than in one state
  only." `PROVIDERS[].licensed` says the same. So does `people-trust.md`, drawn
  from her bio on the practice's own site.
- **Her own Headway bio text agrees**: "I am licensed in the states of New
  Jersey and Pennsylvania."
- **But Headway's structured licensure fields say New Jersey only** — "License
  type: APN (Advanced Practice Nurse) (New Jersey)" and "Licensed in: New
  Jersey". Whitaker's profile on the same platform lists both states in both
  fields, so the field is capable of holding two and was not simply left blank.

Free text is easy to leave stale; a structured licence field the platform uses
for routing is not. **This is a patient-facing risk, not a copy question:** the
site currently tells a Pennsylvania patient that either provider can see them.
If Ofoegbu's PA licence has lapsed or never existed, that is a booking the
practice cannot lawfully honour.

**Action: ask the client for her PA licence number, or verify against the PA
Department of State licensee search, before this branch ships.** Until then do
not weaken the site copy on a directory field alone — but do not treat the
claim as settled either.

### 2. Years of experience — three different numbers for Whitaker

| Source | Claim |
|---|---|
| Practice site / current copy | "More than 10 years of direct patient care" |
| Headway | "10 years of experience" |
| Grow Therapy | "15 years of experience" |

`CLAUDE.md` lists "specific years of experience" as a regulated fact that must
stay a placeholder. The current copy's "more than 10 years" is the safest of the
three and is the one the practice itself published. **Leave it.** Worth asking
the client which is right, since 15 is a stronger claim if true.

Ofoegbu has the same problem in milder form: Headway's field says "8 years of
experience" while her bio on the same page says "a nurse for 14 years with the
last 11 years in Mental Health and Addiction". The site uses the 11-year
framing, which matches her bio.

### 3. Ages served — the site says nothing, and it should stay that way

| Source | Claim |
|---|---|
| Grow (Whitaker) | Adults (18–64), Elders (65+) — **no children** |
| Headway (Whitaker) | Adults, Adolescents, **Children** |
| Headway (Ofoegbu) | Adolescents, Children, Adults |

Two platforms flatly contradict each other about the same clinician. `CLAUDE.md`
already forbids extrapolating a paediatric scope claim, and `OPEN_CLIENT_ITEMS`
logs the age range as open. **This capture does not close it — it confirms why
it is open.** Paediatric psychiatric prescribing is exactly the claim not to get
wrong.

### 4. Therapy modalities — now named, but inconsistently

`OPEN_CLIENT_ITEMS` asks for "Named therapy modalities offered (CBT, DBT, EMDR,
and similar), if any", raised in priority on 2026-09-29 when the owners
confirmed psychotherapy is delivered alongside medication management.

The directories name modalities for the first time — and disagree:

- **Grow (Whitaker):** Compassion Focused therapy, described at length.
- **Headway (Whitaker):** Motivational Interviewing, Behavior Modification,
  Cognitive Behavioral Family Therapy. Care types: medication management,
  **individual therapy, family therapy**.
- **Headway (Ofoegbu):** no modality named; care type is **medication
  management only**, though her approach mentions "supportive counseling".

Two useful things here. First, Headway independently corroborates the owners'
2026-09-29 statement that psychotherapy is a delivery mode and not only a line
in a treatment plan — "individual therapy" and "family therapy" are listed as
care types for Whitaker. Second, the two providers are **not** interchangeable
on this: only Whitaker lists therapy as a care type. That is directly relevant
to the existing CLIENT question in `app/services/page.tsx` about binding
providers to services.

**Still not publishable.** Four different modalities across two platforms, none
corroborated, is a menu to ask the client about, not a list to ship.

### 5. Conditions treated — directories are broader than the site

The site's `WHAT_WE_TREAT.conditions` omits three things the directories carry:

- **ADHD / ADD** — listed by Grow (Whitaker, "other specialties") and Headway
  (both providers). `OPEN_CLIENT_ITEMS` flags ADHD as "one of the highest-volume
  queries for a psychiatric NP practice", appearing nowhere in the source
  material, and asks whether the omission is deliberate. **Two platforms and
  both providers say it is not.** This is the highest-value content addition in
  this capture.
- **Substance use / addiction** — Grow lists it for Whitaker; Headway lists it
  as Ofoegbu's *first* specialty. `OPEN_CLIENT_ITEMS` asks whether this is an
  active service line. The directories say yes, and Ofoegbu's existing bio
  ("last 11 years in Mental Health and Addiction") already pointed that way.
  Note this also bears on the "behavioral care" H1: in US payer language
  behavioral health includes SUD, so the hero already implies a door the
  conditions list does not open.
- **Insomnia / sleep** — Grow (Whitaker) and Headway (Ofoegbu, "Sleep
  disorder"). U.S. News names "insomnia and sleep apnea" among her areas of
  expertise.

Grow adds more still for Whitaker: Dissociative Disorders, Personality
Disorders, Self Esteem, Impulse Control Disorders, Behavioral Issues, Emotional
Disturbance.

### 6. Insurance — the site's list is a subset, and the platforms' lists are theirs

`INSURANCE.payers` currently names seven. The directories name far more, but
**these are the plans each platform is contracted with, not necessarily plans
Newpoint accepts directly.** A patient who books through Grow Therapy is billed
by Grow Therapy.

Worth noting rather than porting: both Headway profiles and Grow all carry
Aetna, Cigna, Horizon BCBS NJ, Oscar, Oxford and United Healthcare, which
overlaps the site's list closely. Grow adds a large Medicare/Medicaid
Advantage set (Braven, Geisinger, Humana Dual, UPMC, Capital Blue Cross,
Highmark, Independence Blue Cross) that is plausible for a two-state practice.

**Do not expand `INSURANCE.payers` from this file.** The existing copy rule —
"accept", never "in network" — exists precisely because acceptance and
contracting are different things, and a marketplace's contracts are a third
thing again.

---

## What must NOT be ported

- **"Dr. Funmilayo Whitaker" and "Dr. Obianuju Ofoegbu."** Both Headway
  profiles use the title. `CLAUDE.md` forbids it outright in copy, metadata,
  alt text and schema — NJ and PA both have title-protection statutes and both
  providers are advanced practice nurses. The directories using it is not
  permission; it is the same error the live site makes.
- **Patient reviews and ratings.** Grow shows 4.7/5 from 135 ratings with
  quoted reviews; U.S. News shows 4.6/5 from 13 and an AI-written summary.
  `CLAUDE.md` lists testimonials and patient quotes as regulated facts requiring
  the client's sign-off, and these are reviews of her work *on those platforms*.
  Republishing a Grow Therapy review on newpointnp.com also raises a platform
  terms question. If the practice wants reviews, collect them directly.
- **Grow Therapy's $150 session fee.** It is that platform's rate. The site says
  "a session fee and a sliding scale are available", which is the practice's own
  wording, and a hard number would need confirming.
- **Availability and booking slots.** Both Headway profiles expose live
  appointment times and a free-consultation flow. Newpoint has no online
  scheduling — `services-analysis.md` is explicit — and the site must not imply
  one.
- **Whitaker's Grow Therapy first-person marketing copy.** It reads "I help high
  stressed manage anxiety and avoid burnout", contains several typos ("crete a
  tailor paln"), and is written to convert on a marketplace. Useful as evidence
  of her voice and of what she treats; not copy to lift.

---

## Verbatim voice — what the providers actually sound like

The client asked for the providers' own vocabulary. The most useful finding is
that **the site's existing copy is already derived from it.** Whitaker's Headway
"What you can expect from me" is near-identical to the passage in
`research/content/services.md` that `WHAT_TO_EXPECT` was built from:

> "The initial visit consists of completing a comprehensive psychiatric
> evaluation and identifying risk factors that might affect an individual's
> mental health. Diagnoses of mental illness are made based on assessment, and
> then the most effective care plan for the individual is determined. The
> treatment plan consists of psychotherapy modalities and psychopharmacology to
> improve the person's mental health. As we evaluate progress, we will continue
> to provide support and education as needed."

Two things follow. First, the site's clinical framing is sound — it is the
providers' own. Second, **the providers' own word is "evaluation", not
"assessment"**, on every platform. The owners' 2026-09-29 instruction to say
"assessment" is therefore a deliberate change of register, not a correction of
the site, and the decision to keep "evaluation" as a retained synonym in four
places is the right one: patients referred by these very profiles will arrive
having been told "evaluation".

Other phrasing worth having:

- Grow (Whitaker), on telehealth — "technology-based therapeutic tools such as
  telehealth in behavioral health services to see patients via telehealth on an
  **expanded schedule (weekends evenings and holidays by request)**". The site's
  "expanded schedule" language comes from here. It still does not say what the
  hours actually are; `OPEN_CLIENT_ITEMS` keeps that open.
- Grow (Whitaker), the treatment menu — "Psychiatric consultation / Medication
  treatment / Individual counseling / Skill building groups / Support groups /
  Referral to follow-up services". This is verbatim the "Also available" list on
  `/services`, confirming that list is sourced and current.
- Headway (Whitaker), approach — "warm, empathic, non-judgmental, and
  collaborative", which `PROVIDERS[].approach` already carries verbatim.
- Headway (Ofoegbu), approach — "Evidence-based and Patient-centered
  therapeutic approach to provide psychiatric evaluations, medication management
  and supportive counseling".
- Grow (Whitaker), opening hook — "Do you feel overwhelmed and pulled in
  different directions, unable to be happy? Are you struggling to keep up with
  your daily activities, relationship, work, and health?" Second-person,
  symptom-led, direct. The site is deliberately calmer than this, which is the
  right call for a practice site, but it shows the audience she writes for:
  stressed working adults heading toward burnout, not people seeking a
  diagnosis.

---

## Suggested order of questions for the client

1. **Confirm the address** and the suite format. Unblocks the largest single
   item in `OPEN_CLIENT_ITEMS` and all Local SEO work.
2. **Confirm the Morrisville, PA location** — is it a Newpoint office? Unblocks
   in-person claims in Pennsylvania.
3. **Ofoegbu's Pennsylvania licence** — number, or confirmation she does not
   hold one. The site currently claims she does.
4. **ADHD** — treated or not. Highest-value content addition available.
5. **Substance use / addiction** — an active service line, or incidental to
   Ofoegbu's history.
6. **Age range**, as a practice policy. Two platforms contradict each other.
7. **Therapy modalities** — which of the four named are actually offered, by
   whom, and as what appointment.
8. **Permission to publish** NPI and licence numbers.
9. **Years of experience** — 10 or 15 for Whitaker.
10. **Reviews** — whether the practice wants to collect testimonials directly.
