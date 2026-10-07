/**
 * Typed access to newpoint-marketing (docs/automation-architecture.md §3, §4).
 *
 * Runtimes connect as a login that is a member of `marketing_rw`, never as
 * `postgres` or `service_role`. Every write is idempotent, so a retried attempt
 * changes nothing a successful one already wrote.
 */
import pg from "pg";
import type { ClusteredCandidate, BacklogItem } from "../domain/seo/keyword-plan.js";
import type { Snapshot, TrackedKeyword } from "../domain/seo/rank-snapshots.js";

/** A pool in production, a single client in tests. */
export type Queryable = Pick<pg.Pool, "query">;

/**
 * TLS is verified against Supabase's own root CA (Database settings → SSL
 * configuration → Download certificate), which is not in Node's public trust
 * store.
 *
 * The pool is built from the URL's parts, never from `connectionString`: pg
 * lets query parameters in a connection string override host and TLS settings
 * (`?host=`, `?sslmode=no-verify`), which would undo both the project check in
 * env.ts and the verification here. env.ts also refuses any URL with a query.
 */
export function createMarketingPool(databaseUrl: string, caCertificate: string): pg.Pool {
  const url = new URL(databaseUrl);
  const pool = new pg.Pool({
    host: url.hostname,
    port: url.port === "" ? 5432 : Number(url.port),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")) || "postgres",
    ssl: { ca: caCertificate, rejectUnauthorized: true, servername: url.hostname },
    max: 3,
    idleTimeoutMillis: 10_000,
  });
  // An idle client's connection dropping (a pooler restart) is emitted here. The pool
  // discards that client and the next query reconnects; if it cannot, that query fails
  // inside runSafely. Without a listener the event is an uncaught exception, outside it.
  pool.on("error", () => undefined);
  return pool;
}

/**
 * Inserts new keywords and enriches existing ones. A null cluster, intent or
 * service never overwrites a value already stored, so a failed clustering run
 * cannot erase a human's or an earlier run's work.
 */
export async function upsertKeywords(db: Queryable, rows: readonly ClusteredCandidate[]): Promise<number> {
  if (rows.length === 0) return 0;
  const result = await db.query(
    `insert into marketing.keywords (term, cluster, intent, state, town, service_slug, source)
     select * from unnest($1::text[], $2::text[], $3::marketing.keyword_intent[], $4::text[], $5::text[], $6::text[],
                          $7::marketing.keyword_source[])
     on conflict (lower(term), coalesce(state, ''), coalesce(lower(town), '')) do update
       set cluster      = coalesce(excluded.cluster, marketing.keywords.cluster),
           intent       = coalesce(marketing.keywords.intent, excluded.intent),
           service_slug = coalesce(marketing.keywords.service_slug, excluded.service_slug)`,
    [
      rows.map((r) => r.term),
      rows.map((r) => r.cluster),
      rows.map((r) => r.intent),
      rows.map((r) => r.state),
      rows.map((r) => r.town),
      rows.map((r) => r.serviceSlug),
      rows.map((r) => r.source),
    ],
  );
  return result.rowCount ?? 0;
}

/** Adds backlog items that are not already open. Returns how many were new. */
export async function proposeBacklog(db: Queryable, items: readonly BacklogItem[], sourceAgent: string): Promise<number> {
  if (items.length === 0) return 0;
  const result = await db.query(
    `insert into marketing.content_backlog (kind, target, rationale, source_agent)
     select kind, target, rationale, $4 from unnest($1::marketing.backlog_kind[], $2::text[], $3::text[])
       as t(kind, target, rationale)
     on conflict (kind, lower(target)) where status in ('proposed', 'accepted') do nothing`,
    [items.map((i) => i.kind), items.map((i) => i.target), items.map((i) => i.rationale), sourceAgent],
  );
  return result.rowCount ?? 0;
}

export async function listTrackedKeywords(db: Queryable): Promise<TrackedKeyword[]> {
  const result = await db.query<{ id: string; term: string }>(`select id, term from marketing.keywords`);
  return result.rows;
}

/** One row per keyword per day; a re-run of the same week overwrites with the same numbers. */
export async function upsertSnapshots(db: Queryable, snapshots: readonly Snapshot[]): Promise<number> {
  if (snapshots.length === 0) return 0;
  const result = await db.query(
    `insert into marketing.keyword_snapshots (keyword_id, date, gsc_position, impressions, clicks)
     select * from unnest($1::uuid[], $2::date[], $3::numeric[], $4::int[], $5::int[])
     on conflict (keyword_id, date) do update
       set gsc_position = excluded.gsc_position,
           impressions  = excluded.impressions,
           clicks       = excluded.clicks`,
    [
      snapshots.map((s) => s.keywordId),
      snapshots.map((s) => s.date),
      snapshots.map((s) => s.position),
      snapshots.map((s) => s.impressions),
      snapshots.map((s) => s.clicks),
    ],
  );
  return result.rowCount ?? 0;
}

export async function countMovers(db: Queryable): Promise<number> {
  const result = await db.query<{ n: number }>(`select count(*)::int as n from marketing.rank_movers`);
  return result.rows[0]?.n ?? 0;
}
