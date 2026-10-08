import { describe, expect, it } from "vitest";
import { contentRuleGuidance, contentRulesTouched } from "../../src/domain/content-rules/newpoint-rules.js";

describe("content rules", () => {
  it.each([
    ["psychiatrist near me", ["clinician_title"]],
    ["dr whitaker reviews", ["clinician_title"]],
    ["doctor-supervised weight loss", ["clinician_title"]],
    ["psychiatric evaluation nj", ["evaluation"]],
    ["ozempic prescription new jersey", ["drug_brand"]],
    ["can newpoint prescribe adderall", ["medication_or_class"]],
    ["are ssris prescribed by nurse practitioners", ["medication_or_class"]],
    ["does newpoint take highmark insurance", ["payer"]],
    ["psychiatric assessment for children", ["open_client_item"]],
    ["how much does a telehealth visit cost", ["open_client_item"]],
    ["urgent mental health help nj", ["crisis"]],
    ["how much weight can you lose on tirzepatide", ["medication_or_class", "weight_outcome"]],
    ["lose 30 pounds fast", ["weight_outcome"]],
  ])("flags %s", (text, rules) => {
    expect(contentRulesTouched(text)).toEqual(rules);
  });

  it.each([
    "psychiatric assessment lawrence township nj",
    "medical weight management new jersey",
    "psychiatric nurse practitioner near me",
    "drive to lawrenceville",
  ])("passes %s", (text) => {
    expect(contentRulesTouched(text)).toEqual([]);
  });

  it("flags the degree too, on purpose: whether 'doctor' is the degree is a person's call", () => {
    expect(contentRulesTouched("doctor of nursing practice")).toEqual(["clinician_title"]);
  });

  it("says which brief section governs", () => {
    expect(contentRuleGuidance(["clinician_title", "drug_brand"])).toBe(
      "no psychiatrist, physician or Dr. (CLAUDE.md: Clinician titles); no drug brand names (CLAUDE.md: Medical weight management)",
    );
  });
});

describe("blocking vs guidance", () => {
  it("lets a crisis topic through with guidance, and blocks the rest", async () => {
    const { blockingRulesTouched } = await import("../../src/domain/content-rules/newpoint-rules.js");
    expect(blockingRulesTouched("what to do in a mental health crisis")).toEqual([]);
    expect(contentRuleGuidance(contentRulesTouched("what to do in a mental health crisis"))).toContain("988 / 911");
    expect(blockingRulesTouched("psychiatrist for a crisis")).toEqual(["clinician_title"]);
  });
});
