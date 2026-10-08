import { describe, expect, it } from "vitest";
import { postViolations } from "../../src/domain/content-rules/newpoint-rules.js";
import { observancesForWeek } from "../../src/domain/social/calendar.js";
import { acceptPlan, contentHash, MAX_POSTS_PER_WEEK, nextWeekStart, slotAt, type PostContent } from "../../src/domain/social/plan.js";

const rules = (text: string) => postViolations(text).map((v) => v.rule);

describe("postViolations", () => {
  it("passes a post that keeps every rule", () => {
    expect(
      rules(
        "A psychiatric assessment is a first conversation about what you are experiencing. Our psychiatric-mental health nurse practitioners see patients in person or by telehealth. Learn more at newpointnp.com/services.",
      ),
    ).toEqual([]);
  });

  it.each([
    ["Book with Dr. Whitaker today.", "dr_without_qualifier"],
    ["Our psychiatrist can help.", "physician_title"],
    ["Ask your doctor about it.", "physician_title"],
    ["Lose 20 pounds in 8 weeks.", "outcome_claim"],
    ["Our care is proven to work.", "outcome_claim"],
    ["Questions about Ozempic?", "drug_brand"],
    ["We can discuss SSRIs.", "medication_or_class"],
    ["One of our patients told us it changed her life.", "testimonial"],
    ["10% off your first month.", "pricing"],
    ["Book a psychiatric evaluation.", "evaluation"],
    ["If you are thinking about suicide, reach out.", "crisis_without_988_911"],
    ["We accept Aetna.", "unconfirmed_fact"],
    ["Visit us at 6 Colonial Lake Drive, Suite D.", "unconfirmed_fact"],
    ["Read more at example.com/article.", "off_site_link"],
  ])("flags %s", (text, rule) => {
    expect(rules(text)).toContain(rule);
  });

  it.each([
    ["DR. Whitaker will see you.", "dr_without_qualifier"],
    ["Dr.Whitaker will see you.", "dr_without_qualifier"],
    ["Dr. Whitaker leads intake. Dr. Ofoegbu, a nurse practitioner, joins her.", "dr_without_qualifier"],
    ["Seen by an MD.", "physician_title"],
    ["Patients lose an average of 15% of body weight.", "outcome_claim"],
    ["Many lose twenty pounds.", "outcome_claim"],
    ["Feel better in weeks.", "outcome_claim"],
    ["Ask about semaglutide.", "medication_or_class"],
    ["One patient said it helped.", "testimonial"],
    ["Rated 5-star by families.", "testimonial"],
    ["Book a free consultation.", "pricing"],
    ["Care that is affordable.", "pricing"],
    ["Book your psych eval.", "evaluation"],
    ["If you want to die, you are not alone.", "crisis_without_988_911"],
    ["Self-injury is more common than people think.", "crisis_without_988_911"],
    ["Open 9am to 5pm.", "unconfirmed_fact"],
    ["Mon-Fri appointments.", "unconfirmed_fact"],
    ["Accepting new clients now.", "unconfirmed_fact"],
    ["134 Franklin Corner Rd, Lawrenceville.", "unconfirmed_fact"],
    ["Ozem\u200Bpic questions?", "drug_brand"],
  ])("closes the bypass: %s", (text, rule) => {
    expect(rules(text)).toContain(rule);
  });

  it("never allows Dr. in alt text, even when the body qualifies it", () => {
    const found = postViolations("Dr. Whitaker, DNP, FNP-BC, PMHNP-BC.", ["Dr. Whitaker at her desk"]).map((v) => v.rule);
    expect(found).toContain("title_in_alt_text");
    expect(postViolations("Dr. Whitaker, DNP, FNP-BC, PMHNP-BC.", ["A clinician at her desk"])).toEqual([]);
  });

  it("allows Dr. beside the credentials or the role, and the degree written out", () => {
    expect(rules("Dr. Funmilayo Whitaker, DNP, FNP-BC, PMHNP-BC")).toEqual([]);
    expect(rules("Dr. Whitaker is a psychiatric-mental health nurse practitioner.")).toEqual([]);
    expect(rules("Both hold a Doctor of Nursing Practice.")).toEqual([]);
  });

  it("allows a crisis post that carries both numbers", () => {
    expect(rules("If you are thinking about suicide, call or text 988, or call 911 in an emergency.")).toEqual([]);
  });

  it("gives a fix written in source for every rule", () => {
    for (const violation of postViolations("Dr. X, our psychiatrist: 10% off, see example.com")) {
      expect(violation.fix.length).toBeGreaterThan(10);
    }
  });
});

