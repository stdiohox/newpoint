/**
 * Cartesia agent calls, for Joyce's outbound call to a new website lead
 * (docs/lead-crm.md "Lead calls"; the agent's script is docs/voice-agent-outbound.md).
 *
 * CRM side of the zone line, on purpose: the lead CRM lives in the marketing
 * Supabase by owner decision (2026-11-09), and this only dials a lead the CRM
 * already holds and reads back enum answers. It is not adapters/voice (the PHI
 * receptionist), and it imports nothing from the PHI zone.
 *
 * Bodies are parsed with zod and only the fields we keep leave this module: no
 * transcript text, no summary. A non-2xx becomes a VendorHttpError with the status only.
 */
import { z } from "zod";
import { VendorHttpError } from "../../lib/errors.js";
import type { FetchLike } from "../../lib/http.js";

const API = "https://api.cartesia.ai";
export const CARTESIA_VERSION = "2026-08-14";

/** Which branch of the script Joyce takes: the four appointment questions, or "the team will call you back". */
export type RequestType = "new_patient" | "other";

export interface PlaceCallRequest {
  /** E.164 US number, from callableNumber(). */
  readonly to: string;
  /** Spoken in the greeting ("May I speak with {{first_name}}?"). */
  readonly firstName: string;
  readonly requestType: RequestType;
}

export type PlaceCallResult =
  | { readonly ok: true; readonly callId: string }
  /** Cartesia refused this destination (bad number, not allowed). Not retried. */
  | { readonly ok: false; readonly error: "rejected" }
  /** Accepted or not, we cannot tell (unreadable 200). Never retried: a second request could dial twice. */
  | { readonly ok: false; readonly error: "ambiguous" };

export const OUTCOMES = [
  "appointment_requested",
  "callback_requested",
  "not_interested",
  "wrong_person",
  "language_help",
  "under_18",
  "crisis",
] as const;
export type SpokenOutcome = (typeof OUTCOMES)[number];

const WINDOWS = ["weekday_morning", "weekday_afternoon", "weekday_evening", "weekend"] as const;

/** What Joyce sends with record_outcome. Unknown or malformed optional fields are dropped, not fatal. */
export const outcomeArgsSchema = z.object({
  outcome: z.enum(OUTCOMES),
  state: z.enum(["NJ", "PA", "other", "unknown"]).optional().catch(undefined),
  modality: z.enum(["in_person", "telehealth", "either"]).optional().catch(undefined),
  seen_before: z.enum(["yes", "no", "unknown"]).optional().catch(undefined),
  preferred_windows: z.array(z.enum(WINDOWS)).max(4).optional().catch(undefined),
});

export interface RecordedAnswers {
  readonly outcome: SpokenOutcome;
  readonly state: "NJ" | "PA" | "other" | "unknown" | null;
  readonly modality: "in_person" | "telehealth" | "either" | null;
  readonly seenBefore: "yes" | "no" | "unknown" | null;
  readonly preferredWindows: readonly (typeof WINDOWS)[number][];
}

/** Pure: Joyce's record_outcome arguments as we keep them, or null when unusable. */
export function readOutcomeArgs(args: unknown): RecordedAnswers | null {
  const parsed = outcomeArgsSchema.safeParse(args ?? {});
  if (!parsed.success) return null;
  return {
    outcome: parsed.data.outcome,
    state: parsed.data.state ?? null,
    modality: parsed.data.modality ?? null,
    seenBefore: parsed.data.seen_before ?? null,
    preferredWindows: [...new Set(parsed.data.preferred_windows ?? [])],
  };
}

/** What crm.record_lead_call stores. */
export interface CallResult {
  /** Cartesia's status; "other" for any value it adds later (treated as not finished). */
  readonly status: "created" | "started" | "completed" | "failed" | "other";
  readonly startedAt: Date | null;
  readonly endedAt: Date | null;
  readonly endReason: string | null;
  /** Joyce's last record_outcome call, if she made one ("crisis" is never overwritten). */
  readonly recorded: RecordedAnswers | null;
  /** Joyce used transfer_to_number (only ever 988 in her config). */
  readonly transferred: boolean;
}

export interface CallsClient {
  placeCall(request: PlaceCallRequest): Promise<PlaceCallResult>;
  /** null = not found or unreadable (the task treats it as not finished yet). */
  getCall(callId: string): Promise<CallResult | null>;
}

export interface CartesiaOptions {
  readonly apiKey: string;
  readonly agentId: string;
  readonly fromNumberId: string;
  /** POST: no retry inside (a repeated request could dial twice). */
  readonly placeFetch: FetchLike;
  /** GET: safe to retry. */
  readonly readFetch: FetchLike;
}

const CALL_ID = /^[A-Za-z0-9_-]{1,80}$/;

const placeResponse = z.object({
  calls: z
    .array(z.object({ agent_call_id: z.string().regex(CALL_ID).optional(), error: z.unknown().optional() }))
    .min(1),
});

const isoOrNull = z.iso.datetime({ offset: true }).nullable().optional().catch(null);

