/**
 * Zone-scoped environment (docs/automation-architecture.md §0.1, §6 layer 2).
 *
 * One schema per zone. Phase 0 is public-zone only, so only the marketing
 * schema exists; the PHI schema arrives in Phase 5 with its own loader.
 *
 * `loadMarketingEnv` does two things:
 *   1. validates the variables the marketing project needs;
 *   2. REFUSES TO START if any PHI-zone credential is present at all. "A
 *      marketing deploy has no PHI credential in its environment" is enforced
 *      here, not just written down.
 *
 * Errors carry variable NAMES only. Values are never echoed.
 */
import { z } from "zod";
import { ConfigError } from "./errors.js";

const postgresUrl = z
  .string()
  .regex(/^postgres(ql)?:\/\/[^\s]+$/, "must be a postgres:// or postgresql:// URL");

const googleServiceAccount = z
  .string()
  .transform((raw, ctx) => {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "must be the service-account key file as JSON" });
      return z.NEVER;
    }
  })
  .pipe(
    z.object({
      type: z.literal("service_account"),
      client_email: z.email(),
      private_key: z.string().startsWith("-----BEGIN PRIVATE KEY-----"),
    }),
  );

export const marketingEnvSchema = z.object({
  /** Session-pooler URL for the `trigger_marketing` login (member of `marketing_rw`). */
  MARKETING_DATABASE_URL: postgresUrl,
  /** Search Console property: `sc-domain:newpointnp.com` or `https://newpointnp.com/`. */
  GSC_SITE_URL: z.string().regex(/^(sc-domain:[a-z0-9.-]+|https:\/\/[^\s]+\/)$/),
  /** Service-account key JSON; the account is added as a restricted user on the property. */
  GSC_SERVICE_ACCOUNT_JSON: googleServiceAccount,
});

export type MarketingEnv = Readonly<z.output<typeof marketingEnvSchema>>;

/**
 * Names that must never exist in a public-zone runtime. Matching is by NAME, so
 * a PHI credential cannot sneak in under a value check.
 *
 * `ANTHROPIC_API_KEY` (unqualified) is forbidden too: in this codebase the two
 * Anthropic orgs are always named `_PUBLIC` / `_PHI`, and an unqualified key is
 * exactly how the HIPAA-org key would end up in the wrong project.
 */
export const PHI_ZONE_VARIABLE_PATTERNS: readonly RegExp[] = [
  /(^|_)PHI($|_)/i,
  /(^|_)HIPAA($|_)/i,
  /^TWILIO_/i,
  /^VAPI_/i,
  // Supabase secret keys under every name they ship with: legacy service_role,
  // and the newer `sb_secret_` keys. Neither belongs in a runtime (§4).
  /^SUPABASE_SERVICE_(ROLE|KEY)/i,
  /^SUPABASE_SECRET/i,
  /^ANTHROPIC_(API_KEY|AUTH_TOKEN)$/i,
];

export function findPhiZoneVariables(source: Readonly<Record<string, string | undefined>>): string[] {
  return Object.keys(source)
    .filter((name) => source[name] !== undefined && source[name] !== "")
    .filter((name) => PHI_ZONE_VARIABLE_PATTERNS.some((pattern) => pattern.test(name)))
    .sort();
}

export function loadMarketingEnv(
  source: Readonly<Record<string, string | undefined>> = process.env,
): MarketingEnv {
  const forbidden = findPhiZoneVariables(source);
  if (forbidden.length > 0) {
    throw new ConfigError("phi_zone_variable_in_public_runtime", forbidden);
  }

  const result = marketingEnvSchema.safeParse(source);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => String(issue.path[0] ?? "(root)")))].sort();
    throw new ConfigError("invalid_marketing_env", names);
  }
  return Object.freeze(result.data);
}
