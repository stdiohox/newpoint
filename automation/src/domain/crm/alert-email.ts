/**
 * The new-lead alert email (docs/lead-crm.md).
 *
 * Carries the reason, the time and a link, and nothing about the person: their
 * name, email and phone stay in the CRM behind sign-in, not in inboxes.
 *
 * Sent as HTML (email-layout.ts) with a plain-text alternative.
 */
import type { Email } from "../../adapters/email/resend.js";
import { button, C, esc, FONT, heading, layout, paragraph } from "./email-layout.js";

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

const PRIVACY = "Contact details are only in the CRM, not in this email.";
const WHY = "You get these because new-lead alerts are on for your Newpoint CRM account.";

export function alertEmail(leads: readonly ClaimedLead[], recipients: readonly string[], crmBaseUrl: string): Email {
  if (leads.length === 0) throw new Error("alertEmail needs at least one lead");
  const first = leads[0];
  const single = leads.length === 1 && first !== undefined;
  const subject = single ? `New lead: ${first.reason}` : `${String(leads.length)} new leads in the Newpoint CRM`;

  const lines = leads.flatMap((lead) => [
    `${lead.reason} · ${formatEastern(lead.createdAt)}`,
    `${crmBaseUrl}/leads/${lead.id}`,
    "",
  ]);

  const text = [
    single ? "A new lead came in through the website." : "New leads came in through the website.",
    "",
    ...lines,
    `Open the CRM to see who it is and follow up. ${PRIVACY}`,
    "",
    WHY,
  ].join("\n");

  return { to: recipients, subject, text, html: alertHtml(leads, crmBaseUrl, subject) };
}

/* ------------------------------------------------------------------ HTML -- */

function leadRow(lead: ClaimedLead, crmBaseUrl: string, withLink: boolean): string {
  const href = `${crmBaseUrl}/leads/${lead.id}`;
  const link = withLink
    ? `<td align="right" valign="middle" style="padding:14px 0 14px 12px;border-top:1px solid ${C.border};white-space:nowrap;">
<a href="${esc(href)}" style="font-family:${FONT};font-size:14px;font-weight:600;color:${C.royal};text-decoration:none;">Open&nbsp;&rarr;</a></td>`
    : "";
  return `<tr>
<td valign="middle" style="padding:14px 0;border-top:1px solid ${C.border};">
<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${C.tint};font-family:${FONT};font-size:12px;font-weight:600;letter-spacing:0.02em;color:${C.royal};">${esc(lead.reason)}</span>
<div style="padding-top:6px;font-family:${FONT};font-size:14px;line-height:20px;color:${C.muted};">${esc(formatEastern(lead.createdAt))}</div>
</td>${link}
</tr>`;
}

function alertHtml(leads: readonly ClaimedLead[], crmBaseUrl: string, subject: string): string {
  const single = leads.length === 1;
  const first = leads[0];
  const primaryHref = single && first ? `${crmBaseUrl}/leads/${first.id}` : crmBaseUrl;
  const intro = single
    ? "Someone asked to be contacted through the website."
    : "These came in through the website since the last alert.";
  const rows = leads.map((lead) => leadRow(lead, crmBaseUrl, !single)).join("");

  return layout({
    title: subject,
    preheader: single && first ? `${first.reason} · ${formatEastern(first.createdAt)}` : intro,
    siteOrigin: new URL(crmBaseUrl).origin,
    label: "CRM",
    body: `${heading(single ? "New lead" : `${String(leads.length)} new leads`)}
${paragraph(esc(intro), "margin-bottom:20px;")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border-bottom:1px solid ${C.border};">${rows}</table>
${button(primaryHref, single ? "Open lead in CRM" : "Open the CRM")}
<p style="margin:24px 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted};">${esc(PRIVACY)} Sign in to see who it is and follow up.</p>`,
    footer: esc(WHY),
  });
}
