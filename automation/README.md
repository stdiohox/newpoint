# Newpoint automation layer

Design: [`docs/automation-architecture.md`](../docs/automation-architecture.md).
This package is **Phase 0, public zone only** (§7). There is no PHI code here, and
`trigger.phi.config.ts` is an empty stub until Phase 5.

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

## Setup you must do (Phase 0)

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
   - n8n Postgres credential = the same shape, with `n8n_reader`.

### 2. Trigger.dev — project `newpoint-marketing`

1. Create the project `newpoint-marketing`. **Do not** enable the HIPAA add-on here; that
   is for `newpoint-phi` in Phase 5.
2. Copy its project ref (`proj_…`) into `TRIGGER_PROJECT_REF_MARKETING`. For local use,
   put it in `automation/.env.marketing`, copied from `.env.marketing.example`. For CI,
   set it as a CI secret.
3. Run `npx trigger.dev login` locally. CI deploys need a personal access token in
   `TRIGGER_ACCESS_TOKEN`.
4. In the dashboard, under Environment Variables (Dev **and** Prod), set:
   `MARKETING_DATABASE_URL`, `GSC_SITE_URL`, `GSC_SERVICE_ACCOUNT_JSON`.
   Never add a variable matching `*_PHI*`, `TWILIO_*`, `VAPI_*`,
   `SUPABASE_SERVICE_ROLE*` or an unqualified `ANTHROPIC_API_KEY`. The runtime refuses
   to start if one is present.
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

### 4. n8n

Work through [`n8n/README.md`](n8n/README.md) before activating any workflow.
