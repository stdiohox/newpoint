/**
 * ops.retention-sweep (docs/automation-architecture.md §5.9). Daily 03:00 ET.
 *
 * Clears message bodies past `purge_after`, and phone verification codes once used or expired. Rows stay (ids, direction, template,
 * timestamps) for the audit trail. Until D16 sets retention periods no writer sets
 * `purge_after`, so this clears nothing; it is built so the periods only need setting.
 * Referral documents (Phase 10) are removed from the private bucket past their purge_after.
 */
import type { ReferralStore } from "../../../adapters/storage/referral-store.js";
import type { PhiDb } from "../../../lib/db-phi.js";
import { phiSchedule } from "../../../lib/task.js";
import { phiRuntime } from "../runtime.js";

/** Referral documents past purge_after (D16 sets it): the file is removed, then the path cleared. */
export async function purgeReferralDocuments(db: PhiDb, store: ReferralStore, actor: string): Promise<number> {
  const { rows } = await db.tx(actor, (q) =>
    q.query<{ id: string; document_path: string }>(
      // Never the document of a referral nobody has decided on yet.
      `select id, document_path from phi.referrals
        where document_path is not null and purge_after is not null and purge_after <= now() and status in ('confirmed', 'rejected')
        order by purge_after limit 500`,
    ),
  );
  let purged = 0;
  let failed = false;
  for (const r of rows) {
    // One bad row never stalls the rest; the next run retries it (a 404 counts as removed).
    try {
      await store.remove(r.document_path);
      // The extracted values (names, numbers) go with the file.
      await db.tx(actor, (q) => q.query(`update phi.referrals set document_path = null, extracted = null where id = $1`, [r.id]));
      purged += 1;
    } catch {
      failed = true;
    }
  }
  if (failed) throw new Error("ops.retention-sweep: a referral document could not be removed");
  return purged;
}

export async function runRetentionSweep(db: PhiDb, actor: string): Promise<{ readonly messageBodies: number; readonly codes: number }> {
  return db.tx(actor, async (q) => {
    const bodies = await q.query(`update phi.messages set body = null where body is not null and purge_after is not null and purge_after <= now()`);
    // Phone codes are never kept past use or expiry (Phase 6); this needs no D16 decision.
    const codes = await q.query(`update phi.phone_verifications set code = null where code is not null and (verified_at is not null or expires_at <= now())`);
    return { messageBodies: bodies.rowCount ?? 0, codes: codes.rowCount ?? 0 };
  });
}

const ID = "ops.retention-sweep";

export const retentionSweep = phiSchedule({
  id: ID,
  cron: { pattern: "0 3 * * *", timezone: "America/New_York" },
  retry: { maxAttempts: 3 },
  maxDuration: 300,
  run: async () => {
    const rt = phiRuntime();
    const result = await runRetentionSweep(rt.db, ID);
    const documents = rt.referralStore === null ? 0 : await purgeReferralDocuments(rt.db, rt.referralStore, ID);
    return { ...result, documents };
  },
});
