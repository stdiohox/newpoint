# Newpoint automation layer

Design: [`docs/automation-architecture.md`](../docs/automation-architecture.md).
This package is **Phases 0 to 4, public zone only** (§7). There is no PHI code here,
and `trigger.phi.config.ts` is an empty stub until Phase 5.

npm only (`package-lock.json`). Node 24+.

```bash
npm ci
npm run check        # typecheck + lint + all tests (includes the pgTAP suite)
npm run test:db      # pgTAP suite only
```

## What is here

| Path | What it does |
|---|---|
| `src/lib/phi.ts` | `Phi<T>` / `PublicText` brands. Public sinks accept only `PublicText`. |
| `src/lib/env.ts` | Zod-validated marketing env. **Refuses to start if a PHI-zone variable is present.** |
| `src/lib/logger.ts` | Structured logger. Only literal event names and PHI-safe values compile. |
| `src/lib/errors.ts` | `FailureClass` enum and `toSafeError`. Vendor error text is never kept. |
| `eslint.config.mjs` | The zone rule: `src/trigger/marketing/**` cannot import PHI-zone modules. |
| `trigger.marketing.config.ts` | Trigger.dev project `newpoint-marketing`. |
| `supabase/marketing/supabase/` | Migrations and pgTAP tests for the `newpoint-marketing` project. |
| `test/db/` | Runs the pgTAP suite against an embedded Postgres 17 shaped like Supabase. |
| `n8n/README.md` | Hostinger/n8n hardening checklist. |
| `src/lib/task.ts` | `marketingSchedule`: the only way to define a marketing task. The original error never leaves `run()`, so Trigger.dev records a `SafeTaskError` and no vendor text. |
| `src/trigger/marketing/init.ts` | Global hooks: env check before every attempt, retry policy by failure class, one PHI-safe failure line. |
| `src/trigger/marketing/seo/` | `seo.keyword-research` (monthly) and `seo.rank-tracker` (Mondays 06:00 ET), §5.3. |
| `src/adapters/google/search-console.ts` | Search Analytics API (D8: the only keyword data source). |
| `src/adapters/llm/anthropic-public.ts` | The public Anthropic org. §5 routing; zod-validated structured output; refusals flagged, never defaulted. |
| `src/domain/seo/` | Seed matrix, clustering checks, backlog rules, snapshot matching. Pure. |
| `src/trigger/marketing/geo/` | `geo.probe` (Tuesdays 07:00 ET) and `geo.recommendations` (the 4th, 08:00 ET), §5.6. |
| `src/adapters/geo/` | The answer-engine interface and its one v1 engine: Claude with web search, public org (D9). |
| `src/adapters/site/schema-coverage.ts` | Reads the public site's sitemap and JSON-LD for `geo.recommendations`. |
| `src/domain/geo/` | Prompts from clusters, answer analysis, the schema audit against the brief, recommendation screening. Pure. |
| `src/domain/content-rules/` | The brief's titles, terminology, brand, drug and outcome rules as code. |

## Phase 1: what the SEO tasks write

| Task | Writes | Read by |
|---|---|---|
| `seo.keyword-research` | `marketing.keywords` (seed matrix + 28 days of Search Console queries, clustered by `claude-sonnet-5-5`); `content_backlog` page-gap and FAQ candidates | A human (backlog), the social planner and GEO (later phases) |
| `seo.rank-tracker` | `marketing.keyword_snapshots`, one row per keyword per day | The `marketing.rank_movers` view, which the n8n weekly report reads with `n8n_reader` |

- A keyword with `cluster` null was not clustered (a refusal, a truncated or malformed
  answer, or the model left it out). A person assigns it; nothing is guessed (§5).
- `volume` is null: Search Console has impressions, not search volume (D8).
- Search Console data settles about three days late, so both tasks stop three days back.

## Phase 2: what the GEO tasks write

| Task | Writes | Read by |
|---|---|---|
| `geo.probe` | New `geo_prompts` from the keyword clusters (one question per cluster per state, plus town questions); one `geo_runs` row per prompt per engine per week | `geo.recommendations`; n8n reports (read-only) |
| `geo.recommendations` | `content_backlog`: `schema` fixes and gaps against the brief, `citation` targets (sites cited instead of Newpoint), `faq` entries for questions where Newpoint is missing | A person editing the site repo |

- Prompts are seeded once and then belong to people: set `active = false` to stop probing one.
  Clusters that touch a content rule never become prompts.
