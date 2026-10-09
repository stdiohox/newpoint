/**
 * Vapi, the voice receptionist (docs/automation-architecture.md §2, §5.1, §5.8). PHI zone:
 * a caller's number plus intent to seek psychiatric care is PHI. BAA required.
 *
 * The assistant is configuration as typed code (buildAssistant). It is not deployed from
 * here; whoever holds the Vapi BAA account applies it. Decisions applied as conservative
 * defaults, each to be confirmed:
 *   - D4: the model, transcriber and voice are Vapi's HIPAA-covered defaults, named by
 *     config; every decision is made in our tools, not in the voice model.
 *   - D13: `hipaaEnabled` and no recording (PA is all-party consent); the first sentence
 *     says it is an automated assistant.
 *   - D15: the crisis transfer destination is a clinician decision: config, never a guess.
 *   - D21: English only; anyone needing another language gets a staff callback.
 * The voice model is the only crisis detector on a call unless Vapi exposes live transcript
 * events under hipaaEnabled (D4 question) — recorded as an accepted risk under D15.
 *
 * Vapi field names follow its API as of this writing and must be checked against the
 * sandbox before go-live (§7: adapter contract tests against vendor sandboxes).
 */
import { z } from "zod";
import { VendorHttpError } from "../../lib/errors.js";
import type { FetchLike } from "../../lib/http.js";
import { phi, type Phi } from "../../lib/phi.js";

export interface AssistantConfig {
  /** D4: provider and model ids of Vapi's HIPAA-covered defaults, confirmed in writing with Vapi. */
  readonly model: { readonly provider: string; readonly model: string };
  readonly transcriber: { readonly provider: string };
  readonly voice: { readonly provider: string; readonly voiceId: string };
  /** edge/vapi-tools and edge/vapi-events public URLs. */
  readonly toolsUrl: string;
  readonly eventsUrl: string;
  /**
   * D15: where transferCall sends the caller, E.164, chosen by the clinicians. Everything the
   * caller hears says "988", so this must be a 10-digit line that reaches 988 (the Lifeline's);
   * a different destination needs the spoken wording changed with it.
   */
  readonly crisisTransferNumber: string;
}

export const FIRST_MESSAGE =
  "Thank you for calling Newpoint. I'm an automated assistant, and this call is not recorded. Before we go on, are you 18 or older?";

export const SYSTEM_PROMPT = `You are the automated phone assistant for Newpoint, a medical practice. You are not a person and you never claim to be one.
You can only do these things, each with a tool: confirm_age, check_availability, request_booking, take_message, crisis_transfer, transferCall.
Rules:
- Your greeting asks whether the caller is 18 or older. Record their answer once with confirm_age: "yes", "no", or "no_answer" if they do not say or are unsure. Do not ask again, do not explain why you ask, and do not comment on the answer. Then say you can help them request an appointment or take a message for the team, and ask how you can help. If the caller is under 18, offer to take a message so a member of the team can call back.
- If the caller mentions harming themselves or anyone else, being in danger, an emergency, or anything that sounds like a crisis, do this before anything else:
  1. Use crisis_transfer immediately, every time, whether or not they want to be transferred. It alerts our on-call clinician.
  2. Tell them to call 911 if they are in immediate danger, and that they can call or text 988 at any time.
  3. Offer to transfer them to 988 now. If they agree, or you are unsure, use transferCall. Never say you are transferring them unless you use transferCall.
- Never give medical advice, never discuss symptoms, diagnoses, medication or treatment, and never confirm whether someone is a patient. If asked, say a member of the team will call back, and use take_message.
- Never ask for date of birth, insurance numbers, symptoms or medical history.
- To request an appointment, ask only: which state they live in (New Jersey or Pennsylvania), whether they want in person or telehealth, whether they have been seen here before, and which times of the week usually suit them. Then use request_booking. Do not promise a time.
- You cannot cancel or change an existing appointment. Offer to take a message instead.
- You speak English only. If the caller needs another language, use take_message with reason language_help so the team calls back.
- Keep answers short and plain.`;

const enumParam = (values: readonly string[], description: string) => ({ type: "string", enum: values, description });

