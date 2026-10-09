/**
 * Slot values for templates, read from the row the message is about. The task
 * payload carries ids only (§0.4), so a date, a time, a provider name or a code never
 * sits in a queue. Templates whose source rows arrive in later phases are refused here
 * until their resolver exists.
 */
import type { Queryable } from "../../../lib/db-phi.js";
import { ValidationError } from "../../../lib/errors.js";
import { templateDef, type Slots, type TemplateId } from "../../../domain/messaging/templates.js";
import { HANDOFF_URLS, provider } from "../../../domain/scheduling/providers.js";
import { smsDate, smsTime } from "../../../domain/scheduling/time.js";

export interface SlotConfig {
  /** PHI_GOOGLE_REVIEW_URL: the only link a review text may carry. null = not configured. */
  readonly reviewUrl: string | null;
}

export async function resolveSlots(q: Queryable, template: TemplateId, entityId: string, config: SlotConfig = { reviewUrl: null }): Promise<Slots> {
  if (template === "review_request") {
    // The entity is a review request just claimed for sending (reviews.request-review); the link is the practice's own.
    const { rows } = await q.query(
      `select 1 from phi.review_requests where id = $1 and status = 'sent' and sent_at > now() - interval '1 hour'`,
      [entityId],
    );
    if (rows.length === 0) throw new ValidationError("review_request_unavailable");
    if (config.reviewUrl === null) throw new ValidationError("review_link_unconfigured");
    return { link: config.reviewUrl };
  }
  if (template === "verification_code") {
    // The code row is the entity: a live, unused code only. An expired or used code is never re-sent.
    const { rows } = await q.query<{ code: string }>(
      `select code from phi.phone_verifications where id = $1 and code is not null and verified_at is null and expires_at > now()`,
      [entityId],
    );
    const code = rows[0]?.code;
    if (code === undefined) throw new ValidationError("verification_expired");
    return { code };
  }
  if (template === "booking_confirmed" || template === "appointment_reminder_48h" || template === "appointment_reminder_2h") {
    // The appointment is the entity: provider, date and time come from its row, never a payload.
    const { rows } = await q.query<{ provider_id: string; starts_at: Date }>(
      `select provider_id, starts_at from phi.appointments where id = $1 and status = 'scheduled'`,
      [entityId],
    );
    const row = rows[0];
    const who = row === undefined ? undefined : provider(row.provider_id);
    if (row === undefined || who === undefined) throw new ValidationError("appointment_unavailable");
    return { provider: who.smsName, date: smsDate(row.starts_at), time: smsTime(row.starts_at) };
  }
  if (template === "booking_handoff") {
    // Only a URL on the provider allowlist may go out: never one stored by mistake or tampering.
    const { rows } = await q.query<{ url: string | null }>(`select adapter_result ->> 'url' as url from phi.booking_requests where id = $1`, [entityId]);
    const url = rows[0]?.url ?? null;
    if (url === null || !HANDOFF_URLS.has(url)) throw new ValidationError("handoff_url_unavailable");
    return { link: url };
  }
  if (templateDef(template).slots.length === 0) return {};
  throw new ValidationError("slots_unavailable");
}
