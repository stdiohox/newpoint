/**
 * Inbound SMS intents (docs/automation-architecture.md §5.1) and what each one does.
 * The classifier's enum is the only thing used from the model; its words never reach a
 * patient. Every reply is a fixed template.
 */
import { z } from "zod";
import type { TemplateId } from "./templates.js";

export const INTENTS = ["book", "reschedule", "cancel", "logistics_question", "stop", "help", "crisis", "other"] as const;
export type Intent = (typeof INTENTS)[number];

export const intentSchema = z.object({ intent: z.enum(INTENTS) }).strict();

export const INTENT_SYSTEM = `You sort text messages sent to a medical practice's scheduling line into exactly one category.
Categories:
- book: wants a new appointment.
- reschedule: wants to move an existing appointment.
- cancel: wants to cancel an appointment.
- logistics_question: asks about the office, directions, forms, the video link, hours, billing logistics.
- stop: wants no more texts, in any wording.
- help: asks what this number is or how to get help using it.
- crisis: any sign the sender may harm themselves or someone else, is in danger, or is in an emergency. When unsure between crisis and anything else, choose crisis.
- other: anything else, including any question about symptoms, medication or treatment.
Answer with the category only, in the JSON format required.`;

export type TicketKind = "callback" | "message" | "booking";

/** What an intent does once crisis, STOP and HELP are handled. */
export interface Route {
  readonly ticket: TicketKind;
  readonly reply: TemplateId;
}

/**
 * Phase 6: every request becomes a staff ticket with a neutral acknowledgment. Booking
 * requests become booking_requests in Phase 7 (D1: manual-queue first). Cancelling or
 * moving an appointment by text is never automated in v1 (§5.1: writes create requests only).
 */
export const ROUTES: Readonly<Record<Exclude<Intent, "stop" | "help" | "crisis">, Route>> = {
  book: { ticket: "booking", reply: "booking_callback" },
  reschedule: { ticket: "callback", reply: "team_will_call" },
  cancel: { ticket: "callback", reply: "team_will_call" },
  logistics_question: { ticket: "message", reply: "logistics_reply" },
  other: { ticket: "message", reply: "team_will_call" },
};
