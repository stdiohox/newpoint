/**
 * The urgent email when Joyce's call to a lead ended flagged as a possible
 * crisis (docs/lead-crm.md "Lead calls").
 *
 * Like the new-lead alert, it carries a link and a time, nothing about the
 * person: who it is stays in the CRM behind sign-in. Joyce has already given
 * the lead 988 and 911 on the call; this email asks staff to call them back.
 */
import type { Email } from "../../adapters/email/resend.js";
import { formatEastern } from "./alert-email.js";
import { button, esc, FONT, C, heading, layout, paragraph } from "./email-layout.js";

export interface CrisisCall {
  readonly leadId: string;
  readonly endedAt: Date | null;
}

const WHY = "You get these because new-lead alerts are on for your Newpoint CRM account.";
const INTRO =
  "Joyce, the automated assistant, called a website lead, and something on the call sounded like a possible crisis. She gave them 988 and 911. Please call them back as soon as you can.";

export function crisisCallEmail(calls: readonly CrisisCall[], recipients: readonly string[], crmBaseUrl: string): Email {
  if (calls.length === 0) throw new Error("crisisCallEmail needs at least one call");
  const subject = "Urgent: call this lead back now";
  const links = calls.map((call) => `${crmBaseUrl}/leads/${call.leadId}`);
  const when = (call: CrisisCall) => (call.endedAt ? `Call ended ${formatEastern(call.endedAt)}` : "Call ended");

  const text = [INTRO, "", ...calls.flatMap((call, i) => [when(call), links[i] ?? "", ""]), WHY].join("\n");

  const rows = calls
    .map(
      (call, i) =>
        `<p style="margin:0 0 8px;font-family:${FONT};font-size:14px;line-height:20px;color:${C.muted};">${esc(when(call))} · <a href="${esc(links[i] ?? crmBaseUrl)}" style="color:${C.royal};font-weight:600;text-decoration:none;">Open lead&nbsp;&rarr;</a></p>`,
    )
    .join("");
  const first = links[0] ?? crmBaseUrl;

  return {
    to: recipients,
    subject,
    text,
    html: layout({
      title: subject,
      preheader: "A call flagged a possible crisis. Please call the lead back.",
      siteOrigin: new URL(crmBaseUrl).origin,
      label: "CRM",
      body: `${heading("Call this lead back now")}
${paragraph(esc(INTRO), "margin-bottom:20px;")}
${rows}
<div style="height:16px;"></div>
${button(first, "Open lead in CRM")}`,
      footer: esc(WHY),
    }),
    idempotencyKey: `crisis-call-${calls.map((call) => call.leadId).join("-")}`.slice(0, 256),
  };
}
