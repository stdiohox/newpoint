/**
 * The new-lead alert email (docs/lead-crm.md).
 *
 * Carries the reason, the time and a link, and nothing about the person: their
 * name, email and phone stay in the CRM behind sign-in, not in inboxes.
 */
import type { Email } from "../../adapters/email/resend.js";

export interface ClaimedLead {
  readonly id: string;
  readonly reason: string;
  readonly createdAt: Date;
}

const TIME = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatEastern(at: Date): string {
  return `${TIME.format(at)} ET`;
}

export function alertEmail(leads: readonly ClaimedLead[], recipients: readonly string[], crmBaseUrl: string): Email {
  if (leads.length === 0) throw new Error("alertEmail needs at least one lead");
  const first = leads[0];
  const subject =
    leads.length === 1 && first ? `New lead: ${first.reason}` : `${String(leads.length)} new leads in the Newpoint CRM`;

  const lines = leads.flatMap((lead) => [
    `${lead.reason} · ${formatEastern(lead.createdAt)}`,
    `${crmBaseUrl}/leads/${lead.id}`,
    "",
  ]);

  const text = [
    leads.length === 1 ? "A new lead came in through the website." : "New leads came in through the website.",
    "",
    ...lines,
    "Open the CRM to see who it is and follow up. Contact details are only in the CRM, not in this email.",
    "",
    "You get these because new-lead alerts are on for your Newpoint CRM account.",
  ].join("\n");

  return { to: recipients, subject, text };
}
