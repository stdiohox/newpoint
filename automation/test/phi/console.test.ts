/**
 * The staff console against the embedded newpoint-phi database, as staff_console with
 * RLS on. Tokens are signed by a local test key; nothing calls a real IdP.
 */
import { exportJWK, generateKeyPair, createLocalJWKSet, SignJWT } from "jose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createConsole } from "../../src/console/app.js";
import { IDLE_COOKIE, idleCookieValue, type AuthConfig } from "../../src/console/auth.js";
import { consoleDb } from "../../src/console/db.js";
import { escapeHtml, html } from "../../src/console/html.js";
import { fromLocal } from "../../src/domain/scheduling/time.js";
import { startProjectDb, type MarketingDb } from "../db/marketing-db.js";
import { seedContact } from "./fixtures.js";

const ORIGIN = "https://console.example.test";
const NOW = Date.parse("2026-10-20T15:00:00Z");
const SECRET = "x".repeat(40);

let db: MarketingDb | undefined;
const client = () => {
  if (!db) throw new Error("phi database did not start");
  return db.client;
};
let auth: AuthConfig;
let privateKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];
let handler: (request: Request) => Promise<Response>;

beforeAll(async () => {
  db = await startProjectDb("phi");
  const pair = await generateKeyPair("ES256");
  privateKey = pair.privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "ES256" };
  auth = { jwks: createLocalJWKSet({ keys: [jwk] }), issuer: "https://idp.example.test", audience: "newpoint-console", sessionSecret: SECRET };
  handler = createConsole({ auth, db: consoleDb(() => Promise.resolve(client())), origin: ORIGIN, now: () => NOW });
});
afterAll(async () => {
  await db?.stop();
});
beforeEach(async () => {
  await client().query("reset role");
  await client().query(`truncate phi.audit_log, phi.crisis_events, phi.tickets, phi.review_requests, phi.review_exclusions, phi.appointments, phi.consents, phi.follow_ups, phi.booking_requests cascade; truncate phi.contacts cascade`);
});

interface TokenSpec { role?: string | null; aal?: string; sub?: string; issuedMinutesAgo?: number; issuer?: string; expiresInMinutes?: number }

async function token(spec: TokenSpec = {}): Promise<string> {
  const iat = Math.floor(NOW / 1000) - (spec.issuedMinutesAgo ?? 1) * 60;
  const claims: Record<string, unknown> = { aal: spec.aal ?? "aal2" };
  if (spec.role !== null) claims["staff_role"] = spec.role ?? "staff_clinician";
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "ES256", kid: "k1" })
    .setSubject(spec.sub ?? "clinician-1")
    .setIssuer(spec.issuer ?? auth.issuer)
    .setAudience(auth.audience)
    .setIssuedAt(iat)
    .setExpirationTime(Math.floor(NOW / 1000) + (spec.expiresInMinutes ?? 30) * 60)
    .sign(privateKey);
}

async function request(path: string, init: { method?: string; token?: string; origin?: string | null; body?: string; cookie?: string } = {}) {
  const headers = new Headers();
  if (init.token !== undefined) headers.set("authorization", `Bearer ${init.token}`);
  if (init.origin !== null) headers.set("origin", init.origin ?? ORIGIN);
  if (init.cookie !== undefined) headers.set("cookie", init.cookie);
  if (init.body !== undefined) headers.set("content-type", "application/x-www-form-urlencoded");
  return handler(new Request(`${ORIGIN}${path}`, { method: init.method ?? "GET", headers, body: init.body ?? null }));
}

async function crisisEvent(acked = false): Promise<string> {
  const contact = await seedContact(client());
  const { rows } = await client().query<{ id: string }>(
    `insert into phi.crisis_events (contact_id, channel, detected_by, staff_ack_at, staff_ack_by) values ($1, 'sms', 'keyword', $2, $3) returning id`,
    [contact, acked ? new Date() : null, acked ? "clinician-0" : null],
  );
  return rows[0]?.id ?? "";
}

