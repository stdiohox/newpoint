import { describe, expect, it } from "vitest";
import { ConfigError } from "../../src/lib/errors.js";
import { loadConsoleEnv } from "../../src/console/env.js";
import { loadPhiEnv } from "../../src/lib/env-phi.js";
import { loadMarketingEnv } from "../../src/lib/env.js";
import { assertApprovedForEnvironment } from "../../src/trigger/phi/runtime.js";

const REF = "abcdefghijklmnopqrst";
const valid = {
  PHI_DATABASE_URL: `postgresql://phi_tasks_rt.${REF}:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
  PHI_DATABASE_CA_CERT: "-----BEGIN CERTIFICATE-----\nMIIfake\n-----END CERTIFICATE-----\n",
  SUPABASE_PHI_PROJECT_REF: REF,
  TWILIO_ACCOUNT_SID: `AC${"0".repeat(32)}`,
  TWILIO_AUTH_TOKEN: "f".repeat(32),
  TWILIO_MESSAGING_SERVICE_SID: `MG${"1".repeat(32)}`,
  TWILIO_VOICE_FROM: "+16095550100",
  ANTHROPIC_API_KEY_PHI: "sk-ant-fake",
  PHI_ON_CALL_PRIMARY_PHONE: "+16095550101",
  PHI_ON_CALL_SECONDARY_PHONE: "+16095550102",
  PHI_OPS_PAGE_PHONE: "+16095550103",
  PHI_STAFF_CONSOLE_URL: "https://console.example.test/",
  PHI_N8N_ACTION_WEBHOOK_URL: "https://n8n.example.test/webhook/action",
  PHI_N8N_ACTION_WEBHOOK_SECRET: "s".repeat(40),
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

describe("loadPhiEnv", () => {
  it("loads a complete PHI environment with default budgets", () => {
    const env = loadPhiEnv(valid);
    expect(env.SMS_DAILY_BUDGET).toBe(300);
    expect(env.SMS_PER_NUMBER_DAILY).toBe(4);
  });

  it.each(["MARKETING_DATABASE_URL", "ANTHROPIC_API_KEY_PUBLIC", "ANTHROPIC_API_KEY", "META_PAGE_TOKEN", "GBP_ACCOUNT_ID", "N8N_SOCIAL_APPROVAL_WEBHOOK_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"])(
    "refuses to start with public-zone or secret variable %s present",
    (name) => {
      const error = configError(() => loadPhiEnv({ ...valid, [name]: "x" }));
      expect(error.code).toBe("public_zone_variable_in_phi_runtime");
      expect(error.variables).toEqual([name]);
    },
  );

  it("refuses a database URL for another Supabase project", () => {
    const error = configError(() => loadPhiEnv({ ...valid, SUPABASE_PHI_PROJECT_REF: "zyxwvutsrqponmlkjihg" }));
    expect(error.code).toBe("phi_db_host_mismatch");
  });

  it("names bad variables without their values", () => {
    const error = configError(() => loadPhiEnv({ ...valid, PHI_ON_CALL_PRIMARY_PHONE: "+44 20 7946 0000" }));
    expect(error.variables).toEqual(["PHI_ON_CALL_PRIMARY_PHONE"]);
    expect(error.message).not.toContain("7946");
  });

  it("every PHI-only variable is refused by the marketing loader", () => {
    for (const name of Object.keys(valid)) {
      const error = configError(() => loadMarketingEnv({ [name]: "x" }));
      expect(error.code, name).toBe("phi_zone_variable_in_public_runtime");
    }
  });
});

describe("production approval gate (D15, D20)", () => {
  const placeholder = { crisis: { approved: false }, consent: { approved: false } };
  it("refuses PRODUCTION while either wording is a placeholder", () => {
    expect(configError(() => { assertApprovedForEnvironment("PRODUCTION", placeholder); }).variables).toEqual(["CRISIS_SCRIPT", "CONSENT_WORDING"]);
    expect(configError(() => { assertApprovedForEnvironment("PRODUCTION", { ...placeholder, crisis: { approved: true } }); }).variables).toEqual([
      "CONSENT_WORDING",
    ]);
  });
  it("refuses PRODUCTION with the wording as committed today", () => {
    expect(() => { assertApprovedForEnvironment("PRODUCTION"); }).toThrow(ConfigError);
  });
  it("lets staging and development run", () => {
    expect(() => { assertApprovedForEnvironment("STAGING", placeholder); }).not.toThrow();
    expect(() => { assertApprovedForEnvironment("DEVELOPMENT", placeholder); }).not.toThrow();
  });
  it("passes PRODUCTION once both are approved", () => {
    expect(() => { assertApprovedForEnvironment("PRODUCTION", { crisis: { approved: true }, consent: { approved: true } }); }).not.toThrow();
  });
});

describe("loadConsoleEnv", () => {
  const consoleValid = {
    PHI_CONSOLE_DATABASE_URL: `postgresql://phi_console_rt.${REF}:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    PHI_DATABASE_CA_CERT: valid.PHI_DATABASE_CA_CERT,
    SUPABASE_PHI_PROJECT_REF: REF,
    PHI_CONSOLE_JWKS_URL: "https://idp.example.test/.well-known/jwks.json",
    PHI_CONSOLE_JWT_ISSUER: "https://idp.example.test",
    PHI_CONSOLE_JWT_AUDIENCE: "newpoint-console",
    PHI_CONSOLE_SESSION_SECRET: "s".repeat(40),
    PHI_CONSOLE_ORIGIN: "https://console.example.test",
  };
  it("loads its own variables", () => {
    expect(loadConsoleEnv(consoleValid).PHI_CONSOLE_ORIGIN).toBe("https://console.example.test");
  });
  it.each(["TWILIO_AUTH_TOKEN", "ANTHROPIC_API_KEY_PHI", "PHI_DATABASE_URL", "PHI_N8N_ACTION_WEBHOOK_SECRET", "MARKETING_DATABASE_URL"])(
    "refuses task or public credentials: %s",
    (name) => {
      expect(configError(() => loadConsoleEnv({ ...consoleValid, [name]: "x" })).variables).toEqual([name]);
    },
  );
  it("the task runtime refuses the console's variables", () => {
    expect(configError(() => loadPhiEnv({ ...valid, PHI_CONSOLE_SESSION_SECRET: "x" })).variables).toEqual(["PHI_CONSOLE_SESSION_SECRET"]);
  });
});
