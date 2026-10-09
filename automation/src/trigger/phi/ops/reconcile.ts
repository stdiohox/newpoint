/**
 * ops.reconcile (PHI project), every 5 minutes. The edge handlers commit a row and then
 * queue a task; Twilio does not retry inbound webhooks and the site form has already said
 * "thanks", so a failed hand-off must be caught here, not lost:
 *   - an inbound message still unhandled (intent null) after 2 minutes → messaging.inbound-sms;
 *   - a web inquiry with no ticket after 5 minutes → referrals.lead-follow-up;
 *   - a live, unsent verification code → messaging.send-sms.
 * Every re-queue uses the same idempotency key as the edge, so a run that already exists
 * is not started twice. Only the last day is swept: older rows are a person's problem now,
 * and they are already in the console as tickets or messages.
 */
import { tasks } from "@trigger.dev/sdk";
import type { PhiDb } from "../../../lib/db-phi.js";
import { phiSchedule } from "../../../lib/task.js";
import { phiRuntime } from "../runtime.js";

export interface Stranded {
  readonly inbound: readonly string[];
  readonly inquiries: readonly string[];
  readonly codes: readonly { readonly id: string; readonly contactId: string }[];
}

export async function findStranded(db: PhiDb, actor: string): Promise<Stranded> {
  return db.tx(actor, async (q) => {
    const inbound = await q.query<{ id: string }>(
      `select id from phi.messages
        where direction = 'inbound' and intent is null
          and created_at < now() - interval '2 minutes' and created_at > now() - interval '1 day'
        order by created_at limit 200`,
    );
    const inquiries = await q.query<{ id: string }>(
      `select i.id from phi.inquiries i
        where i.source = 'web' and i.created_at < now() - interval '5 minutes' and i.created_at > now() - interval '1 day'
          and not exists (select 1 from phi.tickets t where t.source_kind = 'inquiry' and t.source_id = i.id)
        order by i.created_at limit 200`,
    );
    const codes = await q.query<{ id: string; contact_id: string }>(
      `select v.id, v.contact_id from phi.phone_verifications v
        where v.code is not null and v.verified_at is null and v.expires_at > now() and v.created_at < now() - interval '1 minute'
          and not exists (select 1 from phi.messages m where m.idempotency_key = 'verification_code:' || v.id || ':0')
        limit 200`,
    );
    return {
      inbound: inbound.rows.map((r) => r.id),
      inquiries: inquiries.rows.map((r) => r.id),
      codes: codes.rows.map((r) => ({ id: r.id, contactId: r.contact_id })),
    };
  });
}

const ID = "ops.reconcile";

export const reconcile = phiSchedule({
  id: ID,
  cron: { pattern: "*/5 * * * *", timezone: "America/New_York" },
  retry: { maxAttempts: 2 },
  maxDuration: 120,
  run: async () => {
    const stranded = await findStranded(phiRuntime().db, ID);
    for (const messageId of stranded.inbound) {
      await tasks.trigger("messaging.inbound-sms", { messageId }, { idempotencyKey: `inbound-sms:${messageId}` });
    }
    for (const inquiryId of stranded.inquiries) {
      await tasks.trigger("referrals.lead-follow-up", { inquiryId }, { idempotencyKey: `lead-follow-up:${inquiryId}` });
    }
    for (const code of stranded.codes) {
      await tasks.trigger(
        "messaging.send-sms",
        { template: "verification_code", contactId: code.contactId, entityId: code.id, step: 0 },
        { idempotencyKey: `send-sms:verification_code:${code.id}:0` },
      );
    }
    return { inbound: stranded.inbound.length, inquiries: stranded.inquiries.length, codes: stranded.codes.length };
  },
});
