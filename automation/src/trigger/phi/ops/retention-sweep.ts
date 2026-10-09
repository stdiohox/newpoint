/**
 * ops.retention-sweep (docs/automation-architecture.md §5.9). Daily 03:00 ET.
 *
 * Clears message bodies past `purge_after`, and phone verification codes once used or expired. Rows stay (ids, direction, template,
 * timestamps) for the audit trail. Until D16 sets retention periods no writer sets
 * `purge_after`, so this clears nothing; it is built so the periods only need setting.
 * Referral documents join this sweep with Phase 10.
 */
import type { PhiDb } from "../../../lib/db-phi.js";
import { phiSchedule } from "../../../lib/task.js";
import { phiRuntime } from "../runtime.js";

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
  run: () => runRetentionSweep(phiRuntime().db, ID),
});