const callResponse = z.object({
  status: z.string(),
  start_time: isoOrNull,
  end_time: isoOrNull,
  end_reason: z.string().nullable().optional().catch(null),
  transcript: z
    .array(
      z.object({
        tool_calls: z
          .array(z.object({ name: z.string(), arguments: z.unknown().optional() }))
          .nullable()
          .optional()
          .catch(null),
      }),
    )
    .nullable()
    .optional()
    .catch(null),
});

const KNOWN_STATUS = new Set(["created", "started", "completed", "failed"]);

/** Pure: the fields we keep from a Get Call body. Exported for tests. */
export function readCall(body: unknown): CallResult | null {
  const parsed = callResponse.safeParse(body);
  if (!parsed.success) return null;
  const call = parsed.data;
  let recorded: RecordedAnswers | null = null;
  let transferred = false;
  for (const turn of call.transcript ?? []) {
    for (const tool of turn.tool_calls ?? []) {
      if (tool.name === "transfer_to_number") transferred = true;
      if (tool.name !== "record_outcome" || recorded?.outcome === "crisis") continue;
      recorded = readOutcomeArgs(tool.arguments) ?? recorded;
    }
  }
  return {
    status: KNOWN_STATUS.has(call.status) ? (call.status as CallResult["status"]) : "other",
    startedAt: call.start_time ? new Date(call.start_time) : null,
    endedAt: call.end_time ? new Date(call.end_time) : null,
    endReason: call.end_reason ?? null,
    recorded,
    transferred,
  };
}

export function createCartesiaCalls(options: CartesiaOptions): CallsClient {
  const headers = {
    authorization: `Bearer ${options.apiKey}`,
    "x-api-key": options.apiKey,
    "cartesia-version": CARTESIA_VERSION,
  };
  return {
    async placeCall(request) {
      const response = await options.placeFetch(`${API}/agents/calls`, {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          agent_id: options.agentId,
          from_number_id: options.fromNumberId,
          ringing_timeout_seconds: 30,
          max_call_duration_minutes: 10,
          outbound_calls: [
            {
              to_number: request.to,
              dynamic_variables: { first_name: request.firstName, request_type: request.requestType },
            },
          ],
        }),
      });
      if (!response.ok) throw new VendorHttpError("cartesia", response.status);
      const parsed = placeResponse.safeParse(await response.json().catch(() => null));
      // 200 with a body we cannot read: Cartesia may have dialled.
      if (!parsed.success) return { ok: false, error: "ambiguous" };
      const first = parsed.data.calls[0];
      if (first?.agent_call_id) return { ok: true, callId: first.agent_call_id };
      return first?.error === undefined ? { ok: false, error: "ambiguous" } : { ok: false, error: "rejected" };
    },

    async getCall(callId) {
      if (!CALL_ID.test(callId)) return null;
      const response = await options.readFetch(`${API}/agents/calls/${callId}`, { headers });
      if (response.status === 404) return null;
      if (!response.ok) throw new VendorHttpError("cartesia", response.status);
      return readCall(await response.json().catch(() => null));
    },
  };
}

/**
 * Area codes Joyce may call: New Jersey, Pennsylvania and their Eastern-time
 * neighbours (New York, Delaware, Maryland, DC), where patients of an NJ/PA
 * practice live and work. Everything else is refused before dialling: it keeps
 * calls inside the callee's 08:00–21:00 (all Eastern), and premium-rate,
 * toll-free, personal (5XX) and Caribbean/Canadian +1 numbers can never be
 * dialled at the practice's cost (security review 2026-11-17).
 */
export const CALLABLE_AREA_CODES: ReadonlySet<string> = new Set([
  // New Jersey
  "201", "551", "609", "640", "732", "848", "856", "862", "908", "973",
  // Pennsylvania
  "215", "223", "267", "272", "412", "445", "484", "570", "582", "610", "717", "724", "814", "835", "878",
  // New York
  "212", "315", "329", "332", "347", "363", "516", "518", "585", "607", "624", "631", "646", "680", "716",
  "718", "838", "845", "914", "917", "929", "934",
  // Delaware, Maryland, DC
  "302", "227", "240", "301", "410", "443", "667", "202", "771",
]);

export type CallableNumber =
  | { readonly ok: true; readonly e164: string }
  | { readonly ok: false; readonly error: "invalid_number" | "outside_area" };

/**
 * A stored phone as E.164 (+1NXXNXXXXXX) when Joyce may call it. The form takes
 * any of "(609) 527-9438", "609.527.9438", "+1 609 527 9438", "1-609-527-9438".
 */
export function callableNumber(phone: string): CallableNumber {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+") && !trimmed.startsWith("+1")) return { ok: false, error: "outside_area" };
  let digits = trimmed.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return { ok: false, error: "invalid_number" };
  if (!CALLABLE_AREA_CODES.has(digits.slice(0, 3))) return { ok: false, error: "outside_area" };
  return { ok: true, e164: `+1${digits}` };
}

/** The first word of a name, for the greeting. Letters, apostrophes and hyphens only, or null. */
export function firstName(name: string): string | null {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return /^[\p{L}][\p{L}'’-]{0,39}$/u.test(first) ? first : null;
}
