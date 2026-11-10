import { CONTACT } from '@/lib/content';
import { EMAIL_PATTERN, LEAD_LIMITS, PHONE_PATTERN } from './form-contract';

/**
 * What /api/leads accepts: the contact form's four fields and nothing else
 * (CLAUDE.md "Compliance"). The rules mirror crm.leads' CHECK constraints in
 * automation/supabase/marketing/supabase/migrations/20261109000001_crm.sql, so a
 * bad value is a 400 here rather than a database error.
 */
export interface LeadInput {
  name: string;
  email: string;
  phone: string | null;
  reason: (typeof CONTACT.reasons)[number];
}

export type LeadField = 'name' | 'email' | 'phone' | 'reason';

export { HONEYPOT_FIELD } from './form-contract';
const EMAIL = EMAIL_PATTERN;
const PHONE = PHONE_PATTERN;

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function parseLeadInput(
  raw: unknown
): { ok: true; lead: LeadInput } | { ok: false; fields: LeadField[] } {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const name = text(body.name);
  const email = text(body.email).toLowerCase();
  const phone = text(body.phone);
  const reason = text(body.reason);

  const fields: LeadField[] = [];
  if (name.length < 1 || name.length > LEAD_LIMITS.name) fields.push('name');
  if (email.length > LEAD_LIMITS.email || !EMAIL.test(email)) fields.push('email');
  if (phone && !PHONE.test(phone)) fields.push('phone');
  if (!(CONTACT.reasons as readonly string[]).includes(reason)) fields.push('reason');
  if (fields.length > 0) return { ok: false, fields };

  return {
    ok: true,
    lead: { name, email, phone: phone || null, reason: reason as LeadInput['reason'] },
  };
}
