/**
 * Practice-local time for texts and the console. NJ and PA are both America/New_York.
 * Pure: formatting for SMS slots, and turning a staff-entered local date and time into an
 * instant (DST-correct, by asking Intl for the zone's offset at that moment).
 */
import { PRACTICE_TZ } from "../messaging/quiet-hours.js";

const DATE = new Intl.DateTimeFormat("en-US", { timeZone: PRACTICE_TZ, weekday: "short", month: "short", day: "numeric" });
const TIME = new Intl.DateTimeFormat("en-US", { timeZone: PRACTICE_TZ, hour: "numeric", minute: "2-digit", hour12: true });

/** "Tue, Oct 20": the SMS `date` slot shape. */
export const smsDate = (at: Date): string => DATE.format(at);
/** "3:30 PM": the SMS `time` slot shape. */
export const smsTime = (at: Date): string => TIME.format(at).replace(/\u202f/g, " ");

function offsetMs(at: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: PRACTICE_TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const local = Date.UTC(Number(parts["year"]), Number(parts["month"]) - 1, Number(parts["day"]), Number(parts["hour"]), Number(parts["minute"]), Number(parts["second"]));
  return local - Math.floor(at.getTime() / 1000) * 1000;
}

/** "2026-10-20" + "15:30" in New York → the instant. null if either is malformed. */
export function fromLocal(date: string, time: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (d === null || t === null) return null;
  const [y, m, day, hh, mm] = [Number(d[1]), Number(d[2]), Number(d[3]), Number(t[1]), Number(t[2])];
  const naive = Date.UTC(y, m - 1, day, hh, mm);
  // Date.UTC rolls 2026-13-01 into January: the parts must survive the round trip.
  const check = new Date(naive);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== day || hh > 23 || mm > 59) return null;
  // Two passes settle the offset across a DST change.
  let guess = new Date(naive - offsetMs(new Date(naive)));
  guess = new Date(naive - offsetMs(guess));
  // A wall-clock time the spring-forward gap skips (02:30 on the March change) does not exist:
  // refuse it rather than silently move the visit by an hour.
  if (guess.getTime() + offsetMs(guess) !== naive) return null;
  return guess;
}
