/** Shared PHI-zone test helpers. Every value is synthetic: 555-01xx numbers, made-up names. */
import type pg from "pg";
import type { PageText, Twilio } from "../../src/adapters/messaging/twilio.js";
import type { SmsBody } from "../../src/domain/messaging/templates.js";
import { VendorHttpError } from "../../src/lib/errors.js";
import type { Phi } from "../../src/lib/phi.js";

export const ENV = {
  SMS_DAILY_BUDGET: 300,
  SMS_PER_NUMBER_DAILY: 4,
  PHI_OPS_PAGE_PHONE: "+16095550199",
  PHI_ON_CALL_PRIMARY_PHONE: "+16095550191",
  PHI_ON_CALL_SECONDARY_PHONE: "+16095550192",
  PHI_STAFF_CONSOLE_URL: "https://console.example.test/",
};

export interface FakeTwilio extends Twilio {
  readonly sms: { to: string; body: string }[];
  readonly pages: { to: string; text: string }[];
  readonly calls: { to: string; text: string }[];
  /** sms: "rejected" = Twilio answered 400 (definite); "ambiguous" = a 503 or a dropped response. */
  fail: { sms?: "rejected" | "ambiguous" | undefined; page?: boolean; call?: boolean };
}

let sid = 0;
const nextSid = (prefix: string) => `${prefix}${(sid++).toString(16).padStart(32, "0")}`;

export function fakeTwilio(): FakeTwilio {
  const twilio: FakeTwilio = {
    sms: [],
    pages: [],
    calls: [],
    fail: {},
    sendSms(to: Phi<string>, body: SmsBody) {
      if (twilio.fail.sms === "rejected") return Promise.reject(new VendorHttpError("twilio", 400));
      if (twilio.fail.sms === "ambiguous") return Promise.reject(new VendorHttpError("twilio", 503));
      twilio.sms.push({ to, body });
      return Promise.resolve(nextSid("SM"));
    },
    page(to: string, text: PageText) {
      if (twilio.fail.page) return Promise.reject(new Error("page failed"));
      twilio.pages.push({ to, text });
      return Promise.resolve(nextSid("SM"));
    },
    call(to: string, text: PageText) {
      if (twilio.fail.call) return Promise.reject(new Error("call failed"));
      twilio.calls.push({ to, text });
      return Promise.resolve(nextSid("CA"));
    },
  };
  return twilio;
}

export interface ContactSpec {
  readonly phone?: string | null;
  readonly minor?: "adult" | "minor" | "unknown";
  readonly verified?: boolean;
  readonly consent?: "granted" | "revoked" | "none";
}

let phoneSeq = 0;

/** Inserts as the superuser (no role), so tests can set any state. */
export async function seedContact(client: pg.Client, spec: ContactSpec = {}): Promise<string> {
  const phone = spec.phone === undefined ? `+1609555${String(1000 + (phoneSeq++ % 8000)).padStart(4, "0")}` : spec.phone;
  const { rows } = await client.query<{ id: string }>(
    `insert into phi.contacts (first_name, phone_e164, phone_verified_at, state, minor_status)
     values ('Testperson', $1, $2, 'NJ', $3) returning id`,
    [phone, spec.verified === false ? null : new Date("2026-10-01T12:00:00Z"), spec.minor ?? "adult"],
  );
  const id = rows[0]?.id;
  if (id === undefined) throw new Error("seedContact");
  const consent = spec.consent ?? "granted";
  if (consent !== "none") {
    await client.query(
      `insert into phi.consents (contact_id, kind, granted_at, source, evidence) values ($1, 'sms_transactional', now() - interval '1 day', 'web_form', '{"wording_version":0}')`,
      [id],
    );
  }
  if (consent === "revoked") {
    await client.query(
      `insert into phi.consents (contact_id, kind, revoked_at, source, evidence) values ($1, 'sms_transactional', now(), 'sms_keyword', '{"keyword":"STOP"}')`,
      [id],
    );
  }
  return id;
}

export const ENTITY = () => crypto.randomUUID();
