import { describe, expect, it } from "vitest";
import { keywordIntent } from "../../src/domain/consent/opt-out.js";
import { CONSENT_WORDING } from "../../src/domain/consent/wording.js";
import { detectCrisis } from "../../src/domain/crisis/detect.js";
import { CRISIS_SCRIPT } from "../../src/domain/crisis/response.js";
import { inWindow, nextInWindow, REVIEW_WINDOW, SMS_WINDOW } from "../../src/domain/messaging/quiet-hours.js";
import { renderTemplate, TEMPLATES, type TemplateId } from "../../src/domain/messaging/templates.js";

describe("crisis detection (§5.8): deterministic, conservative", () => {
  it.each([
    "I want to kill myself",
    "i dont want to live anymore",
    "thinking about suicide",
    "I took too many pills",
    "I'm going to hurt someone",
    "KILL MYSELF",
    "I want to k​ill myself",
    "this is an emergency",
    "should I call 988",
    "I’m going to end my life",
    "i wanna die",
    "i want to harm myself",
    "ending it all",
    "hanging myself tonight",
    "i want to take my own life",
    "I'd rather be dead",
    "nothing to live for",
    "gonna slit my wrists",
    "thinking of jumping off the bridge",
    "kms",
    "i dont wanna live",
    "took 30 pills",
    "thinking about sucide",
    "kill  myself",
    "want to\ndie",
  ])("detects %s", (text) => {
    expect(detectCrisis(text)).toBe(true);
  });

  it.each(["Can I move my appointment to Tuesday?", "What insurance do you take?", "STOP", "Thanks!"])("leaves %s alone", (text) => {
    expect(detectCrisis(text)).toBe(false);
  });
});

describe("opt-out keywords (D20, FCC 2024 any reasonable means)", () => {
  it.each(["STOP", "stop.", " Unsubscribe ", "QUIT", "opt out", "Please stop texting me", "don't text me anymore", "remove me from this list", "please stop", "stop please", "opt me out", "STOP 🙏", "Stop!!!", "No more texts.", "never message me again"])(
    "%s is an opt-out",
    (text) => {
      expect(keywordIntent(text)).toBe("stop");
    },
  );
  it.each(["HELP", "info"])("%s is help", (text) => {
    expect(keywordIntent(text)).toBe("help");
  });
  it.each(["Can I book for Friday?", "stop by the office?", "Can I stop by Tuesday at 3?"])("%s is neither", (text) => {
    expect(keywordIntent(text)).toBeNull();
  });
});

describe("quiet hours, America/New_York", () => {
  it("08:00–21:00 local, across DST", () => {
    expect(inWindow(new Date("2026-07-01T12:00:00Z"), SMS_WINDOW)).toBe(true); // 08:00 EDT
    expect(inWindow(new Date("2026-07-01T11:59:00Z"), SMS_WINDOW)).toBe(false);
    expect(inWindow(new Date("2026-12-01T13:00:00Z"), SMS_WINDOW)).toBe(true); // 08:00 EST
    expect(inWindow(new Date("2026-12-02T02:00:00Z"), SMS_WINDOW)).toBe(false); // 21:00 EST
  });
  it("defers to the next window start", () => {
    expect(nextInWindow(new Date("2026-12-02T03:00:00Z"), SMS_WINDOW)).toEqual(new Date("2026-12-02T13:00:00Z"));
    expect(nextInWindow(new Date("2026-12-01T10:00:00Z"), REVIEW_WINDOW)).toEqual(new Date("2026-12-01T15:00:00Z"));
  });
});

describe("SMS templates (§5.0): neutral wording, typed slots", () => {
  const ids = Object.keys(TEMPLATES) as TemplateId[];
  const FORBIDDEN = /(psychiatr|mental|depress|anxiety|adhd|bipolar|schizo|medication|prescri|therap|diagnos|suicid|substance|addiction|weight|ketamine|spravato)/i;

  it.each(ids)("%s says Newpoint, logistics only, and offers STOP", (id) => {
    const text: string = TEMPLATES[id].text;
    expect(text.startsWith("Newpoint")).toBe(true);
    expect(text).not.toMatch(FORBIDDEN);
    if (id !== "crisis_response") expect(text).toContain("Reply STOP");
  });

  it("template ids fit the messages.template check", () => {
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it("only the crisis response ignores quiet hours", () => {
    expect(ids.filter((id) => TEMPLATES[id].anyHour)).toEqual(["crisis_response"]);
    expect(ids.filter((id) => TEMPLATES[id].beforeVerification)).toEqual(["verification_code"]);
  });

  it("fills shaped slots and refuses anything else", () => {
    expect(renderTemplate("booking_confirmed", { provider: "A. Provider", date: "Tue, Oct 20", time: "3:30 PM" })).toBe(
      "Newpoint: you are booked with A. Provider on Tue, Oct 20 at 3:30 PM. Reply STOP to opt out.",
    );
    expect(() => renderTemplate("booking_confirmed", { provider: "A. Provider", date: "Tue, Oct 20" })).toThrow("time");
    expect(() => renderTemplate("booking_handoff", { link: "http://insecure.example" })).toThrow("link");
    expect(() => renderTemplate("booking_confirmed", { provider: "Dr <script>", date: "Tue, Oct 20", time: "3:30 PM" })).toThrow();
    expect(() => renderTemplate("verification_code", { code: "12345\nextra" })).toThrow();
  });

  it("the crisis SMS gives 988 and 911 and says the line is not monitored around the clock", () => {
    const text = renderTemplate("crisis_response");
    expect(text).toContain("988");
    expect(text).toContain("911");
    expect(text).toMatch(/not monitored around the clock/);
  });
});

describe("D15 / D20 placeholders are marked unapproved", () => {
  it("is not approved until a clinician / counsel signs off", () => {
    expect(CRISIS_SCRIPT.approved).toBe(false);
    expect(CONSENT_WORDING.approved).toBe(false);
  });
});
