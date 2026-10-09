import { describe, expect, it } from "vitest";
import { createHeadwayHandoff } from "../../src/adapters/scheduling/headway-handoff.js";
import { createManualQueue } from "../../src/adapters/scheduling/manual-queue.js";
import { phi } from "../../src/lib/phi.js";
import { PROVIDERS } from "../../src/domain/scheduling/providers.js";
import { remindersDue } from "../../src/domain/scheduling/reminders.js";
import { slotPolicy, type BookingFacts } from "../../src/domain/scheduling/slot-policy.js";
import { fromLocal, smsDate, smsTime } from "../../src/domain/scheduling/time.js";

const adult: BookingFacts = { minorStatus: "adult", state: "NJ", modality: null, service: "unknown", newPatient: false, providerPref: null };

describe("slot policy (§5.1)", () => {
  it.each([
    [{ minorStatus: "unknown" as const }, "age_not_confirmed"],
    [{ minorStatus: "minor" as const }, "age_not_confirmed"],
    [{ service: "weight_management" as const }, "weight_management"],
    [{ state: null }, "state_unknown"],
    [{ state: "NY" }, "state_unknown"],
    [{ newPatient: null }, "new_patient_unknown"],
    [{ state: "PA", modality: "in_person" as const }, "no_eligible_provider"],
  ])("callback for %o", (over, reason) => {
    expect(slotPolicy({ ...adult, ...over })).toEqual({ kind: "callback", reason });
  });

  it("offers only providers licensed in the state with the modality there, honouring a preference", () => {
    const pa = slotPolicy({ ...adult, state: "PA", modality: "telehealth" });
    expect(pa.kind === "eligible" && pa.providers.map((p) => p.id)).toEqual(["funmilayo-whitaker", "anastasia-ofoegbu"]);
    const pref = slotPolicy({ ...adult, providerPref: "anastasia-ofoegbu" });
    expect(pref.kind === "eligible" && pref.providers.map((p) => p.id)).toEqual(["anastasia-ofoegbu"]);
  });

  it("a new patient's first visit is the assessment, whatever was asked", () => {
    const d = slotPolicy({ ...adult, newPatient: true, service: "medication_management" });
    expect(d.kind === "eligible" && d.service).toBe("assessment");
  });

  it("texts never say 'Dr.' and handoff pages are only the recorded ones", () => {
    for (const p of PROVIDERS) expect(p.smsName).not.toMatch(/Dr\b/);
    expect(PROVIDERS.find((p) => p.id === "anastasia-ofoegbu")?.headwayUrl).toBeNull();
  });
});

describe("adapters (D1: manual-queue, headway-handoff)", () => {
  const cmd = (providers: ("funmilayo-whitaker" | "anastasia-ofoegbu")[]) =>
    phi({ bookingRequestId: "r", contactId: "c", providers, state: "NJ" as const, modality: null, slot: null });

  it("manual-queue opens a ticket and reads no calendar", async () => {
    const manual = createManualQueue((id) => Promise.resolve(`ticket-for-${id}`));
    expect(manual.capabilities).toEqual({ readAvailability: false, writeBooking: false, webhooks: false });
    expect(await manual.book(cmd(["funmilayo-whitaker"]))).toEqual({ ok: true, value: { kind: "callback", ticketId: "ticket-for-r" } });
    expect(await manual.cancel({ adapter: "manual-queue", externalRef: "x" })).toEqual({ ok: false, error: { code: "unsupported" } });
  });

  it("headway-handoff hands off to one provider's recorded page only", async () => {
    const headway = createHeadwayHandoff();
    expect(await headway.book(cmd(["funmilayo-whitaker"]))).toEqual({ ok: true, value: { kind: "handoff", url: "https://care.headway.co/providers/funmilayo-whitaker-2" } });
    expect((await headway.book(cmd(["anastasia-ofoegbu"]))).ok).toBe(false);
    expect((await headway.book(cmd(["funmilayo-whitaker", "anastasia-ofoegbu"]))).ok).toBe(false);
  });
});

describe("reminders (§5.1, §5.0 quiet hours)", () => {
  const H = 3_600_000;
  it("48 h and 2 h windows", () => {
    const now = new Date("2026-10-20T15:00:00Z"); // 11:00 ET
    expect(remindersDue(new Date(now.getTime() + 47 * H), now)).toEqual(["appointment_reminder_48h"]);
    expect(remindersDue(new Date(now.getTime() + 1.5 * H), now)).toEqual(["appointment_reminder_2h"]);
    expect(remindersDue(new Date(now.getTime() + 10 * H), now)).toEqual([]);
  });
  it("a 2 h reminder that quiet hours would push too close to the visit is dropped", () => {
    const now = new Date("2026-10-20T11:00:00Z"); // 07:00 ET: window opens 08:00
    expect(remindersDue(new Date("2026-10-20T12:20:00Z"), now)).toEqual([]); // 08:20 visit
    expect(remindersDue(new Date("2026-10-20T12:50:00Z"), now)).toEqual(["appointment_reminder_2h"]); // 08:50 visit
  });
});

describe("practice-local time", () => {
  it("formats SMS slots", () => {
    const at = new Date("2026-10-20T19:30:00Z");
    expect(smsDate(at)).toBe("Tue, Oct 20");
    expect(smsTime(at)).toBe("3:30 PM");
  });
  it("turns staff-entered ET into the right instant across DST", () => {
    expect(fromLocal("2026-10-20", "15:30")?.toISOString()).toBe("2026-10-20T19:30:00.000Z");
    expect(fromLocal("2026-12-01", "09:00")?.toISOString()).toBe("2026-12-01T14:00:00.000Z");
    expect(fromLocal("2026-13-01", "09:00")).toBeNull();
    expect(fromLocal("2026-12-01", "9am")).toBeNull();
    expect(fromLocal("2026-03-08", "02:30")).toBeNull(); // skipped by spring-forward
  });
});
