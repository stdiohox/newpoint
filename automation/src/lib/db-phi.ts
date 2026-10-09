/**
 * newpoint-phi access (docs/automation-architecture.md §3 lib/db-phi.ts, §4, §6).
 *
 * - Runtimes connect as members of phi_tasks or phi_edge, never service_role.
 * - Every unit of work runs in a transaction that names its actor
 *   (`newpoint.actor`), so the audit triggers record who wrote what. Reads are
 *   audited here, explicitly, because triggers cannot see them.
 * - Values read from the phi schema come back as Phi<T>. Nothing in this file is
 *   importable from the public zone (eslint.config.mjs).
 */
import pg from "pg";
import { phi, type Phi } from "./phi.js";

export type Queryable = Pick<pg.ClientBase, "query">;

/** A transaction with its actor set. `actor` is a task id (+ run id) or a staff user id. */
export interface PhiDb {
  tx<T>(actor: string, fn: (q: Queryable) => Promise<T>): Promise<T>;
}

/** Thrown when a rollback itself failed: the connection is suspect and must not be reused. */
export class BrokenConnectionError extends Error {}

async function inTx<T>(client: Queryable, actor: string, fn: (q: Queryable) => Promise<T>): Promise<T> {
  await client.query("begin");
  try {
    await client.query("select set_config('newpoint.actor', $1, true)", [actor]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // The original error is the one that matters; the connection is marked broken.
      throw new BrokenConnectionError("rollback_failed", { cause: error });
    }
    throw error;
  }
}

export function poolDb(pool: pg.Pool): PhiDb {
  return {
    async tx(actor, fn) {
      const client = await pool.connect();
      let broken = false;
      try {
        return await inTx(client, actor, fn);
      } catch (error) {
        broken = error instanceof BrokenConnectionError;
        throw error;
      } finally {
        // A connection whose rollback failed is destroyed, not returned to the pool.
        client.release(broken);
      }
    },
  };
}

/** One client, for tests and for single-connection runtimes. */
export function clientDb(client: Queryable): PhiDb {
  return { tx: (actor, fn) => inTx(client, actor, fn) };
}

/** Built like createMarketingPool: parts, never a connection string, and CA-verified TLS. */
export function createPhiPool(databaseUrl: string, caCertificate: string): pg.Pool {
  const url = new URL(databaseUrl);
  const pool = new pg.Pool({
    host: url.hostname,
    port: url.port === "" ? 5432 : Number(url.port),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")) || "postgres",
    ssl: { ca: caCertificate, rejectUnauthorized: true, servername: url.hostname },
    max: 5,
    idleTimeoutMillis: 10_000,
    // Never wait forever: the crisis path must fail fast and retry, not hang.
    connectionTimeoutMillis: 10_000,
    statement_timeout: 15_000,
    query_timeout: 20_000,
  });
  pool.on("error", () => undefined);
  return pool;
}

export async function auditRead(q: Queryable, entity: string, entityId: string): Promise<void> {
  await q.query(`insert into phi.audit_log (actor, action, entity, entity_id) values (phi.actor(), 'read', $1, $2)`, [entity, entityId]);
}

export async function auditSend(q: Queryable, entity: string, entityId: string): Promise<void> {
  await q.query(`insert into phi.audit_log (actor, action, entity, entity_id) values (phi.actor(), 'send', $1, $2)`, [entity, entityId]);
}

// --- Contacts and consent -----------------------------------------------------------

export type MinorStatus = "adult" | "minor" | "unknown";

export interface Contact {
  readonly id: string;
  readonly phone: Phi<string> | null;
  readonly firstName: Phi<string> | null;
  readonly phoneVerifiedAt: Date | null;
  readonly state: "NJ" | "PA" | null;
  readonly minorStatus: MinorStatus;
}

export async function getContact(q: Queryable, id: string): Promise<Contact | null> {
  const { rows } = await q.query<{
    id: string;
    phone_e164: string | null;
    first_name: string | null;
    phone_verified_at: Date | null;
    state: "NJ" | "PA" | null;
    minor_status: MinorStatus;
  }>(`select id, phone_e164, first_name, phone_verified_at, state, minor_status::text as minor_status from phi.contacts where id = $1`, [id]);
  const row = rows[0];
  if (!row) return null;
  await auditRead(q, "contacts", id);
  return {
    id: row.id,
    phone: row.phone_e164 === null ? null : phi(row.phone_e164),
    firstName: row.first_name === null ? null : phi(row.first_name),
    phoneVerifiedAt: row.phone_verified_at,
    state: row.state,
    minorStatus: row.minor_status,
  };
}

export type ConsentKind = "sms_transactional" | "sms_marketing" | "review_requests" | "unencrypted_sms_ack";