- A refused or cut-off answer is not stored (it measured nothing). `competitors_mentioned`
  is NULL when extraction failed, never an empty "none".
- Retention: `ops.geo-retention` (the 1st, 03:00 ET) clears `answer_excerpt` and
  `competitors_mentioned` 90 days after a run and sets `details_purged_at`. Those columns
  hold third-party names; the measurement columns stay for trends. A NULL
  `competitors_mentioned` with `details_purged_at` set means purged, not a failed extraction.
- Cost per weekly run: up to 30 probes, each one Sonnet 5.5 answer with up to 5 web
  searches plus one short extraction call. Web search is billed per search.
- Schema advice is written in source and never recommends an address, `hasCredential`,
  an NPI identifier, `Physician` or `areaServed` on a Person. FAQ suggestions that touch
  a content rule are dropped before they reach the backlog.

The Supabase CLI always reads `<workdir>/supabase/migrations`, which is why the
marketing project lives at `supabase/marketing/supabase/` and not one level up.

## How the pgTAP suite runs locally

There is no Docker or Postgres install needed. `test/db/marketing-db.ts` starts
Postgres 17 from the `embedded-postgres` package, reproduces Supabase's API roles and
their default grants on `public`, loads pgTAP 1.3.4 into `extensions` (downloaded
once from the GitHub release, SHA-256 pinned, cached in `node_modules/.cache`), applies
the migrations, and runs every `supabase/marketing/supabase/tests/*.test.sql`.

The files follow Supabase's pgTAP convention, so they should also run with
`supabase test db --workdir supabase/marketing`. That command needs Docker and has
**not** been run here. The migrations were checked with the real CLI
(`supabase db push`) against a fresh Postgres.

---

## Phase 3: the social engine (§5.7)

```
social.planner ─▶ social.drafter ─▶ social.compliance ─┬─▶ social.approval ─▶ social.publisher
 (Mon 07:00 ET)          ▲                              │    (72 h, n8n email)    (at the slot)
                         └── feedback, at most 3 rounds ┘
```

| Task | Does |
|---|---|
| `social.planner` | Plans the following week: topics × channels from the keyword clusters, confirmed facts and the awareness calendar. |
| `social.drafter` | Body, plus an image from the confirmed media library and its alt text. A draft that does not fit its channel is rejected, never trimmed. |
| `social.compliance` | `postViolations` (the brief as code) first, then `claude-opus-5-5` review for tone and implied claims. Back to the drafter at most three times, then to the owner **with the report**. |
| `social.approval` | Hashes the post, creates a 72 h wait token, sends n8n the draft and the token's one-time URL, waits. |
| `social.publisher` | Re-hashes and re-runs the rules; refuses on any change or rule break. Facebook and Instagram now (D10); GBP posts stay `approved` for Phase 4. Runs once, retries only Meta 429s, so a post can never go out twice. |

- **Media library:** `public.practice_facts` key `social.media_library`, `confirmed = true`, value
  `[{ "url": "https://…", "description": "…" }]`. Images the practice owns, on a public https URL.
  Without it, Instagram is not planned (it cannot post without an image).
- **Statuses:** `planned → drafted → in_compliance → awaiting_approval → approved → published`, or
  `rejected` / `expired` with `status_reason` (a code, never vendor text).
- **Not sent to Meta yet:** alt text (parameter to confirm against the pinned Graph version).

## Phase 4: Google Business Profile (§5.2)

| Task | Does |
|---|---|
| `gbp.sync` (hourly) | Reviews → `marketing.gbp_reviews`; each unanswered review to the drafter. A reply someone posted in the GBP UI stops the pipeline for that review. |
| `gbp.reply-drafter` | Sonnet 5.5 draft (no tools, review fenced as untrusted) → `replyViolations` (§5.2: never implies a patient, names no one, no clinical word, never repeats the review) → confirm-page approval with the raw review beside the draft (72 h) → one reminder (72 h) → posted only if approved. **Never auto-posts.** |
| `gbp.post-publisher` (every 15 min) | Publishes the GBP posts approved through the Phase 3 pipeline at their slot. Hash and rules re-checked; no phone number in a GBP post; claimed before the API call. |
| `gbp.nap-audit` (monthly) | **Blocked until D11.** Runs only with `GBP_NAP_AUDIT_ENABLED=true` AND `legal_name`, `street_address`, `phone` confirmed in `public.practice_facts`. Mismatches → `content_backlog` (`nap`). |
| `ops.heartbeat` (every 15 min) | Phase 3 fix: alerts Koret ops once for any post stuck in `publishing` > 30 min. |

