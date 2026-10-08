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
  /** Supabase's root CA (PEM), so TLS to the database is verified, not just encrypted. */
  MARKETING_DATABASE_CA_CERT: z.string().startsWith("-----BEGIN CERTIFICATE-----"),
  /** The newpoint-marketing project ref (Supabase → Project settings). The DB URL must point at it. */
  SUPABASE_MARKETING_PROJECT_REF: z.string().regex(/^[a-z]{20}$/, "must be a 20-letter Supabase project ref"),
  /** Key for the STANDARD (public) Anthropic org. Never the HIPAA org's key (§2). */
  ANTHROPIC_API_KEY_PUBLIC: z.string().startsWith("sk-ant-"),
  /**
   * The public site geo.recommendations reads for schema.org coverage (§5.6).
   * Pinned to the practice's own domain: the task fetches whatever this names.
   */
  GEO_SITE_URL: z
    .string()
    .regex(/^https:\/\/([a-z0-9-]+\.)*newpointnp\.com\/$/, "must be https://newpointnp.com/ or a subdomain, ending in /")
    .default("https://newpointnp.com/"),
  // --- Phase 3, social (§5.7). Optional here so SEO and GEO run before Meta is set up;
  // each social task demands what it needs through socialEnv() / approvalEnv().
  /** Graph API version, pinned (for example v24.0). Never defaulted: Meta retires versions. */
  META_GRAPH_VERSION: z.string().regex(/^v\d+\.\d+$/).optional(),
  /** The Facebook Page that posts. */
  META_PAGE_ID: z.string().regex(/^\d{5,25}$/).optional(),
  /** A long-lived Page access token for that Page, from the Meta app after app review. */
  META_PAGE_ACCESS_TOKEN: z.string().min(20).optional(),
  /** The Instagram professional account linked to the Page. */
  META_IG_USER_ID: z.string().regex(/^\d{5,25}$/).optional(),
  /** n8n webhook that sends a draft to the owners for approval (§5.7). */
  N8N_SOCIAL_APPROVAL_WEBHOOK_URL: z.string().regex(/^https:\/\/[^\s]+$/).optional(),
  /** That webhook's Header Auth secret (n8n/README.md §5). */
  N8N_SOCIAL_APPROVAL_WEBHOOK_SECRET: z.string().min(32).optional(),
  // --- Phase 4, GBP (§5.2). Optional at load, demanded by the GBP tasks.
  /** n8n webhook for review-reply approvals (raw review beside the draft). */
  N8N_GBP_REPLY_APPROVAL_WEBHOOK_URL: z.string().regex(/^https:\/\/[^\s]+$/).optional(),
  N8N_GBP_REPLY_APPROVAL_WEBHOOK_SECRET: z.string().min(32).optional(),
  /** n8n webhook that alerts Koret ops (ops.heartbeat). */
  N8N_OPS_ALERT_WEBHOOK_URL: z.string().regex(/^https:\/\/[^\s]+$/).optional(),
  N8N_OPS_ALERT_WEBHOOK_SECRET: z.string().min(32).optional(),
  /** OAuth client and a refresh token of a user who manages the listing (GBP has no service accounts). */
  GBP_OAUTH_CLIENT_ID: z.string().regex(/\.apps\.googleusercontent\.com$/).optional(),
  GBP_OAUTH_CLIENT_SECRET: z.string().min(10).optional(),
  GBP_OAUTH_REFRESH_TOKEN: z.string().min(20).optional(),
  /** accounts/{GBP_ACCOUNT_ID}/locations/{GBP_LOCATION_ID}: numeric ids from the GBP API. */
  GBP_ACCOUNT_ID: z.string().regex(/^\d{5,30}$/).optional(),
  GBP_LOCATION_ID: z.string().regex(/^\d{5,30}$/).optional(),
  /**
   * gbp.nap-audit runs only when this is exactly "true". Leave unset until D11 is
   * confirmed (legal name, street address, storefront vs service area); the task
   * also refuses unless those facts are confirmed in public.practice_facts.
   */
  GBP_NAP_AUDIT_ENABLED: z.enum(["true", "false"]).optional(),
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
  if (supabaseProjectRef(result.data.MARKETING_DATABASE_URL) !== result.data.SUPABASE_MARKETING_PROJECT_REF) {
    throw new ConfigError("marketing_db_host_mismatch", [
      "MARKETING_DATABASE_URL",
      "SUPABASE_MARKETING_PROJECT_REF",
    ]);
  }
  return Object.freeze(result.data);
}

/**
 * The Supabase project a connection string points at, or undefined when it is
 * not a Supabase URL at all. Two shapes exist:
 *   - session/transaction pooler: user `<role>.<ref>` at `*.pooler.supabase.com`;
 *   - direct: host `db.<ref>.supabase.co`.
 * The check is the runtime half of "a marketing deploy has no PHI credential":
 * a newpoint-phi URL pasted into MARKETING_DATABASE_URL names another project.
 */
