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
