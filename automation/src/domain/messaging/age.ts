/**
 * Reading a reply to "Are you 18 or older?" (D18). Deterministic and strict: only a clear
 * yes or a clear no counts; anything else leaves the age unknown (a staff callback, as before).
 */
const YES = new Set(["yes", "y", "yeah", "yep", "yup", "yes i am", "i am", "yes im 18", "yes i am 18", "im 18", "i am 18", "im over 18", "i am over 18"]);
const NO = new Set(["no", "n", "nope", "no i am not", "no im not", "i am not", "im not", "not yet", "no im under 18", "i am under 18", "im under 18"]);

export type AgeAnswer = "yes" | "no" | null;

export function parseAgeAnswer(text: string): AgeAnswer {
  const plain = text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (YES.has(plain)) return "yes";
  if (NO.has(plain)) return "no";
  return null;
}
