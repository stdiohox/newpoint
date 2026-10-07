/**
 * Pure logic for seo.rank-tracker (docs/automation-architecture.md §5.3).
 */

export interface TrackedKeyword {
  readonly id: string;
  readonly term: string;
}

export interface DailyQueryRow {
  readonly query: string;
  /** YYYY-MM-DD */
  readonly date: string;
  readonly position: number;
  readonly impressions: number;
  readonly clicks: number;
}

export interface Snapshot {
  readonly keywordId: string;
  readonly date: string;
  readonly position: number;
  readonly impressions: number;
  readonly clicks: number;
}

const normalise = (term: string): string => term.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * One snapshot per tracked keyword per day that Search Console reports. A term
 * stored twice (for example once per state) gets the same row under each id.
 * Search Console only reports queries with impressions, so a missing day means
 * "not seen", which is recorded as no row, not as a zero.
 */
export function matchSnapshots(keywords: readonly TrackedKeyword[], rows: readonly DailyQueryRow[]): Snapshot[] {
  const idsByTerm = new Map<string, string[]>();
  for (const keyword of keywords) {
    const key = normalise(keyword.term);
    idsByTerm.set(key, [...(idsByTerm.get(key) ?? []), keyword.id]);
  }

  // Search Console can split one normalised query across casings; merge per day.
  const merged = new Map<string, { query: string; date: string; weighted: number; impressions: number; clicks: number }>();
  for (const row of rows) {
    const key = `${normalise(row.query)}\u0000${row.date}`;
    const current = merged.get(key) ?? { query: normalise(row.query), date: row.date, weighted: 0, impressions: 0, clicks: 0 };
    current.weighted += row.position * row.impressions;
    current.impressions += row.impressions;
    current.clicks += row.clicks;
    merged.set(key, current);
  }

  const snapshots: Snapshot[] = [];
  for (const day of merged.values()) {
    if (day.impressions === 0) continue;
    for (const keywordId of idsByTerm.get(day.query) ?? []) {
      snapshots.push({
        keywordId,
        date: day.date,
        // Impression-weighted, as Search Console itself averages position.
        position: Math.round((day.weighted / day.impressions) * 100) / 100,
        impressions: day.impressions,
        clicks: day.clicks,
      });
    }
  }
  return snapshots;
}

/** Search Console's final data lags about three days; the tracker reads the 7 settled days before that. */
export function trackingWindow(now: Date): { readonly startDate: string; readonly endDate: string } {
  const day = (offset: number): string => new Date(now.getTime() - offset * 86_400_000).toISOString().slice(0, 10);
  return { startDate: day(9), endDate: day(3) };
}

/** The research window: the 28 settled days. */
export function researchWindow(now: Date): { readonly startDate: string; readonly endDate: string } {
  const day = (offset: number): string => new Date(now.getTime() - offset * 86_400_000).toISOString().slice(0, 10);
  return { startDate: day(30), endDate: day(3) };
}
