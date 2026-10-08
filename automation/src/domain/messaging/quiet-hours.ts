/**
 * Quiet hours (§5.0): texts go out 08:00–21:00 in the recipient's local time; outside
 * the window they are deferred, never dropped. Reviews use a narrower 10:00–19:00
 * window (§5.4). NJ and PA are both America/New_York; an unknown state is treated the same.
 */
export const PRACTICE_TZ = "America/New_York";

export interface Window {
  readonly startHour: number;
  readonly endHour: number;
}
export const SMS_WINDOW: Window = { startHour: 8, endHour: 21 };
export const REVIEW_WINDOW: Window = { startHour: 10, endHour: 19 };

function localHourMinute(at: Date, tz: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "numeric", hour12: false }).formatToParts(at);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { hour, minute };
}

export function inWindow(at: Date, window: Window = SMS_WINDOW, tz = PRACTICE_TZ): boolean {
  const { hour } = localHourMinute(at, tz);
  return hour >= window.startHour && hour < window.endHour;
}

/** The next instant inside the window: `at` itself when already inside. Minute precision. */
export function nextInWindow(at: Date, window: Window = SMS_WINDOW, tz = PRACTICE_TZ): Date {
  if (inWindow(at, window, tz)) return at;
  let probe = new Date(Math.ceil(at.getTime() / 60_000) * 60_000);
  for (let i = 0; i < 48 * 60; i += 1) {
    const { minute } = localHourMinute(probe, tz);
    if (inWindow(probe, window, tz) && minute === 0) return probe;
    probe = new Date(probe.getTime() + 60_000);
  }
  throw new Error("nextInWindow: no window within 48 hours");
}
