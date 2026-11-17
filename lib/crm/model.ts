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

/* --------------------------------------------------------------- lead calls -- */

/** One row of crm.lead_calls (automation/.../20261117000001_crm_lead_calls.sql): Joyce's call. */
export interface LeadCall {
  lead_id: string;
  status: 'dialing' | 'retry' | 'placed' | 'ended' | 'not_placed';
  attempts: number;
  placed_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  end_reason: string | null;
  outcome: string | null;
  state: string | null;
  modality: string | null;
  seen_before: string | null;
  preferred_windows: string[] | null;
  error: string | null;
}

export const CALL_OUTCOME_LABEL: Record<string, string> = {
  appointment_requested: 'Asked for an appointment',
  callback_requested: 'Asked the team to call back',
  not_interested: 'No longer interested',
  wrong_person: 'Wrong person or number',
  language_help: 'Needs help in another language',
  under_18: 'Under 18: a staff member should call back',
  crisis: 'Possible crisis: call them back now',
  voicemail: 'Voicemail, message left',
  no_answer: 'No answer',
  no_outcome: 'Answered, nothing recorded',
  failed: 'The call did not go through',
};

export const CALL_DETAIL_LABEL: Record<string, string> = {
  NJ: 'New Jersey',
  PA: 'Pennsylvania',
  other: 'Another state',
  unknown: 'Not sure',
  in_person: 'In person',
  telehealth: 'Telehealth',
  either: 'Either',
  yes: 'Yes',
  no: 'No',
  weekday_morning: 'Weekday mornings',
  weekday_afternoon: 'Weekday afternoons',
  weekday_evening: 'Weekday evenings',
  weekend: 'Weekends',
};

/** What staff see for a call that is not finished, or never went out. */
export function callStatusLabel(call: LeadCall): string {
  switch (call.status) {
    case 'dialing':
      return 'Calling now';
    case 'retry':
      return 'Call could not start; trying again shortly';
    case 'placed':
      return 'Call in progress';
    case 'not_placed':
      switch (call.error) {
        case 'invalid_number':
          return 'Not called: the number is not a valid US number';
        case 'outside_area':
          return 'Not called: Joyce only calls NJ, PA, NY, DE, MD and DC area codes';
        case 'expired':
          return 'Not called: the lead was already contacted, or more than a day old';
        default:
          return 'Not called: the call could not be placed';
      }
    case 'ended':
      return CALL_OUTCOME_LABEL[call.outcome ?? ''] ?? 'Ended';
  }
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

/* ------------------------------------------------------------ Google reviews -- */

export const REVIEW_STATUSES = ['drafted', 'awaiting_approval', 'approved', 'rejected', 'posted', 'expired'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** One row of crm.review_queue() (automation/.../20261111000002_gbp_review_approval.sql). */
export interface ReviewRow {
  id: string;
  rating: number;
  body: string | null;
  reviewer: string | null;
  created_at: string;
  reply_status: ReviewStatus;
  status_reason: string | null;
  reply_draft: string | null;
  approved_reply: string | null;
  decided_by_name: string | null;
  decided_at: string | null;
  replied_at: string | null;
}

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  drafted: 'Waiting for a decision',
  awaiting_approval: 'Waiting for a decision',
  approved: 'Approved, posting within 15 minutes',
  rejected: 'Not posted',
  posted: 'Posted to Google',
  expired: 'Not posted',
};

/** The reply rules the automation enforces (automation/src/domain/content-rules/newpoint-rules.ts), in staff words. */
export const REPLY_RULE_LABEL: Record<string, string> = {
  implies_patient:
    'It must not say or hint that the reviewer is or was a patient: no "your", and "you" only in "thank you" or "we invite you to call"; no visit, wait, appointment, care, staff, team, feeling or improvement.',
  provider_name: 'It names no provider and uses no title.',
  clinical_term: 'It uses no clinical or health word, not even "mental health".',
  names_reviewer: 'It does not name the reviewer.',
  repeats_review: 'It repeats nothing from the review and mentions no detail of it.',
  other_phone: 'The only phone number in it is the practice line.',
  post_rule: 'No prices, offers, hours, addresses, links, titles or outcomes.',
};

/** What staff check before approving: the same seven rules the automation re-checks before posting. */
export const REPLY_RULES = Object.values(REPLY_RULE_LABEL);

/** Why a reply stopped, in staff words. Codes are written in the automation source. */
export function reviewReasonLabel(code: string | null): string | undefined {
  if (!code) return undefined;
  if (code.startsWith('rule_at_post')) {
    const rule = REPLY_RULE_LABEL[code.slice('rule_at_post_'.length)];
    return rule ? `Not posted: the approved text broke a reply rule. ${rule}` : 'Not posted: the approved text broke a reply rule.';
  }
  const known: Record<string, string> = {
    reply_failed_validator: 'No automatic draft passed the reply rules. You can write one below; the same rules are checked before it is posted.',
    staff_skipped: 'Skipped by staff.',
    replied_elsewhere: 'A reply was already on Google, so nothing was posted.',
    review_changed: 'The review was edited after the reply was approved, so it was not posted. Read it again before deciding.',
    post_failed: 'Google refused the reply three times. You can approve it again to retry, or leave the review unanswered.',
    crisis_review: 'This review mentions self-harm. No reply is drafted or posted; the clinical lead decides on any outreach, outside Google.',
  };
  return known[code];
}

export const REPLY_MAX = 1000;
/** Google's opaque review id, not a UUID. The database function is the real gate. */
export const REVIEW_ID = /^[\w-]{1,200}$/;

export function isPendingReview(status: ReviewStatus): boolean {
  return status === 'drafted' || status === 'awaiting_approval';
}

/** A refused or skipped review staff may still answer from the CRM (crm.decide_review allows the same set). */
export function canReopenReview(review: Pick<ReviewRow, 'reply_status' | 'status_reason'>): boolean {
  if (review.reply_status !== 'rejected' || !review.status_reason) return false;
  return (
    ['reply_failed_validator', 'staff_skipped', 'post_failed'].includes(review.status_reason) ||
    review.status_reason.startsWith('rule_at_post')
  );
}
