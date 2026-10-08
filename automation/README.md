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

### 7. n8n

Work through [`n8n/README.md`](n8n/README.md) before activating any workflow.
