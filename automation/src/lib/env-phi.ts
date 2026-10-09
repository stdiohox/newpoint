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
  /**
   * Phase 9: the practice's generic Google review link — the only URL a review text may carry.
   * Unset until the Google Business Profile is verified (D11); no review request goes out without it.
   */
  PHI_GOOGLE_REVIEW_URL: z
    .string()
    .regex(/^https:\/\/(g\.page\/r\/[A-Za-z0-9_-]{6,80}\/review|search\.google\.com\/local\/writereview\?placeid=[A-Za-z0-9_-]{10,80})$/)
    .optional(),
  /** Phase 10: the private referral bucket on newpoint-phi, with a storage-scoped JWT (never service_role). All three or none. */
  PHI_STORAGE_URL: z.string().regex(/^https:\/\/[a-z]{20}\.supabase\.co$/).optional(),
  PHI_STORAGE_BUCKET: z.string().regex(/^[a-z0-9-]{3,63}$/).optional(),
  PHI_STORAGE_JWT: z.string().min(40).optional(),
  /** D12: referrer updates are built but OFF. Turning this on alone sends nothing (no channel is wired). */
  PHI_REFERRER_UPDATE_ENABLED: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
  /** Phase 9: the insert-only metrics_writer login on newpoint-marketing (§1 crossing). All three or none. */
  PHI_METRICS_WRITER_DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\/[^\s]+$/).optional(),
  PHI_METRICS_WRITER_CA_CERT: z.string().startsWith("-----BEGIN CERTIFICATE-----").optional(),
  PHI_METRICS_MARKETING_PROJECT_REF: z.string().regex(/^[a-z]{20}$/).optional(),
  /**
   * D1: both adapters are built; only manual-queue is ON by default. headway-handoff texts a
   * care.headway.co link whose lock-screen preview names a mental-health platform and the
   * provider (healthcare review, Phase 7), which §5.0's neutral-wording rule forbids. Turn it
   * on only after the owners decide how a link may be sent (e.g. a neutral redirect).
   */
  PHI_SCHEDULING_ADAPTERS: z
    .string()
    .regex(/^(manual-queue|headway-handoff)(,(manual-queue|headway-handoff))*$/)
    .default("manual-queue")
    .transform((v) => v.split(",")),
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
  const storage = [result.data.PHI_STORAGE_URL, result.data.PHI_STORAGE_BUCKET, result.data.PHI_STORAGE_JWT];
  if (storage.some((v) => v !== undefined) && storage.some((v) => v === undefined)) {
    throw new ConfigError("storage_partial", ["PHI_STORAGE_BUCKET", "PHI_STORAGE_JWT", "PHI_STORAGE_URL"]);
  }
  // The bucket lives in newpoint-phi itself, never anywhere else.
  if (result.data.PHI_STORAGE_URL !== undefined && result.data.PHI_STORAGE_URL !== `https://${result.data.SUPABASE_PHI_PROJECT_REF}.supabase.co`) {
    throw new ConfigError("storage_host_mismatch", ["PHI_STORAGE_URL", "SUPABASE_PHI_PROJECT_REF"]);
  }
  const metrics = [result.data.PHI_METRICS_WRITER_DATABASE_URL, result.data.PHI_METRICS_WRITER_CA_CERT, result.data.PHI_METRICS_MARKETING_PROJECT_REF];
  if (metrics.some((v) => v !== undefined) && metrics.some((v) => v === undefined)) {
    throw new ConfigError("metrics_writer_partial", ["PHI_METRICS_MARKETING_PROJECT_REF", "PHI_METRICS_WRITER_CA_CERT", "PHI_METRICS_WRITER_DATABASE_URL"]);
  }
  if (result.data.PHI_METRICS_WRITER_DATABASE_URL !== undefined) {
    // The writer must point at newpoint-marketing, and never at the PHI project itself.
    const ref = supabaseProjectRef(result.data.PHI_METRICS_WRITER_DATABASE_URL);
    // And it must be a metrics_writer login, never postgres or another full-privilege role.
    const user = decodeURIComponent(new URL(result.data.PHI_METRICS_WRITER_DATABASE_URL).username);
    if (!/^metrics_writer(_[a-z0-9]+)?(\.[a-z]{20})?$/.test(user)) {
      throw new ConfigError("metrics_writer_role", ["PHI_METRICS_WRITER_DATABASE_URL"]);
    }
    if (ref !== result.data.PHI_METRICS_MARKETING_PROJECT_REF || ref === result.data.SUPABASE_PHI_PROJECT_REF) {
      throw new ConfigError("metrics_writer_host_mismatch", ["PHI_METRICS_MARKETING_PROJECT_REF", "PHI_METRICS_WRITER_DATABASE_URL"]);
    }
  }
  return Object.freeze(result.data);
}