describe("contentHash", () => {
  const post: PostContent = {
    channel: "facebook",
    body: "Hello",
    media: [{ url: "https://newpointnp.com/a.jpg", alt: "A waiting room" }],
    scheduledFor: new Date("2026-10-19T14:00:00Z"),
  };

  it("is stable, and changes with anything that reaches the platform", () => {
    expect(contentHash(post)).toBe(contentHash({ ...post }));
    expect(contentHash(post)).toMatch(/^[0-9a-f]{64}$/);
    for (const changed of [
      { ...post, body: "Hello." },
      { ...post, channel: "instagram" as const },
      { ...post, media: [{ url: "https://newpointnp.com/a.jpg", alt: "A room" }] },
      { ...post, scheduledFor: new Date("2026-10-19T15:00:00Z") },
    ]) {
      expect(contentHash(changed)).not.toBe(contentHash(post));
    }
  });
});

describe("scheduling", () => {
  it("puts a slot at 10:00 New York time on both sides of the DST change", () => {
    expect(slotAt(new Date("2026-10-19T00:00:00Z")).toISOString()).toBe("2026-10-19T14:00:00.000Z");
    expect(slotAt(new Date("2026-11-09T00:00:00Z")).toISOString()).toBe("2026-11-09T15:00:00.000Z");
  });

  it("plans the following week, starting Monday", () => {
    expect(nextWeekStart(new Date("2026-10-12T11:00:00Z")).toISOString()).toBe("2026-10-19T00:00:00.000Z");
    expect(nextWeekStart(new Date("2026-10-18T23:00:00Z")).toISOString()).toBe("2026-10-19T00:00:00.000Z");
  });

  it("knows the observances of a week", () => {
    expect(observancesForWeek(new Date("2026-10-05T00:00:00Z")).map((o) => o.name)).toEqual([
      "ADHD Awareness Month",
      "World Mental Health Day",
    ]);
    expect(observancesForWeek(new Date("2026-08-03T00:00:00Z"))).toEqual([]);
  });
});

describe("acceptPlan", () => {
  const week = new Date("2026-10-19T00:00:00Z");

  it("keeps offered channels, one post per channel per day, and drops restricted topics", () => {
    const result = acceptPlan(
      {
        posts: [
          { channel: "facebook", day: 0, topic: "What happens at a psychiatric assessment" },
          { channel: "facebook", day: 0, topic: "A second post the same day" },
          { channel: "instagram", day: 1, topic: "Telehealth from home" },
          { channel: "gbp", day: 2, topic: "Why see a psychiatrist" },
          { channel: "gbp", day: 3, topic: "World Mental Health Day" },
        ],
      },
      week,
      ["facebook", "gbp"],
    );
    expect(result.ok).toBe(true);
    expect(result.dropped).toBe(3);
    expect(result.posts.map((p) => [p.channel, p.scheduledFor.toISOString()])).toEqual([
      ["facebook", "2026-10-19T14:00:00.000Z"],
      ["gbp", "2026-10-22T14:00:00.000Z"],
    ]);
  });

  it("refuses a malformed plan whole", () => {
    expect(acceptPlan({ posts: [{ channel: "facebook", day: 9, topic: "x" }] }, week, ["facebook"]).ok).toBe(false);
    const tooMany = Array.from({ length: MAX_POSTS_PER_WEEK + 1 }, (_, day) => ({ channel: "facebook" as const, day: day % 7, topic: "t" }));
    expect(acceptPlan({ posts: tooMany }, week, ["facebook"]).ok).toBe(false);
    expect(acceptPlan(null, week, ["facebook"])).toEqual({ posts: [], dropped: 0, ok: false });
  });
});
