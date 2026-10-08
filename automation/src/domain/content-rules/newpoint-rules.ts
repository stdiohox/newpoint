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
  ["evaluation", /\b(evaluations?|evals?)\b/i],
  // "Medical weight management": no brand names anywhere on the site.
  ["drug_brand", /\b(ozempic|wegovy|zepbound|mounjaro|saxenda|rybelsus)\b/i],
  // "ADHD prescribing line": no medication and no drug class named; DEA scope is open.
  [
    "medication_or_class",
    /\b(adderall|ritalin|vyvanse|concerta|focalin|xanax|klonopin|lexapro|zoloft|prozac|wellbutrin|lithium|stimulants?|benzodiazepines?|controlled substances?|antidepressants?|ssris?|snris?|antipsychotics?|mood stabili[sz]ers?|glp-1s?|semaglutide|tirzepatide|liraglutide|phentermine|methylphenidate|amphetamines?|lisdexamfetamine|bupropion|sertraline|fluoxetine|escitalopram|citalopram|paroxetine|venlafaxine|duloxetine|trazodone|mirtazapine|quetiapine|aripiprazole|lamotrigine|alprazolam|clonazepam|lorazepam|atomoxetine|guanfacine)\b/i,
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
  [
    "crisis",
    /\b(crisis|emergenc(y|ies)|urgent|suicid\w*|self[- ]?(harm\w*|injur\w*)|overdose|988|911|want(s|ed)? to die|end (my|your|their|his|her) li(fe|ves)|kill(ing)? (myself|yourself|themselves|himself|herself)|hurt(ing)? (myself|yourself|themselves))\b/i,
  ],
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

// --- Posts (§5.7) -----------------------------------------------------------
// A finished social post is held to the brief directly, not screened by topic.
// social.compliance runs these before the LLM review, and social.publisher runs
// them again before anything goes out.

export type PostRule =
  | "dr_without_qualifier"
  | "physician_title"
  | "outcome_claim"
  | "drug_brand"
  | "medication_or_class"
  | "testimonial"
  | "pricing"
  | "evaluation"
  | "crisis_without_988_911"
  | "unconfirmed_fact"
  | "off_site_link"
  | "title_in_alt_text";

export interface PostViolation {
  readonly rule: PostRule;
  /** What a drafter must change, in words a person can act on. Written here, never model text. */
  readonly fix: string;
}

/** The qualifier the client's condition requires beside "Dr.". */
const QUALIFIER = /DNP, FNP-BC, PMHNP-BC|nurse practitioner/i;
/** How near is "beside": within this many characters after the title… */
const BESIDE = 80;

/** …and before the sentence ends or another "Dr." begins, whichever comes first. */
function beside(text: string, from: number): string {
  const rest = text.slice(from, from + BESIDE);
  const stop = rest.search(/[!?\n]|\.(\s|$)|\bdr\b/i);
  return stop === -1 ? rest : rest.slice(0, stop);
}

const POST_RULES: readonly (readonly [PostRule, (text: string) => boolean, string])[] = [
  [
    "dr_without_qualifier",
    // CLAUDE.md, override of 2026-10-01: "Dr." only where the credentials or "nurse practitioner"
    // are visible BESIDE it, so each "Dr." is checked against the text right after it.
    (t) => [...t.matchAll(/\bdr\b\.?/gi)].some((m) => !QUALIFIER.test(beside(t, m.index + m[0].length))),
    'Use "Dr." only immediately followed by "DNP, FNP-BC, PMHNP-BC" or the words "nurse practitioner", or drop the title.',
  ],
  [
    "physician_title",
    (t) => /\b(physicians?|psychiatrists?)\b|doctor-supervised|\bdoctors?\b(?! of nursing practice)/i.test(t) || /\bM\.?D\b\.?/.test(t),
    'Never "physician", "psychiatrist", "doctor" or "MD" for the providers; they are psychiatric-mental health nurse practitioners. "Doctor of Nursing Practice" is the only use of "doctor".',
  ],
  [
    "outcome_claim",
    (t) =>
      matches("weight_outcome", t) ||
      /\b(guarantee[ds]?|cures?|cured|proven|results in)\b/i.test(t) ||
      /\d+\s*(%|percent)/i.test(t) ||
      /\b(lose|lost|losing|drop|dropped|shed|shedding)\b[^.!?]{0,40}\b(pounds?|lbs?|kilos?|kg|weight|inches|sizes?)\b/i.test(t) ||
      /\b(in|within) (just |only )?(\d+|a few|two|three|four|five|six|eight|ten|twelve) (days?|weeks?|months?)\b/i.test(t) ||
      /\bfeel better (fast|quickly|soon|in)\b/i.test(t),
    "Claim no outcome: no results, amounts, percentages, timeframes, cures or guarantees.",
  ],
  ["drug_brand", (t) => matches("drug_brand", t), "Name no drug brand."],
  ["medication_or_class", (t) => matches("medication_or_class", t), "Name no medication, generic or brand, and no drug class."],
  [
    "testimonial",
    (t) =>
      /\b(testimonials?|success stor(y|ies)|reviews? from|(5|five)[- ]stars?)\b/i.test(t) ||
      /\b(one|a|another|our) (patient|client)s? (said|says|shared|told|wrote|recently)\b/i.test(t) ||
      /\bone of our (patients|clients)\b/i.test(t) ||
      /["\u201c][^"\u201d]{8,}["\u201d]\s*[\u2014\u2013-]\s*\p{Lu}/u.test(t),
    "No testimonials, reviews or patient stories, real or invented, and no attributed quotes.",
  ],
  [
    "pricing",
    (t) =>
      /\$\s?\d|\b(discounts?|\d+\s?% off|percent off|coupons?|promo(tion)? codes?|special offers?|pricing|prices?|costs?|copays?|complimentary|affordab\w*|sliding scale|save \$?\d+)\b/i.test(t) ||
      /\bfree (consult\w*|\d+[- ]minute|visits?|sessions?|screenings?|assessments?|calls?)\b/i.test(t),
    "No prices, costs, discounts or free offers.",
  ],
  ["evaluation", (t) => matches("evaluation", t), 'Call the appointment a "psychiatric assessment", not an evaluation or "eval".'],
  [
    "crisis_without_988_911",
    (t) => matches("crisis", t) && !(/\b988\b/.test(t) && /\b911\b/.test(t)),
    "A post on crisis, suicide or self-harm must say: call or text 988, or call 911 in an emergency.",
  ],
  [
    "unconfirmed_fact",
    (t) =>
      matches("payer", t) ||
      matches("open_client_item", t) ||
      /\b\d{1,2}(:\d{2})?\s?(am|pm)\b/i.test(t) ||
      /\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?\s?[-\u2013\u2014]\s?(mon|tue|wed|thu|fri|sat|sun)/i.test(t) ||
      /\bopen (on )?(mon|tues|wednes|thurs|fri|satur|sun)days?\b/i.test(t) ||
      /\b(accepting|taking) (new )?(patients|clients)\b|\bappointments? (available )?(today|tomorrow|this week|next week)\b/i.test(t) ||
      /\b(suite|ste\.?)\s*\w+|\b\d{1,5}\s+[\w.]+(\s[\w.]+){0,3}\s(drive|dr|road|rd|street|st|avenue|ave|lane|ln|boulevard|blvd|way|pike|highway|hwy)\b\.?|\broute \d+\b|\b\d{5}(-\d{4})?\b/i.test(t),
    "State no hours, times, availability, ages, prices, payers or street address: none of these is confirmed.",
  ],
  [
    "off_site_link",
    (t) =>
      [...t.matchAll(/\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?/gi)].some(
        (m) => !/^(?:https?:\/\/)?(?:www\.)?newpointnp\.com(?:[/?#]|$)/i.test(m[0]),
      ),
    "Link only to newpointnp.com.",
  ],
];

/** Text as a reader sees it: compatibility forms folded, invisible format characters removed. */
function visible(text: string): string {
  return text.normalize("NFKC").replace(/[\p{Cf}]/gu, "");
}

function matches(rule: ContentRule, text: string): boolean {
  return RULES.some(([name, pattern]) => name === rule && pattern.test(text));
}

/**
 * Every rule a finished post breaks, in a fixed order; empty when it passes.
 * Alt text is held to every rule and, separately, may never carry "Dr." at all
 * (CLAUDE.md: no Dr. in alt text, whatever the post says).
 */
export function postViolations(body: string, altTexts: readonly string[] = []): PostViolation[] {
  const text = visible([body, ...altTexts].join("\n"));
  const found = POST_RULES.filter(([, breaks]) => breaks(text)).map(([rule, , fix]) => ({ rule, fix }));
  if (altTexts.some((alt) => /\bdr\b\.?/i.test(visible(alt))) && !found.some((v) => v.rule === "title_in_alt_text")) {
    found.push({ rule: "title_in_alt_text", fix: 'Never "Dr." in alt text; describe the image, not the title.' });
  }
  return found;
}

/** Every post rule, for validating rule codes read back from storage. */
export const POST_RULE_NAMES: readonly PostRule[] = [...POST_RULES.map(([rule]) => rule), "title_in_alt_text"];
