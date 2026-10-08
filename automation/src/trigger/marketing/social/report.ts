/**
 * The stored compliance report, read back for the owner's approval message.
 * Only the closed fields come from the jsonb here; the free-text notes come
 * through getDraftFeedback, which returns them as PublicText.
 */
import { POST_RULE_NAMES, type PostRule } from "../../../domain/content-rules/newpoint-rules.js";

const KNOWN_RULES: ReadonlySet<string> = new Set(POST_RULE_NAMES);

export function fromStoredReport(report: unknown): { readonly passed: boolean; readonly rounds: number; readonly rules: PostRule[] } {
  const r = (typeof report === "object" && report !== null ? report : {}) as Record<string, unknown>;
  const rules = Array.isArray(r["rules"])
    ? r["rules"].filter((x): x is PostRule => typeof x === "string" && KNOWN_RULES.has(x))
    : [];
  return { passed: r["passed"] === true, rounds: typeof r["round"] === "number" ? r["round"] : 0, rules };
}
