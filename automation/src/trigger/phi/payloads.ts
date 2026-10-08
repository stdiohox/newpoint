/**
 * Every PHI task's payload schema, in one place (docs/automation-architecture.md §6
 * layer 4). Payloads are ids and enums only: a queue, a run's payload view and a
 * retry log must never carry a name, number, date of an appointment or message text.
 * test/phi/queue-hygiene.test.ts walks this registry and fails on any field named like
 * a contact attribute, and on any free string field.
 */
import { z } from "zod";
import { TEMPLATES, type TemplateId } from "../../domain/messaging/templates.js";

const TEMPLATE_IDS = Object.keys(TEMPLATES) as [TemplateId, ...TemplateId[]];

export const PHI_PAYLOADS = {
  "messaging.send-sms": z
    .object({
      template: z.enum(TEMPLATE_IDS),
      contactId: z.uuid(),
      /** The row the message is about (inquiry, appointment, crisis event, …). */
      entityId: z.uuid(),
      step: z.number().int().min(0).max(20),
    })
    .strict(),
  "ops.crisis-page": z.object({ crisisEventId: z.uuid() }).strict(),
} as const;