- **Facts the GBP tasks read** (`public.practice_facts`, `confirmed = true`, string values):
  `phone` (the practice line replies may give), and for the NAP audit `legal_name` and
  `street_address`. Unconfirmed facts are never used.
- `marketing.gbp_posts` (§4) is unused: GBP posts go through `social_posts` (channel `gbp`)
  so they share the Phase 3 drafting, compliance and approval.
- GBP performance metrics (§5.2 inputs) are not fetched: §4 has no table for them.

## Phase 5: PHI foundations (§4, §5.0, §5.8, §6) — built, NOT deployable yet

Everything here is PHI zone: Supabase project `newpoint-phi`, Trigger.dev project
`newpoint-phi` (`trigger.phi.config.ts`, `src/trigger/phi`), the staff console
(`src/console`). **Nothing may be deployed or pointed at real data until the BAAs in §2
are signed** (Supabase, Trigger.dev HIPAA add-on, Twilio, Anthropic HIPAA org). Tested
against the embedded Postgres and fakes only.

| Piece | Does |
|---|---|
| `supabase/phi` migration | `phi` + `ops` schemas, 15 tables, `consent_state` view, append-only consents and audit log, audit trigger on every PHI table, 12-month review cap, roles `phi_tasks` / `phi_edge` / `staff_console` (never `service_role`), RLS everywhere keyed on the console's verified `staff_role` claim. pgTAP: `supabase/phi/supabase/tests`. |
| `messaging.send-sms` | The §5.0 contract. Checks in order: idempotency, contact and phone, **D18 adult only**, active `sms_transactional` consent, verified phone, crisis pause for sequences, quiet hours 08:00–21:00 ET (deferred, not dropped), global budget (breaker pages Koret ops once a day) and per-number limit. Claims the row before Twilio, releases it if Twilio refuses: at most once. |
| `ops.crisis-page` | Pages the on-call clinician by SMS **and** voice call every 10 min until acknowledged; adds the second provider from 30 min. Fixed text and the console link, no patient detail. n8n is not in this path. |
| `ops.crisis-dead-man` (every minute) | Any unacknowledged event not paged within 2 min, or whose last page is over 12 min old, is paged from the cron, and Koret ops is paged once for it. |
| `ops.retention-sweep` (03:00 ET) | Clears message bodies past `purge_after`. **D16 open: nothing sets `purge_after`, so nothing is purged yet.** |
| Staff console (`src/console`) | **D7 open: host-agnostic, not deployed.** A fetch-style handler: SSO JWT via JWKS with MFA (`aal2`) and `staff_role`, 15-min idle timeout, queries as `staff_console` with the user's claims (RLS decides), every record shown audited, escaped HTML, strict CSP, same-origin POSTs. Callback/ticket queue, crisis acknowledge and resume (clinician only), review-window exclusion (clinician only), age status (D18). |
| `n8n/workflows/action-required.json` | The PHI zone's only n8n message: `{ kind: "action_required", at }` → an email with the console link. |

- **Placeholders that block production.** `domain/crisis/response.ts` (D15) and
  `domain/consent/wording.ts` (D20) are `approved: false`. The PHI project's
  `onStartAttempt` refuses PRODUCTION while either is unapproved.
- **D18 in force.** `minor_status` defaults to `unknown` and only staff (console) or a
  future scheduling adapter set it, so until someone marks a contact `adult` no automated
  text goes to them, the crisis auto-response included. The clinician page still fires.
- **Zone rules both ways.** ESLint and `test/zone-graph.ts` stop PHI code from reaching
  public adapters (`anthropic-public`, `google`, `geo`, `social`, `site`, `n8n/emit`,
  `db-marketing`, `trigger/marketing`), as well as the reverse. PHI env names all carry
  `PHI`/`TWILIO_`, so the marketing loader refuses them.
- **Queue hygiene.** `src/trigger/phi/payloads.ts` holds every PHI payload schema (ids
  and enums only); `test/phi/queue-hygiene.test.ts` enforces it.
- **At most once, for real.** Twilio is called with no in-call retry and a 10 s timeout.
  Only a 4xx releases a message claim; a timeout or 5xx keeps it (the text may have gone),
  so a retry never sends a second copy. Pages go from the voice number, not the patient
  Messaging Service, so a clinician's STOP can't block them; if the primary on-call can't
  be reached at all, the secondary is paged in the same round.
