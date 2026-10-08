/**
 * The staff console's environment (D7: host-agnostic, not deployed). Every name
 * carries PHI_ so the public zone's loader refuses it.
 */
import { z } from "zod";
import { ConfigError } from "../lib/errors.js";
import { supabaseProjectRef } from "../lib/env.js";
import { findPublicZoneVariables } from "../lib/env-phi.js";

export const consoleEnvSchema = z.object({
  /** A login role that is a member of staff_console, and nothing else. */
  PHI_CONSOLE_DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\/[^\s]+$/),
  PHI_DATABASE_CA_CERT: z.string().startsWith("-----BEGIN CERTIFICATE-----"),
  SUPABASE_PHI_PROJECT_REF: z.string().regex(/^[a-z]{20}$/),
  /** The SSO provider's JWKS, issuer and audience. MFA is required (aal2). */
  PHI_CONSOLE_JWKS_URL: z.string().regex(/^https:\/\/[^\s]+$/),
  PHI_CONSOLE_JWT_ISSUER: z.string().min(1),
  PHI_CONSOLE_JWT_AUDIENCE: z.string().min(1),
  /** Signs the idle-timeout cookie. */
  PHI_CONSOLE_SESSION_SECRET: z.string().min(32),
  /** The console's own origin, e.g. https://console.example.com. POSTs from anywhere else are refused. */
  PHI_CONSOLE_ORIGIN: z.string().regex(/^https:\/\/[a-z0-9.-]+(:\d+)?$/),
});
export type ConsoleEnv = Readonly<z.output<typeof consoleEnvSchema>>;

const CONSOLE_FORBIDDEN: readonly RegExp[] = [/^TWILIO_/i, /^VAPI_/i, /^ANTHROPIC_/i, /^PHI_DATABASE_URL$/i, /^PHI_N8N_/i];

export function loadConsoleEnv(source: Readonly<Record<string, string | undefined>> = process.env): ConsoleEnv {
  // The console holds only its own staff_console login: no task database, Twilio or model credential,
  // so a compromised console cannot step around the RLS keyed on staff_role.
  const forbidden = [
    ...findPublicZoneVariables(source),
    ...Object.keys(source).filter((name) => source[name] !== undefined && source[name] !== "" && CONSOLE_FORBIDDEN.some((p) => p.test(name))),
  ].sort();
  if (forbidden.length > 0) throw new ConfigError("public_zone_variable_in_phi_runtime", forbidden);
  const result = consoleEnvSchema.safeParse(source);
  if (!result.success) {
    throw new ConfigError("invalid_console_env", [...new Set(result.error.issues.map((i) => String(i.path[0] ?? "(root)")))].sort());
  }
  if (supabaseProjectRef(result.data.PHI_CONSOLE_DATABASE_URL) !== result.data.SUPABASE_PHI_PROJECT_REF) {
    throw new ConfigError("phi_db_host_mismatch", ["PHI_CONSOLE_DATABASE_URL", "SUPABASE_PHI_PROJECT_REF"]);
  }
  return Object.freeze(result.data);
}
