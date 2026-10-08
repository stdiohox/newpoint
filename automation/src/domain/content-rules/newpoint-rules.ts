/**
 * The CLAUDE.md content rules as code (docs/automation-architecture.md §3).
 *
 * Screening for machine-produced text (a cluster label, a suggested FAQ, a
 * query mapped to a service page): does it touch a rule the brief makes
 * binding? Each rule names the brief section it comes from. A match does not
 * mean the text is wrong; a search query may contain anything. It means the
 * text must not become copy unreviewed.
 *
 * Two strengths:
 *   - blocking: the topic itself pulls toward a claim the brief forbids or has
 *     not confirmed. Labels touching one are not stored; FAQ suggestions
 *     touching one are dropped.
 *   - guidance: the topic is fine and should be covered, but only a certain
 *     way. The text goes through with the rule attached.
 */

export type ContentRule =
  | "clinician_title"
  | "evaluation"
  | "drug_brand"
  | "medication_or_class"
  | "weight_outcome"
  | "payer"
  | "open_client_item"
  | "crisis";

const RULES: readonly (readonly [ContentRule, RegExp])[] = [
  // "Clinician titles": never psychiatrist, physician or Dr.; "doctor" only as the degree.
  ["clinician_title", /\b(psychiatrists?|physicians?|doctors?|dr)\b|doctor-supervised/i],
  // "Terminology": the appointment is an assessment; "evaluation" survives in four places only.
  ["evaluation", /\bevaluations?\b/i],
  // "Medical weight management": no brand names anywhere on the site.
  ["drug_brand", /\b(ozempic|wegovy|zepbound|mounjaro|saxenda|rybelsus)\b/i],
  // "ADHD prescribing line": no medication and no drug class named; DEA scope is open.
  [
    "medication_or_class",
    /\b(adderall|ritalin|vyvanse|concerta|focalin|xanax|klonopin|lexapro|zoloft|prozac|wellbutrin|lithium|stimulants?|benzodiazepines?|controlled substances?|antidepressants?|ssris?|snris?|antipsychotics?|mood stabili[sz]ers?|glp-1s?)\b/i,
  ],
  // "Medical weight management": no outcome claimed, no pounds, no percentages.
  ["weight_outcome", /\b(how much weight|lose \d+|\d+\s*(lbs?|pounds|%)|before and after)\b/i],
  // "Payer list": nine published payers are unconfirmed and stay on /insurance only.
  [
    "payer",
    /\b(insurance|insurers?|in[- ]network|out[- ]of[- ]network|copays?|medicaid|medicare|aetna|cigna|united\s?healthcare|optum|oscar|oxford|carelon|highmark|geisinger|blue cross|bcbs|horizon|amerihealth|health plan)\b/i,
  ],
  // OPEN_CLIENT_ITEMS: age range, hours, availability, new-patient status and price are not confirmed.
  [
    "open_client_item",
    /\b(child(ren)?|kids?|teens?|teenagers?|adolescents?|pediatric|minors?|ages? \d+|hours|weekends?|evenings?|same[- ]day|walk[- ]ins?|cost|costs|price|pricing|fees?|how much does|accepting new patients|taking new patients)\b/i,
  ],
  // "Compliance": crisis guidance (988 / 911) where a distressed visitor would look.
  ["crisis", /\b(crisis|emergenc(y|ies)|urgent|suicid\w*|self[- ]harm|overdose|988|911)\b/i],
];

const GUIDANCE_ONLY: ReadonlySet<ContentRule> = new Set(["crisis"]);

/** Every rule a text touches, in a fixed order; empty when it touches none. */
export function contentRulesTouched(text: string): ContentRule[] {
  return RULES.filter(([, pattern]) => pattern.test(text)).map(([rule]) => rule);
}

/** The rules that stop a text from becoming a label, a prompt or a suggestion. */
export function blockingRulesTouched(text: string): ContentRule[] {
  return contentRulesTouched(text).filter((rule) => !GUIDANCE_ONLY.has(rule));
}

const GUIDANCE: Readonly<Record<ContentRule, string>> = {
  clinician_title: "no psychiatrist, physician or Dr. (CLAUDE.md: Clinician titles)",
  evaluation: 'say "assessment" (CLAUDE.md: Terminology)',
  drug_brand: "no drug brand names (CLAUDE.md: Medical weight management)",
  medication_or_class: "no medication or drug class, DEA scope is open (CLAUDE.md: ADHD prescribing line)",
  weight_outcome: "no weight-loss outcome (CLAUDE.md: Medical weight management)",
  payer: "only the confirmed payers, never the nine under review (CLAUDE.md: Payer list)",
  open_client_item: "an open client item: a CLIENT placeholder until confirmed (CLAUDE.md, OPEN_CLIENT_ITEMS)",
  crisis: "include the 988 / 911 guidance in the practice's own words (CLAUDE.md: Compliance)",
};

/** One line a reviewer can act on: which rules apply and where they are written. */
export function contentRuleGuidance(rules: readonly ContentRule[]): string {
  return rules.map((rule) => GUIDANCE[rule]).join("; ");
}
