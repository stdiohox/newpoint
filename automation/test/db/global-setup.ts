/**
 * Vitest global setup: runs once, in the main process, before any test worker.
 * Puts pgTAP in the cache so the database suites never touch the network.
 */
import { join } from "node:path";
import { ensurePgTapCached } from "./pgtap-source.js";

export default async function setup(): Promise<void> {
  await ensurePgTapCached(join(import.meta.dirname, "..", ".."));
}
