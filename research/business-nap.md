# Business / NAP Data

Critical for local SEO and Google Business Profile setup. All values below are exactly as they appear on the live site — do not normalize/change without client confirmation, since the source itself is inconsistent (see "Name inconsistencies" below).

## Legal / business name — INCONSISTENT ACROSS THE SITE
The business name is rendered **four different ways** on its own website:

| Where | Exact string |
|---|---|
| Logo (image wordmark) | NEWPOINT HEALTHCARE SERVICES, LLC |
| Homepage/Contact body copy | New Point Healthcare Services LLC |
| Services page `<title>` | New Point Healthcare LLC (drops "Services") |
| Homepage schema.org JSON-LD `name` | New Point healthcare Services LLC (lowercase "h" — typo) |
| Domain name | newpointnp.com ("np" likely = "Nurse Practitioner(s)") |

**This must be resolved to one canonical legal name before the rebuild/GBP work**, since NAP consistency (exact name match across web, GBP, and citations) is a core local-SEO ranking factor. "Newpoint" (one word, per the logo) vs. "New Point" (two words, per body copy) is the primary fork to resolve with the client — the logo is normally treated as the authoritative brand mark, but the LLC's actual registered name (as filed with NJ) should be the tiebreaker; that should be confirmed from the client's formation documents, not guessed from the website.

## Tagline
"Your Health is our Priority" (as shown in the logo, italic script treatment)

## Phone numbers (verbatim, `tel:` links from the site)
- (609) 527-9438 — primary; used as the header "Call Us" button target
- (215) 526-4153
- (215) 987-2847
- Fax: (609) 527-9437

## Email addresses (verbatim)
- fwhitaker@newpointnp.com (Funmilayo Whitaker)
- aofoegbu@newpointnp.com (Anastasia Ofoegbu)
- No general/practice-wide inbox (e.g. info@ or contact@) found — only the two named-provider addresses.

## Physical address
**Not published anywhere on the site.** Only city/township-level location is given, and even that varies:
- "Lawrence Township, NJ" (homepage H1, contact body copy)
- "Lawrenceville, NJ" (page `<title>` tags — Lawrenceville is a section of Lawrence Township, so this is consistent in substance but inconsistent in the exact wording used)

No street address, suite number, ZIP code, or embedded map exists on the site. **This is a hard blocker for Google Business Profile / local-pack SEO** — GBP requires a verifiable address (or a defined service area if it's a service-area business with no public storefront). The client needs to supply the real address (or confirm this is a telehealth/service-area-only practice with no public office) before a GBP listing or NAP citations can be built.

## License numbers / accreditations / certifications
**None published.** No NPI numbers, no NJ/PA nursing board license numbers, no DEA registration, no practice accreditation badges (e.g., Joint Commission), no malpractice-insurance disclosure. Credentials given are only the providers' post-nominal letters (DNP, FNP-BC, PMHNP-BC) — see `people-trust.md`. For a psychiatric prescribing practice, publishing at least the providers' state license numbers (or an "ask us" note) is a common trust signal that's currently missing.

## Service area
Stated only at the state level: **"New Jersey and Pennsylvania."** No county or town-level breakdown is given anywhere (the brief asked which NJ/PA counties/towns are covered — the site does not say; this needs to come from the client). The only town actually named is the practice's own presumed location (Lawrence Township / Lawrenceville, NJ).

## Hours of operation
**Not published.** The only scheduling-adjacent detail is on the Services page: "telehealth in behavioral health services... on an expanded schedule (weekends evenings and holidays by request)" — implying non-standard/flexible hours exist, but no actual weekly hours table anywhere.

## Insurance accepted
(from Services page — see `content/services.md` and `services-analysis.md` for full context)
- Aetna
- Optum
- Cigna Evernorth
- United Healthcare
- Medicare
- NJ Medicaid
- Blue Cross Blue Shield Horizon NJ

## Finances / payment
- Session fee: Yes (amount not disclosed)
- Sliding scale: Yes (criteria not disclosed)
- Payment methods: all major credit and debit cards, cash

## Intake / referral process
Not formally documented as a process. The only stated path to becoming a patient is: contact via phone / email / the contact form → "the initial visit involves completing a comprehensive psychiatric evaluation" (per Services page). No mention of: referral requirements, new-patient paperwork, telehealth platform used, what to expect at intake, wait times, or whether they accept walk-ins/self-referrals vs. requiring a physician referral.

## CMS / platform (relevant to any future NAP/citation work)
Site is built on **IONOS Website Builder** (Duda platform, white-labeled) — see `seo-technical.md`.
