/**
 * Awareness observances social.planner may build around (§5.7 input).
 *
 * Only US or international observances with a FIXED date or month, so the
 * calendar never needs a lookup to be right. Observances defined as "the
 * first week of" or "the second Thursday of" are left out on purpose.
 * Suicide Prevention Awareness Month is a crisis topic: every post about it
 * must carry 988 / 911, which social.compliance enforces.
 */
import { publicText, type PublicText } from "../../lib/phi.js";

export interface Observance {
  readonly name: PublicText;
  /** 1-12. */
  readonly month: number;
  /** A single day, or null for the whole month. */
  readonly day: number | null;
}

export const OBSERVANCES: readonly Observance[] = [
  { name: publicText("Mental Health Awareness Month"), month: 5, day: null },
  { name: publicText("PTSD Awareness Month"), month: 6, day: null },
  { name: publicText("Minority Mental Health Awareness Month"), month: 7, day: null },
  { name: publicText("Suicide Prevention Awareness Month"), month: 9, day: null },
  { name: publicText("ADHD Awareness Month"), month: 10, day: null },
  { name: publicText("World Mental Health Day"), month: 10, day: 10 },
];

/** Observances that touch any day of the week starting `weekStart` (UTC dates). */
export function observancesForWeek(weekStart: Date): Observance[] {
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86_400_000));
  return OBSERVANCES.filter((o) =>
    days.some((d) => d.getUTCMonth() + 1 === o.month && (o.day === null || d.getUTCDate() === o.day)),
  );
}
