/** crm.new-lead-alert against the embedded Postgres, AS crm_alerts (docs/lead-crm.md). */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Email, EmailSender } from "../../src/adapters/email/resend.js";
import { alertEmail, formatEastern } from "../../src/domain/crm/alert-email.js";
import { loadCrmEnv } from "../../src/lib/env.js";
import { createLogger, type LogRecord } from "../../src/lib/logger.js";
import { sendLeadAlerts } from "../../src/trigger/marketing/crm/lead-alerts.js";
import { startMarketingDb, type MarketingDb } from "../db/marketing-db.js";

const STAFF = "00000000-0000-4000-8000-0000000000a1";
const CRM = "https://www.newpointnp.com/crm";

let db: MarketingDb | undefined;
const client = () => {
  if (!db) throw new Error("database did not start");
  return db.client;
};

async function asOwner<T>(fn: () => Promise<T>): Promise<T> {
  await client().query("reset role");
  try {
    return await fn();
  } finally {
    await client().query("set role crm_alerts");
  }
}

async function submit(name: string, key: string): Promise<string> {
  return asOwner(async () => {
    const { rows } = await client().query<{ id: string }>(
      "select crm.submit_lead($1, $2, null, 'New patient inquiry', $3) as id",
      [name, `${name.toLowerCase()}@example.com`, key.repeat(64)],
    );
    const id = rows[0]?.id;
    if (!id) throw new Error("no id");
    return id;
  });
}

function recordingSender(fail = false): EmailSender & { sent: Email[] } {
  const sent: Email[] = [];
  return {
    sent,
    send(email) {
      if (fail) return Promise.reject(new Error("resend down"));
      sent.push(email);
      return Promise.resolve();
    },
  };
}

beforeAll(async () => {
  db = await startMarketingDb();
  await db.client.query(`insert into auth.users (id, email) values ($1, 'desk@example.com')`, [STAFF]);
  await db.client.query(`insert into crm.staff (user_id, email, display_name) values ($1, 'desk@example.com', 'Front desk')`, [
    STAFF,
  ]);
  await db.client.query("set role crm_alerts");
});

afterAll(async () => {
  await db?.stop();
});

beforeEach(async () => {
  await asOwner(() => client().query("delete from crm.leads"));
});

describe("crm.new-lead-alert", () => {
  it("emails active staff once per lead, without the person's details", async () => {
    const id = await submit("Grace", "a");
    const email = recordingSender();
    const records: LogRecord[] = [];
    const deps = { db: client(), email, crmBaseUrl: CRM, logger: createLogger((r) => records.push(r)) };

    expect(await sendLeadAlerts(deps)).toEqual({ claimed: 1, sent: 1, recipients: 1 });
    expect(email.sent).toHaveLength(1);
    const sent = email.sent[0];
    expect(sent?.to).toEqual(["desk@example.com"]);
    expect(sent?.subject).toBe("New lead: New patient inquiry");
    expect(sent?.text).toContain(`${CRM}/leads/${id}`);
    expect(sent?.text).not.toMatch(/grace/i);

    expect(await sendLeadAlerts(deps)).toEqual({ claimed: 0, sent: 0, recipients: 0 });
    expect(email.sent).toHaveLength(1);
    expect(JSON.stringify(records)).not.toMatch(/grace/i);
  });

  it("a failed send is retried after the claim expires, not lost", async () => {
    await submit("Alan", "b");
    const deps = { db: client(), crmBaseUrl: CRM, logger: createLogger(() => undefined) };

    await expect(sendLeadAlerts({ ...deps, email: recordingSender(true) })).rejects.toThrow("resend down");
    // Still claimed: an immediate re-run does not double-send.
    const again = recordingSender();
    expect((await sendLeadAlerts({ ...deps, email: again })).claimed).toBe(0);

    await asOwner(() => client().query("update crm.leads set alert_claimed_at = now() - interval '11 minutes'"));
    expect(await sendLeadAlerts({ ...deps, email: again })).toEqual({ claimed: 1, sent: 1, recipients: 1 });
  });

  it("with nobody to alert, it leaves the lead to be sent later", async () => {
    await submit("Ida", "c");
    await asOwner(() => client().query("update crm.staff set alerts = false"));
    const email = recordingSender();
    const deps = { db: client(), email, crmBaseUrl: CRM, logger: createLogger(() => undefined) };
    try {
      expect(await sendLeadAlerts(deps)).toEqual({ claimed: 1, sent: 0, recipients: 0 });
      expect(email.sent).toHaveLength(0);
      const { rows } = await asOwner(() =>
        client().query<{ n: number }>("select count(*)::int as n from crm.leads where alerted_at is null"),
      );
      expect(rows[0]?.n).toBe(1);
    } finally {
      await asOwner(() => client().query("update crm.staff set alerts = true"));
    }
  });

  it("several leads go in one email", async () => {
    await submit("Lin", "d");
    await submit("Kay", "e");
    const email = recordingSender();
    await sendLeadAlerts({ db: client(), email, crmBaseUrl: CRM, logger: createLogger(() => undefined) });
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]?.subject).toBe("2 new leads in the Newpoint CRM");
  });
});

describe("alertEmail", () => {
  it("formats times in Eastern time", () => {
    expect(formatEastern(new Date("2026-11-09T19:14:00Z"))).toBe("Mon, Nov 9, 2:14 PM ET");
  });

  it("refuses an empty batch", () => {
    expect(() => alertEmail([], ["a@example.com"], CRM)).toThrow();
  });
});

describe("loadCrmEnv", () => {
  const base = {
    MARKETING_DATABASE_URL: "postgresql://trigger_marketing.utxaczptucbqrnnzmziz:pw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres",
    MARKETING_DATABASE_CA_CERT: "-----BEGIN CERTIFICATE-----\nx\n-----END CERTIFICATE-----",
    SUPABASE_MARKETING_PROJECT_REF: "utxaczptucbqrnnzmziz",
    RESEND_API_KEY: "re_1234567890abcdef",
    CRM_ALERT_FROM: "Newpoint CRM <crm@newpointnp.com>",
  };

  it("needs no Anthropic or Search Console key", () => {
    expect(loadCrmEnv(base).CRM_BASE_URL).toBe(CRM);
  });

  it("refuses a sender outside newpointnp.com and a PHI variable", () => {
    expect(() => loadCrmEnv({ ...base, CRM_ALERT_FROM: "x <a@gmail.com>" })).toThrow("invalid_crm_env");
    expect(() => loadCrmEnv({ ...base, TWILIO_AUTH_TOKEN: "x" })).toThrow("phi_zone_variable_in_public_runtime");
  });
});

describe("site ↔ database drift", () => {
  it("CONTACT.reasons in lib/content.ts are exactly the reasons crm.leads accepts", async () => {
    const root = join(import.meta.dirname, "..", "..", "..");
    const content = await readFile(join(root, "lib", "content.ts"), "utf8");
    const block = /export const CONTACT = \{[\s\S]*?reasons: \[([\s\S]*?)\]/.exec(content)?.[1] ?? "";
    const siteReasons = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);

    const migration = await readFile(
      join(root, "automation", "supabase", "marketing", "supabase", "migrations", "20261109000001_crm.sql"),
      "utf8",
    );
    const check = /reason\s+text not null check \(reason in \(([\s\S]*?)\)\)/.exec(migration)?.[1] ?? "";
    const dbReasons = [...check.matchAll(/'([^']+)'/g)].map((m) => m[1]);

    expect(siteReasons).toHaveLength(4);
    expect(dbReasons).toEqual(siteReasons);
  });
});
