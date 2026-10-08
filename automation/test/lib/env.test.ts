import { describe, expect, it } from "vitest";
import { findPhiZoneVariables, loadMarketingEnv, supabaseProjectRef } from "../../src/lib/env.js";
import { ConfigError } from "../../src/lib/errors.js";

const serviceAccount = JSON.stringify({
  type: "service_account",
  client_email: "gsc-reader@newpoint-marketing.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIfake\n-----END PRIVATE KEY-----\n",
});

const MARKETING_REF = "abcdefghijklmnopqrst";
const PHI_REF = "zyxwvutsrqponmlkjihg";

const valid = {
  MARKETING_DATABASE_URL: `postgresql://trigger_marketing.${MARKETING_REF}:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
  MARKETING_DATABASE_CA_CERT: "-----BEGIN CERTIFICATE-----\nMIIfake\n-----END CERTIFICATE-----\n",
  SUPABASE_MARKETING_PROJECT_REF: MARKETING_REF,
  ANTHROPIC_API_KEY_PUBLIC: "sk-ant-api03-fake",
  GSC_SITE_URL: "sc-domain:newpointnp.com",
  GSC_SERVICE_ACCOUNT_JSON: serviceAccount,
};

function configError(fn: () => unknown): ConfigError {
  try {
    fn();
  } catch (error) {
    if (error instanceof ConfigError) return error;
    throw error;
  }
  throw new Error("expected a ConfigError");
}

describe("loadMarketingEnv", () => {
  it("parses a valid environment", () => {
    const env = loadMarketingEnv(valid);
    expect(env.GSC_SITE_URL).toBe("sc-domain:newpointnp.com");
    expect(env.GSC_SERVICE_ACCOUNT_JSON.client_email).toBe(
      "gsc-reader@newpoint-marketing.iam.gserviceaccount.com",
    );
    expect(Object.isFrozen(env)).toBe(true);
  });

  it("accepts a URL-prefix Search Console property", () => {
    expect(loadMarketingEnv({ ...valid, GSC_SITE_URL: "https://newpointnp.com/" }).GSC_SITE_URL).toBe(
      "https://newpointnp.com/",
    );
  });

  it("reports invalid variables by NAME and never by value", () => {
    const error = configError(() =>
      loadMarketingEnv({ ...valid, MARKETING_DATABASE_URL: "mysql://secret-host", GSC_SERVICE_ACCOUNT_JSON: "{" }),
    );
    expect(error.code).toBe("invalid_marketing_env");
    expect(error.variables).toEqual(["GSC_SERVICE_ACCOUNT_JSON", "MARKETING_DATABASE_URL"]);
    expect(JSON.stringify(error)).not.toContain("secret-host");
    expect(error.message).not.toContain("secret-host");
  });

  it("reports missing variables", () => {
    expect(configError(() => loadMarketingEnv({})).variables).toEqual([
      "ANTHROPIC_API_KEY_PUBLIC",
      "GSC_SERVICE_ACCOUNT_JSON",
      "GSC_SITE_URL",
      "MARKETING_DATABASE_CA_CERT",
      "MARKETING_DATABASE_URL",
      "SUPABASE_MARKETING_PROJECT_REF",
    ]);
  });

  it.each([
    ["the PHI project's pooler URL", `postgresql://trigger_marketing.${PHI_REF}:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres`],
    ["the PHI project's direct URL", `postgresql://postgres:pw@db.${PHI_REF}.supabase.co:5432/postgres`],
    ["a non-Supabase host", "postgresql://u:pw@db.example.com:5432/postgres"],
    ["a query string that pg would read as the host", `postgresql://trigger_marketing.${MARKETING_REF}:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres?host=db.${PHI_REF}.supabase.co`],
    ["a query string that turns off TLS verification", `postgresql://trigger_marketing.${MARKETING_REF}:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify`],
    ["a malformed username encoding", "postgresql://trigger_marketing.%zz:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres"],
    ["a pooler URL with no project in the user", "postgresql://postgres:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres"],
  ])("refuses a database URL for %s", (_label, url) => {
    const error = configError(() => loadMarketingEnv({ ...valid, MARKETING_DATABASE_URL: url }));
    expect(error.code).toBe("marketing_db_host_mismatch");
    expect(JSON.stringify(error)).not.toContain("pw");
  });

  it("accepts the marketing project's direct URL", () => {
    const url = `postgresql://postgres:pw@db.${MARKETING_REF}.supabase.co:5432/postgres`;
    expect(loadMarketingEnv({ ...valid, MARKETING_DATABASE_URL: url }).MARKETING_DATABASE_URL).toBe(url);
  });

  it.each([
    "ANTHROPIC_API_KEY_PHI",
    "PHI_DATABASE_URL",
    "SUPABASE_PHI_URL",
    "TRIGGER_PROJECT_REF_PHI",
    "TWILIO_AUTH_TOKEN",
    "VAPI_API_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_AUTH_TOKEN",
    "SUPABASE_SERVICE_KEY",
    "SUPABASE_SECRET_KEY",
    "HIPAA_DATABASE_URL",
    "twilio_auth_token",
    "newpoint_phi_db_url",
  ])("refuses to start when %s is present", (name) => {
    const error = configError(() => loadMarketingEnv({ ...valid, [name]: "x" }));
    expect(error.code).toBe("phi_zone_variable_in_public_runtime");
    expect(error.variables).toEqual([name]);
  });

  it("checks for PHI-zone variables before validating anything else", () => {
    expect(configError(() => loadMarketingEnv({ TWILIO_ACCOUNT_SID: "AC1" })).code).toBe(
      "phi_zone_variable_in_public_runtime",
    );
  });
});

