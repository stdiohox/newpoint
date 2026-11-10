/**
 * The lead pipeline as staff see it. Values match the crm.lead_status enum
 * (automation/supabase/marketing/supabase/migrations/20261109000001_crm.sql).
 */
export const LEAD_STATUSES = ['new', 'contacted', 'scheduled', 'won', 'not_a_fit'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  scheduled: 'Scheduled',
  won: 'Became a patient',
  not_a_fit: 'Not a fit',
};

/** Pale chip + dark text. Every pair clears WCAG AA for small text. */
export const STATUS_TONE: Record<LeadStatus, string> = {
  new: 'bg-[#E1F3FE] text-[#1F6C9F]',
  contacted: 'bg-[#FBF3DB] text-[#7A5200]',
  scheduled: 'bg-[#EDF3EC] text-[#346538]',
  won: 'bg-np-blue-50 text-np-ink',
  not_a_fit: 'bg-np-neutral-100 text-np-neutral-700',
};

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === 'string' && (LEAD_STATUSES as readonly string[]).includes(value);
}

export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  phone: string | null;
  reason: string;
  status: LeadStatus;
  owner_id: string | null;
}

export interface LeadActivity {
  id: number;
  at: string;
  actor_id: string | null;
  kind: 'created' | 'status' | 'owner' | 'note';
  from_status: LeadStatus | null;
  to_status: LeadStatus | null;
  owner_to: string | null;
  body: string | null;
}

const WHEN = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** "Nov 9, 2:14 PM": the practice's own time zone, whoever is looking. */
export function formatWhen(iso: string): string {
  return WHEN.format(new Date(iso));
}

/** Contact notes are short by design (the hint keeps clinical detail out). The DB allows 2,000. */
export const NOTE_MAX = 1000;

export const UUID =/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
