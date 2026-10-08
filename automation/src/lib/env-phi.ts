/**
 * The PHI zone's environment (docs/automation-architecture.md §0.1, §6 layer 2).
 *
 * Mirror of loadMarketingEnv: validates what the newpoint-phi Trigger.dev project
 * needs, and REFUSES TO START if any public-zone credential is present, so
 * credentials never cross in either direction. The database URL must name the
 * newpoint-phi project. Errors carry variable names only.
 */
import { z } from "zod";
import { supabaseProjectRef } from "./env.js";
import { ConfigError } from "./errors.js";

const e164 = z.string().regex(/^\+1[2-9]\d{9}$/, "must be a US number in E.164 form");
const https = z.string().regex(/^https:\/\/[^\s]+$/);

export const phiEnvSchema = z.object({
  PHI_DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\/[^\s]+$/),
  PHI_DATABASE_CA_CERT: z.string().startsWith("-----BEGIN CERTIFICATE-----"),
  SUPABASE_PHI_PROJECT_REF: z.string().regex(/^[a-z]{20}$/),
  TWILIO_ACCOUNT_SID: z.string().regex(/^AC[0-9a-f]{32}$/),
  TWILIO_AUTH_TOKEN: z.string().regex(/^[0-9a-f]{32}$/),
  TWILIO_MESSAGING_SERVICE_SID: z.string().regex(/^MG[0-9a-f]{32}$/),
  /** The verified number pages and crisis calls come from. */
  TWILIO_VOICE_FROM: e164,
  /** The Anthropic HIPAA org's key (§2). Never the standard org's. */
  ANTHROPIC_API_KEY_PHI: z.string().startsWith("sk-ant-"),
  /** On-call list for crisis pages (D15: clinicians own it). */
  PHI_ON_CALL_PRIMARY_PHONE: e164,
  PHI_ON_CALL_SECONDARY_PHONE: e164,
  /** Koret ops, for paging failures and the SMS circuit breaker. */
  PHI_OPS_PAGE_PHONE: e164,
  /** §5.0 budget: global outbound SMS per day, and per number per day. */
  SMS_DAILY_BUDGET: z.coerce.number().int().min(1).max(5_000).default(300),
  SMS_PER_NUMBER_DAILY: z.coerce.number().int().min(1).max(20).default(4),
  /** Linked from pages and from n8n's generic "action required" message. */
  PHI_STAFF_CONSOLE_URL: https,
  /** n8n receives { kind: "action_required", at } and nothing else (§1). */
  PHI_N8N_ACTION_WEBHOOK_URL: https,
  PHI_N8N_ACTION_WEBHOOK_SECRET: z.string().min(32),
});

export type PhiEnv = Readonly<z.output<typeof phiEnvSchema>>;

/** Public-zone credentials: none of these may exist in a PHI runtime. */
export const PUBLIC_ZONE_VARIABLE_PATTERNS: readonly RegExp[] = [
  /^MARKETING_/i,
  /^SUPABASE_MARKETING/i,
  /^ANTHROPIC_API_KEY(_PUBLIC)?$/i,
  /^ANTHROPIC_AUTH_TOKEN$/i,
  /^GSC_/i,
  /^META_/i,
  /^GBP_/i,
  /^N8N_(SOCIAL|GBP|OPS)_/i,
  // Supabase secret keys belong in neither runtime (§4: scoped roles, never service_role).
  /^SUPABASE_SERVICE_(ROLE|KEY)/i,
  /^SUPABASE_SECRET/i,
];

/** The console's own login and session secret stay on the console host, never in a task runtime. */
const CONSOLE_ONLY_PATTERNS: readonly RegExp[] = [/^PHI_CONSOLE_/i];

export function findPublicZoneVariables(source: Readonly<Record<string, string | undefined>>): string[] {
  return Object.keys(source)
    .filter((name) => source[name] !== undefined && source[name] !== "")
    .filter((name) => PUBLIC_ZONE_VARIABLE_PATTERNS.some((p) => p.test(name)))
    .sort();
}

export function loadPhiEnv(source: Readonly<Record<string, string | undefined>> = process.env): PhiEnv {
  const forbidden = [
    ...findPublicZoneVariables(source),
    ...Object.keys(source).filter((name) => source[name] !== undefined && source[name] !== "" && CONSOLE_ONLY_PATTERNS.some((p) => p.test(name))),
  ].sort();
  if (forbidden.length > 0) throw new ConfigError("public_zone_variable_in_phi_runtime", forbidden);
  const result = phiEnvSchema.safeParse(source);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => String(issue.path[0] ?? "(root)")))].sort();
    throw new ConfigError("invalid_phi_env", names);
  }
  if (supabaseProjectRef(result.data.PHI_DATABASE_URL) !== result.data.SUPABASE_PHI_PROJECT_REF) {
    throw new ConfigError("phi_db_host_mismatch", ["PHI_DATABASE_URL", "SUPABASE_PHI_PROJECT_REF"]);
  }
  return Object.freeze(result.data);
}