describe("GEO_SITE_URL", () => {
  it("defaults to the practice's site and accepts only its domain", () => {
    expect(loadMarketingEnv(valid).GEO_SITE_URL).toBe("https://newpointnp.com/");
    expect(loadMarketingEnv({ ...valid, GEO_SITE_URL: "https://staging.newpointnp.com/" }).GEO_SITE_URL).toBe(
      "https://staging.newpointnp.com/",
    );
    for (const url of ["https://169.254.169.254/", "https://localhost/", "https://newpointnp.com.evil.example/", "http://newpointnp.com/"]) {
      expect(configError(() => loadMarketingEnv({ ...valid, GEO_SITE_URL: url })).variables).toEqual(["GEO_SITE_URL"]);
    }
  });
});

describe("supabaseProjectRef", () => {
  it("reads the ref from both URL shapes and nothing else", () => {
    expect(supabaseProjectRef(valid.MARKETING_DATABASE_URL)).toBe(MARKETING_REF);
    expect(supabaseProjectRef(`postgres://postgres:x@db.${PHI_REF}.supabase.co:6543/postgres`)).toBe(PHI_REF);
    expect(supabaseProjectRef("postgres://u:x@localhost:5432/postgres")).toBeUndefined();
    expect(supabaseProjectRef("not a url")).toBeUndefined();
  });
});

describe("findPhiZoneVariables", () => {
  it("ignores public-zone names that merely contain the letters", () => {
    expect(
      findPhiZoneVariables({
        ANTHROPIC_API_KEY_PUBLIC: "x",
        GRAPHITE_TOKEN: "x",
        DELPHI_MODE: "x",
        TRIGGER_SECRET_KEY: "x",
      }),
    ).toEqual([]);
  });

  it("ignores empty and unset values", () => {
    expect(findPhiZoneVariables({ TWILIO_AUTH_TOKEN: "", VAPI_API_KEY: undefined })).toEqual([]);
  });
});

describe("social env (Phase 3)", async () => {
  const { approvalWebhookEnv, metaEnv } = await import("../../src/lib/env.js");

  it("is optional at load, and each social task asks for exactly what it needs", () => {
    const env = loadMarketingEnv(valid);
    expect(configError(() => metaEnv(env)).variables).toEqual(["META_GRAPH_VERSION", "META_PAGE_ID", "META_PAGE_ACCESS_TOKEN"]);
    expect(configError(() => approvalWebhookEnv(env)).variables).toEqual([
      "N8N_SOCIAL_APPROVAL_WEBHOOK_URL",
      "N8N_SOCIAL_APPROVAL_WEBHOOK_SECRET",
    ]);
  });

  it("returns the Meta and webhook settings once set", () => {
    const env = loadMarketingEnv({
      ...valid,
      META_GRAPH_VERSION: "v24.0",
      META_PAGE_ID: "1234567",
      META_PAGE_ACCESS_TOKEN: "EAAG-page-token-xxxxxxxx",
      N8N_SOCIAL_APPROVAL_WEBHOOK_URL: "https://n8n.example/webhook/newpoint-social-approval",
      N8N_SOCIAL_APPROVAL_WEBHOOK_SECRET: "s".repeat(32),
    });
    expect(metaEnv(env)).toMatchObject({ graphVersion: "v24.0", pageId: "1234567", igUserId: undefined });
    expect(approvalWebhookEnv(env).url).toBe("https://n8n.example/webhook/newpoint-social-approval");
  });

  it("rejects an unpinned Graph version and a short webhook secret", () => {
    expect(configError(() => loadMarketingEnv({ ...valid, META_GRAPH_VERSION: "latest" })).variables).toEqual(["META_GRAPH_VERSION"]);
    expect(configError(() => loadMarketingEnv({ ...valid, N8N_SOCIAL_APPROVAL_WEBHOOK_SECRET: "short" })).variables).toEqual([
      "N8N_SOCIAL_APPROVAL_WEBHOOK_SECRET",
    ]);
  });
});
