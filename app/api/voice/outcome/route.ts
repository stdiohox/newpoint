import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * POST /api/voice/outcome: the endpoint behind Joyce's `record_outcome` webhook
 * tool on outbound lead calls (docs/voice-agent-outbound.md, docs/lead-crm.md
 * "Lead calls").
 *
 * Stores nothing itself. It checks the shared secret, keeps only the enum
 * fields, and hands them to the Trigger task crm.lead-call-outcome, which notes
 * them on the call and, on a crisis, emails staff while the call is still on.
 * If that hand-off fails, the crm.lead-calls sweep still reads the same answers
 * from Cartesia after the call ends.
 *
 * Env (Vercel, server-side):
 *   CRM_VOICE_TOOL_SECRET  32+ characters; the tool sends it as x-newpoint-voice-secret
 *   TRIGGER_SECRET_KEY     newpoint-marketing prod key (already set for lead alerts)
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEADER = 'x-newpoint-voice-secret';
const MAX_BODY = 4_096;

const OUTCOMES = new Set([
  'appointment_requested',
  'callback_requested',
  'not_interested',
  'wrong_person',
  'language_help',
  'under_18',
  'crisis',
]);
const ENUMS: Record<string, ReadonlySet<string>> = {
  state: new Set(['NJ', 'PA', 'other', 'unknown']),
  modality: new Set(['in_person', 'telehealth', 'either']),
  seen_before: new Set(['yes', 'no', 'unknown']),
};
const WINDOWS = new Set(['weekday_morning', 'weekday_afternoon', 'weekday_evening', 'weekend']);
const CALL_ID = /^[A-Za-z0-9_-]{1,80}$/;

function text(status: number, body: string) {
  return new NextResponse(body, { status, headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' } });
}

function secretMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Only the known enum fields survive; anything else in the body is dropped unread. */
function pickOutcome(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') return null;
  const raw = body as Record<string, unknown>;
  if (typeof raw.call_id !== 'string' || !CALL_ID.test(raw.call_id)) return null;
  if (typeof raw.outcome !== 'string' || !OUTCOMES.has(raw.outcome)) return null;
  const out: Record<string, unknown> = { call_id: raw.call_id, outcome: raw.outcome };
  for (const [field, allowed] of Object.entries(ENUMS)) {
    const value = raw[field];
    if (typeof value === 'string' && allowed.has(value)) out[field] = value;
  }
  if (Array.isArray(raw.preferred_windows)) {
    const windows = [...new Set(raw.preferred_windows.filter((w): w is string => typeof w === 'string' && WINDOWS.has(w)))];
    if (windows.length > 0) out.preferred_windows = windows.slice(0, 4);
  }
  return out;
}

export async function POST(request: NextRequest) {
  const secret = process.env.CRM_VOICE_TOOL_SECRET;
  if (!secret || secret.length < 32) return text(503, 'Unavailable.');
  if (!secretMatches(request.headers.get(HEADER), secret)) return text(401, 'Unauthorized.');

  const raw = await request.text();
  if (raw.length > MAX_BODY) return text(413, 'Too large.');
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return text(400, 'Not saved.');
  }
  const outcome = pickOutcome(body);
  if (!outcome) return text(400, 'Not saved.');

  const triggerKey = process.env.TRIGGER_SECRET_KEY;
  if (!triggerKey) {
    console.error(JSON.stringify({ event: 'crm.voice_outcome_no_trigger_key' }));
    return text(200, 'Saved.');
  }
  try {
    const response = await fetch('https://api.trigger.dev/api/v1/tasks/crm.lead-call-outcome/trigger', {
      method: 'POST',
      headers: { authorization: `Bearer ${triggerKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ payload: outcome }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) console.error(JSON.stringify({ event: 'crm.voice_outcome_trigger_failed', status: response.status }));
  } catch {
    console.error(JSON.stringify({ event: 'crm.voice_outcome_trigger_failed', status: null }));
  }
  // Joyce carries on either way: the sweep reads the same answers from Cartesia after the call.
  return text(200, 'Saved.');
}
