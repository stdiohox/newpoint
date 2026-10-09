/**
 * edge/intake referral route (docs/automation-architecture.md §5.5, §7 Phase 10; D17: the
 * clinician web form is the only intake path; the fax path waits for a BAA-covered e-fax).
 *
 *   POST /intake/referral   multipart: referrer_organization, referrer_name, referrer_phone,
 *                           referrer_email?, turnstileToken, document (PDF)
 *
 * The same layers as the contact form: exact Origin, Turnstile, rate limits (per IP from the
 * host's trusted header, and a global daily ceiling), each counted in its own transaction.
 * The document must be a PDF (checked by its bytes, not its name) of at most 10 MB; it is
 * stored in the private bucket under a server-chosen UUID, never anything the sender typed.
 * Referrer fields are the referring clinician's own details; patient details come only from
 * the document, by extraction, and only become a contact after staff confirm them.
 */
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { referralPath, type ReferralStore } from "../../src/adapters/storage/referral-store.js";
import { boundedBytes, type EdgeDeps } from "../shared/deps.js";
import { parseMultipart } from "../shared/multipart.js";
import { allow, rateKey } from "../shared/rate-limit.js";
import type { Turnstile } from "../shared/turnstile.js";
import { toE164 } from "./handler.js";

export const REFERRAL_LIMITS = { maxBytes: 10 * 1024 * 1024, ipPerHour: 10, perDay: 100, attemptsPerIpPerHour: 30 } as const;

const fieldsSchema = z
  .object({
    referrer_organization: z.string().trim().min(1).max(200),
    referrer_name: z.string().trim().min(1).max(200),
    referrer_phone: z.string().trim().max(32),
    referrer_email: z.string().trim().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).optional(),
    turnstileToken: z.string().min(1).max(2048),
  })
  .strict();

export interface ReferralIntakeConfig {
  /** Where the clinician referral form is served from, exactly. */
  readonly formOrigin: string;
  readonly turnstile: Turnstile;
  readonly hmacSecret: string;
  readonly ipHeader: string;
  readonly store: ReferralStore;
}

const json = (status: number, body: object, origin: string): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": origin, vary: "Origin" },
  });

/** A PDF starts with "%PDF-" (a polyglot with something else in front is refused). */
const isPdf = (bytes: Uint8Array): boolean => Buffer.from(bytes.subarray(0, 5)).toString("latin1") === "%PDF-";

export function createReferralIntake(config: ReferralIntakeConfig, deps: EdgeDeps): (request: Request) => Promise<Response> {
  const origin = config.formOrigin;
  return async (request) => {
    if (request.method !== "POST") return json(405, { ok: false }, origin);
    if (request.headers.get("origin") !== origin) return json(403, { ok: false }, origin);
    const ip = request.headers.get(config.ipHeader)?.trim() ?? "";
    if (ip === "" || ip.length > 64) return json(400, { ok: false }, origin);
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.startsWith("multipart/form-data")) return json(415, { ok: false }, origin);
    // Before any byte of a 10 MB body is buffered: a declared size is required, and every
    // attempt (good or bad) counts against a cheap per-IP limit, so parallel uploads cannot
    // exhaust memory ahead of Turnstile and the referral limits.
    const declared = Number(request.headers.get("content-length") ?? "NaN");
    if (!Number.isFinite(declared) || declared <= 0) return json(411, { ok: false }, origin);
    if (declared > REFERRAL_LIMITS.maxBytes + 64 * 1024) return json(413, { ok: false }, origin);
    const attempt = await deps.db.tx("edge.intake", (q) =>
      allow(q, rateKey(config.hmacSecret, "ip", `referral-attempt:${ip}`), 3_600_000, REFERRAL_LIMITS.attemptsPerIpPerHour, deps.now()),
    );
    if (!attempt) return json(429, { ok: false }, origin);
    // The whole multipart body is capped (document plus a few small fields).
    const body = await boundedBytes(request, REFERRAL_LIMITS.maxBytes + 64 * 1024);
    if (body === null) return json(413, { ok: false }, origin);

    const form = parseMultipart(body, contentType);
    if (form === null) return json(400, { ok: false }, origin);
    const fileNames = Object.keys(form.files);
    const bytes = form.files["document"];
    if (bytes === undefined || fileNames.length !== 1) return json(400, { ok: false }, origin);
    const parsed = fieldsSchema.safeParse(form.fields);
    if (!parsed.success) return json(400, { ok: false }, origin);
    const phone = toE164(parsed.data.referrer_phone);
    if (phone === null) return json(400, { ok: false, field: "referrer_phone" }, origin);
    if (bytes.byteLength === 0 || bytes.byteLength > REFERRAL_LIMITS.maxBytes) return json(413, { ok: false }, origin);
    if (!isPdf(bytes)) return json(415, { ok: false, field: "document" }, origin);
    if (!(await config.turnstile(parsed.data.turnstileToken, ip))) return json(403, { ok: false }, origin);

    try {
      const now = deps.now();
      const allowed = await deps.db.tx("edge.intake", async (q) => {
        if (!(await allow(q, rateKey(config.hmacSecret, "ip", `referral:${ip}`), 3_600_000, REFERRAL_LIMITS.ipPerHour, now))) return false;
        return allow(q, "global:referrals", 86_400_000, REFERRAL_LIMITS.perDay, now);
      });
      if (!allowed) return json(429, { ok: false }, origin);

      const id = randomUUID();
      const path = referralPath(id);
      // The file first: a referral row never points at a document that is not there.
      await config.store.put(path, bytes, "application/pdf");
      try {
        await deps.db.tx("edge.intake", (q) =>
          q.query(
            `insert into phi.referrals (id, referrer_org, referrer_name, referrer_contact, document_path, status)
             values ($1, $2, $3, $4, $5, 'received')`,
            [id, parsed.data.referrer_organization, parsed.data.referrer_name, parsed.data.referrer_email ?? phone, path],
          ),
        );
      } catch (error) {
        await config.store.remove(path).catch(() => undefined);
        throw error;
      }
      await deps.enqueue("referrals.intake", { referralId: id }, `referrals-intake:${id}`).catch(() => undefined);
      return json(200, { ok: true }, origin);
    } catch {
      return json(500, { ok: false }, origin);
    }
  };
}
