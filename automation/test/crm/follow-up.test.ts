/** crm.stale-lead-nudge and crm.weekly-summary against the embedded Postgres, AS crm_alerts. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Email, EmailSender } from "../../src/adapters/email/resend.js";
import { ageLabel, nudgeEmail, weekLabel, weeklySummaryEmail } from "../../src/domain/crm/follow-up-email.js";
import { createLogger } from "../../src/lib/logger.js";
import { easternHour, sendStaleLeadNudges, sendWeeklySummary } from "../../src/trigger/marketing/crm/follow-up.js";
import { startMarketingDb, type MarketingDb } from "../db/marketing-db.js";

const DESK = "00000000-0000-4000-8000-0000000000e1";
const DOC = "00000000-0000-4000-8000-0000000000e2";
const CRM = "https://www.newpointnp.com/crm";
/** A Tuesday at 10:00 ET (15:00 UTC, EST). */
const DAYTIME = new Date("2026-11-10T15:00:00Z");
/** 03:00 ET. */
const NIGHT = new Date("2026-11-10T08:00:00Z");

let db: MarketingDb | undefined;
const client = () => {
  if (!db) throw new Error("database did not start");
  return db.client;
};
const quiet = () => createLogger(() => undefined);

async function asOwner<T>(fn: () => Promise<T>): Promise<T> {
  await client().query("reset role");
  try {
    return await fn();
  } finally {
    await client().query("set role crm_alerts");
  }
}

async function submit(name: string, key: string, hoursAgo: number, reason = "New patient inquiry"): Promise<string> {
  return asOwner(async () => {
    const { rows } = await client().query<{ id: string }>(
      "select crm.submit_lead($1, $2, null, $3, $4) as id",
      [name, `${name.toLowerCase().replace(/\s+/g, "")}@example.com`, reason, key.repeat(64)],
    );
    const id = rows[0]?.id;
    if (!id) throw new Error("no id");
    await client().query("update crm.leads set created_at = now() - make_interval(hours => $2) where id = $1", [id, hoursAgo]);
    return id;
  });
}

function recordingSender(): EmailSender & { sent: Email[] } {
  const sent: Email[] = [];
  return {
    sent,
    send(email) {
      sent.push(email);
      return Promise.resolve();
    },
  };
}

beforeAll(async () => {
  db = await startMarketingDb();
  await db.client.query(`insert into auth.users (id, email) values ($1, 'desk@example.com'), ($2, 'doc@example.com')`, [DESK, DOC]);
  await db.client.query(`insert into crm.staff (user_id, email, display_name, role) values ($1, 'desk@example.com', 'Front desk', 'front_desk')`, [DESK]);
  await db.client.query(`insert into crm.staff (user_id, email, display_name, role) values ($1, 'doc@example.com', 'Doctor', 'provider')`, [DOC]);
  await db.client.query("set role crm_alerts");
});

afterAll(async () => {
  await db?.stop();
});

beforeEach(async () => {
  await asOwner(() => client().query("delete from crm.leads"));
});

describe("crm.stale-lead-nudge", () => {
  it("does nothing outside 08:00–19:59 Eastern", async () => {
    await submit("Grace Day", "a", 30);
    const email = recordingSender();
    expect(await sendStaleLeadNudges({ db: client(), email, crmBaseUrl: CRM, logger: quiet() }, NIGHT)).toEqual({
      skipped: "quiet_hours",
      level1: 0,
      level2: 0,
    });
    expect(email.sent).toHaveLength(0);
    expect(easternHour(new Date("2026-07-01T23:30:00Z"))).toBe(19); // EDT
    expect(easternHour(new Date("2026-12-01T04:59:00Z"))).toBe(23); // EST
  });

  it("nudges the front desk after 24 h, once, without the person's details", async () => {
    const id = await submit("Grace Day", "a", 30);
    const email = recordingSender();
    const deps = { db: client(), email, crmBaseUrl: CRM, logger: quiet() };

    expect(await sendStaleLeadNudges(deps, DAYTIME)).toEqual({ level1: 1, level2: 0 });
    const sent = email.sent[0];
    expect(sent?.to).toEqual(["desk@example.com"]);
    expect(sent?.subject).toBe("Reminder: 1 lead waiting for a first call");
    expect(sent?.text).toContain(`${CRM}/leads/${id}`);
    expect(sent?.text).not.toMatch(/grace/i);
    expect(sent?.html).not.toMatch(/graceday@example\.com/);

    expect(await sendStaleLeadNudges(deps, DAYTIME)).toEqual({ level1: 0, level2: 0 });
    expect(email.sent).toHaveLength(1);
  });

  it("escalates to everyone after 72 h, and a never-nudged old lead gets only the 72 h nudge", async () => {
    await submit("Old One", "b", 80);
    await submit("Old Two", "c", 90, "Existing patient");
    const email = recordingSender();
    expect(await sendStaleLeadNudges({ db: client(), email, crmBaseUrl: CRM, logger: quiet() }, DAYTIME)).toEqual({
      level1: 0,
      level2: 2,
    });
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]?.to).toEqual(["desk@example.com", "doc@example.com"]);
    expect(email.sent[0]?.subject).toBe("Still waiting: 2 leads not contacted");
    expect(email.sent[0]?.idempotencyKey).toMatch(/^lead-nudge\/2\/[0-9a-f]{32}$/);
  });

  it("nudges an existing patient's message after 4 hours, and everyone after 24", async () => {
    await submit("Current Patient", "7", 5, "Existing patient");
    await submit("Current Patient Two", "8", 26, "Existing patient");
    const email = recordingSender();
    expect(await sendStaleLeadNudges({ db: client(), email, crmBaseUrl: CRM, logger: quiet() }, DAYTIME)).toEqual({
      level1: 1,
      level2: 1,
    });
    expect(email.sent.map((e) => e.to)).toEqual([["desk@example.com", "doc@example.com"], ["desk@example.com"]]);
  });

  it("leaves contacted leads alone", async () => {
    const id = await submit("Handled", "d", 80);
    await asOwner(() => client().query("update crm.leads set status = 'contacted' where id = $1", [id]));
    const email = recordingSender();
    expect(await sendStaleLeadNudges({ db: client(), email, crmBaseUrl: CRM, logger: quiet() }, DAYTIME)).toEqual({
      level1: 0,
      level2: 0,
    });
  });

  it("sends the 24 h and 72 h nudges as two emails when both are due", async () => {
    await submit("Day", "e", 30);
    await submit("Days", "f", 80);
    const email = recordingSender();
    expect(await sendStaleLeadNudges({ db: client(), email, crmBaseUrl: CRM, logger: quiet() }, DAYTIME)).toEqual({
      level1: 1,
      level2: 1,
    });
    expect(email.sent.map((e) => e.to)).toEqual([["desk@example.com", "doc@example.com"], ["desk@example.com"]]);
  });
});

