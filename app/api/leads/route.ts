import { after, NextResponse, type NextRequest } from 'next/server';
import { parseLeadInput } from '@/lib/crm/lead-input';
import { intakeEnv, submitLead, triggerLeadAlert } from '@/lib/crm/intake';

/**
 * POST /api/leads: the contact form's endpoint (components/ui/onboarding-form.tsx).
 *
 * Same-origin JSON only. Stores the lead through crm.submit_lead (rate limits
 * live there), then starts the staff alert after the response is sent.
 * Nothing about the visitor is logged, and errors carry no field values.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY = 4_096;

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host || new URL(origin).host !== host) return json(403, { error: 'forbidden' });
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return json(415, { error: 'unsupported' });
  }

  const env = intakeEnv();
  if (!env) return json(503, { error: 'unavailable' });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json(413, { error: 'too_large' });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: 'invalid', fields: [] });
  }

  // Honeypot: a field people never see. A bot that fills it is told "thanks"
  // and nothing is stored.
  if (body && typeof body === 'object' && String((body as Record<string, unknown>).website ?? '') !== '') {
    return json(201, { ok: true });
  }

  const parsed = parseLeadInput(body);
  if (!parsed.ok) return json(400, { error: 'invalid', fields: parsed.fields });

  const ip =
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';

  try {
    const result = await submitLead(env, parsed.lead, ip);
    if (!result.ok) {
      return result.reason === 'rate_limited'
        ? json(429, { error: 'rate_limited' })
        : json(400, { error: 'invalid', fields: [] });
    }
    after(() => triggerLeadAlert(env));
    return json(201, { ok: true });
  } catch {
    console.error(JSON.stringify({ event: 'crm.lead_store_failed' }));
    return json(500, { error: 'server' });
  }
}
