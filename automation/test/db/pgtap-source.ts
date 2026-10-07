/**
 * pgTAP, pinned by version and checksum, for the local pgTAP run.
 *
 * Supabase ships pgTAP as an extension. Locally there is no Postgres install,
 * so the suite runs against embedded Postgres and loads pgTAP's install script
 * directly. The script is fetched once from the official GitHub release,
 * verified against a pinned SHA-256, and cached under node_modules/.cache.
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

/**
 * The zip is cached, not the extracted SQL, and its hash is checked on EVERY
 * read, so a tampered cache is refused rather than executed. Writes go to a
 * temp file and are renamed into place, so a parallel reader never sees a
 * partial file.
 */
export async function loadPgTapSql(cacheRoot: string): Promise<string> {
  const dir = join(cacheRoot, "node_modules", ".cache", "newpoint-pgtap", VERSION);
  const zipPath = join(dir, `pgTAP-${VERSION}.zip`);

  let zip = await readFile(zipPath).catch(() => undefined);
  if (zip === undefined) {
    const response = await fetch(URL);
    if (!response.ok) throw new Error(`pgTAP download failed: HTTP ${String(response.status)}`);
    zip = Buffer.from(await response.arrayBuffer());
    verify(zip);
    await mkdir(dir, { recursive: true });
    const partial = `${zipPath}.${String(process.pid)}.partial`;
    await writeFile(partial, zip);
    await rename(partial, zipPath);
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

function verify(zip: Buffer): void {
  const digest = createHash("sha256").update(zip).digest("hex");
  if (digest !== SHA256) throw new Error(`pgTAP checksum mismatch: got ${digest}`);
}
