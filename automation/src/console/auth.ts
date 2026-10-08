/**
 * Staff console sign-in (docs/automation-architecture.md §6 layer 6).
 *
 * - SSO with MFA: the access token is a JWT from the practice's identity provider,
 *   verified against its JWKS (issuer, audience, expiry), and must carry `aal2` (MFA
 *   completed), a `sub` (no shared accounts) and a `staff_role` of staff_clinician or
 *   staff_admin.
 * - 15-minute idle timeout: a signed cookie holds (sub, last activity). A request more
 *   than 15 minutes after the last one is refused unless the token was issued after
 *   it (the user signed in again). The cookie is renewed on every accepted request.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";

export const IDLE_TIMEOUT_MS = 15 * 60_000;
export const IDLE_COOKIE = "np_console_idle";
export const TOKEN_COOKIE = "np_console_at";

export type StaffRole = "staff_clinician" | "staff_admin";

export interface StaffSession {
  readonly sub: string;
  readonly role: StaffRole;
  /** The verified claims, passed to Postgres as request.jwt.claims. */
  readonly claims: Readonly<{ sub: string; staff_role: StaffRole }>;
}

export interface AuthConfig {
  readonly jwks: JWTVerifyGetKey;
  readonly issuer: string;
  readonly audience: string;
  readonly sessionSecret: string;
}

export type AuthResult =
  | { readonly ok: true; readonly session: StaffSession; readonly idleCookie: string }
  | { readonly ok: false; readonly reason: "no_token" | "invalid_token" | "mfa_required" | "no_role" | "idle_timeout" };

const ROLES: readonly StaffRole[] = ["staff_clinician", "staff_admin"];

function sign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function idleCookieValue(secret: string, sub: string, at: number): string {
  const payload = `${Buffer.from(sub).toString("base64url")}.${String(at)}`;
  return `${payload}.${sign(secret, payload)}`;
}

function readIdleCookie(secret: string, value: string | undefined): { sub: string; at: number } | null {
  if (value === undefined) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [subPart = "", atPart = "", mac = ""] = parts;
  const expected = Buffer.from(sign(secret, `${subPart}.${atPart}`));
  const given = Buffer.from(mac);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const at = Number(atPart);
  if (!Number.isSafeInteger(at)) return null;
  return { sub: Buffer.from(subPart, "base64url").toString(), at };
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

export async function authenticate(config: AuthConfig, request: Request, now: number): Promise<AuthResult> {
  const cookies = parseCookies(request.headers.get("cookie"));
  const bearer = /^Bearer (\S+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  const token = bearer ?? cookies[TOKEN_COOKIE];
  if (token === undefined) return { ok: false, reason: "no_token" };

  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, config.jwks, {
      issuer: config.issuer,
      audience: config.audience,
      algorithms: ["RS256", "ES256", "EdDSA"],
      currentDate: new Date(now),
      requiredClaims: ["sub", "exp", "iat"],
    }));
  } catch {
    return { ok: false, reason: "invalid_token" };
  }
  if (payload["aal"] !== "aal2") return { ok: false, reason: "mfa_required" };
  const role = payload["staff_role"];
  const sub = payload.sub;
  if (typeof sub !== "string" || sub === "" || !ROLES.includes(role as StaffRole)) return { ok: false, reason: "no_role" };

  const issuedAt = (payload.iat ?? 0) * 1000;
  const idle = readIdleCookie(config.sessionSecret, cookies[IDLE_COOKIE]);
  const lastActive = idle !== null && idle.sub === sub ? idle.at : issuedAt;
  // A fresh sign-in after the timeout restarts the session; otherwise the gap since the last request decides.
  if (now - Math.max(lastActive, issuedAt) > IDLE_TIMEOUT_MS) return { ok: false, reason: "idle_timeout" };

  const staffRole = role as StaffRole;
  return {
    ok: true,
    session: { sub, role: staffRole, claims: { sub, staff_role: staffRole } },
    idleCookie: idleCookieValue(config.sessionSecret, sub, now),
  };
}
