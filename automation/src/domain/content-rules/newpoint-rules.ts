/**
 * The CLAUDE.md content rules as code (docs/automation-architecture.md §3).
 *
 * Phase 1 needs the screening half: does a piece of machine-produced text (a
 * cluster label, a suggested FAQ, a query mapped to a service page) touch a
 * rule the brief makes binding? Each rule names the brief section it comes
 * from. A match does not mean the text is wrong: a search query may contain
 * anything. It means the text must not be treated as copy, or must reach a
 * human with the rule attached.
 */

export type ContentRule = "clinician_title" | "evaluation" | "drug_brand" | "controlled_or_class" | "weight_outcome";

const RULES: readonly (readonly [ContentRule, RegExp])[] = [
  // "Clinician titles": never psychiatrist, physician or Dr.; "doctor" only as the degree.
  ["clinician_title", /\b(psychiatrists?|physicians?|doctors?|dr)\b|doctor-supervised/i],
  // "Terminology": the appointment is an assessment; "evaluation" survives in four places only.
  ["evaluation", /\bevaluations?\b/i],
  // "Medical weight management": no brand names anywhere on the site.
  ["drug_brand", /\b(ozempic|wegovy|zepbound|mounjaro|saxenda|rybelsus)\b/i],
  // "ADHD prescribing line": no medication and no drug class named; DEA scope is open.
  ["controlled_or_class", /\b(adderall|ritalin|vyvanse|concerta|focalin|xanax|klonopin|stimulants?|benzodiazepines?|controlled substances?)\b/i],
  // "Medical weight management": no outcome claimed, no pounds, no percentages.
  ["weight_outcome", /\b(how much weight|lose \d+|\d+\s*(lbs?|pounds|%)|before and after)\b/i],
];

/** The rules a text touches, in a fixed order; empty when it touches none. */
export function contentRulesTouched(text: string): ContentRule[] {
  return RULES.filter(([, pattern]) => pattern.test(text)).map(([rule]) => rule);
}

const GUIDANCE: Readonly<Record<ContentRule, string>> = {
  clinician_title: "no psychiatrist, physician or Dr. (CLAUDE.md: Clinician titles)",
  evaluation: 'say "assessment" (CLAUDE.md: Terminology)',
  drug_brand: "no drug brand names (CLAUDE.md: Medical weight management)",
  controlled_or_class: "no medication or drug class, DEA scope is open (CLAUDE.md: ADHD prescribing line)",
  weight_outcome: "no weight-loss outcome (CLAUDE.md: Medical weight management)",
};

/** One line a reviewer can act on: which rules apply and where they are written. */
export function contentRuleGuidance(rules: readonly ContentRule[]): string {
  return rules.map((rule) => GUIDANCE[rule]).join("; ");
}
