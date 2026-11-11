/**
 * The confirmation email to a lead (docs/lead-crm.md): their details were
 * received and someone will be in touch. A "New patient inquiry" also gets the
 * new-patient intake form, to complete and bring to the first appointment (not
 * to email back: it asks for personal and medical information). Existing
 * patients, billing questions and "something else" get the receipt only.
 *
 * The crisis line sits in the body, at body size, and replies are flagged as
 * not monitored around the clock: this inbox is not where a crisis should go.
 */
import type { Email } from "../../adapters/email/resend.js";
import { button, C, esc, FONT, heading, layout, paragraph } from "./email-layout.js";

/** The practice line, as on the site (lib/content.ts CONTACT.phonePrimary). */
export const PRACTICE_PHONE = "(609) 527-9438";
const PRACTICE_PHONE_HREF = "tel:+16095279438";

/** Served from the site's public/forms. */
export const INTAKE_FORM_PATH = "/forms/new-patient-intake.pdf";

export interface ConfirmationLead {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly reason: string;
}

export interface ConfirmationOptions {
  readonly siteOrigin: string;
  readonly from: string;
  readonly replyTo: string;
}

/** The one reason that gets the intake form (crm.leads reason check). */
export const NEW_PATIENT_REASON = "New patient inquiry";

/** First word of the name they typed, if it looks like a name; otherwise none. */
export function firstName(name: string): string | null {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return /^[\p{L}][\p{L}'’-]{0,39}$/u.test(first) ? first : null;
}

/** The site's wording (lib/content.ts CONTACT.crisisNote), kept identical. */
const CRISIS_TEXT = "If you’re in a crisis, call 988, or 911 in an emergency.";
const REPLY_TEXT =
  "This inbox isn’t monitored around the clock, so please don’t include medical details or anything urgent in a reply.";

export function confirmationEmail(lead: ConfirmationLead, o: ConfirmationOptions): Email {
  const formUrl = `${o.siteOrigin}${INTAKE_FORM_PATH}`;
  const newPatient = lead.reason === NEW_PATIENT_REASON;
  const first = firstName(lead.name);
  const greeting = first ? `Hi ${first},` : "Hello,";
  const subject = "We received your request";
  const thanks = newPatient
    ? "Thank you for reaching out to Newpoint Healthcare. We received your details, and someone from our team will contact you soon to arrange your first appointment."
    : "Thank you for reaching out to Newpoint Healthcare. We received your message, and someone from our team will get back to you soon.";

  const text = [
    greeting,
    "",
    thanks,
    "",
    ...(newPatient
      ? [
          "Before your first appointment, please complete our new-patient intake form and bring it with you:",
          formUrl,
          "Please don’t email the completed form: it asks for personal and medical information.",
          "",
        ]
      : []),
    `Questions? Call us at ${PRACTICE_PHONE}, or reply to this email. ${REPLY_TEXT}`,
    "",
    CRISIS_TEXT,
    "",
    "Newpoint Healthcare",
  ].join("\n");

  const link = (href: string, label: string, color: string = C.royal) =>
    `<a href="${href}" style="color:${color};font-weight:600;text-decoration:none;">${label}</a>`;

  const formBlock = newPatient
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;border-top:1px solid ${C.border};border-bottom:1px solid ${C.border};"><tr><td style="padding:20px 0;">
<div style="font-family:${FONT};font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${C.royal};padding-bottom:6px;">Before your first appointment</div>
${paragraph("Please complete our new-patient intake form and bring it with you.", "margin-bottom:16px;")}
${button(formUrl, "Download the intake form")}
<p style="margin:16px 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted};">Please don’t email the completed form: it asks for personal and medical information.</p>
</td></tr></table>`
    : "";

  const html = layout({
    title: subject,
    preheader: newPatient
      ? "Someone from our team will contact you soon. Here is your intake form."
      : "Someone from our team will get back to you soon.",
    siteOrigin: o.siteOrigin,
    body: `${heading("We received your request")}
${paragraph(esc(greeting), "margin-top:16px;")}
${paragraph(esc(thanks))}
${formBlock}
${paragraph(`Questions? Call us at ${link(PRACTICE_PHONE_HREF, PRACTICE_PHONE)}, or reply to this email.`, "margin-bottom:8px;")}
<p style="margin:0 0 20px;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted};">${esc(REPLY_TEXT)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:12px 14px;background:${C.page};border-radius:8px;font-family:${FONT};font-size:15px;line-height:22px;color:${C.ink};">
If you’re in a crisis, call ${link("tel:988", "988", C.ink)}, or ${link("tel:911", "911", C.ink)} in an emergency.
</td></tr></table>`,
    footer: "Newpoint Healthcare · You received this because you asked us to contact you through newpointnp.com.",
  });

  return {
    to: [lead.email],
    subject,
    text,
    html,
    from: o.from,
    replyTo: o.replyTo,
    // Resend drops a repeat of the same key (24 h), so a send whose "mark" was
    // lost cannot reach the person twice.
    idempotencyKey: `lead-confirmation/${lead.id}`,
  };
}
