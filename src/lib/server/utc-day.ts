/**
 * Midnight UTC on `date`, optionally shifted by `offsetDays`.
 *
 * Shared by queue.ts (the daily new-card cap) and stats.ts (streaks, due
 * buckets, the heatmap window) so both always agree on where a UTC day
 * starts. Two independent implementations of the same boundary is exactly
 * the kind of thing that silently drifts apart later.
 */
export function utcDayStart(date: Date, offsetDays = 0): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + offsetDays)
  );
}
