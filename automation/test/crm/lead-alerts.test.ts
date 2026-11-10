/** crm.new-lead-alert against the embedded Postgres, AS crm_alerts (docs/lead-crm.md). */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Email, EmailSender } from "../../src/adapters/email/resend.js";
import { alertEmail, formatEastern } from "../../src/domain/crm/alert-email.js";
import { loadCrmEnv } from "../../src/lib/env.js";
import { VendorHttpError } from "../../src/lib/errors.js";
import { createLogger, type LogRecord } from "../../src/lib/logger.js";
import { confirmationEmail, firstName, INTAKE_FORM_PATH, PRACTICE_PHONE } from "../../src/domain/crm/confirmation-email.js";
import { processNewLeads, sendLeadAlerts, sendLeadConfirmations } from "../../src/trigger/marketing/crm/lead-alerts.js";
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
    const deps = { db: client(), email, crmBaseUrl: CRM, confirm: null, logger: createLogger((r) => records.push(r)) };

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

  it("a failed send is released, so the task's own retry sends it, without spending the attempt", async () => {
    await submit("Alan", "b");
    const deps = { db: client(), crmBaseUrl: CRM, confirm: null, logger: createLogger(() => undefined) };

    await expect(sendLeadAlerts({ ...deps, email: recordingSender(true) })).rejects.toThrow("resend down");
    const again = recordingSender();
    expect(await sendLeadAlerts({ ...deps, email: again })).toEqual({ claimed: 1, sent: 1, recipients: 1 });
    const { rows } = await asOwner(() =>
      client().query<{ n: number }>("select alert_attempts as n from crm.leads where name = 'Alan'"),
    );
    expect(rows[0]?.n).toBe(1);
  });

  it("a claim that was never released expires after 5 minutes", async () => {
    await submit("Ruth", "f");
    await asOwner(() => client().query("update crm.leads set alert_claimed_at = now() - interval '4 minutes', alert_attempts = 1"));
    const deps = { db: client(), email: recordingSender(), crmBaseUrl: CRM, confirm: null, logger: createLogger(() => undefined) };
    expect((await sendLeadAlerts(deps)).claimed).toBe(0);
    await asOwner(() => client().query("update crm.leads set alert_claimed_at = now() - interval '6 minutes'"));
    expect((await sendLeadAlerts(deps)).claimed).toBe(1);
  });

  it("logs an error for leads whose alert gave up, without their details", async () => {
    await submit("Edith", "9");
    await asOwner(() => client().query("update crm.leads set alert_attempts = 5"));
    const records: LogRecord[] = [];
    const deps = { db: client(), email: recordingSender(), crmBaseUrl: CRM, confirm: null, logger: createLogger((r) => records.push(r)) };
    await sendLeadAlerts(deps);
    expect(records.some((r) => r.event === "crm.lead_alert.gave_up")).toBe(true);
    expect(JSON.stringify(records)).not.toMatch(/edith/i);
  });

  it("with nobody to alert, it leaves the lead to be sent later", async () => {
    await submit("Ida", "c");
    await asOwner(() => client().query("update crm.staff set alerts = false"));
    const email = recordingSender();
    const deps = { db: client(), email, crmBaseUrl: CRM, confirm: null, logger: createLogger(() => undefined) };
    try {
      // Every sweep in this state gives the claim back without spending an attempt.
      for (let i = 0; i < 7; i++) {
        expect(await sendLeadAlerts(deps)).toEqual({ claimed: 1, sent: 0, recipients: 0 });
      }
      expect(email.sent).toHaveLength(0);
      const { rows } = await asOwner(() =>
        client().query<{ n: number }>(
          "select count(*)::int as n from crm.leads where alerted_at is null and alert_attempts = 0 and alert_claimed_at is null",
        ),
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
    await sendLeadAlerts({ db: client(), email, crmBaseUrl: CRM, confirm: null, logger: createLogger(() => undefined) });
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]?.subject).toBe("2 new leads in the Newpoint CRM");
  });
});

