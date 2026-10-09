/**
 * referrals.referrer-update (docs/automation-architecture.md §5.5). BUILT, AND DISABLED.
 *
 * D12 (42 CFR Part 2 and NJ/PA mental-health confidentiality) is with counsel, and no
 * BAA-covered channel to referring clinicians has been chosen. Until both, this task does
 * nothing: PHI_REFERRER_UPDATE_ENABLED is false by default and no channel is wired in the
 * runtime, so even with the flag on it refuses.
 *
 * What it would send, minimum necessary for treatment purposes: that the referral was
 * received and the patient scheduled. No date, no time, no provider, no diagnosis or notes.
 */
import type { PhiDb } from "../../../lib/db-phi.js";
import { phiTask } from "../../../lib/task.js";
import { PHI_PAYLOADS } from "../payloads.js";
import { phiRuntime } from "../runtime.js";

/** The only words a referrer would get. Fixed; nothing about the patient but that they are scheduled. */
export const REFERRER_NOTICE = "Newpoint received your referral, and the patient has been scheduled. Thank you.";

/** A BAA-covered channel to the referring clinician (fax, secure email, EHR): not chosen yet. */
export interface ReferrerChannel {
  send(referralId: string, text: typeof REFERRER_NOTICE): Promise<void>;
}

export interface ReferrerUpdateDeps {
  readonly db: PhiDb;
  readonly enabled: boolean;
  readonly channel: ReferrerChannel | null;
  readonly actor: string;
}

export type ReferrerUpdateResult = "disabled" | "no_channel" | "not_referred" | "sent" | "already_sent";

export async function runReferrerUpdate(deps: ReferrerUpdateDeps, appointmentId: string): Promise<{ readonly result: ReferrerUpdateResult }> {
  if (!deps.enabled) return { result: "disabled" };
  if (deps.channel === null) return { result: "no_channel" };
  const referralId = await deps.db.tx(deps.actor, async (q) => {
    const { rows } = await q.query<{ id: string }>(
      `select r.id from phi.appointments a join phi.referrals r on r.contact_id = a.contact_id
        where a.id = $1 and a.status = 'scheduled' and r.status = 'confirmed' and a.starts_at > r.reviewed_at
        order by r.received_at desc limit 1`,
      [appointmentId],
    );
    return rows[0]?.id ?? null;
  });
  if (referralId === null) return { result: "not_referred" };
  // Once per referral, recorded as a follow-up row before the send (at most once).
  const claimed = await deps.db.tx(deps.actor, async (q) => {
    const { rows } = await q.query<{ contact_id: string }>(`select contact_id from phi.referrals where id = $1`, [referralId]);
    const r = await q.query(
      `insert into phi.follow_ups (contact_id, kind, step, due_at, status, source_id) values ($1, 'referrer_update', 0, now(), 'sent', $2)
       on conflict (kind, source_id, step) where source_id is not null do nothing`,
      [rows[0]?.contact_id, referralId],
    );
    return (r.rowCount ?? 0) === 1;
  });
  if (!claimed) return { result: "already_sent" };
  await deps.channel.send(referralId, REFERRER_NOTICE);
  return { result: "sent" };
}

const ID = "referrals.referrer-update";

export const referrerUpdate = phiTask({
  id: ID,
  schema: PHI_PAYLOADS["referrals.referrer-update"],
  // At most once, by design: the claim row is written before the send, so a retry would only
  // report already_sent. A failed send is visible in the run, not repeated.
  retry: { maxAttempts: 1 },
  maxDuration: 60,
  run: ({ appointmentId }) => {
    const rt = phiRuntime();
    // D12: no channel is wired; enabling the flag alone sends nothing.
    return runReferrerUpdate({ db: rt.db, enabled: rt.env.PHI_REFERRER_UPDATE_ENABLED, channel: null, actor: ID }, appointmentId);
  },
});
