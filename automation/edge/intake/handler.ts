/**
 * edge/intake (docs/automation-architecture.md §5.5 "edge/intake hardening", §7 Phase 6).
 * The site contact form posts here directly from the browser.
 *
 *   POST /intake         { name, email, phone?, reason, smsConsent, consentVersion, turnstileToken }
 *   POST /intake/verify  { verificationId, code }
 *
 * Every layer from §5.5 applies, in this order: exact Origin, a bounded JSON body that
 * zod parses strictly (the site's four reasons only; no free text), Turnstile, then rate
 * limits (per IP from the host's trusted header only, per phone, and a global cap on codes
 * against SMS pumping), each counted in its own transaction so a later failure cannot
 * roll a hit back. Only US numbers are accepted (NANP area codes outside the US refused).
 *
 * AGE (D18): "Are you 18 or older?" is optional, and a typed-in number is not proof of anything:
 *   - "yes" with a phone: applied only once the code texted to that phone is confirmed.
 *   - "no": applied to a contact this submission creates (no code, no texts: a staff callback);
 *     for a number already on file it is kept on the inquiry for staff, never applied, so the
 *     form cannot flip someone else's record.
 *   - no phone: the answer applies to the new email-only contact (it can never be texted).
 *   - no answer: unknown (a staff callback).
 *
 * CONSENT IS PENDING UNTIL THE CODE IS CONFIRMED. The ticked box and the wording (stored
 * verbatim, against the version this server holds) ride on the code's row; /intake/verify
 * writes them to phi.consents only after the code matches. So entering someone else's
 * number can neither grant consent for it nor undo their STOP, and send-sms will not send a
 * code to a number whose latest consent event is a revocation.
 *
 * After the commit, the follow-up and the code are queued; if queueing fails the request
 * still succeeds and ops.reconcile picks the rows up. Responses never echo what was sent.
 * The CLAUDE.md HIPAA rule holds: name, email, phone and a constrained reason only.
 */
import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { answerUnknownAge, type Queryable } from "../../src/lib/db-phi.js";
import { CONSENT_WORDING } from "../../src/domain/consent/wording.js";
import { boundedText, type EdgeDeps } from "../shared/deps.js";
import { allow, rateKey } from "../shared/rate-limit.js";
import type { Turnstile } from "../shared/turnstile.js";
import { contactFor } from "../twilio-inbound/handler.js";

/** The site's CONTACT.reasons (lib/content.ts), mapped to phi.inquiry_reason. */
export const REASONS = {
  "New patient inquiry": "new_patient",
  "Existing patient": "existing_patient",
  "Insurance or billing question": "billing_insurance",
  "Something else": "other",
} as const;

const intakeSchema = z
  .object({
    name: z.string().trim().min(1).max(120).regex(/^[\p{L}\p{M} .,'-]+$/u),
    email: z.string().trim().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    phone: z.string().trim().max(32).optional(),
    reason: z.enum(Object.keys(REASONS) as [keyof typeof REASONS, ...(keyof typeof REASONS)[]]),
    smsConsent: z.boolean(),
    /** "Are you 18 or older?" Optional: no answer leaves the age unknown (D18: staff callback). */
    adult: z.enum(["yes", "no"]).optional(),
    consentVersion: z.number().int().min(0),
    turnstileToken: z.string().min(1).max(2048),
  })
  .strict();

const verifySchema = z.object({ verificationId: z.uuid(), code: z.string().regex(/^\d{6}$/) }).strict();

export const LIMITS = {
  ipPerHour: 5,
  phonePerDay: 3,
  /** Codes across the whole site per hour: the SMS-pumping ceiling. */
  codesPerHour: 30,
  verifyIpPerHour: 20,
  codeTtlMs: 10 * 60_000,
  maxAttempts: 5,
} as const;

/**
 * NANP area codes that are NOT the United States (Canada, the Caribbean, Bermuda) plus
 * premium 900. Twilio Geo Permissions are US only (§5.0); this refuses them before a code
 * is ever queued, so a pumping attack cannot reach high-rate destinations.
 */
const NON_US_NPA = new Set([
  "204", "226", "236", "249", "250", "263", "289", "306", "343", "354", "365", "367", "368", "382", "387", "403", "416", "418",
  "428", "431", "437", "438", "450", "460", "468", "474", "506", "514", "519", "548", "579", "581", "584", "587", "600", "604",
  "613", "639", "647", "672", "683", "709", "742", "753", "778", "780", "782", "807", "819", "825", "867", "873", "879", "902",
  "905", "942", "242", "246", "264", "268", "284", "345", "441", "473", "649", "658", "664", "721", "758", "767", "784", "809",
  "829", "849", "868", "869", "876", "900",
]);

export interface IntakeConfig {
  /** The site's origin, exactly: https://newpointnp.com */
  readonly siteOrigin: string;
  readonly turnstile: Turnstile;
  /** HMAC key for rate-limit keys, code hashes and the IP hash in consent evidence. Never stored in the database. */
  readonly hmacSecret: string;
  /** The header the host sets to the client IP and a client cannot forge (e.g. cf-connecting-ip). */
  readonly ipHeader: string;
}

/** US numbers only, as typed on the site: "(609) 555-0100", "609-555-0100", "+1 609 555 0100". */
export function toE164(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(ten) || NON_US_NPA.has(ten.slice(0, 3))) return null;
  return `+1${ten}`;
}

/** Binds a code to its row under a key the database never holds. */
export function codeHmac(secret: string, verificationId: string, code: string): string {
  return createHmac("sha256", secret).update(`verify:${verificationId}:${code}`).digest("base64url");
}

function json(status: number, body: object, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": origin, vary: "Origin" },
  });
}