export async function hasActiveConsent(q: Queryable, contactId: string, kind: ConsentKind): Promise<boolean> {
  const { rows } = await q.query<{ active: boolean }>(
    `select active from phi.consent_state where contact_id = $1 and kind = $2`,
    [contactId, kind],
  );
  return rows[0]?.active === true;
}

/** The latest consent event for (contact, kind): a STOP stays a STOP until the person grants again. */
export async function latestConsent(q: Queryable, contactId: string, kind: ConsentKind): Promise<"granted" | "revoked" | null> {
  const { rows } = await q.query<{ active: boolean }>(`select active from phi.consent_state where contact_id = $1 and kind = $2`, [contactId, kind]);
  const row = rows[0];
  return row === undefined ? null : row.active ? "granted" : "revoked";
}

export async function revokeConsent(q: Queryable, contactId: string, kind: ConsentKind, source: string, evidence: object): Promise<void> {
  await q.query(
    `insert into phi.consents (contact_id, kind, revoked_at, source, evidence) values ($1, $2, now(), $3, $4)`,
    [contactId, kind, source, JSON.stringify(evidence)],
  );
}

/** §5.8: a crisis pauses automated sequences until a clinician resumes them. */
export async function sequencesPaused(q: Queryable, contactId: string): Promise<boolean> {
  const { rows } = await q.query(
    `select 1 from phi.crisis_events where contact_id = $1 and sequences_resumed_at is null limit 1`,
    [contactId],
  );
  return rows.length > 0;
}

// --- Messages --------------------------------------------------------------------------

export async function openSmsConversation(q: Queryable, contactId: string): Promise<string> {
  const existing = await q.query<{ id: string }>(
    `select id from phi.conversations where contact_id = $1 and channel = 'sms' and closed_at is null order by started_at desc limit 1`,
    [contactId],
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const created = await q.query<{ id: string }>(
    `insert into phi.conversations (contact_id, channel) values ($1, 'sms')
     on conflict (contact_id) where channel = 'sms' and closed_at is null do nothing returning id`,
    [contactId],
  );
  const id =
    created.rows[0]?.id ??
    (await q.query<{ id: string }>(`select id from phi.conversations where contact_id = $1 and channel = 'sms' and closed_at is null`, [contactId]))
      .rows[0]?.id;
  if (!id) throw new Error("openSmsConversation: no id");
  return id;
}

export async function outboundToday(q: Queryable, contactId: string | null): Promise<number> {
  const { rows } = await q.query<{ n: number }>(
    contactId === null
      ? `select count(*)::int as n from phi.messages where direction = 'outbound' and failed_at is null and created_at >= date_trunc('day', now() at time zone 'America/New_York') at time zone 'America/New_York'`
      : `select count(*)::int as n from phi.messages m join phi.conversations c on c.id = m.conversation_id
          where m.direction = 'outbound' and m.failed_at is null and c.contact_id = $1
            and m.created_at >= date_trunc('day', now() at time zone 'America/New_York') at time zone 'America/New_York'`,
    contactId === null ? [] : [contactId],
  );
  return rows[0]?.n ?? 0;
}

// --- Tickets ---------------------------------------------------------------------------

export type TicketKind = "callback" | "message" | "booking" | "clinician_review" | "referral_review" | "crisis_follow_up";

/** One open ticket per (kind, source): a retried task adds nothing. Returns whether it is new. */
export async function openTicket(
  q: Queryable,
  ticket: { readonly contactId: string | null; readonly kind: TicketKind; readonly sourceKind: string; readonly sourceId: string },
): Promise<boolean> {
  const result = await q.query(
    `insert into phi.tickets (contact_id, kind, source_kind, source_id) values ($1, $2, $3, $4)
     on conflict (kind, source_kind, source_id) where status in ('open', 'in_progress') do nothing`,
    [ticket.contactId, ticket.kind, ticket.sourceKind, ticket.sourceId],
  );
  return (result.rowCount ?? 0) === 1;
}

// --- Age (D18) ----------------------------------------------------------------------------

/**
 * Applies a self-reported age, as the database allows it (minor_status_guard): a "yes" only
 * fills an UNKNOWN age; a "no" may also replace an earlier self-reported "yes"; nothing ever
 * overrides a staff decision.
 */
export async function answerUnknownAge(q: Queryable, contactId: string, status: "adult" | "minor", source: "web_form" | "voice" | "sms"): Promise<boolean> {
  const r = await q.query(
    status === "adult"
      ? `update phi.contacts set minor_status = 'adult', minor_status_source = $2 where id = $1 and minor_status = 'unknown'`
      : `update phi.contacts set minor_status = 'minor', minor_status_source = $2
          where id = $1 and minor_status <> 'minor' and minor_status_source is distinct from 'staff'`,
    [contactId, source],
  );
  return (r.rowCount ?? 0) === 1;
}
