/**
 * Every SMS a patient can receive (docs/automation-architecture.md §0.7, §5.0).
 *
 * Fixed templates with typed slots: date, time, provider display name, link, code.
 * The wording is neutral: "Newpoint" and logistics only, never "psychiatric", a
 * condition or a medication, because phones are shared and lock screens show
 * previews. Model free text never reaches a patient: `SmsBody` can only be made
 * by `renderTemplate`, and the Twilio adapter accepts nothing else.
 */
import { CRISIS_SCRIPT } from "../crisis/response.js";

declare const smsBodyBrand: unique symbol;
export type SmsBody = string & { readonly [smsBodyBrand]: true };

export interface Slots {
  readonly date?: string;
  readonly time?: string;
  readonly provider?: string;
  readonly link?: string;
  readonly code?: string;
}

interface TemplateDef {
  readonly text: string;
  readonly slots: readonly (keyof Slots)[];
  /** Part of an automated sequence: paused while a crisis is open for the contact (§5.8). */
  readonly sequence: boolean;
  /** May go out before the phone is verified (only the verification code itself). */
  readonly beforeVerification: boolean;
  /** Ignores quiet hours (§5.0: only the crisis auto-response, a reply to what was just sent). */
  readonly anyHour: boolean;
  /** A narrower send window than 08:00–21:00 (§5.4: review requests 10:00–19:00). */
  readonly window?: "review";
}

export const TEMPLATES = {
  verification_code: {
    text: "Newpoint: your verification code is {code}. It expires in 10 minutes. Reply STOP to opt out.",
    slots: ["code"], sequence: false, beforeVerification: true, anyHour: false,
  },
  team_will_call: {
    text: "Newpoint: thanks for your message. A member of our team will call you. Reply STOP to opt out.",
    slots: [], sequence: false, beforeVerification: false, anyHour: false,
  },
  help: {
    text: "Newpoint: for help, call the practice line. Reply STOP to opt out. Msg & data rates may apply.",
    slots: [], sequence: false, beforeVerification: false, anyHour: false,
  },
  logistics_reply: {
    text: "Newpoint: a member of our team will follow up about your question. Reply STOP to opt out.",
    slots: [], sequence: false, beforeVerification: false, anyHour: false,
  },
  lead_follow_up_1: {
    text: "Newpoint: thanks for reaching out. A member of our team will call you soon. Reply STOP to opt out.",
    slots: [], sequence: true, beforeVerification: false, anyHour: false,
  },
  lead_follow_up_2: {
    text: "Newpoint: we tried to reach you about your inquiry. Reply to this text or call the practice line. Reply STOP to opt out.",
    slots: [], sequence: true, beforeVerification: false, anyHour: false,
  },
  lead_follow_up_3: {
    text: "Newpoint: a last note about your inquiry. We are here when you are ready: call the practice line. Reply STOP to opt out.",
    slots: [], sequence: true, beforeVerification: false, anyHour: false,
  },
  booking_confirmed: {
    text: "Newpoint: you are booked with {provider} on {date} at {time}. Reply STOP to opt out.",
    slots: ["provider", "date", "time"], sequence: false, beforeVerification: false, anyHour: false,
  },
  booking_handoff: {
    text: "Newpoint: you can choose a time here: {link} Reply STOP to opt out.",
    slots: ["link"], sequence: false, beforeVerification: false, anyHour: false,
  },
  booking_callback: {
    text: "Newpoint: thanks. A member of our team will call you to set up a time. Reply STOP to opt out.",
    slots: [], sequence: false, beforeVerification: false, anyHour: false,
  },
  appointment_reminder_48h: {
    text: "Newpoint: reminder of your appointment with {provider} on {date} at {time}. Reply STOP to opt out.",
    slots: ["provider", "date", "time"], sequence: false, beforeVerification: false, anyHour: false,
  },
  appointment_reminder_2h: {
    text: "Newpoint: see you today at {time} with {provider}. Reply STOP to opt out.",
    slots: ["time", "provider"], sequence: false, beforeVerification: false, anyHour: false,
  },
  no_show_rebook: {
    text: "Newpoint: we missed you at your recent appointment. Reply to this text or call the practice line to pick a new time. Reply STOP to opt out.",
    slots: [], sequence: true, beforeVerification: false, anyHour: false,
  },
  post_visit_logistics: {
    text: "Newpoint: if you need help with forms or the video link, call the practice line. Reply STOP to opt out.",
    slots: [], sequence: true, beforeVerification: false, anyHour: false,
  },
  review_request: {
    text: "Newpoint: if you would like to share feedback publicly, you can leave a review here: {link} Reply STOP to opt out.",
    slots: ["link"], sequence: true, beforeVerification: false, anyHour: false, window: "review",
  },
  crisis_response: {
    text: CRISIS_SCRIPT.sms,
    slots: [], sequence: false, beforeVerification: false, anyHour: true,
  },
} as const satisfies Record<string, TemplateDef>;

export type TemplateId = keyof typeof TEMPLATES;

const SLOT_SHAPE: Readonly<Record<keyof Slots, RegExp>> = {
  date: /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/,
  time: /^\d{1,2}:\d{2} (AM|PM)$/,
  // A provider display name: letters, spaces, dots, commas and hyphens only.
  provider: /^[\p{L} .,'-]{2,80}$/u,
  link: /^https:\/\/[^\s]{1,300}$/,
  code: /^\d{6}$/,
};

/**
 * The only way to make an SmsBody. Every slot is required, shape-checked and
 * single-line, so nothing but the listed slot values ever varies.
 */
export function renderTemplate(id: TemplateId, slots: Slots = {}): SmsBody {
  const def: TemplateDef = TEMPLATES[id];
  let text: string = def.text;
  for (const name of def.slots) {
    const value = slots[name];
    if (value === undefined || !SLOT_SHAPE[name].test(value)) throw new TypeError(`renderTemplate(${id}): bad or missing slot ${name}`);
    text = text.replace(`{${name}}`, value);
  }
  if (/\{[a-z]+\}/.test(text)) throw new TypeError(`renderTemplate(${id}): unfilled slot`);
  return text as SmsBody;
}

export const templateDef = (id: TemplateId): TemplateDef => TEMPLATES[id];
