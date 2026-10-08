/**
 * Typed access to newpoint-marketing (docs/automation-architecture.md §3, §4).
 *
 * Runtimes connect as a login that is a member of `marketing_rw`, never as
 * `postgres` or `service_role`. Every write is idempotent, so a retried attempt
 * changes nothing a successful one already wrote.
 */
import pg from "pg";
import type { BacklogItem } from "../domain/backlog.js";
import type { GeoPromptSeed, ClusterKeyword, UsState } from "../domain/geo/prompts.js";
import type { GeoRunRow } from "../domain/geo/recommendations.js";
import { fromPublicSource, type PublicText } from "./phi.js";
import type { ClusteredCandidate } from "../domain/seo/keyword-plan.js";
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

// --- GEO (Phase 2, §5.6) ---------------------------------------------------
// Text read here is newpoint-marketing data, public by construction (§0.1), and
// leaves as PublicText because it is sent to the public Anthropic org.

const pub = (text: string): PublicText => fromPublicSource("newpoint_marketing_db", text);

export async function listClusterKeywords(db: Queryable): Promise<ClusterKeyword[]> {
  const result = await db.query<{ cluster: string; state: UsState | null; town: string | null; intent: string | null }>(
    `select cluster, state, town, intent::text as intent
       from marketing.keywords
      where cluster is not null
      order by cluster, term`,
  );
  return result.rows.map((row) => ({
    cluster: pub(row.cluster),
    state: row.state,
    town: row.town === null ? null : pub(row.town),
    intent: row.intent,
  }));
}

/** New prompts only; an existing prompt (and whether a person deactivated it) is left alone. */
export async function seedGeoPrompts(db: Queryable, seeds: readonly GeoPromptSeed[]): Promise<number> {
  if (seeds.length === 0) return 0;
  const result = await db.query(
    `insert into marketing.geo_prompts (prompt, intent, state, cluster)
     select * from unnest($1::text[], $2::text[], $3::text[], $4::text[])
     on conflict (prompt) do nothing`,
    [seeds.map((s) => s.prompt), seeds.map((s) => s.intent), seeds.map((s) => s.state), seeds.map((s) => s.cluster)],
  );
  return result.rowCount ?? 0;
}

export interface PromptToProbe {
  readonly id: string;
  readonly prompt: PublicText;
  readonly state: UsState | null;
}

/**
 * Active prompts this engine has not attempted in the last six days (answered,
 * or failed to answer), least recently attempted first. Six, not seven: a weekly
 * run a few hours early still probes. A retried run therefore resumes where the
 * failed attempt stopped, and a prompt that keeps failing cannot starve the rest.
 */
export async function listPromptsToProbe(db: Queryable, engine: string, limit: number, now: Date): Promise<PromptToProbe[]> {
  const result = await db.query<{ id: string; prompt: string; state: UsState | null }>(
    `select p.id, p.prompt, p.state
       from marketing.geo_prompts p
       left join lateral (
         select max(r.run_at) as last_run from marketing.geo_runs r where r.prompt_id = p.id and r.engine = $1
       ) l on true
      cross join lateral (select greatest(l.last_run, p.last_failed_at) as last_attempt) a
      where p.active
        and (a.last_attempt is null or a.last_attempt <= $2::timestamptz - interval '6 days')
      order by a.last_attempt asc nulls first, p.id
      limit $3`,
    [engine, now.toISOString(), limit],
  );
  return result.rows.map((row) => ({ id: row.id, prompt: pub(row.prompt), state: row.state }));
}

export async function markProbeFailed(db: Queryable, promptId: string, at: Date): Promise<void> {
  await db.query(`update marketing.geo_prompts set last_failed_at = $2 where id = $1`, [promptId, at.toISOString()]);
}

export interface GeoRunInsert {
  readonly promptId: string;
  readonly engine: string;
  readonly runAt: Date;
  readonly answerExcerpt: string;
  readonly newpointMentioned: boolean;
  readonly newpointCited: boolean;
  readonly citedUrls: readonly string[];
  /** null = extraction failed (not "none"). */
  readonly competitors: readonly string[] | null;
}

export async function insertGeoRun(db: Queryable, run: GeoRunInsert): Promise<void> {
  await db.query(
    `insert into marketing.geo_runs
       (prompt_id, engine, run_at, answer_excerpt, newpoint_mentioned, newpoint_cited, cited_urls, competitors_mentioned)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      run.promptId,
      run.engine,
      run.runAt.toISOString(),
      run.answerExcerpt,
      run.newpointMentioned,
      run.newpointCited,
      run.citedUrls,
      run.competitors,
    ],
  );
}

/** Runs since `since`, with each cited URL reduced to its host in SQL (lowercase, no "www."). */
export async function listGeoRuns(db: Queryable, since: Date): Promise<GeoRunRow[]> {
  const result = await db.query<{
    prompt_id: string;
    prompt: string;
    newpoint_mentioned: boolean;
    newpoint_cited: boolean;
    cited_hosts: string[];
    competitors_mentioned: string[] | null;
  }>(
    `select r.prompt_id, p.prompt, r.newpoint_mentioned, r.newpoint_cited, r.competitors_mentioned,
            coalesce(array(
              select distinct h
                from unnest(r.cited_urls) u,
                     regexp_replace(substring(lower(u) from '^https?://(?:[^/?#@]*@)?([^/:?#@\\s]+)'), '^www\\.', '') h
               where h is not null and h <> '' and length(h) <= 253
            ), '{}') as cited_hosts
       from marketing.geo_runs r
       join marketing.geo_prompts p on p.id = r.prompt_id
      where r.run_at >= $1
      order by r.run_at, r.id`,
    [since.toISOString()],
  );
  return result.rows.map((row) => ({
    promptId: row.prompt_id,
    prompt: pub(row.prompt),
    newpointMentioned: row.newpoint_mentioned,
    newpointCited: row.newpoint_cited,
    citedHosts: row.cited_hosts.map(pub),
    competitors: row.competitors_mentioned === null ? null : row.competitors_mentioned.map(pub),
  }));
}

/** Distinct cluster names, for the recommendations prompt (§5.6 input: keywords). */
export async function listClusters(db: Queryable): Promise<PublicText[]> {
  const result = await db.query<{ cluster: string }>(
    `select distinct cluster from marketing.keywords where cluster is not null order by cluster`,
  );
  return result.rows.map((row) => pub(row.cluster));
}