export function createIntake(config: IntakeConfig, deps: EdgeDeps): (request: Request) => Promise<Response> {
  const origin = config.siteOrigin;
  return async (request) => {
    const path = new URL(request.url).pathname.replace(/\/+$/, "");
    if (request.method === "OPTIONS") {
      if (request.headers.get("origin") !== origin) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-methods": "POST",
          "access-control-allow-headers": "content-type",
          "access-control-max-age": "600",
          vary: "Origin",
        },
      });
    }
    if (request.method !== "POST") return json(405, { ok: false }, origin);
    if (request.headers.get("origin") !== origin) return json(403, { ok: false }, origin);
    // No trusted client IP means the host is misconfigured: refuse rather than skip the limit.
    const ip = request.headers.get(config.ipHeader)?.trim() ?? "";
    if (ip === "" || ip.length > 64) return json(400, { ok: false }, origin);
    const text = await boundedText(request, 4_096);
    if (text === null) return json(413, { ok: false }, origin);
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return json(400, { ok: false }, origin);
    }
    try {
      if (path.endsWith("/intake/verify")) return await verify(config, deps, ip, body);
      if (path.endsWith("/intake")) return await submit(config, deps, ip, body);
      return json(404, { ok: false }, origin);
    } catch {
      return json(500, { ok: false }, origin);
    }
  };
}

async function submit(config: IntakeConfig, deps: EdgeDeps, ip: string, body: unknown): Promise<Response> {
  const origin = config.siteOrigin;
  const parsed = intakeSchema.safeParse(body);
  if (!parsed.success) return json(400, { ok: false }, origin);
  const form = parsed.data;
  const phone = form.phone === undefined || form.phone === "" ? null : toE164(form.phone);
  if (form.phone !== undefined && form.phone !== "" && phone === null) return json(400, { ok: false, field: "phone" }, origin);
  // Consent must be to the wording this server holds now; a stale page re-renders it.
  if (form.smsConsent && form.consentVersion !== CONSENT_WORDING.version) return json(409, { ok: false, reason: "consent_wording_changed" }, origin);
  if (!(await config.turnstile(form.turnstileToken, ip))) return json(403, { ok: false }, origin);

  const now = deps.now();
  const wantsCode = form.smsConsent && phone !== null && form.adult !== "no";
  const allowed = await deps.db.tx("edge.intake", async (q) => {
    if (!(await allow(q, rateKey(config.hmacSecret, "ip", ip), 3_600_000, LIMITS.ipPerHour, now))) return false;
    if (phone !== null && !(await allow(q, rateKey(config.hmacSecret, "phone", phone), 86_400_000, LIMITS.phonePerDay, now))) return false;
    if (wantsCode && !(await allow(q, "global:verification_codes", 3_600_000, LIMITS.codesPerHour, now))) return false;
    return true;
  });
  if (!allowed) return json(429, { ok: false }, origin);

  const result = await deps.db.tx("edge.intake", (q) => record(q, config, form, phone, ip, now));
  // Queued after the commit. A failure here is not the visitor's problem: ops.reconcile re-queues.
  await deps.enqueue("referrals.lead-follow-up", { inquiryId: result.inquiryId }, `lead-follow-up:${result.inquiryId}`).catch(() => undefined);
  if (result.verificationId !== null) {
    await deps
      .enqueue(
        "messaging.send-sms",
        { template: "verification_code", contactId: result.contactId, entityId: result.verificationId, step: 0 },
        `send-sms:verification_code:${result.verificationId}:0`,
      )
      .catch(() => undefined);
  }
  return json(200, { ok: true, verificationId: result.verificationId }, origin);
}