describe("lead confirmation", () => {
  const confirm = { siteOrigin: "https://www.newpointnp.com", from: "Newpoint Healthcare <frontdesk@newpointnp.com>", replyTo: "desk@example.com" };
  const quiet = () => createLogger(() => undefined);

  it("emails each new lead once, from the practice, with the intake form and a reply-to", async () => {
    await submit("Grace", "c");
    const email = recordingSender();
    const deps = { db: client(), email, crmBaseUrl: CRM, confirm, logger: quiet() };

    expect(await sendLeadConfirmations(deps)).toEqual({ claimed: 1, sent: 1 });
    const sent = email.sent[0];
    expect(sent?.to).toEqual(["grace@example.com"]);
    expect(sent?.from).toBe(confirm.from);
    expect(sent?.replyTo).toBe("desk@example.com");
    expect(sent?.text).toContain("Hi Grace,");
    expect(sent?.html).toContain(`href="https://www.newpointnp.com${INTAKE_FORM_PATH}"`);
    expect(sent?.text).toContain("988");
    expect(sent?.html).toContain('href="tel:988"');
    expect(sent?.idempotencyKey).toMatch(/^lead-confirmation\//);
    expect(await sendLeadConfirmations(deps)).toEqual({ claimed: 0, sent: 0 });
  });

  it("sends the receipt without the intake form for anything but a new-patient inquiry", () => {
    for (const reason of ["Existing patient", "Insurance or billing question", "Something else"]) {
      const { html, text } = confirmationEmail({ id: "x", name: "Ada", email: "a@example.com", reason }, confirm);
      expect(html).not.toContain(INTAKE_FORM_PATH);
      expect(text).not.toContain("intake form");
      expect(text).not.toContain("first appointment");
      expect(text).toContain("988");
    }
  });

  it("spends the attempt on a permanent rejection instead of retrying it forever", async () => {
    await submit("Grace", "f");
    const rejecting: EmailSender = { send: () => Promise.reject(new VendorHttpError("resend", 422)) };
    expect(await sendLeadConfirmations({ db: client(), email: rejecting, crmBaseUrl: CRM, confirm, logger: quiet() })).toEqual({
      claimed: 1,
      sent: 0,
    });
    const attempts = await asOwner(() => client().query<{ a: number; claimed: boolean }>(
      "select confirm_attempts::int as a, confirm_claimed_at is not null as claimed from crm.leads",
    ));
    expect(attempts.rows[0]).toEqual({ a: 1, claimed: true });
  });

  it("is off while no reply-to inbox is configured", async () => {
    await submit("Grace", "d");
    const email = recordingSender();
    expect(await sendLeadConfirmations({ db: client(), email, crmBaseUrl: CRM, confirm: null, logger: quiet() })).toEqual({
      claimed: 0,
      sent: 0,
    });
    expect(email.sent).toHaveLength(0);
  });

  it("releases a failed send so the retry sends it, and still sends the staff alert", async () => {
    await submit("Grace", "e");
    const failing = recordingSender(true);
    await expect(processNewLeads({ db: client(), email: failing, crmBaseUrl: CRM, confirm, logger: quiet() })).rejects.toThrow(
      "resend down",
    );
    const email = recordingSender();
    const result = await processNewLeads({ db: client(), email, crmBaseUrl: CRM, confirm, logger: quiet() });
    expect(result.confirmations).toEqual({ claimed: 1, sent: 1 });
    expect(result.alerts.sent).toBe(1);
  });

  it("greets by first name only when it looks like one, and escapes it", () => {
    expect(firstName("  Ada   Obi ")).toBe("Ada");
    expect(firstName("<script>")).toBeNull();
    expect(firstName("O'Neil")).toBe("O'Neil");
    const { html, text } = confirmationEmail({ id: "x", name: "<b>x</b>", email: "a@example.com", reason: "New patient inquiry" }, confirm);
    expect(text.startsWith("Hello,")).toBe(true);
    expect(html).not.toContain("<b>x</b>");
  });

  it("uses the site's phone number", async () => {
    const content = await readFile(join(import.meta.dirname, "../../../lib/content.ts"), "utf8");
    expect(content).toContain(`phonePrimary: '${PRACTICE_PHONE}'`);
  });
});

describe("alertEmail", () => {
  it("formats times in Eastern time", () => {
    expect(formatEastern(new Date("2026-11-09T19:14:00Z"))).toBe("Mon, Nov 9, 2:14 PM ET");
  });

  it("refuses an empty batch", () => {
    expect(() => alertEmail([], ["a@example.com"], CRM)).toThrow();
  });

  const lead = { id: "11111111-1111-4111-8111-111111111111", reason: "New patient inquiry", createdAt: new Date("2026-11-09T19:14:00Z") };

  it("sends a branded HTML body alongside the text", () => {
    const { html, text } = alertEmail([lead], ["a@example.com"], CRM);
    expect(text).toContain(`${CRM}/leads/${lead.id}`);
    expect(html).toContain(`href="${CRM}/leads/${lead.id}"`);
    expect(html).toContain("Open lead in CRM");
    expect(html).toContain("Mon, Nov 9, 2:14 PM ET");
    expect(html).toContain(`src="${new URL(CRM).origin}/brand/newpoint-mark-color.png"`);
  });

  it("lists every lead with its own link in a batch, and links the button to the list", () => {
    const second = { ...lead, id: "22222222-2222-4222-8222-222222222222", reason: "Existing patient" };
    const { html } = alertEmail([lead, second], ["a@example.com"], CRM);
    expect(html).toContain("2 new leads");
    expect(html).toContain(`href="${CRM}/leads/${second.id}"`);
    expect(html).toContain(`href="${CRM}"`);
  });

  it("escapes what it interpolates", () => {
    const { html } = alertEmail([{ ...lead, reason: `<b>"x"</b>` }], ["a@example.com"], CRM);
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;b&gt;&quot;x&quot;&lt;/b&gt;");
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
