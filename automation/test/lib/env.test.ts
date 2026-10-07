import { describe, expect, it } from "vitest";
import { findPhiZoneVariables, loadMarketingEnv } from "../../src/lib/env.js";
import { ConfigError } from "../../src/lib/errors.js";

const serviceAccount = JSON.stringify({
  type: "service_account",
  client_email: "gsc-reader@newpoint-marketing.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIfake\n-----END PRIVATE KEY-----\n",
});

const valid = {
  MARKETING_DATABASE_URL:
    "postgresql://trigger_marketing.abcdefghijklmnop:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
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
      "GSC_SERVICE_ACCOUNT_JSON",
      "GSC_SITE_URL",
      "MARKETING_DATABASE_URL",
    ]);
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
