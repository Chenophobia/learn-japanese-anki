/**
 * The single definition of the activity heatmap's date window.
 *
 * The grid (Heatmap.svelte) and the query that feeds it (server/stats.ts)
 * must agree on exactly which days are covered. They previously each derived
 * the window from their own copy of `53`, anchored differently: the query on
 * today, the grid on the Saturday on/after today. On any day but Saturday
 * that left the query returning 1–6 days older than the grid's leftmost
 * column — days a screen reader would announce but no cell ever drew.
 */
export const HEATMAP_WEEKS = 53;
export const HEATMAP_WINDOW_DAYS = HEATMAP_WEEKS * 7;

/** `YYYY-MM-DD` of the UTC day containing `date`. */
function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * A month label sits in an 11px column but renders roughly 20px wide, so it
 * overflows into its neighbours and needs about three columns of room.
 */
export const MIN_LABEL_COLUMNS = 3;

/**
 * Picks which week-columns get a month label, given each column's month.
 *
 * A column is labelled when it starts a new month AND the next month starts
 * far enough after it. Dropping the crowded ones is what stops "Jul" and
 * "Aug" rendering on top of each other: column 0 always counts as a month
 * start, so a grid opening on the last days of a month would otherwise put a
 * near-invisible partial month right next to the real one. The same rule at
 * the right edge keeps a trailing label from overflowing past the last column
 * and being clipped by the scroll container.
 */
export function monthLabelColumns(monthByColumn: number[]): boolean[] {
  const starts = monthByColumn.reduce<number[]>((acc, month, i) => {
    if (i === 0 || monthByColumn[i - 1] !== month) acc.push(i);
    return acc;
  }, []);

  const labelled: boolean[] = Array(monthByColumn.length).fill(false);
  starts.forEach((column, i) => {
    const next = starts[i + 1] ?? monthByColumn.length;
    if (next - column >= MIN_LABEL_COLUMNS) labelled[column] = true;
  });
  return labelled;
}

/**
 * The inclusive UTC date range the grid draws: a whole number of weeks
 * ending on the Saturday on/after today, so the final column is a complete
 * week containing today.
 */
export function heatmapRange(now: Date): { start: string; end: string; endDate: Date } {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (HEATMAP_WINDOW_DAYS - 1));

  return { start: isoDay(start), end: isoDay(end), endDate: end };
}