export function supabaseProjectRef(databaseUrl: string): string | undefined {
  let url: URL;
  let username: string;
  try {
    url = new URL(databaseUrl);
    username = decodeURIComponent(url.username);
  } catch {
    return undefined;
  }
  // pg reads connection options from the query string (`?host=`, `?sslmode=`), and
  // they win over everything else. A URL with one is refused outright, so the host
  // checked here is the host connected to (createMarketingPool never passes the URL).
  if (url.search !== "" || url.hash !== "") return undefined;
  const host = url.hostname.toLowerCase();
  const direct = /^db\.([a-z]{20})\.supabase\.co$/.exec(host);
  if (direct) return direct[1];
  if (host.endsWith(".pooler.supabase.com")) {
    return /^[^.]+\.([a-z]{20})$/.exec(username)?.[1];
  }
  return undefined;
}

export interface MetaEnv {
  readonly graphVersion: string;
  readonly pageId: string;
  readonly pageAccessToken: string;
  /** Absent until the Instagram account is linked; Instagram posts are then not planned. */
  readonly igUserId: string | undefined;
}

/** The Meta credentials social.publisher needs, or a ConfigError naming what is missing. */
export function metaEnv(env: MarketingEnv): MetaEnv {
  const missing = (["META_GRAPH_VERSION", "META_PAGE_ID", "META_PAGE_ACCESS_TOKEN"] as const).filter((name) => env[name] === undefined);
  if (missing.length > 0 || !env.META_GRAPH_VERSION || !env.META_PAGE_ID || !env.META_PAGE_ACCESS_TOKEN) {
    throw new ConfigError("meta_env_missing", missing);
  }
  return {
    graphVersion: env.META_GRAPH_VERSION,
    pageId: env.META_PAGE_ID,
    pageAccessToken: env.META_PAGE_ACCESS_TOKEN,
    igUserId: env.META_IG_USER_ID,
  };
}

const WEBHOOKS = {
  social_approval: ["N8N_SOCIAL_APPROVAL_WEBHOOK_URL", "N8N_SOCIAL_APPROVAL_WEBHOOK_SECRET"],
  gbp_reply_approval: ["N8N_GBP_REPLY_APPROVAL_WEBHOOK_URL", "N8N_GBP_REPLY_APPROVAL_WEBHOOK_SECRET"],
  ops_alert: ["N8N_OPS_ALERT_WEBHOOK_URL", "N8N_OPS_ALERT_WEBHOOK_SECRET"],
} as const;

/** An n8n webhook and its Header Auth secret, or a ConfigError naming what is missing. */
export function webhookEnv(env: MarketingEnv, webhook: keyof typeof WEBHOOKS): { readonly url: string; readonly secret: string } {
  const [urlName, secretName] = WEBHOOKS[webhook];
  const url = env[urlName];
  const secret = env[secretName];
  if (!url || !secret) {
    throw new ConfigError(`${webhook}_webhook_env_missing` as const, [urlName, secretName].filter((name) => env[name] === undefined));
  }
  return { url, secret };
}

/** The n8n webhook social.approval posts to, or a ConfigError naming what is missing. */
export function approvalWebhookEnv(env: MarketingEnv): { readonly url: string; readonly secret: string } {
  try {
    return webhookEnv(env, "social_approval");
  } catch (error) {
    if (error instanceof ConfigError) throw new ConfigError("approval_webhook_env_missing", error.variables);
    throw error;
  }
}

export interface GbpEnv {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
  readonly accountId: string;
  readonly locationId: string;
}

/** The GBP OAuth client and listing ids, or a ConfigError naming what is missing. */
export function gbpEnv(env: MarketingEnv): GbpEnv {
  const names = ["GBP_OAUTH_CLIENT_ID", "GBP_OAUTH_CLIENT_SECRET", "GBP_OAUTH_REFRESH_TOKEN", "GBP_ACCOUNT_ID", "GBP_LOCATION_ID"] as const;
  const missing = names.filter((name) => env[name] === undefined);
  const { GBP_OAUTH_CLIENT_ID, GBP_OAUTH_CLIENT_SECRET, GBP_OAUTH_REFRESH_TOKEN, GBP_ACCOUNT_ID, GBP_LOCATION_ID } = env;
  if (!GBP_OAUTH_CLIENT_ID || !GBP_OAUTH_CLIENT_SECRET || !GBP_OAUTH_REFRESH_TOKEN || !GBP_ACCOUNT_ID || !GBP_LOCATION_ID) {
    throw new ConfigError("gbp_env_missing", missing);
  }
  return {
    clientId: GBP_OAUTH_CLIENT_ID,
    clientSecret: GBP_OAUTH_CLIENT_SECRET,
    refreshToken: GBP_OAUTH_REFRESH_TOKEN,
    accountId: GBP_ACCOUNT_ID,
    locationId: GBP_LOCATION_ID,
  };
}
