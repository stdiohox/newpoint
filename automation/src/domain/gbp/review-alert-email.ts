/**
 * Staff emails for Google reviews (docs/lead-crm.md, "Google reviews").
 *
 * - `draft`: a reply is drafted and waits in the CRM: approve, edit or skip.
 * - `manual`: no draft passed the rules; staff may write one in the CRM (same
 *   checks apply) or leave it.
 * - `not_posted`: an approved reply was refused at posting time, so staff know
 *   nothing went out and can try again in the CRM.
 * - `crisis`: the review mentions self-harm. No draft, no public reply: the
 *   clinical lead decides what, if anything, to do, off Google.
 *
 * Reviews are public; the excerpt here is what anyone can read on Google. Links
 * and the reviewer's name are bounded so an email cannot be used to carry junk.
 */
import type { Email } from "../../adapters/email/resend.js";
import { button, C, esc, FONT, heading, layout, paragraph } from "../crm/email-layout.js";

export interface ReviewForEmail {
  readonly id: string;
  readonly rating: number;
  readonly text: string | null;
  readonly reviewer: string | null;
}

export type ReviewAlertKind = "draft" | "manual" | "not_posted" | "crisis";

const WHY = "You get these because new-lead alerts are on for your Newpoint CRM account.";
const EXCERPT = 300;
const NAME = 60;

export function stars(rating: number): string {
  const n = Math.min(5, Math.max(0, Math.round(rating)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

/** Collapsed, cut to 300 characters, links defanged (mail clients auto-link plain text). */
export function excerpt(text: string | null): string {
  if (text === null || text.trim() === "") return "(rating only, no text)";
  const t = text
    .replace(/\s+/g, " ")
    .replace(/\bhttps?:\/\/\S+/gi, "[link]")
    .trim();
  return t.length > EXCERPT ? `${t.slice(0, EXCERPT - 1)}…` : t;
}

function reviewerLabel(reviewer: string | null): string {
  const name = (reviewer ?? "").replace(/\s+/g, " ").trim();
  if (name === "") return "by a Google user";
  return `by ${name.length > NAME ? `${name.slice(0, NAME - 1)}…` : name}`;
}

const COPY: Record<ReviewAlertKind, { subject: (r: ReviewForEmail) => string; heading: string; body: string; button: string }> = {
  draft: {
    subject: (r) => `New ${String(r.rating)}-star Google review: approve or skip the reply`,
    heading: "A Google review is waiting for a decision",
    body: "A reply is drafted. Read the review beside it in the CRM, edit the reply if you like, then approve it or skip it. Skipping is always fine. Nothing is posted until someone approves.",
    button: "Open the review",
  },
  manual: {
    subject: (r) => `New ${String(r.rating)}-star Google review: no automatic reply`,
    heading: "No drafted reply passed the rules",
    body: "The automatic drafts did not pass the practice's reply rules, so none is offered. You can write a reply in the CRM, where the same rules are checked before anything is posted, or leave this review unanswered.",
    button: "Open the review",
  },
  not_posted: {
    subject: (r) => `Google review reply not posted (${String(r.rating)}-star review)`,
    heading: "An approved reply was not posted",
    body: "The reply was stopped at posting time; the CRM shows why. Nothing went out. You can edit it and approve it again in the CRM, or leave the review unanswered.",
    button: "Open the review",
  },
  crisis: {
    subject: (r) => `Google review mentions a crisis (${String(r.rating)}-star review)`,
    heading: "A review mentions self-harm",
    body: "No reply was drafted and none will be posted: a public reply is not the place for this. Please have the clinical lead read the review and decide whether any outreach is appropriate, outside Google. The review is listed in the CRM for the record.",
    button: "See it in the CRM",
  },
};

export function reviewAlertEmail(kind: ReviewAlertKind, review: ReviewForEmail, recipients: readonly string[], crmBaseUrl: string): Email {
  const copy = COPY[kind];
  const subject = copy.subject(review);
  const who = reviewerLabel(review.reviewer);
  const url = `${crmBaseUrl}/reviews`;

  const text = [copy.heading, "", `${stars(review.rating)} ${who}`, excerpt(review.text), "", copy.body, url, "", WHY].join("\n");

  const html = layout({
    title: subject,
    preheader: `${stars(review.rating)} ${excerpt(review.text).slice(0, 90)}`,
    siteOrigin: new URL(crmBaseUrl).origin,
    label: "CRM",
    body: `${heading(copy.heading)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 20px;"><tr>
<td style="padding:16px 18px;background:${C.page};border-radius:8px;">
<div style="font-family:${FONT};font-size:14px;line-height:20px;color:${C.muted};"><span style="color:${C.ink};letter-spacing:2px;">${esc(stars(review.rating))}</span> &nbsp;${esc(who)}</div>
<div style="padding-top:8px;font-family:${FONT};font-size:15px;line-height:24px;color:${C.ink};">${esc(excerpt(review.text))}</div>
</td></tr></table>
${paragraph(esc(copy.body), "margin-bottom:20px;")}
${button(url, copy.button)}`,
    footer: esc(WHY),
  });

  return { to: recipients, subject, text, html, idempotencyKey: `review-${kind}/${review.id}` };
}