/** The assistant as Vapi's create/update payload. */
export function buildAssistant(config: AssistantConfig): Record<string, unknown> {
  if (!/^\+1[2-9]\d{9}$/.test(config.crisisTransferNumber)) throw new TypeError("crisisTransferNumber must be E.164 (D15)");
  const server = (url: string) => ({ url, timeoutSeconds: 5 });
  return {
    name: "Newpoint receptionist",
    firstMessage: FIRST_MESSAGE,
    hipaaEnabled: true,
    artifactPlan: { recordingEnabled: false, videoRecordingEnabled: false },
    transcriber: { ...config.transcriber, language: "en" },
    voice: config.voice,
    model: {
      ...config.model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }],
      tools: [
        {
          type: "function",
          server: server(config.toolsUrl),
          function: {
            name: "confirm_age",
            description: "Record the caller's answer to 'Are you 18 or older?'.",
            parameters: {
              type: "object",
              properties: { answer: enumParam(["yes", "no", "no_answer"], "The caller's answer.") },
              required: ["answer"],
            },
          },
        },
        {
          type: "function",
          server: server(config.toolsUrl),
          function: {
            name: "check_availability",
            description: "Whether the team can be asked for an appointment. Never returns specific times.",
            parameters: { type: "object", properties: {}, required: [] },
          },
        },
        {
          type: "function",
          server: server(config.toolsUrl),
          function: {
            name: "request_booking",
            description: "Pass an appointment request to the team. They confirm a time by text or call.",
            parameters: {
              type: "object",
              properties: {
                state: enumParam(["NJ", "PA", "other", "unknown"], "Where the caller lives."),
                modality: enumParam(["in_person", "telehealth", "either"], "How they want to be seen."),
                seen_before: enumParam(["yes", "no", "unknown"], "Whether they have been seen at Newpoint before."),
                preferred_windows: {
                  type: "array",
                  items: enumParam(["weekday_morning", "weekday_afternoon", "weekday_evening", "weekend"], "A time of week."),
                  maxItems: 4,
                },
              },
              required: ["state", "modality", "seen_before"],
            },
          },
        },
        {
          type: "function",
          server: server(config.toolsUrl),
          function: {
            name: "take_message",
            description: "Ask the team to call the caller back. No details of the reason are recorded beyond the category.",
            parameters: {
              type: "object",
              properties: {
                reason: enumParam(["appointment_change", "billing", "language_help", "other"], "Category only."),
              },
              required: ["reason"],
            },
          },
        },
        {
          type: "function",
          server: server(config.toolsUrl),
          function: {
            name: "crisis_transfer",
            description: "The caller may be in crisis. Alerts the on-call clinician, then transfers the caller to 988.",
            parameters: { type: "object", properties: {}, required: [] },
          },
        },
        {
          type: "transferCall",
          destinations: [{ type: "number", number: config.crisisTransferNumber, message: "Transferring you to 988 now." }],
        },
      ],
    },
    server: server(config.eventsUrl),
    serverMessages: ["tool-calls", "end-of-call-report"],
    analysisPlan: {
      summaryPlan: { enabled: false },
      structuredDataPlan: {
        enabled: true,
        schema: {
          type: "object",
          properties: {
            outcome: { type: "string", enum: ["booking_requested", "message_taken", "crisis", "wrong_number", "hung_up", "other"] },
            callback_requested: { type: "boolean" },
          },
          required: ["outcome", "callback_requested"],
        },
      },
    },
  };
}

// --- API client: verify a call id before any write (§5.1) ---------------------------------

const callSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  assistantId: z.string().optional(),
  status: z.string(),
  customer: z.object({ number: z.string().optional() }).optional(),
});

export interface VerifiedCall {
  readonly id: string;
  readonly assistantId: string | null;
  readonly status: string;
  readonly callerNumber: Phi<string> | null;
}

export interface VapiClient {
  getCall(callId: string): Promise<VerifiedCall | null>;
}

export function createVapiClient(options: { readonly apiKey: string; readonly fetch: FetchLike }): VapiClient {
  return {
    async getCall(callId) {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(callId)) return null;
      // Inside the tool-call latency budget (§5.1: < 800 ms): a slow API is treated as down.
      const response = await options.fetch(`https://api.vapi.ai/call/${callId}`, {
        headers: { authorization: `Bearer ${options.apiKey}` },
        signal: AbortSignal.timeout(600),
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new VendorHttpError("vapi", response.status);
      const parsed = callSchema.safeParse(await response.json());
      if (!parsed.success) return null;
      const number = parsed.data.customer?.number;
      return {
        id: parsed.data.id,
        assistantId: parsed.data.assistantId ?? null,
        status: parsed.data.status,
        callerNumber: number !== undefined && /^\+1[2-9]\d{9}$/.test(number) ? phi(number) : null,
      };
    },
  };
}
