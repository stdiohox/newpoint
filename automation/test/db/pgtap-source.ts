/**
 * pgTAP, pinned by version and checksum, for the local pgTAP run.
 *
 * Supabase ships pgTAP as an extension. Locally there is no Postgres install,
 * so the suite runs against embedded Postgres and loads pgTAP's install script
 * directly. The script is fetched once per test run from the official GitHub
 * release, verified against a pinned SHA-256, and cached under
 * node_modules/.cache.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

const VERSION = "1.3.4";
const URL = `https://github.com/theory/pgtap/releases/download/v${VERSION}/pgTAP-${VERSION}.zip`;
const SHA256 = "5de16455e3e29898813f05cc9f396a31f878309a94d8adb34e80f423a5841736";
/** pgTAP's Makefile substitutes these three tokens; nothing else is templated. */
const NUMVERSION = VERSION.split(".").slice(0, 2).join(".");

const cacheDir = (root: string): string => join(root, "node_modules", ".cache", "newpoint-pgtap", VERSION);
const zipPathIn = (root: string): string => join(cacheDir(root), `pgTAP-${VERSION}.zip`);

/** Attempts and backoff for the one download per test run (2s, 4s, 8s between tries). */
const DOWNLOAD_ATTEMPTS = 4;

/**
 * Downloads and caches the pinned zip unless a verified copy is already there.
 * Called ONCE per test run, from test/db/global-setup.ts, before any worker
 * starts: the suites that boot a database only read the cache, so a flaky
 * network fails one retried download up front instead of whichever suite's
 * beforeAll happened to lose the race (the old failure: four suites each
 * fetching from GitHub in parallel after `npm ci` cleared the cache).
 *
 * Written to a temp file and renamed into place, so a reader never sees a
 * partial zip.
 */
export async function ensurePgTapCached(root: string): Promise<void> {
  const cached = await readFile(zipPathIn(root)).catch(() => undefined);
  if (cached !== undefined && digestOf(cached) === SHA256) return;

  let lastError: unknown;
  for (let attempt = 1; attempt <= DOWNLOAD_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(URL, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`pgTAP download failed: HTTP ${String(response.status)}`);
      const zip = Buffer.from(await response.arrayBuffer());
      verify(zip);
      await mkdir(cacheDir(root), { recursive: true });
      const partial = `${zipPathIn(root)}.${String(process.pid)}.${String(Date.now())}.partial`;
      await writeFile(partial, zip);
      await rename(partial, zipPathIn(root));
      return;
    } catch (error) {
      lastError = error;
      if (attempt < DOWNLOAD_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 2_000 * 2 ** (attempt - 1)));
    }
  }
  throw new Error(`pgTAP could not be downloaded after ${String(DOWNLOAD_ATTEMPTS)} attempts`, { cause: lastError });
}

/**
 * The pgTAP install SQL from the cache. The hash is checked on EVERY read, so
 * a tampered cache is refused rather than executed. Never downloads: a missing
 * cache means global setup did not run, which is a harness bug to surface.
 */
export async function loadPgTapSql(cacheRoot: string): Promise<string> {
  const zipPath = zipPathIn(cacheRoot);
  const zip = await readFile(zipPath).catch(() => undefined);
  if (zip === undefined) {
    throw new Error("pgTAP is not cached: run the suite through vitest (test/db/global-setup.ts fetches it)");
  }
  verify(zip);

  const template = execFileSync("unzip", ["-p", zipPath, `pgTAP-${VERSION}/sql/pgtap.sql.in`], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  return template
    .replaceAll("MODULE_PATHNAME", "pgtap")
    .replaceAll("__OS__", process.platform)
    .replaceAll("__VERSION__", NUMVERSION);
}

const digestOf = (zip: Buffer): string => createHash("sha256").update(zip).digest("hex");

function verify(zip: Buffer): void {
  const digest = digestOf(zip);
  if (digest !== SHA256) throw new Error(`pgTAP checksum mismatch: got ${digest}`);
}
