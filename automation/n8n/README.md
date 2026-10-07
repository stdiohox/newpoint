# n8n on Hostinger — hardening checklist

n8n is in the **public zone** (docs/automation-architecture.md §0.1, §2). Hostinger
will not sign a BAA, so this box must never hold PHI or any credential that can
reach the PHI zone. The checklist makes that true and keeps it true. Tick every
box before the first workflow is activated, then re-run the **monthly** section.

Env-var names are n8n's; confirm each against the docs for the n8n version you
pin, because n8n renames settings between majors.

## 1. Host (VPS)

- [ ] Ubuntu LTS, `unattended-upgrades` on for security updates.
- [ ] SSH: key-only (`PasswordAuthentication no`), `PermitRootLogin no`, a named sudo user.
- [ ] Firewall (`ufw`): allow 443 and 80 (ACME only), and 22 from known IPs only. Deny everything else.
- [ ] `fail2ban` on sshd.
- [ ] n8n listens on `127.0.0.1:5678` only; the reverse proxy is the only public listener.
      Verify: `ss -tlnp` shows nothing on `0.0.0.0:5678`.
- [ ] Hostinger panel account has 2FA.
- [ ] Record the VPS's public IPv4. It is **not** added to the `newpoint-phi` Supabase
      network allowlist, ever (§2). It is added to `newpoint-marketing` only if that
      project's network restrictions are switched on.

## 2. Reverse proxy and TLS

- [ ] Caddy or Traefik in front, automatic Let's Encrypt certificate.
- [ ] HSTS (`max-age=31536000`), HTTP → HTTPS redirect.
- [ ] `N8N_PROTOCOL=https`, `N8N_HOST=<n8n domain>`, `WEBHOOK_URL=https://<n8n domain>/`.
- [ ] `N8N_SECURE_COOKIE=true`.
- [ ] Editor UI path optionally restricted to known IPs at the proxy; `/webhook/*` stays public.
- [ ] `/rest/*` is reachable only through the editor (same IP restriction), and
      `/healthz` and `/metrics` return no version or build details to the internet.

## 3. n8n configuration

- [ ] Version **pinned** (Docker tag, not `latest`). Upgrades are deliberate, after reading release notes.
- [ ] `N8N_ENCRYPTION_KEY` set explicitly and stored in the password manager — losing it
      loses every stored credential; leaking it exposes them.
- [ ] Database: Postgres on the VPS (`DB_TYPE=postgresdb`), not SQLite, and **not** either
      Newpoint Supabase project.
- [ ] Owner account with a strong unique password and **2FA enabled**. One named account
      per person; no shared logins.
- [ ] `N8N_PUBLIC_API_DISABLED=true` (nothing calls the n8n API).
- [ ] `N8N_DIAGNOSTICS_ENABLED=false`, `N8N_TEMPLATES_ENABLED=false`.
- [ ] `N8N_BLOCK_ENV_ACCESS_IN_NODE=true` — workflows cannot read the host environment.
- [ ] `N8N_RESTRICT_FILE_ACCESS_TO=` an empty scratch directory, so no node can read the
      n8n config, the `.n8n` folder or anything else on the host.
- [ ] `N8N_COMMUNITY_PACKAGES_ENABLED=false` — no third-party nodes are installed or installable.
- [ ] User management stays on (one account per person, §3 above); never run with the
      editor open to anyone who reaches the URL.
- [ ] `NODES_EXCLUDE` removes nodes that touch the host or run arbitrary code:
      `["n8n-nodes-base.executeCommand","n8n-nodes-base.ssh","n8n-nodes-base.readWriteFile","n8n-nodes-base.localFileTrigger","n8n-nodes-base.code"]`.
      Excluding the Code node enforces §0.3 — business logic lives in TypeScript on
      Trigger.dev, not in n8n.
- [ ] Execution data kept short: `EXECUTIONS_DATA_PRUNE=true`, `EXECUTIONS_DATA_MAX_AGE=168`
      (hours), `EXECUTIONS_DATA_SAVE_ON_SUCCESS=none`.
- [ ] `GENERIC_TIMEZONE=America/New_York`.

## 4. Credentials — the allowlist

n8n may hold **only** these. Anything else is a finding.

| Credential | Purpose | Scope |
|---|---|---|
| SMTP or Slack bot | Approval and alert notifications to the owners | Send only, to known recipients/channels |
| Postgres `n8n_reader` | Read `newpoint-marketing` for reports | Member of `n8n_ro`: SELECT only (pgTAP-tested) |
| Webhook header secrets | Authenticate inbound webhooks | One random secret per webhook |

n8n must **never** hold:
- any credential for `newpoint-phi` (Supabase, Trigger.dev), Twilio, Vapi, or the HIPAA Anthropic org;
- a Trigger.dev secret key for **either** project — approvals complete through the
  one-time waitpoint URL, which needs no key (§1);
- Google Business Profile, Search Console, Meta or LinkedIn tokens — publishing
  happens in the Trigger.dev marketing project, so a compromised VPS cannot post as Newpoint.

## 5. Workflows

- [ ] Every workflow has the **error workflow** set (Settings → Error workflow) to the
      shared "Koret ops alert" workflow.
- [ ] Every Webhook node uses **Header Auth** with its own random secret; no unauthenticated webhooks.
- [ ] Inbound payloads from the PHI project are only `{ kind: "action_required", at }`
      (§1). A workflow that expects more is wrong by design.
- [ ] No Code nodes (enforced by `NODES_EXCLUDE`), no workflow over ~15 nodes — complexity
      means logic that belongs in a Trigger.dev task.
- [ ] Workflows exported to `automation/n8n/workflows/*.json` and committed. Exports
      contain credential *references* only; check before committing.

## 6. Backups and monitoring

- [ ] Daily encrypted backup of the n8n Postgres database, stored off the VPS.
- [ ] `N8N_ENCRYPTION_KEY` backed up separately from the database backup.
- [ ] A restore tested once, before go-live.
- [ ] External uptime check on `https://<n8n domain>/healthz`, alerting Koret ops.

## 7. Revocation runbook (§6 layer 7)

Run on suspected compromise of the VPS or n8n, and when anyone with editor access leaves.

1. In Supabase `newpoint-marketing`, reset the password of the `n8n_reader` login
   (`alter role n8n_reader password '<new>'`). It can only read, but cut it first.
2. Rotate every webhook header secret, in n8n and in each caller (the Trigger.dev
   marketing project's env vars).
3. Rotate the SMTP or Slack bot token at the provider.
4. Rotate `N8N_ENCRYPTION_KEY` only by re-entering every credential; a leaked key
   exposes everything stored under the old one.
5. Remove the departed or suspect n8n user; review the remaining users.
6. Nothing in the PHI zone needs rotating, **because n8n never held a PHI-zone
   credential**. If the review in §4 finds one, treat it as a PHI incident (D21).

## 8. Monthly

- [ ] Review the credential list against §4. Remove anything not on it.
- [ ] Review user accounts; remove anyone who no longer needs access.
- [ ] Apply the pinned n8n upgrade if one is due; re-run §3 checks after.
- [ ] Rotate webhook secrets and the `n8n_reader` password (90-day maximum, §6 layer 7).