async function record(
  q: Queryable,
  config: IntakeConfig,
  form: z.output<typeof intakeSchema>,
  phone: string | null,
  ip: string,
  now: Date,
): Promise<{ inquiryId: string; contactId: string; verificationId: string | null }> {
  const [first = "", ...rest] = form.name.split(/\s+/);
  // With a phone, "yes" waits for the code; "no" applies only if this submission creates the contact.
  const answered = (s: "adult" | "minor" | "unknown") => (s === "unknown" ? null : "web_form");
  const emailOnly = form.adult === "yes" ? "adult" : form.adult === "no" ? "minor" : "unknown";
  const withPhone = form.adult === "no" ? "minor" : "unknown";
  let contactId: string;
  if (phone === null) {
    const created = await q.query<{ id: string }>(
      `insert into phi.contacts (first_name, last_name, email, minor_status, minor_status_source, minor_status_at)
       values ($1, $2, $3, $4, $5, case when $5::text is null then null else now() end) returning id`,
      [first, rest.join(" ") || null, form.email, emailOnly, answered(emailOnly)],
    );
    contactId = created.rows[0]?.id ?? "";
  } else {
    // An existing contact keeps its details: the edge role cannot read or overwrite them.
    const created = await q.query<{ id: string }>(
      `insert into phi.contacts (first_name, last_name, email, phone_e164, minor_status, minor_status_source, minor_status_at)
       values ($1, $2, $3, $4, $5, $6, case when $6::text is null then null else now() end)
       on conflict (phone_e164) do nothing returning id`,
      [first, rest.join(" ") || null, form.email, phone, withPhone, answered(withPhone)],
    );
    contactId = created.rows[0]?.id ?? (await contactFor(q, phone));
  }
  if (contactId === "") throw new Error("intake: no contact");

  const inquiry = await q.query<{ id: string }>(
    `insert into phi.inquiries (contact_id, source, reason, age_answer) values ($1, 'web', $2, $3) returning id`,
    [contactId, REASONS[form.reason], form.adult ?? null],
  );
  const inquiryId = inquiry.rows[0]?.id;
  if (inquiryId === undefined) throw new Error("intake: no inquiry");
  if (!form.smsConsent || phone === null || form.adult === "no") return { inquiryId, contactId, verificationId: null };

  const verificationId = randomUUID();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await q.query(
    `insert into phi.phone_verifications (id, contact_id, inquiry_id, code, code_hmac, consent_evidence, expires_at, age_answer)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      verificationId,
      contactId,
      inquiryId,
      code,
      codeHmac(config.hmacSecret, verificationId, code),
      JSON.stringify({
        wording_version: CONSENT_WORDING.version,
        wording: CONSENT_WORDING.smsTransactional,
        wording_approved: CONSENT_WORDING.approved,
        form: "site_contact",
        inquiry_id: inquiryId,
        ip_hmac: rateKey(config.hmacSecret, "ip", ip),
        ticked_at: now.toISOString(),
      }),
      new Date(now.getTime() + LIMITS.codeTtlMs),
      form.adult ?? null,
    ],
  );
  return { inquiryId, contactId, verificationId };
}

async function verify(config: IntakeConfig, deps: EdgeDeps, ip: string, body: unknown): Promise<Response> {
  const origin = config.siteOrigin;
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) return json(400, { ok: false }, origin);
  const { verificationId, code } = parsed.data;
  const now = deps.now();
  const allowed = await deps.db.tx("edge.intake", (q) =>
    allow(q, rateKey(config.hmacSecret, "ip", `verify:${ip}`), 3_600_000, LIMITS.verifyIpPerHour, now),
  );
  if (!allowed) return json(429, { ok: false }, origin);

  const outcome = await deps.db.tx("edge.intake", async (q) => {
    const { rows } = await q.query<{
      contact_id: string;
      code_hmac: string;
      consent_evidence: Record<string, unknown> | null;
      age_answer: "yes" | "no" | null;
      expires_at: Date;
      attempts: number;
      verified_at: Date | null;
    }>(`select contact_id, code_hmac, consent_evidence, age_answer, expires_at, attempts, verified_at from phi.phone_verifications where id = $1 for update`, [
      verificationId,
    ]);
    const row = rows[0];
    if (row === undefined || row.verified_at !== null || row.expires_at <= now || row.attempts >= LIMITS.maxAttempts) return "invalid" as const;
    const match = timingSafeEqual(Buffer.from(row.code_hmac), Buffer.from(codeHmac(config.hmacSecret, verificationId, code)));
    if (!match) {
      await q.query(`update phi.phone_verifications set attempts = attempts + 1 where id = $1`, [verificationId]);
      return "invalid" as const;
    }
    await q.query(`update phi.phone_verifications set verified_at = $2, code = null where id = $1`, [verificationId, now]);
    await q.query(`update phi.contacts set phone_verified_at = $2 where id = $1`, [row.contact_id, now]);
    // The number is now proven theirs: a "yes" answers an unknown age.
    if (row.age_answer === "yes") await answerUnknownAge(q, row.contact_id, "adult", "web_form");
    // Only now does the ticked box become consent: the person has shown the number is theirs.
    if (row.consent_evidence !== null) {
      await q.query(
        `insert into phi.consents (contact_id, kind, granted_at, source, evidence) values ($1, 'sms_transactional', $2, 'web_form', $3)`,
        [row.contact_id, now, JSON.stringify({ ...row.consent_evidence, verification_id: verificationId, verified_at: now.toISOString() })],
      );
    }
    return "verified" as const;
  });
  return outcome === "verified" ? json(200, { ok: true }, origin) : json(400, { ok: false }, origin);
}