describe("crm.weekly-summary", () => {
  it("emails last week's counts to everyone with alerts on, with no personal details", async () => {
    const a = await submit("Last Week", "1", 1);
    const b = await submit("Also Last Week", "2", 1, "Existing patient");
    const c = await submit("Week Before", "3", 1);
    // Anchored to this Monday 00:00 ET so the test passes on any day of the week.
    const anchor = "(date_trunc('week', now() at time zone 'America/New_York') at time zone 'America/New_York')";
    await asOwner(async () => {
      await client().query(`update crm.leads set created_at = ${anchor} - interval '2 days' where id = any($1::uuid[])`, [[a, b]]);
      await client().query(`update crm.leads set created_at = ${anchor} - interval '9 days' where id = $1`, [c]);
      await client().query("update crm.leads set status = 'contacted' where id = $1", [a]);
      await client().query(`update crm.lead_activity set at = ${anchor} - interval '2 days' where kind = 'status'`);
    });
    const email = recordingSender();
    const result = await sendWeeklySummary({ db: client(), email, crmBaseUrl: CRM, logger: quiet() });
    expect(result.sent).toBe(true);
    expect(result.recipients).toBe(2);
    const sent = email.sent[0];
    expect(sent?.to).toEqual(["desk@example.com", "doc@example.com"]);
    expect(sent?.subject).toMatch(/^Newpoint leads: week of /);
    expect(sent?.text).toContain("New leads in: 2");
    expect(sent?.text).toContain("Contacted: 1");
    expect(sent?.text).toContain("Open right now: 3 (New 2, Contacted 1, Scheduled 0)");
    expect(sent?.text).toContain("Contacted but not yet scheduled after 7 days: 0");
    expect(sent?.text).not.toMatch(/last week|week before|example\.com/i);
    expect(sent?.idempotencyKey).toMatch(/^weekly-summary\/\d{4}-\d{2}-\d{2}$/);
  });
});

describe("follow-up emails", () => {
  it("labels ages and weeks in plain words", () => {
    const now = new Date("2026-11-10T15:00:00Z");
    expect(ageLabel(new Date("2026-11-09T09:00:00Z"), now)).toBe("30 hours ago");
    expect(ageLabel(new Date("2026-11-06T15:00:00Z"), now)).toBe("4 days ago");
    expect(weekLabel("2026-11-02T05:00:00Z", "2026-11-09T05:00:00Z")).toBe("Nov 2 – Nov 8");
  });

  it("escapes what it interpolates", () => {
    const lead = { id: "x", reason: "<b>Existing patient</b>", createdAt: new Date("2026-11-09T09:00:00Z"), level: 1 as const };
    const { html } = nudgeEmail(1, [lead], ["a@example.com"], CRM);
    expect(html).not.toContain("<b>");
    expect(() => nudgeEmail(1, [], ["a@example.com"], CRM)).toThrow();
    const summary = {
      from: "2026-11-02T05:00:00Z",
      to: "2026-11-09T05:00:00Z",
      new_in: 1,
      by_reason: { "<i>x</i>": 1 },
      moved: {},
      open: {},
      untouched_new: 0,
      stalled_contacted: 0,
      oldest_new_hours: null,
    };
    expect(weeklySummaryEmail(summary, ["a@example.com"], CRM).html).not.toContain("<i>");
  });
});
