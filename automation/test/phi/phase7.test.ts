/**
 * Phase 7 against the embedded newpoint-phi database: booking.request, the slot
 * resolvers, booking.reminders, booking.sync, referrals.no-show / post-visit-logistics as
 * phi_tasks, and the console's appointment recording as staff_console. Fakes for Twilio,
 * Trigger.dev and n8n; synthetic data only.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createHeadwayHandoff } from "../../src/adapters/scheduling/headway-handoff.js";
import { createManualQueue } from "../../src/adapters/scheduling/manual-queue.js";
import { clientDb } from "../../src/lib/db-phi.js";
import { findDueReminders } from "../../src/trigger/phi/booking/reminders.js";
import { runBookingRequest, type BookingDeps } from "../../src/trigger/phi/booking/request.js";
import { planSync } from "../../src/trigger/phi/booking/sync.js";
import { bookingTicket } from "../../src/trigger/phi/booking/ticket.js";
import { runSendSms, type SendSmsPayload } from "../../src/trigger/phi/messaging/send-sms.js";
import { runNoShow, runPostVisitLogistics, type FollowUpDeps } from "../../src/trigger/phi/referrals/follow-ups.js";
import { startProjectDb, type MarketingDb } from "../db/marketing-db.js";
import { ENV, fakeTwilio, seedContact } from "./fixtures.js";

let db: MarketingDb | undefined;
const client = () => {
  if (!db) throw new Error("phi database did not start");
  return db.client;
};
beforeAll(async () => {
  db = await startProjectDb("phi");
});
afterAll(async () => {
  await db?.stop();
});
beforeEach(async () => {
  await client().query("reset role");
  await client().query(
    `truncate phi.audit_log, phi.messages, phi.conversations, phi.consents, phi.tickets, phi.follow_ups, phi.booking_requests,
              phi.appointments, phi.inquiries cascade; truncate phi.contacts cascade`,
  );
});
const asTasks = () => client().query("set role phi_tasks");

function bookingDeps(headway = true): BookingDeps & { sent: SendSmsPayload[]; notes: number } {
  const sent: SendSmsPayload[] = [];
  const state = { notes: 0 };
  const dbc = clientDb(client());
  return {
    db: dbc,
    manual: createManualQueue(async (id, contactId) => (await dbc.tx("booking.request", (q) => bookingTicket(q, id, contactId))).id),
    headway: headway ? createHeadwayHandoff() : null,
    send: (p) => {
      sent.push(p);
      return Promise.resolve();
    },
    notifier: { actionRequired: () => { state.notes += 1; return Promise.resolve(); } },
    actor: "booking.request",
    sent,
    get notes() {
      return state.notes;
    },
  };
}

async function request(contact: Parameters<typeof seedContact>[1], fields: Record<string, unknown> = {}): Promise<{ id: string; contactId: string }> {
  const contactId = await seedContact(client(), contact);
  await client().query(`update phi.contacts set state = 'NJ' where id = $1`, [contactId]);
  const cols = ["contact_id", ...Object.keys(fields)];
  const { rows } = await client().query<{ id: string }>(
    `insert into phi.booking_requests (${cols.join(", ")}) values (${cols.map((_, i) => `$${String(i + 1)}`).join(", ")}) returning id`,
    [contactId, ...Object.values(fields)],
  );
  return { id: rows[0]?.id ?? "", contactId };
}

describe("booking.request (§5.1)", () => {
  it("D18: an unknown-age contact gets a staff callback, never an automated booking", async () => {
    const r = await request({ minor: "unknown" }, { new_patient: false, requested_modality: "telehealth", provider_pref: "funmilayo-whitaker" });
    await asTasks();
    const deps = bookingDeps();
    expect(await runBookingRequest(deps, r.id)).toEqual({ result: "callback" });
    expect(deps.sent.map((p) => p.template)).toEqual(["booking_callback"]);
    await client().query("reset role");
    expect((await client().query(`select status::text, callback_reason, adapter from phi.booking_requests`)).rows).toEqual([
      { status: "callback", callback_reason: "age_not_confirmed", adapter: "manual-queue" },
    ]);
    expect((await client().query(`select kind::text, source_kind from phi.tickets`)).rows).toEqual([{ kind: "booking", source_kind: "booking_request" }]);
  });

  it("hands off to the one eligible provider's Headway page, with the allowlisted link", async () => {
    const r = await request({}, { new_patient: false, requested_modality: "telehealth", provider_pref: "funmilayo-whitaker" });
    await asTasks();
    const deps = bookingDeps();
    expect(await runBookingRequest(deps, r.id)).toEqual({ result: "handed_off" });
    expect(deps.sent.map((p) => p.template)).toEqual(["booking_handoff"]);
    const twilio = fakeTwilio();
    const sms = await runSendSms(
      { db: clientDb(client()), twilio, env: ENV, now: () => new Date("2026-10-20T15:00:00Z"), actor: "messaging.send-sms" },
      deps.sent[0] as SendSmsPayload,
    );
    expect(sms.status).toBe("sent");
    expect(twilio.sms[0]?.body).toContain("https://care.headway.co/providers/funmilayo-whitaker-2");
  });

  it.each([
    ["two eligible providers", { new_patient: false }, "manual_queue"],
    ["weight management (D19)", { new_patient: false, service: "weight_management" }, "weight_management"],
    ["in person in PA (not confirmed)", { new_patient: false, requested_state: "PA", requested_modality: "in_person" }, "no_eligible_provider"],
    ["a provider with no recorded page", { new_patient: false, provider_pref: "anastasia-ofoegbu" }, "manual_queue"],
  ])("a person books it: %s", async (_label, fields, reason) => {
    const r = await request({}, fields);
    await asTasks();
    expect(await runBookingRequest(bookingDeps(), r.id)).toEqual({ result: "callback" });
    await client().query("reset role");
    expect((await client().query(`select callback_reason from phi.booking_requests`)).rows).toEqual([{ callback_reason: reason }]);
  });

  it("with headway-handoff disabled, everything is the manual queue", async () => {
    const r = await request({}, { new_patient: false, provider_pref: "funmilayo-whitaker" });
    await asTasks();
    expect(await runBookingRequest(bookingDeps(false), r.id)).toEqual({ result: "callback" });
  });

  it("is decided once; a retry only re-queues the same idempotent text (a lost send is never final)", async () => {
    const r = await request({ minor: "unknown" });
    await asTasks();
    const deps = bookingDeps();
    await runBookingRequest(deps, r.id);
    expect(await runBookingRequest(deps, r.id)).toEqual({ result: "already_handled" });
    expect(deps.sent).toHaveLength(2);
    expect(deps.sent[1]).toEqual(deps.sent[0]);
    expect(deps.notes).toBe(1);
    await client().query("reset role");
    expect((await client().query(`select count(*)::int as n from phi.tickets`)).rows).toEqual([{ n: 1 }]);
  });

  it("a new patient is never handed off: the first visit must be the assessment", async () => {
    const r = await request({}, { new_patient: true, requested_modality: "telehealth", provider_pref: "funmilayo-whitaker" });
    await asTasks();
    expect(await runBookingRequest(bookingDeps(), r.id)).toEqual({ result: "callback" });
  });

  it("a handoff link is refused unless it is on the provider allowlist", async () => {
    const r = await request({});
    await client().query(`update phi.booking_requests set status = 'handed_off', adapter_result = '{"kind":"handoff","url":"https://evil.example/x"}'`);
    await asTasks();
    await expect(
      runSendSms(
        { db: clientDb(client()), twilio: fakeTwilio(), env: ENV, now: () => new Date("2026-10-20T15:00:00Z"), actor: "messaging.send-sms" },
        { template: "booking_handoff", contactId: r.contactId, entityId: r.id, step: 0 },
      ),
    ).rejects.toThrow("handoff_url_unavailable");
  });
});

async function appointment(contactId: string, startsAt: Date, status = "scheduled", newPatient: boolean | null = null): Promise<string> {
  const req =
    newPatient === null
      ? null
      : (await client().query<{ id: string }>(`insert into phi.booking_requests (contact_id, new_patient, status) values ($1, $2, 'booked') returning id`, [contactId, newPatient]))
          .rows[0]?.id;
  const { rows } = await client().query<{ id: string }>(
    `insert into phi.appointments (contact_id, provider_id, external_ref, adapter, starts_at, modality, status, source_booking_request_id)
     values ($1, 'funmilayo-whitaker', gen_random_uuid()::text, 'manual-queue', $2, 'telehealth', $3, $4) returning id`,
    [contactId, startsAt, status, req ?? null],
  );
  return rows[0]?.id ?? "";
}

describe("reminders and confirmations", () => {
  it("finds the 48 h and 2 h reminders and fills provider, date and time from the appointment", async () => {
    const contactId = await seedContact(client());
    const now = new Date();
    const a48 = await appointment(contactId, new Date(now.getTime() + 47 * 3_600_000));
    await appointment(contactId, new Date(now.getTime() + 10 * 3_600_000));
    await asTasks();
    const due = await findDueReminders(clientDb(client()), "booking.reminders", now);
    expect(due).toEqual([{ appointmentId: a48, contactId, template: "appointment_reminder_48h" }]);
    const twilio = fakeTwilio();
    await runSendSms(
      { db: clientDb(client()), twilio, env: ENV, now: () => new Date("2026-10-20T15:00:00Z"), actor: "messaging.send-sms" },
      { template: "appointment_reminder_48h", contactId, entityId: a48, step: 0 },
    );
    expect(twilio.sms[0]?.body).toMatch(/^Newpoint: reminder of your appointment with Funmilayo Whitaker, DNP on [A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2} at \d{1,2}:\d{2} (AM|PM)\./);
  });

  it("sync plans one confirmation per staff-recorded appointment, a no-show follow-up, and due logistics", async () => {
    const contactId = await seedContact(client());
    const future = await appointment(contactId, new Date(Date.now() + 5 * 86_400_000));
    const missed = await appointment(contactId, new Date(Date.now() - 86_400_000), "no_show");
    const done = await appointment(contactId, new Date(Date.now() - 2 * 86_400_000), "completed");
    await client().query(`insert into phi.follow_ups (contact_id, kind, step, due_at, source_id) values ($1, 'post_visit_logistics', 0, now(), $2)`, [contactId, done]);
    await asTasks();
    const plan = await planSync(clientDb(client()), "booking.sync", [createManualQueue(() => Promise.resolve("t"))], new Date());
    expect(plan.confirmations).toEqual([{ appointmentId: future, contactId }]);
    expect(plan.followUps.map((f) => f.kind).sort()).toEqual(["no_show", "post_visit_logistics"]);
    await planSync(clientDb(client()), "booking.sync", [], new Date());
    await client().query("reset role");
    expect((await client().query(`select count(*)::int as n from phi.follow_ups where kind = 'no_show' and source_id = $1`, [missed])).rows).toEqual([{ n: 1 }]);
  });
});

function followDeps(outcome = "sent"): FollowUpDeps & { sent: SendSmsPayload[] } {
  const sent: SendSmsPayload[] = [];
  return {
    db: clientDb(client()),
    notifier: { actionRequired: () => Promise.resolve() },
    actor: "referrals.no-show",
    sendNow: (p) => {
      sent.push(p);
      return Promise.resolve(outcome);
    },
    sent,
  };
}

async function noShowFollowUp(contactId: string, missedId: string): Promise<string> {
  const { rows } = await client().query<{ id: string }>(
    `insert into phi.follow_ups (contact_id, kind, step, due_at, source_id) values ($1, 'no_show', 0, now(), $2) returning id`,
    [contactId, missedId],
  );
  return rows[0]?.id ?? "";
}

describe("no-show and post-visit logistics (§5.1, §5.5)", () => {
  it("an established patient goes to a clinician review queue; nothing automated", async () => {
    const contactId = await seedContact(client());
    await appointment(contactId, new Date(Date.now() - 30 * 86_400_000), "completed");
    const missed = await appointment(contactId, new Date(Date.now() - 86_400_000), "no_show");
    const f = await noShowFollowUp(contactId, missed);
    await asTasks();
    const deps = followDeps();
    expect(await runNoShow(deps, f)).toEqual({ result: "clinician_review" });
    expect(deps.sent).toEqual([]);
    await client().query("reset role");
    expect((await client().query(`select kind::text from phi.tickets`)).rows).toEqual([{ kind: "clinician_review" }]);
  });

  it("no evidence the patient is new means a clinician reviews it, not an automated text", async () => {
    const contactId = await seedContact(client());
    const missed = await appointment(contactId, new Date(Date.now() - 86_400_000), "no_show");
    const f = await noShowFollowUp(contactId, missed);
    await asTasks();
    const deps = followDeps();
    expect(await runNoShow(deps, f)).toEqual({ result: "clinician_review" });
    expect(deps.sent).toEqual([]);
  });

  it("a patient known to be new gets one automated rebooking offer", async () => {
    const contactId = await seedContact(client());
    const missed = await appointment(contactId, new Date(Date.now() - 86_400_000), "no_show", true);
    const f = await noShowFollowUp(contactId, missed);
    await asTasks();
    const deps = followDeps();
    expect(await runNoShow(deps, f)).toEqual({ result: "rebook_sent" });
    expect(await runNoShow(deps, f)).toEqual({ result: "already_done" });
    expect(deps.sent.map((p) => p.template)).toEqual(["no_show_rebook"]);
  });

  it("a refused rebooking text (D18, consent, crisis pause) becomes a staff callback, never nothing", async () => {
    const contactId = await seedContact(client(), { minor: "unknown" });
    const missed = await appointment(contactId, new Date(Date.now() - 86_400_000), "no_show", true);
    const f = await noShowFollowUp(contactId, missed);
    await asTasks();
    expect(await runNoShow(followDeps("refused"), f)).toEqual({ result: "skipped" });
    await expect(runNoShow(followDeps("failed"), f)).resolves.toEqual({ result: "already_done" });
    await client().query("reset role");
    expect((await client().query(`select status::text from phi.follow_ups where id = $1`, [f])).rows).toEqual([{ status: "skipped" }]);
    expect((await client().query(`select kind::text, source_kind from phi.tickets`)).rows).toEqual([{ kind: "callback", source_kind: "follow_up" }]);
  });

  it("a transport failure is retried, not recorded as a skip", async () => {
    const contactId = await seedContact(client());
    const missed = await appointment(contactId, new Date(Date.now() - 86_400_000), "no_show", true);
    const f = await noShowFollowUp(contactId, missed);
    await asTasks();
    await expect(runNoShow(followDeps("failed"), f)).rejects.toThrow("send failed");
    await client().query("reset role");
    expect((await client().query(`select status::text from phi.follow_ups where id = $1`, [f])).rows).toEqual([{ status: "scheduled" }]);
  });

  it("post-visit logistics sends one non-clinical text", async () => {
    const contactId = await seedContact(client());
    const done = await appointment(contactId, new Date(Date.now() - 86_400_000), "completed");
    const { rows } = await client().query<{ id: string }>(
      `insert into phi.follow_ups (contact_id, kind, step, due_at, source_id) values ($1, 'post_visit_logistics', 0, now(), $2) returning id`,
      [contactId, done],
    );
    await asTasks();
    const deps = followDeps();
    expect(await runPostVisitLogistics(deps, rows[0]?.id ?? "")).toEqual({ result: "logistics_sent" });
    expect(deps.sent.map((p) => p.template)).toEqual(["post_visit_logistics"]);
  });
});
