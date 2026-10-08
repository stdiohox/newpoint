/**
 * Twilio, the SMS and voice carrier (docs/automation-architecture.md §2, §5.0, §5.8).
 * PHI zone: a phone number plus the Newpoint relationship is PHI. BAA required.
 *
 * Only two callers: messaging/send-sms (every text to a patient) and ops/crisis-page
 * (pages to clinicians and Koret ops). Bodies to patients are `SmsBody`, which only
 * the template renderer makes. A non-2xx becomes a VendorHttpError with the status
 * only: Twilio's error text echoes the number.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { VendorHttpError } from "../../lib/errors.js";
import type { LiteralOnly, Phi } from "../../lib/phi.js";
import type { SmsBody } from "../../domain/messaging/templates.js";
import type { FetchLike } from "../../lib/http.js";

export interface TwilioConfig {
  readonly accountSid: string;
  readonly authToken: string;
  readonly messagingServiceSid: string;
  /** The verified number pages and calls come from. */
  readonly voiceFrom: string;
}

/**
 * A page to a clinician or to Koret ops: generic text, never patient details. Only a
 * string literal written in source becomes PageText; the one variable part allowed
 * is the console link, added by withLink.
 */
declare const pageTextBrand: unique symbol;
export type PageText = string & { readonly [pageTextBrand]: true };
export function pageText<const T extends string>(text: T & LiteralOnly<T>): PageText {
  const value: string = text;
  if (!value.startsWith("Newpoint")) throw new TypeError("pageText: pages start with Newpoint");
  return value as PageText;
}
export function withLink(text: PageText, url: string): PageText {
  if (!/^https:\/\/[^\s]{1,200}$/.test(url)) throw new TypeError("withLink: not an https URL");
  return `${text} ${url}` as PageText;
}

export interface Twilio {
  sendSms(to: Phi<string>, body: SmsBody): Promise<string>;
  page(to: string, text: PageText): Promise<string>;
  call(to: string, text: PageText): Promise<string>;
}

const sidSchema = z.object({ sid: z.string().regex(/^(SM|MM|CA)[0-9a-f]{32}$/) });
const xml = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function createTwilio(config: TwilioConfig, fetch: FetchLike): Twilio {
  const base = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}`;
  const auth = `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`;

  async function post(path: string, params: Record<string, string>): Promise<string> {
    const response = await fetch(`${base}/${path}`, {
      method: "POST",
      headers: { authorization: auth, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
    });
    if (!response.ok) throw new VendorHttpError("twilio", response.status);
    return sidSchema.parse(await response.json()).sid;
  }

  return {
    sendSms: (to, body) => post("Messages.json", { To: to, MessagingServiceSid: config.messagingServiceSid, Body: body }),
    // Pages come from the voice number, not the patient Messaging Service: a clinician's STOP to
    // the patient line must never block their crisis pages.
    page: (to, text) => post("Messages.json", { To: to, From: config.voiceFrom, Body: text }),
    call: (to, text) =>
      post("Calls.json", {
        To: to,
        From: config.voiceFrom,
        Twiml: `<Response><Say>${xml(text)}</Say><Pause length="1"/><Say>${xml(text)}</Say></Response>`,
      }),
  };
}

/**
 * Twilio's request signature (X-Twilio-Signature): HMAC-SHA1 over the exact public
 * URL followed by every POST parameter, sorted by name, as name+value; base64.
 * Compared in constant time. Reject before reading anything else from the request.
 */
export function verifyTwilioSignature(
  authToken: string,
  publicUrl: string,
  params: Readonly<Record<string, string>>,
  signature: string | null,
): boolean {
  if (signature === null) return false;
  const data = publicUrl + Object.keys(params).sort().map((key) => key + (params[key] ?? "")).join("");
  const expected = createHmac("sha1", authToken).update(data, "utf8").digest();
  const given = Buffer.from(signature, "base64");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
