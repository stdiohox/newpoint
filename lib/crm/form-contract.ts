/**
 * What the contact form (a client component) and /api/leads must agree on.
 * No imports, on purpose: lib/content.ts must not reach the browser bundle.
 */

/**
 * The honeypot's field name. Deliberately not "website", "url", "company" or
 * anything else browsers and password managers autofill: a real visitor whose
 * browser filled it would be told "thanks" while nothing was stored.
 */
export const HONEYPOT_FIELD = 'np_hp_x7';

/** Field limits, mirrored by crm.leads' CHECK constraints. */
export const LEAD_LIMITS = { name: 120, email: 254, phoneMax: 32 } as const;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_PATTERN = /^[0-9 ().+-]{7,32}$/;
