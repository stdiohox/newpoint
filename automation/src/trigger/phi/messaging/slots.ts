/**
 * Slot values for templates, read from the row the message is about. The task
 * payload carries ids only (§0.4), so a date, a time or a provider name never sits in
 * a queue. Templates whose source rows arrive in later phases are refused here until
 * their resolver exists.
 */
import type { Queryable } from "../../../lib/db-phi.js";
import { ValidationError } from "../../../lib/errors.js";
import { templateDef, type Slots, type TemplateId } from "../../../domain/messaging/templates.js";

export function resolveSlots(_q: Queryable, template: TemplateId): Promise<Slots> {
  if (templateDef(template).slots.length === 0) return Promise.resolve({});
  return Promise.reject(new ValidationError("slots_unavailable"));
}
