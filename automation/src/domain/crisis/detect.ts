/**
 * Deterministic crisis detection (docs/automation-architecture.md §5.8).
 *
 * Runs FIRST on every inbound SMS and on voice tool calls, before STOP/HELP and
 * before any model. A keyword and phrase list, conservative by design: false
 * positives are acceptable (a clinician is paged), false negatives are not. The
 * LLM intent classifier is a second detector, never the only one.
 *
 * The list is clinical content: clinicians own it with the crisis script (D15).
 */
const PHRASES: readonly RegExp[] = [
  // Suicide and its common misspellings.
  /\b(suicid|sucid|suicd|suiscid|suisid|suiced|sucide)\w*/,
  /\bkill(ing|ed)? (my ?self|me)\b|\bkms\b|\bunalive\b/,
  /\bend(ing)? (it all|my life|my own life|things|it)\b/,
  /\btak(e|ing) my (own )?life\b/,
  /\b(want|wanna|going|gonna|plan(ning)?|ready|deserve|need) (to )?die\b|\bi wanna die\b/,
  /\b(wish|want|rather|better off) (i )?(was |were |be |being )?dead\b|\bwant to be dead\b/,
  /\bbetter off (dead|without me|gone)\b/,
  /\bno (reason|point) (to|in) (live|living|going on|being here)\b|\bnothing to live for\b/,
  /\b(can'?t|cannot|cant) (go on|do this anymore|take (it|this) anymore|keep going)\b/,
  /\b(don'?t|do not|dont) (want|wanna) (to )?(live|be alive|be here|wake up|exist)\b/,
  /\b(tired of|done with) (living|life|being alive)\b/,
  /\bself[- ]?harm\w*|\bself[- ]?injur\w*|\b(cut|cutting|hurt|hurting|harm|harming|burn|burning) my ?self\b|\bslit (my )?wrists?\b/,
  /\boverdos\w*|\bod'?ing\b|\b(took|take|taking|swallowed) (all |too many |a lot of |a bunch of |\d+ )?(of )?(my |the |these )?(pills|meds|tablets)\b/,
  /\b(shoot|shooting|hang|hanging|drown|drowning) my ?self\b|\bjump(ing)? (off|in front)\b/,
  /\b(gun|rope|bridge|noose|razor)\b.{0,20}\b(myself|me|end)\b/,
  /\bgoodbye (forever|everyone)\b|\bthis is my last\b/,
  /\b(hurt|kill|harm|shoot|stab)(ing)? (him|her|them|someone|somebody|people|my (husband|wife|partner|kid|kids|child|son|daughter|mom|dad))\b/,
  /\b(abus(e|ed|ing)|rap(e|ed)|assault(ed)?|hit(ting)? me|beat(ing)? me)\b.{0,30}\b(me|now|tonight|happening)\b/,
  /\bin danger\b|\bnot safe\b|\bunsafe\b/,
  /\bemergency\b|\b911\b|\b988\b|\bcrisis\b/,
];

/** Folded for matching: compatibility forms, invisible characters, case, curly quotes. */
function fold(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\p{Cf}]/gu, "")
    .replace(/[‘’]/g, "'")
    .toLowerCase()
    // Line breaks and doubled spaces must not split a phrase.
    .replace(/\s+/g, " ");
}

export function detectCrisis(text: string): boolean {
  const folded = fold(text);
  return PHRASES.some((pattern) => pattern.test(folded));
}
