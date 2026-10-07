/**
 * A throwaway Postgres 17 shaped like the newpoint-marketing Supabase project.
 *
 * What is approximated, and why it matters for the tests:
 * - Supabase's API roles (anon, authenticated, service_role) exist.
 * - Supabase's default privileges on `public` are reproduced: new tables are
 *   granted ALL to those three roles. Without this, the "API roles hold
 *   nothing" tests would pass trivially; with it, they prove the migrations
 *   actually revoke.
 * - pgTAP lives in the `extensions` schema, as on Supabase.
 *
 * What is not: Supabase's other schemas (auth, storage, realtime, …). The
 * marketing migrations do not reference them.
 */
import EmbeddedPostgres from "embedded-postgres";
import type pg from "pg";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPgTapSql } from "./pgtap-source.js";

const PROJECT = join(import.meta.dirname, "..", "..");
export const MARKETING_SUPABASE_DIR = join(PROJECT, "supabase", "marketing", "supabase");

const SUPABASE_BASELINE = `
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;
  create schema extensions;
  grant usage on schema extensions to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

export interface MarketingDb {
  readonly client: pg.Client;
  stop(): Promise<void>;
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") resolve(address.port);
        else reject(new Error("could not allocate a port"));
      });
    });
  });
}

async function sqlFiles(dir: string): Promise<string[]> {
  return (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort();
}

export async function startMarketingDb(): Promise<MarketingDb> {
  const dataDir = await mkdtemp(join(tmpdir(), "newpoint-marketing-pg-"));
  const server = new EmbeddedPostgres({
    databaseDir: dataDir,
    port: await freePort(),
    user: "postgres",
    password: "postgres",
    persistent: false,
    onLog: () => undefined,
  });
  await server.initialise();
  await server.start();
  await server.createDatabase("marketing");

  const client = server.getPgClient("marketing");
  await client.connect();
  try {
    await client.query(SUPABASE_BASELINE);
    await client.query(`alter database marketing set search_path = "$user", public, extensions`);
    await client.query(`set search_path = extensions`);
    await client.query(await loadPgTapSql(PROJECT));
    await client.query(`set search_path = "$user", public, extensions`);

    const migrationsDir = join(MARKETING_SUPABASE_DIR, "migrations");
    for (const file of await sqlFiles(migrationsDir)) {
      await client.query(await readFile(join(migrationsDir, file), "utf8"));
    }
  } catch (error) {
    await client.end();
    await server.stop();
    await rm(dataDir, { recursive: true, force: true });
    throw error;
  }

  return {
    client,
    async stop() {
      await client.end();
      await server.stop();
      await rm(dataDir, { recursive: true, force: true });
    },
  };
}

export async function listTestFiles(): Promise<string[]> {
  return sqlFiles(join(MARKETING_SUPABASE_DIR, "tests"));
}

export interface TapResult {
  readonly planned: number;
  readonly passed: number;
  readonly failures: readonly string[];
  readonly output: readonly string[];
}

/** Runs one pgTAP file and parses its TAP stream. */
export async function runTapFile(client: pg.Client, file: string): Promise<TapResult> {
  const sql = await readFile(join(MARKETING_SUPABASE_DIR, "tests", file), "utf8");
  let results: pg.QueryResult | pg.QueryResult[];
  try {
    // Multi-statement simple query: pg returns one result per statement.
    results = (await client.query(sql)) as pg.QueryResult | pg.QueryResult[];
  } catch (error) {
    await client.query("rollback");
    throw error;
  }

  const output = (Array.isArray(results) ? results : [results])
    .flatMap((result) => result.rows as Record<string, unknown>[])
    .flatMap((row) => Object.values(row))
    .filter((value): value is string => typeof value === "string")
    .flatMap((value) => value.split("\n"));

  const planLine = output.find((line) => /^1\.\.\d+$/.test(line));
  const planned = planLine ? Number(planLine.slice(3)) : 0;
  const passed = output.filter((line) => /^ok \d+/.test(line)).length;
  const failures = output.filter((line) => /^not ok \d+/.test(line));
  return { planned, passed, failures, output };
}
