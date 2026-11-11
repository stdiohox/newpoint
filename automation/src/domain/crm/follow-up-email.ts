/**
 * Follow-up emails to staff (docs/lead-crm.md, "Follow-up nudges"):
 *
 * - the stale-lead nudge: leads still "New" past the first threshold (to the
 *   front desk) or the second (to everyone with alerts on) — 4 h / 24 h for an
 *   existing patient, 24 h / 72 h otherwise (crm.stale_leads);
 * - the Monday summary: last week's counts.
 *
 * Like the new-lead alert, neither carries a name or contact detail: a lead is
 * its reason, its time and a link.
 */
import { createHash } from "node:crypto";
import type { Email } from "../../adapters/email/resend.js";
import { formatEastern } from "./alert-email.js";
import { button, C, esc, FONT, heading, layout, paragraph } from "./email-layout.js";

export interface StaleLead {
  readonly id: string;
  readonly reason: string;
  readonly createdAt: Date;
  /** 1 = 24 h, 2 = 72 h. */
  readonly level: 1 | 2;
}

const WHY = "You get these because new-lead alerts are on for your Newpoint CRM account.";

export function ageLabel(createdAt: Date, now: Date): string {
  const hours = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 3_600_000));
  if (hours < 48) return `${String(hours)} hours ago`;
  return `${String(Math.floor(hours / 24))} days ago`;
}

function leadRows(leads: readonly StaleLead[], crmBaseUrl: string, now: Date): string {
  return leads
    .map(
      (lead) => `<tr>
<td valign="middle" style="padding:12px 0;border-top:1px solid ${C.border};">
<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${C.tint};font-family:${FONT};font-size:12px;font-weight:600;letter-spacing:0.02em;color:${C.royal};">${esc(lead.reason)}</span>
<div style="padding-top:6px;font-family:${FONT};font-size:14px;line-height:20px;color:${C.muted};">Came in ${esc(formatEastern(lead.createdAt))} · ${esc(ageLabel(lead.createdAt, now))}</div>
</td>
<td align="right" valign="middle" style="padding:12px 0 12px 12px;border-top:1px solid ${C.border};white-space:nowrap;">
<a href="${esc(`${crmBaseUrl}/leads/${lead.id}`)}" style="font-family:${FONT};font-size:14px;font-weight:600;color:${C.royal};text-decoration:none;">Open&nbsp;&rarr;</a></td>
</tr>`,
    )
    .join("");
}

export function nudgeEmail(
  level: 1 | 2,
  leads: readonly StaleLead[],
  recipients: readonly string[],
  crmBaseUrl: string,
  now: Date = new Date(),
): Email {
  if (leads.length === 0) throw new Error("nudgeEmail needs at least one lead");
  const n = leads.length;
  const plural = n === 1 ? "lead" : "leads";
  const subject =
    level === 1
      ? `Reminder: ${String(n)} ${plural} waiting for a first call`
      : `Still waiting: ${String(n)} ${plural} not contacted`;
  const intro =
    level === 1
      ? `${n === 1 ? "This lead is" : "These leads are"} still marked New with no contact recorded. A call today makes sure nobody waits too long.`
      : `${n === 1 ? "This lead is" : "These leads are"} still not contacted. Please call today. Mark Not a fit only after you have spoken with them.`;
  const ask =
    "Once you have reached them, open the lead and set the status to Contacted so the reminders stop. A voicemail is not contact.";

  const text = [
    intro,
    "",
    ...leads.flatMap((lead) => [
      `${lead.reason} · came in ${formatEastern(lead.createdAt)} (${ageLabel(lead.createdAt, now)})`,
      `${crmBaseUrl}/leads/${lead.id}`,
      "",
    ]),
    ask,
    "",
    WHY,
  ].join("\n");

  const html = layout({
    title: subject,
    preheader: intro,
    siteOrigin: new URL(crmBaseUrl).origin,
    label: "CRM",
    body: `${heading(level === 1 ? "Waiting for a first call" : "Still not contacted")}
${paragraph(esc(intro), "margin-bottom:20px;")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border-bottom:1px solid ${C.border};">${leadRows(leads, crmBaseUrl, now)}</table>
${button(`${crmBaseUrl}?status=new`, "Open the CRM")}
<p style="margin:24px 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted};">${esc(ask)}</p>`,
    footer: esc(WHY),
  });

  // A retry after a send that was not recorded must not email twice.
  const key = createHash("sha256").update(leads.map((lead) => lead.id).sort().join(",")).digest("hex").slice(0, 32);
  return { to: recipients, subject, text, html, idempotencyKey: `lead-nudge/${String(level)}/${key}` };
}

/* ------------------------------------------------------------- weekly -- */

export interface WeeklySummary {
  readonly from: string;
  readonly to: string;
  readonly new_in: number;
  readonly by_reason: Readonly<Record<string, number>>;
  readonly moved: Readonly<Record<string, number>>;
  readonly open: Readonly<Record<string, number>>;
  readonly untouched_new: number;
  readonly stalled_contacted: number;
  readonly oldest_new_hours: number | null;
}

