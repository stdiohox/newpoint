/**
 * The new-lead alert email (docs/lead-crm.md).
 *
 * Carries the reason, the time and a link, and nothing about the person: their
 * name, email and phone stay in the CRM behind sign-in, not in inboxes.
 *
 * Sent as HTML with a plain-text alternative. The HTML is table-based with
 * inline styles, because that is what Gmail, Outlook and Apple Mail all render
 * the same way. Colours are the site's (app/globals.css): royal #435ba8, ink
 * #131c2e, the warm neutrals. The logo is the PNG served from the site's
 * public/brand: mail clients do not load SVG.
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

const C = {
  page: "#f4f2ed",
  card: "#ffffff",
  border: "#e7e4dd",
  ink: "#131c2e",
  body: "#403d36",
  muted: "#7c776d",
  royal: "#435ba8",
  tint: "#eef1f8",
} as const;

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="border-radius:6px;background:${C.royal};">
<a href="${esc(href)}" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:15px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:6px;">${esc(label)}</a>
</td></tr></table>`;
}

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
  const origin = new URL(crmBaseUrl).origin;
  const logo = `${origin}/brand/newpoint-mark-color.png`;
  const first = leads[0];
  const primaryHref = single && first ? `${crmBaseUrl}/leads/${first.id}` : crmBaseUrl;
  const heading = single ? "New lead" : `${String(leads.length)} new leads`;
  const intro = single
    ? "Someone asked to be contacted through the website."
    : "These came in through the website since the last alert.";
  const preheader = single && first ? `${first.reason} · ${formatEastern(first.createdAt)}` : intro;
  const rows = leads.map((lead) => leadRow(lead, crmBaseUrl, !single)).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.page};">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

<tr><td style="padding:0 4px 20px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle"><img src="${esc(logo)}" width="28" height="28" alt="Newpoint" style="display:block;border:0;"></td>
<td valign="middle" style="padding-left:10px;font-family:${FONT};font-size:15px;font-weight:600;color:${C.ink};">Newpoint <span style="font-weight:400;color:${C.muted};">CRM</span></td>
</tr></table>
</td></tr>

<tr><td style="background:${C.card};border:1px solid ${C.border};border-radius:12px;padding:32px;">
<h1 style="margin:0 0 8px;font-family:${FONT};font-size:24px;line-height:30px;font-weight:700;letter-spacing:-0.01em;color:${C.ink};">${esc(heading)}</h1>
<p style="margin:0 0 20px;font-family:${FONT};font-size:15px;line-height:24px;color:${C.body};">${esc(intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border-bottom:1px solid ${C.border};">${rows}</table>
${button(primaryHref, single ? "Open lead in CRM" : "Open the CRM")}
<p style="margin:24px 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted};">${esc(PRIVACY)} Sign in to see who it is and follow up.</p>
</td></tr>

<tr><td style="padding:20px 4px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.muted};">${esc(WHY)}</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
