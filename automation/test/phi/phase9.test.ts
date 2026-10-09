/**
 * Phase 9: review eligibility, reviews.request-review against newpoint-phi as phi_tasks, the
 * review link slot, and the metrics push into newpoint-marketing as metrics_writer.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createMetricsWriter } from "../../src/adapters/metrics/writer.js";
import { reviewEligibility, suppress, type ReviewFacts } from "../../src/domain/eligibility/review-eligibility.js";
import { clientDb } from "../../src/lib/db-phi.js";
import { runSendSms, type SendSmsPayload } from "../../src/trigger/phi/messaging/send-sms.js";
import { dailyCounts, healthRows, reviewCounts } from "../../src/trigger/phi/reviews/metrics.js";
import { openReviewRequest, sendReviewRequest, type ReviewDeps } from "../../src/trigger/phi/reviews/request-review.js";
import { startMarketingDb, startProjectDb, type MarketingDb } from "../db/marketing-db.js";
import { ENV, fakeTwilio, seedContact } from "./fixtures.js";

const REVIEW_URL = "https://g.page/r/CabcdefGHIJ123/review";
const IN_WINDOW = new Date("2026-10-20T15:00:00Z"); // 11:00 ET
const EVENING = new Date("2026-10-20T23:30:00Z"); // 19:30 ET

const base: ReviewFacts = {
  appointmentStatus: "completed",
  reviewConsent: true,
  smsConsent: true,
  excluded: false,
  crisisInLast90Days: false,
  sentInLast12Months: false,
  minorStatus: "adult",
};

describe("review eligibility (§5.4): every condition must hold", () => {
  it.each([
    [{ appointmentStatus: "no_show" as const }, "not_completed"],
    [{ appointmentStatus: "cancelled" as const }, "not_completed"],
    [{ minorStatus: "unknown" as const }, "not_adult"],
    [{ minorStatus: "minor" as const }, "not_adult"],
    [{ excluded: true }, "excluded"],
    [{ crisisInLast90Days: true }, "recent_crisis"],
    [{ sentInLast12Months: true }, "sent_within_12_months"],
    [{ reviewConsent: false }, "no_review_consent"],
    [{ smsConsent: false }, "no_sms_consent"],
  ])("%o → %s", (over, reason) => {
    expect(reviewEligibility({ ...base, ...over })).toEqual({ eligible: false, reason });
  });
  it("eligible when all hold; nothing about how the visit went is an input (no gating)", () => {
    expect(reviewEligibility(base)).toEqual({ eligible: true });
    expect(Object.keys(base).some((k) => /sentiment|rating|satisf|feedback/i.test(k))).toBe(false);
  });
  it("suppresses counts below 5", () => {
    expect([0, 4, 5, 12].map(suppress)).toEqual([null, null, 5, 12]);
  });
});

let phiDb: MarketingDb | undefined;
let mktDb: MarketingDb | undefined;
const phiClient = () => {
  if (!phiDb) throw new Error("phi database did not start");
  return phiDb.client;
};
const mktClient = () => {
  if (!mktDb) throw new Error("marketing database did not start");
  return mktDb.client;
};
beforeAll(async () => {
  [phiDb, mktDb] = await Promise.all([startProjectDb("phi"), startMarketingDb()]);
});
afterAll(async () => {
  await Promise.all([phiDb?.stop(), mktDb?.stop()]);
});
beforeEach(async () => {
  await phiClient().query("reset role");
  await phiClient().query(
    `truncate phi.audit_log, phi.review_requests, phi.review_exclusions, phi.crisis_events, phi.appointments, phi.consents, phi.messages,
              phi.conversations, phi.inquiries, phi.follow_ups, ops.agent_health cascade; truncate phi.contacts cascade`,
  );
});

async function completedVisit(contact: Parameters<typeof seedContact>[1] = {}, reviewConsent = true): Promise<{ contactId: string; appointmentId: string }> {
  const contactId = await seedContact(phiClient(), contact);
  if (reviewConsent) {
    await phiClient().query(
      `insert into phi.consents (contact_id, kind, granted_at, source, evidence) values ($1, 'review_requests', now(), 'staff', '{"recorded_by":"admin-1"}')`,
      [contactId],
    );
  }
  const { rows } = await phiClient().query<{ id: string }>(
    `insert into phi.appointments (contact_id, provider_id, external_ref, adapter, starts_at, status)
     values ($1, 'funmilayo-whitaker', gen_random_uuid()::text, 'manual-queue', now() - interval '2 hours', 'completed') returning id`,
    [contactId],
  );
  return { contactId, appointmentId: rows[0]?.id ?? "" };
}

function reviewDeps(now = IN_WINDOW, reply: string | { reason: string } = "sent"): ReviewDeps & { sent: SendSmsPayload[] } {
  const sent: SendSmsPayload[] = [];
  return {
    db: clientDb(phiClient()),
    linkConfigured: true,
    now: () => now,
    actor: "reviews.request-review",
    sendNow: (p) => {
      sent.push(p);
      return Promise.resolve(reply);
    },
    sent,
  };
}
const asTasks = () => phiClient().query("set role phi_tasks");

describe("reviews.request-review (§5.4)", () => {
  it("opens a 24 h clinician window, then sends once inside 10:00–19:00", async () => {
    const { appointmentId } = await completedVisit();
    await asTasks();
    const deps = reviewDeps();
    const opened = await openReviewRequest(deps, appointmentId);
    expect("reviewRequestId" in opened && opened.scheduledFor.getTime() - IN_WINDOW.getTime()).toBe(24 * 3_600_000);
    const id = "reviewRequestId" in opened ? opened.reviewRequestId : "";
    expect(await sendReviewRequest(reviewDeps(EVENING), id)).toEqual({ status: "wait", until: new Date("2026-10-21T14:00:00Z") });
    expect(await sendReviewRequest(deps, id)).toEqual({ status: "sent" });
    expect(deps.sent.map((p) => p.template)).toEqual(["review_request"]);
    expect(await sendReviewRequest(deps, id)).toEqual({ status: "skipped", reason: "already_decided" });
  });

  it.each([
    ["excluded", async (c: string) => phiClient().query(`insert into phi.review_exclusions (contact_id, set_by) values ($1, 'clinician-1')`, [c])],
    ["recent_crisis", async (c: string) => phiClient().query(`insert into phi.crisis_events (contact_id, channel, detected_by) values ($1, 'sms', 'keyword')`, [c])],
  ])("never opens a request when %s", async (reason, setup) => {
    const { contactId, appointmentId } = await completedVisit();
    await setup(contactId);
    await asTasks();
    expect(await openReviewRequest(reviewDeps(), appointmentId)).toEqual({ ineligible: reason });
  });

  it("D18 and missing review consent: no request", async () => {
    const unknown = await completedVisit({ minor: "unknown" });
    const noConsent = await completedVisit({}, false);
    await asTasks();
    expect(await openReviewRequest(reviewDeps(), unknown.appointmentId)).toEqual({ ineligible: "not_adult" });
    expect(await openReviewRequest(reviewDeps(), noConsent.appointmentId)).toEqual({ ineligible: "no_review_consent" });
  });

  it("a clinician exclusion during the window stops the send; so does a crisis since", async () => {
    const a = await completedVisit();
    const b = await completedVisit();
    await asTasks();
    const deps = reviewDeps();
    const ra = await openReviewRequest(deps, a.appointmentId);
    const rb = await openReviewRequest(deps, b.appointmentId);
    await phiClient().query("reset role");
    await phiClient().query(`update phi.review_requests set status = 'excluded' where appointment_id = $1`, [a.appointmentId]);
    await phiClient().query(`insert into phi.crisis_events (contact_id, channel, detected_by) values ($1, 'sms', 'keyword')`, [b.contactId]);
    await asTasks();
    expect(await sendReviewRequest(deps, "reviewRequestId" in ra ? ra.reviewRequestId : "")).toEqual({ status: "excluded" });
    expect(await sendReviewRequest(deps, "reviewRequestId" in rb ? rb.reviewRequestId : "")).toEqual({ status: "skipped", reason: "recent_crisis" });
    expect(deps.sent).toEqual([]);
  });

  it("one per patient per 12 months", async () => {
    const a = await completedVisit();
    await asTasks();
    const deps = reviewDeps();
    const first = await openReviewRequest(deps, a.appointmentId);
    await sendReviewRequest(deps, "reviewRequestId" in first ? first.reviewRequestId : "");
    await phiClient().query("reset role");
    const second = await phiClient().query<{ id: string }>(
      `insert into phi.appointments (contact_id, provider_id, external_ref, adapter, starts_at, status)
       values ($1, 'funmilayo-whitaker', 'x2', 'manual-queue', now() - interval '1 hour', 'completed') returning id`,
      [a.contactId],
    );
    await asTasks();
    expect(await openReviewRequest(deps, second.rows[0]?.id ?? "")).toEqual({ ineligible: "sent_within_12_months" });
  });

  it("two visits for one patient: the claim lets only one text go (the 12-month cap holds)", async () => {
    const a = await completedVisit();
    const second = await phiClient().query<{ id: string }>(
      `insert into phi.appointments (contact_id, provider_id, external_ref, adapter, starts_at, status)
       values ($1, 'anastasia-ofoegbu', 'x9', 'manual-queue', now() - interval '3 hours', 'completed') returning id`,
      [a.contactId],
    );
    await asTasks();
    const deps = reviewDeps();
    const r1 = await openReviewRequest(deps, a.appointmentId);
    const r2 = await openReviewRequest(deps, second.rows[0]?.id ?? "");
    // Sequential here (one test connection); concurrent runs serialise on the same per-contact lock.
    const d1 = await sendReviewRequest(deps, "reviewRequestId" in r1 ? r1.reviewRequestId : "");
    const d2 = await sendReviewRequest(deps, "reviewRequestId" in r2 ? r2.reviewRequestId : "");
    expect([d1, d2].filter((d) => d.status === "sent")).toHaveLength(1);
    expect([d1, d2].filter((d) => d.status === "skipped")).toEqual([{ status: "skipped", reason: "sent_within_12_months" }]);
    expect(deps.sent).toHaveLength(1);
  });

  it("a budget or rate hold is not a decision: the request waits for the next window", async () => {
    const a = await completedVisit();
    await asTasks();
    const opened = await openReviewRequest(reviewDeps(), a.appointmentId);
    const id = "reviewRequestId" in opened ? opened.reviewRequestId : "";
    const held = await sendReviewRequest(reviewDeps(IN_WINDOW, { reason: "global_budget" }), id);
    expect(held.status).toBe("wait");
    expect(await sendReviewRequest(reviewDeps(), id)).toEqual({ status: "sent" });
  });

  it("no review link configured: no window is opened at all", async () => {
    const a = await completedVisit();
    await asTasks();
    expect(await openReviewRequest({ ...reviewDeps(), linkConfigured: false }, a.appointmentId)).toEqual({ ineligible: "review_link_unconfigured" });
  });

  it("a refused text is recorded with its reason; a transport failure retries", async () => {
    const a = await completedVisit();
    const b = await completedVisit();
    await asTasks();
    const ra = await openReviewRequest(reviewDeps(), a.appointmentId);
    const rb = await openReviewRequest(reviewDeps(), b.appointmentId);
    expect(await sendReviewRequest(reviewDeps(IN_WINDOW, { reason: "sequences_paused" }), "reviewRequestId" in ra ? ra.reviewRequestId : "")).toEqual({
      status: "skipped",
      reason: "refused_sequences_paused",
    });
    await expect(sendReviewRequest(reviewDeps(IN_WINDOW, "failed"), "reviewRequestId" in rb ? rb.reviewRequestId : "")).rejects.toThrow("send failed");
  });

  it("the text carries the practice's review link and nothing else; no link configured, no text", async () => {
    const a = await completedVisit();
    await asTasks();
    const opened = await openReviewRequest(reviewDeps(), a.appointmentId);
    const id = "reviewRequestId" in opened ? opened.reviewRequestId : "";
    // reviews.request-review claims the row (status sent) before the text: only a claimed row can be texted.
    await phiClient().query("reset role");
    await phiClient().query(`update phi.review_requests set status = 'sent', sent_at = now() where id = $1`, [id]);
    await asTasks();
    const twilio = fakeTwilio();
    const deps = { db: clientDb(phiClient()), twilio, env: ENV, now: () => IN_WINDOW, actor: "messaging.send-sms" };
    await expect(runSendSms(deps, { template: "review_request", contactId: a.contactId, entityId: id, step: 0 })).rejects.toThrow("review_link_unconfigured");
    await runSendSms({ ...deps, env: { ...ENV, PHI_GOOGLE_REVIEW_URL: REVIEW_URL } }, { template: "review_request", contactId: a.contactId, entityId: id, step: 0 });
    expect(twilio.sms[0]?.body).toBe(`Newpoint: if you would like to share feedback publicly, you can leave a review here: ${REVIEW_URL} Reply STOP to opt out.`);
    expect(twilio.sms[0]?.body.match(/https:\/\//g)).toHaveLength(1);
  });
});

describe("metrics (§4, §5.9): suppressed counts and health enum, never crisis", () => {
  it("counts a New York day and suppresses below 5", async () => {
    const contactId = await seedContact(phiClient());
    for (let i = 0; i < 6; i += 1) {
      await phiClient().query(`insert into phi.inquiries (contact_id, source, reason, created_at) values ($1, 'web', 'new_patient', '2026-10-19T16:00:00Z')`, [contactId]);
    }
    await phiClient().query(`insert into phi.inquiries (contact_id, source, reason, created_at) values ($1, 'web', 'other', '2026-10-20T03:30:00Z')`, [contactId]); // 23:30 ET on the 19th
    await asTasks();
    const counts = await dailyCounts(clientDb(phiClient()), "ops.aggregate-metrics", "2026-10-19");
    expect(counts).toEqual([
      { metric: "inquiries", value: 7 },
      { metric: "bookings_completed", value: null },
      { metric: "follow_up_conversions", value: null },
    ]);
    expect(await reviewCounts(clientDb(phiClient()), "reviews.metrics", "2026-10-19")).toEqual([{ metric: "review_requests_sent", value: null }]);
  });

  it("event-driven tasks report the week, not the day", async () => {
    await phiClient().query(`insert into ops.agent_health (task_id, last_success_at) values ('referrals.no-show', '2026-10-22T15:00:00Z')`);
    await asTasks();
    expect(await healthRows(clientDb(phiClient()), "ops.aggregate-metrics")).toEqual([
      { taskId: "referrals.no-show", lastSuccessOn: "2026-10-19", lastFailureOn: null, failureClass: null },
    ]);
  });

  it("health rows are dates only", async () => {
    await phiClient().query(`insert into ops.agent_health (task_id, last_success_at) values ('booking.sync', '2026-10-20T03:30:00Z')`);
    await asTasks();
    expect(await healthRows(clientDb(phiClient()), "ops.aggregate-metrics")).toEqual([
      { taskId: "booking.sync", lastSuccessOn: "2026-10-19", lastFailureOn: null, failureClass: null },
    ]);
  });

  it("the writer, as metrics_writer: inserts only, refuses small counts, never exports ops.crisis-*", async () => {
    await mktClient().query("reset role");
    await mktClient().query("truncate metrics.daily, metrics.agent_health");
    await mktClient().query("set role metrics_writer");
    const writer = createMetricsWriter(mktClient());
    await writer.daily("2026-10-19", [{ metric: "inquiries", value: 7 }, { metric: "bookings_completed", value: null }]);
    await writer.daily("2026-10-19", [{ metric: "inquiries", value: 9 }]); // a retry never overwrites
    await expect(writer.daily("2026-10-19", [{ metric: "review_requests_sent", value: 3 }])).rejects.toThrow("unsuppressed");
    await writer.health("2026-10-20", [
      { taskId: "booking.sync", lastSuccessOn: "2026-10-19", lastFailureOn: null, failureClass: null },
      { taskId: "ops.crisis-dead-man", lastSuccessOn: "2026-10-19", lastFailureOn: null, failureClass: null },
    ]);
    await expect(mktClient().query("select * from metrics.daily")).rejects.toThrow(/permission denied/);
    await mktClient().query("reset role");
    expect((await mktClient().query(`select metric::text, value from metrics.daily order by metric`)).rows).toEqual([
      { metric: "bookings_completed", value: null },
      { metric: "inquiries", value: 7 },
    ]);
    expect((await mktClient().query(`select task_id from metrics.agent_health`)).rows).toEqual([{ task_id: "booking.sync" }]);
  });
});
