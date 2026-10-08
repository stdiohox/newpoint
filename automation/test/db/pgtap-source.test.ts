import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ensurePgTapCached, loadPgTapSql } from "./pgtap-source.js";

const PROJECT = join(import.meta.dirname, "..", "..");
// global setup has already cached the real, hash-verified zip here.
const realZip = () => readFile(join(PROJECT, "node_modules", ".cache", "newpoint-pgtap", "1.3.4", "pgTAP-1.3.4.zip"));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("pgTAP cache", () => {
  it("survives a flaky network: retries the one download, then never fetches again", async () => {
    const zip = await realZip();
    let calls = 0;
    vi.stubGlobal("fetch", () => {
      calls += 1;
      return calls <= 2 ? Promise.reject(new TypeError("fetch failed")) : Promise.resolve(new Response(zip));
    });
    const root = await mkdtemp(join(tmpdir(), "newpoint-pgtap-test-"));
    try {
      await ensurePgTapCached(root);
      expect(calls).toBe(3);
      expect(await loadPgTapSql(root)).toContain("CREATE OR REPLACE FUNCTION");
      await ensurePgTapCached(root);
      expect(calls).toBe(3);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("refuses a download that fails the pinned checksum", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response("not pgtap")));
    const root = await mkdtemp(join(tmpdir(), "newpoint-pgtap-test-"));
    try {
      await expect(ensurePgTapCached(root)).rejects.toThrow("could not be downloaded");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 60_000);

  it("never downloads from a worker: a missing cache is a harness error", async () => {
    const root = await mkdtemp(join(tmpdir(), "newpoint-pgtap-test-"));
    try {
      await expect(loadPgTapSql(root)).rejects.toThrow("not cached");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
