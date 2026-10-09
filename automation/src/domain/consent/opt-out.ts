/**
 * Opt-out detection (D20, FCC 2024: revocation "by any reasonable means").
 * Deterministic and conservative: a false positive revokes consent, which is the
 * safe direction. Runs on every inbound SMS before anything else but crisis detection.
 */
const KEYWORDS = new Set(["stop", "stopall", "unsubscribe", "cancel", "end", "quit", "revoke", "optout", "opt out", "opt-out"]);
const FREE_TEXT =
  /\b(stop|quit|don'?t|do not|no more|never)\b[^.!?]{0,30}\b(texts?|texting|messages?|messaging|contact(ing)?|sms)\b|\b(remove|take) me (off|from)\b|\bunsubscribe\b|\bleave me alone\b|\bwrong number\b/i;
const HELP = new Set(["help", "info"]);

export type KeywordIntent = "stop" | "help" | null;

/** A message that is essentially just a stop word, with politeness around it ("please stop", "STOP 🙏"). */
const BARE_STOP =
  /^(please |pls |plz )?(stop|stopall|unsubscribe|quit|end|cancel|optout|opt out|opt me out|remove me)( it| now| texting| please| pls| thanks| thank you)*$/;

export function keywordIntent(text: string): KeywordIntent {
  const plain = text.normalize("NFKC").trim().toLowerCase().replace(/[.!?\s]+$/g, "");
  // Letters only: emoji, punctuation and repeated spaces dropped.
  const letters = plain.replace(/[^\p{L}\s'-]/gu, " ").replace(/\s+/g, " ").trim();
  if (KEYWORDS.has(plain) || KEYWORDS.has(letters) || BARE_STOP.test(letters) || FREE_TEXT.test(plain)) return "stop";
  if (HELP.has(plain) || HELP.has(letters)) return "help";
  return null;
}
