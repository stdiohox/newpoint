import { createHmac } from 'node:crypto';
import { Pool, type DatabaseError } from 'pg';
import type { LeadInput } from './lead-input';

/**
 * Server-only. The website's way into the lead CRM (docs/lead-crm.md).
 *
 * Connects as a login that is a member of crm_intake, which can call
 * crm.submit_lead and nothing else: this route can store a lead but cannot
 * read one back. The visitor's IP never reaches the database, only an HMAC of
 * it, which the rate limits key on.
 *
 * Env (Vercel, all server-side):
 *   CRM_INTAKE_DATABASE_URL   pooler URL for the crm_intake login
 *   CRM_DATABASE_CA_CERT      Supabase root CA (PEM), so TLS is verified
 *   CRM_INTAKE_HMAC_SECRET    32+ random characters
 *   TRIGGER_SECRET_KEY        newpoint-marketing prod key; optional (the
 *                             10-minute sweep still sends the alert without it)
 */
interface IntakeEnv {
  databaseUrl: string;
  caCert: string;
  hmacSecret: string;
  triggerKey: string | undefined;
}

export function intakeEnv(): IntakeEnv | null {
  const databaseUrl = process.env.CRM_INTAKE_DATABASE_URL;
  const caCert = process.env.CRM_DATABASE_CA_CERT?.replace(/\\n/g, '\n');
  const hmacSecret = process.env.CRM_INTAKE_HMAC_SECRET;
  if (!databaseUrl || !caCert?.startsWith('-----BEGIN CERTIFICATE-----') || !hmacSecret || hmacSecret.length < 32) {
    return null;
  }
  return { databaseUrl, caCert, hmacSecret, triggerKey: process.env.TRIGGER_SECRET_KEY || undefined };
}

let pool: Pool | undefined;

function getPool(env: IntakeEnv): Pool {
  if (pool) return pool;
  // Fields, not the URL: pg lets query-string options (?sslmode=…) override ssl.
  const url = new URL(env.databaseUrl);
  pool = new Pool({
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1) || 'postgres',
    ssl: { ca: env.caCert, rejectUnauthorized: true, servername: url.hostname },
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
  // An idle client dropped by the pooler must not become an uncaught exception.
  pool.on('error', () => undefined);
  return pool;
}

export function clientKey(ip: string, secret: string): string {
  return createHmac('sha256', secret).update(ip).digest('hex');
}

export type SubmitResult = { ok: true; id: string } | { ok: false; reason: 'rate_limited' | 'invalid' };

export async function submitLead(env: IntakeEnv, lead: LeadInput, ip: string): Promise<SubmitResult> {
  try {
    const { rows } = await getPool(env).query<{ id: string }>(
      'select crm.submit_lead($1, $2, $3, $4, $5) as id',
      [lead.name, lead.email, lead.phone, lead.reason, clientKey(ip, env.hmacSecret)]
    );
    const id = rows[0]?.id;
    if (!id) throw new Error('crm.submit_lead returned no id');
    return { ok: true, id };
  } catch (error) {
    const code = (error as Partial<DatabaseError>).code;
    if (code === 'P0001' && (error as Error).message === 'rate_limited') return { ok: false, reason: 'rate_limited' };
    if (code === '23514' || code === '22023' || code === '22001') return { ok: false, reason: 'invalid' };
    throw error;
  }
}

/**
 * Starts crm.new-lead-alert in Trigger.dev. Best effort: a failure here only
 * delays the alert to the next 10-minute sweep, so it is logged (status only)
 * and swallowed.
 */
export async function triggerLeadAlert(env: IntakeEnv): Promise<void> {
  if (!env.triggerKey) return;
  try {
    const response = await fetch('https://api.trigger.dev/api/v1/tasks/crm.new-lead-alert/trigger', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.triggerKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ payload: {} }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) console.error(JSON.stringify({ event: 'crm.alert_trigger_failed', status: response.status }));
  } catch {
    console.error(JSON.stringify({ event: 'crm.alert_trigger_failed', status: null }));
  }
}