const STATUS_LABEL: Readonly<Record<string, string>> = {
  new: "New",
  contacted: "Contacted",
  scheduled: "Scheduled",
  won: "Became a patient",
  not_a_fit: "Not a fit",
};

const DAY = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" });

/** "Nov 3 – Nov 9" for a [from, to) window; `to` is the next Monday, so the label ends the day before. */
export function weekLabel(from: string, to: string): string {
  const last = new Date(new Date(to).getTime() - 12 * 3_600_000);
  return `${DAY.format(new Date(from))} – ${DAY.format(last)}`;
}

function statRow(label: string, value: string, strong = false): string {
  return `<tr>
<td style="padding:10px 0;border-top:1px solid ${C.border};font-family:${FONT};font-size:15px;line-height:22px;color:${strong ? C.ink : C.body};${strong ? "font-weight:600;" : ""}">${esc(label)}</td>
<td align="right" style="padding:10px 0 10px 12px;border-top:1px solid ${C.border};font-family:${FONT};font-size:15px;line-height:22px;color:${C.ink};font-weight:600;white-space:nowrap;">${esc(value)}</td>
</tr>`;
}

function count(map: Readonly<Record<string, number>>, key: string): number {
  return map[key] ?? 0;
}

export function weeklySummaryEmail(summary: WeeklySummary, recipients: readonly string[], crmBaseUrl: string): Email {
  const week = weekLabel(summary.from, summary.to);
  const subject = `Newpoint leads: week of ${DAY.format(new Date(summary.from))}`;
  const reasons = Object.entries(summary.by_reason).sort((a, b) => b[1] - a[1]);
  const openNow = ["new", "contacted", "scheduled"].reduce((sum, key) => sum + count(summary.open, key), 0);
  const oldest =
    summary.oldest_new_hours === null
      ? null
      : summary.oldest_new_hours < 48
        ? `${String(summary.oldest_new_hours)} hours`
        : `${String(Math.floor(summary.oldest_new_hours / 24))} days`;

  const textLines = [
    `Your week in leads, ${week}.`,
    "",
    `New leads in: ${String(summary.new_in)}`,
    ...reasons.map(([reason, n]) => `  ${reason}: ${String(n)}`),
    "",
    `Contacted: ${String(count(summary.moved, "contacted"))}`,
    `Scheduled: ${String(count(summary.moved, "scheduled"))}`,
    `Became a patient: ${String(count(summary.moved, "won"))}`,
    `Not a fit: ${String(count(summary.moved, "not_a_fit"))}`,
    "",
    `Open right now: ${String(openNow)} (New ${String(count(summary.open, "new"))}, Contacted ${String(count(summary.open, "contacted"))}, Scheduled ${String(count(summary.open, "scheduled"))})`,
    `Still New after 24 hours: ${String(summary.untouched_new)}${oldest ? ` (oldest: ${oldest})` : ""}`,
    `Contacted but not yet scheduled after 7 days: ${String(summary.stalled_contacted)}`,
    "",
    crmBaseUrl,
    "",
    WHY,
  ];

  const html = layout({
    title: subject,
    preheader: `${String(summary.new_in)} new, ${String(count(summary.moved, "scheduled"))} scheduled, ${String(count(summary.moved, "won"))} became patients.`,
    siteOrigin: new URL(crmBaseUrl).origin,
    label: "CRM",
    body: `${heading("Your week in leads")}
${paragraph(esc(week), `margin-bottom:20px;color:${C.muted};`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;border-bottom:1px solid ${C.border};">
${statRow("New leads in", String(summary.new_in), true)}
${reasons.map(([reason, n]) => statRow(`\u00a0\u00a0\u00a0${reason}`, String(n))).join("")}
${statRow("Contacted", String(count(summary.moved, "contacted")))}
${statRow("Scheduled", String(count(summary.moved, "scheduled")))}
${statRow(STATUS_LABEL["won"] ?? "Became a patient", String(count(summary.moved, "won")))}
${statRow(STATUS_LABEL["not_a_fit"] ?? "Not a fit", String(count(summary.moved, "not_a_fit")))}
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 24px;border-bottom:1px solid ${C.border};">
${statRow("Open right now", String(openNow), true)}
${statRow("\u00a0\u00a0\u00a0New", String(count(summary.open, "new")))}
${statRow("\u00a0\u00a0\u00a0Contacted", String(count(summary.open, "contacted")))}
${statRow("\u00a0\u00a0\u00a0Scheduled", String(count(summary.open, "scheduled")))}
${statRow("Still New after 24 hours", `${String(summary.untouched_new)}${oldest ? ` · oldest ${oldest}` : ""}`, summary.untouched_new > 0)}
${statRow("Contacted, not yet scheduled after 7 days", String(summary.stalled_contacted), summary.stalled_contacted > 0)}
</table>
${button(crmBaseUrl, "Open the CRM")}`,
    footer: esc(WHY),
  });

  return {
    to: recipients,
    subject,
    text: textLines.join("\n"),
    html,
    idempotencyKey: `weekly-summary/${summary.from.slice(0, 10)}`,
  };
}
