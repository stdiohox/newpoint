# Lead CRM

Staff-only CRM for enquiries from the website's contact form. Built 2026-11-09 by
owner decision: leads are stored in the `newpoint-marketing` Supabase project, in a
schema of their own (`crm`), and staff are alerted by email on each new lead. No SMS.

## What it holds

The contact form's fields and nothing more (CLAUDE.md "Compliance"): name, email,
optional phone and one of the four fixed reasons (`CONTACT.reasons`). Staff add a
status, an owner and short contact notes.

Pipeline: **New → Contacted → Scheduled → Became a patient / Not a fit**. Every status
and owner change is recorded by a database trigger against the signed-in user; notes
are attributed the same way and cannot be edited or forged.

## How it fits together

```
contact form (OnboardingForm)
   │  POST /api/leads  (same origin, JSON, honeypot, 4 KB max)
   ▼
app/api/leads/route.ts ── pg, login crm_intake_site (member of crm_intake)
   │  select crm.submit_lead(name, email, phone, reason, hmac(ip))
   │    rate limits: 5/IP/hour, 3/email/day, 300/day; can store, cannot read
   │  after(): POST Trigger.dev crm.new-lead-alert (optional, best effort)
   ▼
Supabase newpoint-marketing, schema crm
   ▲                                    ▲
   │ Data API as the signed-in user     │ trigger_marketing login (member of crm_alerts)
   │ RLS: crm.is_staff()                │ claim → email → mark sent; every 10 min a sweep
/crm (Next.js, same site)          Trigger.dev crm.new-lead-alert(+ -sweep)
   staff sign in with email+password       Resend → active staff with alerts on
```

- **Database:** `automation/supabase/marketing/supabase/migrations/20261109000001_crm.sql`,
  tested by `tests/010_crm.test.sql` (39 checks: privileges per role, RLS, rate limits,
  history, alerts). `anon`, `service_role` and the marketing roles get nothing in `crm`.
- **Site:** `app/api/leads`, `app/crm/*`, `components/crm/*`, `lib/crm/*`, and
  `middleware.ts` (refreshes the CRM session, sets `noindex`, and keeps `/crm` out of
  holding mode so staff can use it on the production domain).
- **Alerts:** `automation/src/trigger/marketing/crm/`. The email carries the reason, the
  time and a link, never the person's name, email or phone. At least once: a failed send
  is retried after 10 minutes, up to 5 attempts.

## Environment

| Where | Variable | Value |
|---|---|---|
| Vercel (site) | `CRM_SUPABASE_URL` | `https://utxaczptucbqrnnzmziz.supabase.co` |
| | `CRM_SUPABASE_PUBLISHABLE_KEY` | project publishable key |
| | `CRM_INTAKE_DATABASE_URL` | transaction pooler (6543) URL for `crm_intake_site` |
| | `CRM_DATABASE_CA_CERT` | Supabase root CA, `prod-ca-2021.crt` |
| | `CRM_INTAKE_HMAC_SECRET` | 64 random hex characters |
| | `TRIGGER_SECRET_KEY` | optional: newpoint-marketing **prod** secret key (`tr_prod_…`); without it alerts wait for the 10-minute sweep |
| Trigger.dev prod | `RESEND_API_KEY` | Resend key, sending access only |
| | `CRM_ALERT_FROM` | e.g. `Newpoint CRM <crm@newpointnp.com>` (domain verified in Resend) |
| | `CRM_BASE_URL` | optional, default `https://www.newpointnp.com/crm` |

The alert tasks also use `MARKETING_DATABASE_URL`, `MARKETING_DATABASE_CA_CERT` and
`SUPABASE_MARKETING_PROJECT_REF`, already set. They load `loadCrmEnv()`, not the full
marketing env, so they do not need the Anthropic or Search Console keys.

## One-time Supabase settings (dashboard)

1. **Settings → Data API → Exposed schemas:** add `crm`. Without it `/crm` sees nothing
   (PostgREST answers `PGRST106`).
2. **Authentication → Sign In / Providers:** turn **off** "Allow new users to sign up".
   Staff accounts are created by Koret. RLS already shows a non-staff account nothing,
   but nobody should be able to make one.

## Staff accounts

Created by Koret with the Auth admin API and a matching `crm.staff` row, with a
temporary password. `must_change_password` sends them to `/crm/account` on first
sign-in. To remove someone: `update crm.staff set active = false where email = '…'`
(their history keeps their name). To stop their alerts: `set alerts = false`.

## Go-live checklist

- [x] Migration applied (2026-11-09), logins `crm_intake_site` and `trigger_marketing`
      (now also in `crm_alerts`) in place and tested through the pooler.
- [x] Provider accounts created.
- [ ] The two dashboard settings above.
- [ ] Front-desk account (email needed).
- [ ] Resend: verify `newpointnp.com` (DNS at IONOS), create a key, set the two
      Trigger.dev variables, remove `**/crm/**` from `NOT_YET_LIVE` and deploy.
- [ ] The Vercel project that serves newpointnp.com gets the site variables above.
