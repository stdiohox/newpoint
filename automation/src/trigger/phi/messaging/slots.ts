/**
 * Slot values for templates, read from the row the message is about. The task
 * payload carries ids only (§0.4), so a date, a time, a provider name or a code never
 * sits in a queue. Templates whose source rows arrive in later phases are refused here
 * until their resolver exists.
 */
import type { Queryable } from "../../../lib/db-phi.js";
import { ValidationError } from "../../../lib/errors.js";
import { templateDef, type Slots, type TemplateId } from "../../../domain/messaging/templates.js";

export async function resolveSlots(q: Queryable, template: TemplateId, entityId: string): Promise<Slots> {
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
  if (templateDef(template).slots.length === 0) return {};
  throw new ValidationError("slots_unavailable");
}