describe("sign-in (§6 layer 6)", () => {
  it.each([
    ["no token", undefined, "Sign in through"],
    ["no MFA", { aal: "aal1" }, "Multi-factor"],
    ["no staff role", { role: null }, "no staff console role"],
    ["an unknown role", { role: "patient" }, "no staff console role"],
    ["a foreign issuer", { issuer: "https://evil.example" }, "not valid"],
    ["an expired token", { expiresInMinutes: -1 }, "not valid"],
    ["a sign-in older than 15 minutes with no activity", { issuedMinutesAgo: 16 }, "15 minutes"],
  ])("refuses %s", async (_label, spec, message) => {
    const response = await request("/", spec === undefined ? {} : { token: await token(spec) });
    expect(response.status).toBe(401);
    expect(await response.text()).toContain(message);
  });

  it("keeps a session alive while it is active, and ends it after 15 idle minutes", async () => {
    const t = await token({ issuedMinutesAgo: 60, expiresInMinutes: 60 });
    const recent = `${IDLE_COOKIE}=${idleCookieValue(SECRET, "clinician-1", NOW - 5 * 60_000)}`;
    const stale = `${IDLE_COOKIE}=${idleCookieValue(SECRET, "clinician-1", NOW - 16 * 60_000)}`;
    const forged = `${IDLE_COOKIE}=${idleCookieValue("y".repeat(40), "clinician-1", NOW - 60_000)}`;
    const other = `${IDLE_COOKIE}=${idleCookieValue(SECRET, "someone-else", NOW - 60_000)}`;
    expect((await request("/", { token: t, cookie: recent })).status).toBe(200);
    expect((await request("/", { token: t, cookie: stale })).status).toBe(401);
    expect((await request("/", { token: t, cookie: forged })).status).toBe(401);
    expect((await request("/", { token: t, cookie: other })).status).toBe(401);
  });

  it("sets a strict, HttpOnly idle cookie and security headers", async () => {
    const response = await request("/", { token: await token() });
    expect(response.headers.get("set-cookie")).toMatch(/HttpOnly; Secure; SameSite=Strict; Max-Age=900/);
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});

describe("queues", () => {
  it("renders inbound text escaped and audits every record shown as a read by the user", async () => {
    const contact = await seedContact(client());
    await client().query(`update phi.contacts set first_name = '<img src=x onerror=alert(1)>' where id = $1`, [contact]);
    await client().query(`insert into phi.tickets (contact_id, kind, source_kind, source_id) values ($1, 'callback', 'inquiry', gen_random_uuid())`, [contact]);
    await crisisEvent();
    const response = await request("/", { token: await token() });
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(body).not.toContain("<img src=x");
    expect(body).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(body).toContain("NOT ACKNOWLEDGED");
    expect(body).toContain("Testperson");
    expect(body).toMatch(/ ET</);
    const adminView = await (await request("/", { token: await token({ role: "staff_admin", sub: "admin-1" }) })).text();
    expect(adminView).toContain("clinician only");
    const audit = await client().query(
      `select actor, entity, count(*)::int as n from phi.audit_log where action = 'read' group by actor, entity order by actor, entity`,
    );
    // The clinician saw both patients (crisis and callback); the admin saw only the callback's.
    expect(audit.rows).toEqual([
      { actor: "admin-1", entity: "contacts", n: 1 },
      { actor: "admin-1", entity: "crisis_events", n: 1 },
      { actor: "admin-1", entity: "tickets", n: 1 },
      { actor: "clinician-1", entity: "contacts", n: 2 },
      { actor: "clinician-1", entity: "crisis_events", n: 1 },
      { actor: "clinician-1", entity: "tickets", n: 1 },
    ]);
  });
});

describe("actions", () => {
  it("refuses a POST from another origin, or with none", async () => {
    const id = await crisisEvent();
    const t = await token();
    expect((await request(`/crisis/${id}/ack`, { method: "POST", token: t, origin: "https://evil.example" })).status).toBe(403);
    expect((await request(`/crisis/${id}/ack`, { method: "POST", token: t, origin: null })).status).toBe(403);
  });

  it("only a clinician acknowledges a crisis; the audit and the row name them", async () => {
    const id = await crisisEvent();
    expect((await request(`/crisis/${id}/ack`, { method: "POST", token: await token({ role: "staff_admin", sub: "admin-1" }) })).status).toBe(403);
    expect((await request(`/crisis/${id}/ack`, { method: "POST", token: await token() })).status).toBe(303);
    const { rows } = await client().query(`select staff_ack_by from phi.crisis_events where id = $1`, [id]);
    expect(rows).toEqual([{ staff_ack_by: "clinician-1" }]);
    const follow = await client().query(`select kind::text, status::text, source_kind from phi.tickets where source_id = $1`, [id]);
    expect(follow.rows).toEqual([{ kind: "crisis_follow_up", status: "open", source_kind: "crisis_event" }]);
    const audit = await client().query(`select actor from phi.audit_log where action = 'write' and entity = 'crisis_events' and entity_id = $1`, [id]);
    expect(audit.rows.at(-1)).toEqual({ actor: "clinician-1" });
  });

  it("a voice crisis from a withheld number is shown, acknowledged and followed up", async () => {
    const { rows } = await client().query<{ id: string }>(
      `insert into phi.crisis_events (contact_id, channel, detected_by, call_ref) values (null, 'voice', 'voice', 'call_withheld') returning id`,
    );
    const page = await (await request("/", { token: await token() })).text();
    expect(page).toContain("caller withheld their number");
    expect((await request(`/crisis/${rows[0]?.id ?? ""}/ack`, { method: "POST", token: await token() })).status).toBe(303);
    expect((await client().query(`select kind::text, contact_id from phi.tickets`)).rows).toEqual([{ kind: "crisis_follow_up", contact_id: null }]);
  });

  it("an acknowledgment is final and always names the signed-in clinician", async () => {
    const id = await crisisEvent();
    await client().query("begin");
    await client().query("set local role staff_console");
    await client().query(`select set_config('request.jwt.claims', '{"sub":"clinician-1","staff_role":"staff_clinician"}', true)`);
    await client().query(`update phi.crisis_events set staff_ack_at = now(), staff_ack_by = 'someone-else' where id = $1`, [id]);
    await expect(client().query(`update phi.crisis_events set staff_ack_at = null where id = $1`, [id])).rejects.toThrow(/final/);
    await client().query("rollback");
    await client().query("begin");
    await client().query("set local role staff_console");
    await client().query(`select set_config('request.jwt.claims', '{"sub":"clinician-1","staff_role":"staff_clinician"}', true)`);
    await client().query(`update phi.crisis_events set staff_ack_at = now(), staff_ack_by = 'someone-else' where id = $1`, [id]);
    await client().query("commit");
    expect((await client().query(`select staff_ack_by from phi.crisis_events where id = $1`, [id])).rows).toEqual([{ staff_ack_by: "clinician-1" }]);
  });

  it("resumes sequences only after acknowledgment, and only a clinician", async () => {
    const open = await crisisEvent();
    expect((await request(`/crisis/${open}/resume`, { method: "POST", token: await token() })).status).toBe(403);
    const acked = await crisisEvent(true);
    expect((await request(`/crisis/${acked}/resume`, { method: "POST", token: await token({ role: "staff_admin", sub: "admin-1" }) })).status).toBe(403);
    expect((await request(`/crisis/${acked}/resume`, { method: "POST", token: await token() })).status).toBe(303);
    expect((await client().query(`select resumed_by from phi.crisis_events where id = $1`, [acked])).rows).toEqual([{ resumed_by: "clinician-1" }]);
  });

  it("a clinician excludes a patient from the pending review window", async () => {
    const contact = await seedContact(client());
    const appt = await client().query<{ id: string }>(
      `insert into phi.appointments (contact_id, provider_id, adapter, starts_at, status) values ($1, 'funmilayo-whitaker', 'manual-queue', now() - interval '1 day', 'completed') returning id`,
      [contact],
    );
    const review = await client().query<{ id: string }>(
      `insert into phi.review_requests (appointment_id, contact_id, scheduled_for) values ($1, $2, now() + interval '1 day') returning id`,
      [appt.rows[0]?.id, contact],
    );
    const id = review.rows[0]?.id ?? "";
    expect((await request(`/reviews/${id}/exclude`, { method: "POST", token: await token({ role: "staff_admin", sub: "admin-1" }) })).status).toBe(403);
    expect((await request(`/reviews/${id}/exclude`, { method: "POST", token: await token() })).status).toBe(303);
    expect((await client().query(`select status::text from phi.review_requests where id = $1`, [id])).rows).toEqual([{ status: "excluded" }]);
    expect((await client().query(`select set_by from phi.review_exclusions where contact_id = $1`, [contact])).rows).toEqual([{ set_by: "clinician-1" }]);
  });

  it("closes a ticket and sets age status (any staff), refusing bad values", async () => {
    const contact = await seedContact(client(), { minor: "unknown" });
    const ticket = await client().query<{ id: string }>(
      `insert into phi.tickets (contact_id, kind, source_kind, source_id) values ($1, 'callback', 'inquiry', gen_random_uuid()) returning id`,
      [contact],
    );
    const admin = await token({ role: "staff_admin", sub: "admin-1" });
    expect((await request(`/contacts/${contact}/age`, { method: "POST", token: admin, body: "minor_status=wizard" })).status).toBe(400);
    expect((await request(`/contacts/${contact}/age`, { method: "POST", token: admin, body: "minor_status=adult" })).status).toBe(303);
    expect((await client().query(`select minor_status::text from phi.contacts where id = $1`, [contact])).rows).toEqual([{ minor_status: "adult" }]);
    expect((await request(`/tickets/${ticket.rows[0]?.id ?? ""}/close`, { method: "POST", token: admin })).status).toBe(303);
    expect((await request(`/tickets/${ticket.rows[0]?.id ?? ""}/close`, { method: "POST", token: admin })).status).toBe(403);
  });

  it("refuses oversized bodies and hides database errors behind a fixed 500", async () => {
    const t = await token();
    const contact = await seedContact(client());
    expect((await request(`/contacts/${contact}/age`, { method: "POST", token: t, body: `minor_status=${"a".repeat(5000)}` })).status).toBe(413);
    const broken = createConsole({
      auth,
      db: consoleDb(() => Promise.reject(new Error("connect failed: password for user phi_console_rt"))),
      origin: ORIGIN,
      now: () => NOW,
    });
    const response = await broken(new Request(`${ORIGIN}/`, { headers: { authorization: `Bearer ${t}` } }));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("phi_console_rt");
  });

  it("records a booked appointment from a booking ticket (manual-queue), closing the ticket", async () => {
    const contact = await seedContact(client());
    const req = await client().query<{ id: string }>(`insert into phi.booking_requests (contact_id, status) values ($1, 'callback') returning id`, [contact]);
    const ticket = await client().query<{ id: string }>(
      `insert into phi.tickets (contact_id, kind, source_kind, source_id) values ($1, 'booking', 'booking_request', $2) returning id`,
      [contact, req.rows[0]?.id],
    );
    const tid = ticket.rows[0]?.id ?? "";
    const admin = await token({ role: "staff_admin", sub: "admin-1" });
    const etDate = (days: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(Date.now() + days * 86_400_000);
    const body = (over: Record<string, string> = {}) =>
      new URLSearchParams({ provider: "funmilayo-whitaker", date: etDate(14), time: "15:30", modality: "telehealth", ...over }).toString();
    expect((await request(`/tickets/${tid}/appointment`, { method: "POST", token: admin, body: body({ provider: "dr-nobody" }) })).status).toBe(400);
    expect((await request(`/tickets/${tid}/appointment`, { method: "POST", token: admin, body: body({ date: etDate(-3) }) })).status).toBe(400);
    expect((await request(`/tickets/${tid}/appointment`, { method: "POST", token: admin, body: body() })).status).toBe(303);
    const appt = await client().query(`select provider_id, starts_at, adapter, recorded_by, status::text from phi.appointments`);
    expect(appt.rows).toEqual([
      { provider_id: "funmilayo-whitaker", starts_at: fromLocal(etDate(14), "15:30"), adapter: "manual-queue", recorded_by: "admin-1", status: "scheduled" },
    ]);
    expect((await client().query(`select status::text from phi.booking_requests`)).rows).toEqual([{ status: "booked" }]);
    expect((await client().query(`select status::text from phi.tickets where id = $1`, [tid])).rows).toEqual([{ status: "done" }]);
  });

  it("an appointment outcome is final, and logistics help is only for a completed visit", async () => {
    const contact = await seedContact(client());
    const { rows } = await client().query<{ id: string }>(
      `insert into phi.appointments (contact_id, provider_id, external_ref, adapter, starts_at, status)
       values ($1, 'funmilayo-whitaker', 'm1', 'manual-queue', now() - interval '1 hour', 'scheduled') returning id`,
      [contact],
    );
    const id = rows[0]?.id ?? "";
    const t = await token({ role: "staff_admin", sub: "admin-1" });
    expect((await request(`/appointments/${id}/logistics`, { method: "POST", token: t })).status).toBe(403);
    expect((await request(`/appointments/${id}/outcome`, { method: "POST", token: t, body: "status=completed" })).status).toBe(303);
    expect((await request(`/appointments/${id}/outcome`, { method: "POST", token: t, body: "status=no_show" })).status).toBe(403);
    expect((await request(`/appointments/${id}/logistics`, { method: "POST", token: t })).status).toBe(303);
    expect((await client().query(`select kind::text, status::text from phi.follow_ups`)).rows).toEqual([{ kind: "post_visit_logistics", status: "scheduled" }]);
  });

  it("staff record a patient's yes to a review request, as themselves; no other consent kind", async () => {
    const contact = await seedContact(client());
    const admin = await token({ role: "staff_admin", sub: "admin-1" });
    expect((await request(`/contacts/${contact}/review-consent`, { method: "POST", token: admin })).status).toBe(400);
    expect((await request(`/contacts/${contact}/review-consent`, { method: "POST", token: admin, body: "captured=phone" })).status).toBe(303);
    const rows = await client().query<{ kind: string; source: string; recorded_by: string; captured: string }>(
      `select kind::text, source, evidence ->> 'recorded_by' as recorded_by, evidence ->> 'captured' as captured from phi.consents where kind = 'review_requests'`,
    );
    expect(rows.rows).toEqual([{ kind: "review_requests", source: "staff", recorded_by: "admin-1", captured: "phone" }]);
    expect((await client().query(`select active from phi.consent_state where contact_id = $1 and kind = 'review_requests'`, [contact])).rows).toEqual([{ active: true }]);
    expect((await request(`/contacts/${contact}/review-consent/withdraw`, { method: "POST", token: admin })).status).toBe(303);
    expect((await client().query(`select active from phi.consent_state where contact_id = $1 and kind = 'review_requests'`, [contact])).rows).toEqual([{ active: false }]);
    await client().query("begin");
    await client().query("set local role staff_console");
    await client().query(`select set_config('request.jwt.claims', '{"sub":"admin-1","staff_role":"staff_admin"}', true)`);
    await expect(
      client().query(`insert into phi.consents (contact_id, kind, granted_at, source, evidence) values ($1, 'sms_transactional', now(), 'staff', '{"recorded_by":"admin-1","captured":"phone"}')`, [contact]),
    ).rejects.toThrow(/row-level security/);
    await client().query("rollback");
    // Never backdated.
    await client().query("begin");
    await client().query("set local role staff_console");
    await client().query(`select set_config('request.jwt.claims', '{"sub":"admin-1","staff_role":"staff_admin"}', true)`);
    await expect(
      client().query(
        `insert into phi.consents (contact_id, kind, granted_at, source, evidence) values ($1, 'review_requests', now() - interval '30 days', 'staff', '{"recorded_by":"admin-1","captured":"phone"}')`,
        [contact],
      ),
    ).rejects.toThrow(/row-level security/);
    await client().query("rollback");
  });

  it("404s unknown paths and 405s other methods", async () => {
    const t = await token();
    expect((await request("/tickets/not-a-uuid/close", { method: "POST", token: t })).status).toBe(404);
    expect((await request("/", { method: "DELETE", token: t })).status).toBe(405);
  });
});

describe("html tag", () => {
  it("escapes values and keeps fragments", () => {
    expect(escapeHtml(`"'<>&`)).toBe("&quot;&#39;&lt;&gt;&amp;");
    expect(html`<p>${"<b>"}${html`<i>ok</i>`}</p>`.value).toBe("<p>&lt;b&gt;<i>ok</i></p>");
  });
});