- **Acknowledging is final and attributed.** A trigger forces `staff_ack_by` /
  `resumed_by` to the signed-in user and refuses un-acknowledging. Task credentials can't
  acknowledge or resume at all (column grants). Acknowledging opens a `crisis_follow_up`
  callback; clinicians see the patient's name and number, admins don't.


## Phase 6: SMS concierge, lead follow-up, web intake (§5.1, §5.5) — built, NOT deployable yet

| Piece | Does |
|---|---|
| `edge/twilio-inbound` | Signature checked against the exact public URL first; duplicate `MessageSid` dropped (and re-enqueued with the same key, so a lost enqueue still runs once); unknown numbers become unknown-age contacts; empty TwiML reply. |
| `edge/intake` | The site form posts here directly. Exact Origin, strict schema (name, email, optional US phone, the site's four reasons, nothing else), Turnstile, rate limits per IP (5/h) and per phone (3/day) keyed by HMAC. Consent recorded only when ticked, against the server's wording version, stored verbatim. 6-digit code, 10 min, 5 tries. |
| `messaging.inbound-sms` | Crisis (keyword) → event, page, fixed reply awaited before any opt-out in the same message is recorded → STOP/HELP → Haiku 4.5 (HIPAA org, enum only) → a staff ticket and a neutral template. The model is a second crisis detector; a model failure is a ticket, never a default category. |
| `referrals.lead-follow-up` | Every web inquiry opens a callback ticket. Web **new-patient** inquiries get SMS at +5 min, +24 h, +72 h; each step re-checks open / adult / consent / verified / no crisis. Referral-sourced, existing-patient, billing and other inquiries are never enrolled. |
| Site form | `components/ui/intake-form.tsx`, rendered by `ContactCrisis` only when `NEXT_PUBLIC_INTAKE_URL` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` are both set at build. **Unset (the default) the site is unchanged:** same markup, and the intake code is not in the bundle (build-time dead branch via `next.config.ts` `env`). |

- **D5 open:** the edge handlers are host-agnostic fetch handlers (`edge/README.md`); nothing
  is mounted until Supabase confirms Edge Functions are in its BAA, or a BAA host is chosen.
- **D18:** an unknown age gets no automated text; age is now asked at first contact (see
  "Age at first contact" below). Every inquiry and every inbound message still becomes a
  staff ticket.
- `test/phi/consent-drift.test.ts` fails if `SMS_CONSENT` in `lib/content.ts` drifts from
  `CONSENT_WORDING`, or the site's reasons from the handler's.
- **Consent is pending until the code is confirmed.** The ticked box rides on the code's row
  and becomes a `phi.consents` grant only in `/intake/verify`, so typing someone else's
  number can neither grant consent nor undo their STOP; no code goes to a number whose
  latest consent event is a STOP. Lead follow-up needs *this inquiry's* code confirmed.
- **`ops.reconcile`** (every 5 min) re-queues what a lost hand-off left behind: unhandled
  inbound texts, ticketless web inquiries, unsent live codes. Twilio does not retry inbound
  webhooks, so this is the safety net, not an optimisation.
- **The edge role reads ids only** (column grants): never names, bodies, consents or codes.
  Codes are checked against an HMAC keyed outside the database.
- **Go-live chore:** `ops.intake_rate` only grows (no runtime role deletes). Schedule a
  maintenance job outside the runtime roles (e.g. Supabase `pg_cron` as the owner) to delete
  windows older than a day.

## Phase 7: booking (§5.1) — built, NOT deployable yet

D1 conservative default: **`manual-queue` and `headway-handoff` only** (`SchedulingAdapter`
in `src/adapters/scheduling`). No EHR adapter until D1 picks a system with an API and a BAA.

| Piece | Does |
|---|---|
| `domain/scheduling/slot-policy.ts` | D18 minor/unknown age → callback; D19 weight management → callback; state unknown or outside NJ/PA → callback; only providers licensed there with the modality there (in-person confirmed in NJ only, so in-person PA → callback); new patients start with the assessment. |
| `booking.request` | From an SMS "book" intent now (voice in Phase 8). Everything is a staff booking ticket unless headway-handoff is enabled AND the patient is established, asked for a concrete modality, and exactly one provider is eligible with a recorded page (Whitaker's is; Ofoegbu's is not in the repo). Decided once; a retry re-queues the same idempotent text. |
| Console | Staff record the appointment they booked in the real system (provider, ET date and time, modality), mark completed / no-show / cancelled (final), and can send one post-visit logistics text. |
| `booking.reminders` (*/15) | 48 h and 2 h before; a 2 h reminder quiet hours would push within 30 min of the visit is dropped. Reminders keep running during a crisis pause (§5.8). |
| `booking.sync` (*/15) | Confirmation text for each staff-recorded appointment; a no-show opens a follow-up; due follow-ups are queued. Neither v1 adapter has an appointment feed. |
| `referrals.no-show` / `referrals.post-visit-logistics` | Only a patient positively known to be new (booking request marked new) gets one rebooking text; anyone else → clinician review ticket. A refused text → staff callback ticket. One logistics text on request. |

- Texts name providers as "Funmilayo Whitaker, DNP": the site allows "Dr." only beside the
  full credentials, which an SMS slot cannot carry.
- **D18 makes automated booking inert today**: every contact starts `unknown`, so every
  request is a staff callback until staff set the age status.
- A patient who books through Headway is billed by Headway, not Newpoint (D1 note).
- **`headway-handoff` is built but OFF by default** (`PHI_SCHEDULING_ADAPTERS=manual-queue`):
  its care.headway.co link would show a mental-health platform and the provider's name in a
  lock-screen preview. Turn it on only after the owners decide how a link may be sent.

## Phase 8: voice receptionist (§5.1, §5.8) — built, NOT deployable yet

| Piece | Does |
|---|---|
| `adapters/voice/vapi.ts` | The assistant as typed config: `hipaaEnabled`, no recording, summary off, first sentence says it is an automated assistant and the call is not recorded (D13). Tools: `check_availability`, `request_booking`, `take_message`, `crisis_transfer`, plus a `transferCall` to the D15 destination. English only (D21). Not deployed from here. |
| `edge/vapi-tools` | Shared secret (constant time) → call id verified with Vapi and our assistant before any write → enum-only arguments (free text refused). Writes requests only: a booking request (one per call → `booking.request`), a callback message, a voice crisis event (one per call → clinician page). `crisis_transfer` always answers with 988/911 and the transfer, even if the database is down. |
| `edge/vapi-events` | End-of-call report: keeps the structured outcome (an enum and a flag) only; no transcript, summary or recording. Unreadable → "call them back". |
| `booking.process-call-report` | Queues the call's booking request, opens callbacks for messages and for anything not handled, re-queues an unacknowledged crisis page, closes the call. `ops.reconcile` sweeps calls left open 30 min. |

- **D4 open:** model, transcriber and voice providers are config, to be confirmed in writing
  with Vapi as inside its BAA. Whether live transcripts are available under `hipaaEnabled`
  is unknown, so the voice model is the only crisis detector on a call: an accepted risk to
  record under D15.
- **D15 open:** `PHI_VAPI_CRISIS_TRANSFER_NUMBER` is the clinicians' choice; nothing defaults it.
  Everything the caller hears says "988", so it must be a 10-digit line that reaches 988.
- **Crisis on a call, every path pages a clinician:** the prompt makes `crisis_transfer` (the
  page) run first, every time, transfer or not, and allows "transferring you" only with
  `transferCall`; a withheld number still raises a (contactless) event; a Vapi outage still
  answers with 988 / 911; and if Vapi's analysis says "crisis" but no event was raised, the
  call report raises it.
- Vapi field names follow its API as of this writing; contract tests against the Vapi
  sandbox are a go-live step (§7).

## Phase 9: reviews and metrics (§5.4, §5.9) — built, NOT deployable yet

| Piece | Does |
|---|---|
| `domain/eligibility/review-eligibility.ts` | Every rule must hold: completed visit, adult (D18), no exclusion, no crisis in 90 days, none sent in 12 months, active `review_requests` AND `sms_transactional` consent. Nothing about how the visit went is an input: no gating. |
| `reviews.request-review` | Queued by `booking.sync` per completed appointment, again whenever review consent or age status changes. Eligible → a `pending_clinician_window` row shown in the console for 24 h (clinicians can exclude) → the request is CLAIMED (per-patient lock, eligibility re-checked, marked sent) → one text, 10:00–19:00 ET (enforced in send-sms too), the practice's Google review link its only URL. Two visits for one patient can never both text. Budget or rate holds wait for the next window; refusals are recorded with a reason. No reminder, no click tracking (D14). |
| Console | Staff record the patient's own yes (in person or by phone) or a withdrawal, as themselves, never backdated (the only capture point; wording a placeholder under D14/D20). A STOP by text also revokes review consent. |
| `reviews.metrics`, `ops.aggregate-metrics` (02:00 ET) | Counts for the day a week ago (late outcomes are in by then; the push is insert-only): inquiries, completed bookings, review requests sent, follow-up conversions, suppressed below 5; and the agent-health enum as dates (event-driven tasks by week), through the insert-only `metrics_writer` (the login must be a `metrics_writer` role). No crisis count, no `ops.crisis-*` row (the marketing database now refuses them too). |

- **Blocked until set:** `PHI_GOOGLE_REVIEW_URL` (needs the verified GBP, D11) and the
  `PHI_METRICS_WRITER_*` login. Without the link no review text goes out.
- **No "treating clinician" mapping exists** (providers are not linked to staff logins), so
  the review window shows to every clinician.
- The marketing `ops.heartbeat` stale-agent digest that reads `metrics.agent_health` is not
  built here (§5.9 marketing side); the rows are now pushed for it.

## Phase 10: referral intake (§5.5) — built, NOT deployable yet

D17: the clinician web form is the only path (fax waits for a BAA-covered e-fax vendor).
D12: `referrals.referrer-update` is built but OFF.

| Piece | Does |
|---|---|
| `edge/intake/referral.ts` (`POST /intake/referral`) | Exact Origin, a declared size and a per-IP attempt limit BEFORE the body is read, Turnstile, rate limits (per IP, global daily), referrer fields only, a PDF (must start with `%PDF-`) of at most 10 MB stored in the private bucket under a server-chosen UUID. No patient fields on the form. |
| `referrals.intake` | The PDF goes only to the Anthropic HIPAA org (Opus 5.5, effort high, no tools), as untrusted data, into a fixed schema. EVERY referral opens a clinician review ticket: the model's urgency is shown as model-stated and unverified, never trusted to route a referral away from a clinician. Never creates a contact or sends anything. A referral whose intake keeps failing opens a clinician review after 30 minutes (`ops.reconcile`). |
| Console | Referral queue: extracted values shown escaped and pre-filled for staff to check against the document (an audited download, never rendered inline). Confirm creates the contact with NO consent and opens a staff callback (a clinician review for an urgent one); reject. Either closes the review ticket. Urgent, high-risk or unread referrals are clinician-only (admins cannot decide them or see the patient's name). A number already on file is never linked silently: staff resolve it by hand. |
| `referrals.referrer-update` | Would send only "received and the patient has been scheduled", once per referral. OFF (`PHI_REFERRER_UPDATE_ENABLED=false`) and no channel to referrers is wired, so it sends nothing until counsel (D12) and a BAA-covered channel are decided. |
| Retention | `ops.retention-sweep` removes documents past `purge_after` (D16 open: nothing sets it yet). |

- **Not built:** the clinician-facing form page itself (where it is hosted is an owner
  decision, like D7); the edge route is ready for it.
- **Go-live setup:** a PRIVATE Supabase Storage bucket on newpoint-phi and storage-scoped JWTs
  (never service_role): a PUT-only one for the internet-facing edge, and one with get/delete for
  tasks and the console, each limited to that bucket by `storage.objects` policies.

## Age at first contact (D18 follow-up)

"Are you 18 or older?" is asked at first contact: yes → `adult`, no → `minor` (staff
callback only, as before), no answer → stays `unknown` (staff callback). The wording is
neutral: no reason given, nothing clinical.

| Where | How |
|---|---|
| Web form | An optional Yes/No question (nothing pre-selected). A typed-in number proves nothing: a "yes" with a phone applies only once the texted code is confirmed; a "no" applies to a contact this submission creates (no code, no texts, a staff callback) and, for a number already on file, is kept on the inquiry for staff rather than applied. Email-only contacts take the answer at once (they can never be texted). |
| First SMS exchange | An unknown-age texter is asked once per conversation (`age_check`), in reply to their own text: only to a message from the last 30 minutes, never after a STOP, never to a known minor, at most 30 an hour. A clear YES or NO that directly answers it (the last text we sent, within 24 h) sets the age; a NO opens a staff callback; anything unclear leaves it unknown. Crisis, STOP and HELP still come first. |
| Start of a call | The greeting says it is automated and not recorded, then asks. The `confirm_age` tool records yes or no (no answer records nothing); the caller's number comes from Vapi, never the model. An under-18 caller always gets a staff call back, however the call ends. |

- **Database rules** (`minor_status_guard`): a self-reported "yes" only fills an UNKNOWN age; a
  "no" may replace an earlier self-report; nothing automated ever overrides a staff decision;
  `minor_status_source` (`web_form`, `sms`, `voice`, `staff`) and `minor_status_at` record where
  and when, and cannot be rewritten on their own. The guards recognise the runtimes' LOGIN
  roles as members of `phi_tasks` / `phi_edge` (`phi.acts_as`); this also fixes the Phase 6
  phone-verification guard, which compared `current_user` to the group role's name.
- **Self-reported.** Nobody checks an ID; caller ID can be spoofed. This is the conservative
  reading of D18 until counsel and the practice decide.
- **D20 note:** the age question is the one text that can go to someone who has not given SMS
  consent, as a single reply to a message they just sent. Counsel should confirm this.

## Setup you must do (Phases 0 and 1)

### 1. Supabase — project `newpoint-marketing`

This is a **standard** project, not the HIPAA one. It must never hold patient data.

1. Create the project `newpoint-marketing` in the Koret/Newpoint org. Pick the US East
   region, which is closest to NJ/PA. Turn on **"Require MFA"** for the org.
2. Database → Settings: turn on **SSL enforcement**.
3. Nothing uses the Data API (PostgREST), so do not hand out the `anon` key. The
   migrations revoke every table from `anon`, `authenticated` and `service_role`, and
   pgTAP checks it. Turning the Data API off as well is recommended.
4. Apply the migrations from a trusted machine using the **admin** connection string,
   from Connect → Session pooler, as the `postgres` user:
   ```bash
   read -rs MARKETING_ADMIN_DB_URL && export MARKETING_ADMIN_DB_URL   # paste; not echoed, not in history
   # postgresql://postgres.<project-ref>:<db-password>@<pooler-host>:5432/postgres
   npm run db:push:marketing
   unset MARKETING_ADMIN_DB_URL
   ```
   This admin URL is never stored in any runtime, in Trigger.dev or in n8n.
5. Create the login users in the SQL editor. Generate each password; do not reuse one.
   ```sql
   create role trigger_marketing login password '<generated>' in role marketing_rw;
   create role n8n_reader        login password '<generated>' in role n8n_ro;
   -- Phase 5 only, for ops.aggregate-metrics in the PHI project:
   -- create role metrics_pusher login password '<generated>' in role metrics_writer;
   ```
6. Build each runtime URL with the session pooler, using the custom-role username form
   `<role>.<project-ref>`, and test-connect once:
   - `MARKETING_DATABASE_URL` = `postgresql://trigger_marketing.<project-ref>:<pw>@<pooler-host>:5432/postgres`
     (no `sslmode` parameter: TLS is configured in code and verified against the CA below)
   - n8n Postgres credential = the same shape, with `n8n_reader`.
7. Database settings → SSL configuration → **Download certificate**. Its PEM text is
   `MARKETING_DATABASE_CA_CERT`. The project ID (20 lowercase letters, Project settings)
   is `SUPABASE_MARKETING_PROJECT_REF`; the runtime refuses a database URL for any other
   project.

### 2. Trigger.dev — project `newpoint-marketing`

1. Create the project `newpoint-marketing`. **Do not** enable the HIPAA add-on here; that
   is for `newpoint-phi` in Phase 5.
2. Copy its project ref (`proj_…`) into `TRIGGER_PROJECT_REF_MARKETING`. For local use,
   put it in `automation/.env.marketing`, copied from `.env.marketing.example`. For CI,
   set it as a CI secret.
3. Run `npx trigger.dev login` locally. CI deploys need a personal access token in
   `TRIGGER_ACCESS_TOKEN`.
4. In the dashboard, under Environment Variables (Dev **and** Prod), set:
   `MARKETING_DATABASE_URL`, `MARKETING_DATABASE_CA_CERT`, `SUPABASE_MARKETING_PROJECT_REF`,
   `ANTHROPIC_API_KEY_PUBLIC`, `GSC_SITE_URL`, `GSC_SERVICE_ACCOUNT_JSON`.
   Never add a variable matching `*_PHI*`, `*_HIPAA*`, `TWILIO_*`, `VAPI_*`,
   `SUPABASE_SERVICE_ROLE*`, `SUPABASE_SERVICE_KEY*`, `SUPABASE_SECRET*` or an unqualified
   `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN`. The runtime refuses to start if one is
   present.
5. npm 11 blocks install scripts that are not on the allowlist. `esbuild` and
   `@depot/cli` (both from the `trigger.dev` CLI) are still pending. If `trigger
   deploy` fails on bundling, review them and run `npm approve-scripts esbuild`.
   Approve `@depot/cli` only if you deploy with `--depot-build`.

### 3. Google Search Console

1. Verify the **Domain property** `newpointnp.com` with a DNS TXT record. This needs
   access to the domain's DNS. A URL-prefix property (`https://newpointnp.com/`)
   also works if DNS access is not available.
2. In Google Cloud, create or choose a project (for example `newpoint-marketing`),
   enable the **Google Search Console API**, and create a service account `gsc-reader`
   with **no** IAM roles.
3. Create a JSON key for it. If an org policy blocks key creation
   (`iam.disableServiceAccountKeyCreation`), an admin has to allow it for this project.
4. In Search Console → Settings → Users and permissions, add the service account's
   email with **Restricted** permission (read-only).
5. Set the following, in the Trigger.dev dashboard only:
   - `GSC_SITE_URL` = `sc-domain:newpointnp.com` (or `https://newpointnp.com/`);
   - `GSC_SERVICE_ACCOUNT_JSON` = the whole key file on one line.

   Delete the downloaded key file afterwards.

### 4. Anthropic — the standard (public) org

1. Use the **standard** Anthropic org, not the HIPAA org that Phase 5 needs (§2).
2. Create an API key scoped to a workspace for Newpoint marketing, and set it as
   `ANTHROPIC_API_KEY_PUBLIC` in the Trigger.dev dashboard. Set a monthly spend limit on
   that workspace: one keyword-research run is a single Sonnet 5.5 call of at most
   16,000 output tokens.
3. The request uses the `server-side-fallback-2026-07-01` beta (`fallbacks: "default"`):
   a policy decline is re-run on Anthropic's recommended model for that category.

### 5. Meta (Phase 3; full checklist in the deploy notes)

Set, in the Trigger.dev dashboard only: `META_GRAPH_VERSION`, `META_PAGE_ID`,
`META_PAGE_ACCESS_TOKEN`, and `META_IG_USER_ID` once Instagram is linked. Never in n8n.
Then `N8N_SOCIAL_APPROVAL_WEBHOOK_URL` and `N8N_SOCIAL_APPROVAL_WEBHOOK_SECRET` from
[`n8n/README.md` §9](n8n/README.md).

### 6. Google Business Profile (Phase 4; access steps in the deploy notes)

Set, in the Trigger.dev dashboard only: `GBP_OAUTH_CLIENT_ID`, `GBP_OAUTH_CLIENT_SECRET`,
`GBP_OAUTH_REFRESH_TOKEN`, `GBP_ACCOUNT_ID`, `GBP_LOCATION_ID`. Leave
`GBP_NAP_AUDIT_ENABLED` unset until D11 is confirmed. Then the two webhooks from
[`n8n/README.md` §10 and §11](n8n/README.md).

### PHI zone (Phase 5) — only after every §2 BAA is signed

1. Supabase project `newpoint-phi` on a HIPAA-eligible plan with the BAA signed. Apply
   `supabase/phi` with `npm run db:push:phi` (`PHI_ADMIN_DB_URL`). Create login users that
   are members of `phi_tasks` and `staff_console`; never give a runtime `service_role`.
2. Trigger.dev project `newpoint-phi` with the HIPAA add-on and BAA (D3). Env vars
   (`src/lib/env-phi.ts`): `PHI_DATABASE_URL`, `PHI_DATABASE_CA_CERT`,
   `SUPABASE_PHI_PROJECT_REF`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
   `TWILIO_MESSAGING_SERVICE_SID`, `TWILIO_VOICE_FROM`, `ANTHROPIC_API_KEY_PHI`,
   `PHI_ON_CALL_PRIMARY_PHONE`, `PHI_ON_CALL_SECONDARY_PHONE`, `PHI_OPS_PAGE_PHONE`,
   `PHI_STAFF_CONSOLE_URL`, `PHI_N8N_ACTION_WEBHOOK_URL`, `PHI_N8N_ACTION_WEBHOOK_SECRET`,
   optional `SMS_DAILY_BUDGET` (300), `SMS_PER_NUMBER_DAILY` (4). Project ref in
   `TRIGGER_PROJECT_REF_PHI`.
3. Twilio on the BAA-eligible edition; Geo Permissions US only; A2P 10DLC (Phase 6).
4. Staff console host (D7) with a BAA; env in `src/console/env.ts`.
5. Approve and commit the crisis script (D15) and consent wording (D20) with
   `approved: true`, approver and date. Production will not start before that.

### 7. n8n

Work through [`n8n/README.md`](n8n/README.md) before activating any workflow.
