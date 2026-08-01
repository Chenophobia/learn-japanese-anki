import { and, asc, eq, gte, sql } from 'drizzle-orm';
import type { Db } from './db/connect';
import { userCards, reviewLogs } from './db/schema';
import { MATURE_STABILITY_DAYS, REVIEW_STATE } from './progress';
import { utcDayStart } from './utc-day';
import { heatmapRange } from '$lib/heatmap';

export type Stats = {
  learned: number; // user_cards rows (cards introduced)
  mature: number; // Review state and stability >= MATURE_STABILITY_DAYS
  young: number; // introduced but not mature
  streak: number; // consecutive UTC days ending today (or yesterday) with >= 1 review
  retention: number | null; // share of Review-state reviews rated >= Hard; null with no data
  dueToday: number;
  dueTomorrow: number;
  reviewsByDay: Array<{ date: string; count: number }>; // the heatmap grid's date range, only non-zero days
};


/** `YYYY-MM-DD` for the UTC calendar day containing `date`. */
function isoDay(date: Date): string {
  return utcDayStart(date).toISOString().slice(0, 10);
}

/**
 * Aggregates the stats-page metrics in a fixed, small number of grouped
 * queries — no per-day or per-card looping — so the page load stays cheap
 * regardless of how much review history a user has accumulated.
 */
export function userStats(db: Db, userId: number, now: Date = new Date()): Stats {
  const [totals] = db
    .select({
      learned: sql<number>`count(*)`,
      mature: sql<number>`sum(case when ${userCards.state} = ${REVIEW_STATE}
        and ${userCards.stability} >= ${MATURE_STABILITY_DAYS} then 1 else 0 end)`
    })
    .from(userCards)
    .where(eq(userCards.userId, userId))
    .all();

  const learned = totals?.learned ?? 0;
  const mature = totals?.mature ?? 0;

  // Retention only counts reviews where the card was ALREADY in Review state
  // before that review — reviewLogs.state is the pre-review state, so a
  // Learning-state review (still graduating) never dilutes the number.
  const [recall] = db
    .select({
      reviewed: sql<number>`count(*)`,
      recalled: sql<number>`sum(case when ${reviewLogs.rating} >= 2 then 1 else 0 end)`
    })
    .from(reviewLogs)
    .where(and(eq(reviewLogs.userId, userId), eq(reviewLogs.state, REVIEW_STATE)))
    .all();

  const todayEnd = utcDayStart(now, 1).toISOString();
  const tomorrowEnd = utcDayStart(now, 2).toISOString();

  // A single grouped query for both due-buckets rather than two separate
  // count() round trips.
  const [due] = db
    .select({
      dueToday: sql<number>`sum(case when ${userCards.due} < ${todayEnd} then 1 else 0 end)`,
      dueTomorrow: sql<number>`sum(case when ${userCards.due} >= ${todayEnd}
        and ${userCards.due} < ${tomorrowEnd} then 1 else 0 end)`
    })
    .from(userCards)
    .where(eq(userCards.userId, userId))
    .all();

  const window = heatmapRange(now);
  // How many days of the window are in the past. The grid runs to the
  // Saturday on/after today, so between 0 and 6 of its columns are future
  // days that can never hold a review — the windowed streak therefore tops
  // out below HEATMAP_WINDOW_DAYS, and that is the real ceiling below.
  const pastDaysInWindow =
    (Date.parse(isoDay(now)) - Date.parse(window.start)) / 86_400_000 + 1;

  const dayCol = sql<string>`substr(${reviewLogs.reviewedAt}, 1, 10)`;
  const byDay = db
    .select({ date: dayCol, count: sql<number>`count(*)` })
    .from(reviewLogs)
    .where(
      and(
        eq(reviewLogs.userId, userId),
        // Anchored on the grid's own start, not on today: the grid ends on
        // the Saturday on/after today, so a window measured back from today
        // would reach 1-6 days further left than any cell it draws.
        gte(reviewLogs.reviewedAt, `${window.start}T00:00:00.000Z`)
      )
    )
    .groupBy(dayCol)
    .orderBy(asc(dayCol))
    .all();

  let streak = computeStreak(new Set(byDay.map((d) => d.date)), now);
  // The windowed streak can only ever report up to `pastDaysInWindow`, since
  // that's all the data `byDay` has. Hitting that ceiling doesn't mean the
  // streak IS exactly that long — it means it might continue further back
  // than the window, so resolve the true value with one extra unbounded
  // query. This keeps the common case at the cheap windowed cost and only
  // pays for a full history scan in the rare case that actually needs it.
  if (streak >= pastDaysInWindow) {
    streak = computeStreak(allActivityDays(db, userId, dayCol), now);
  }

  return {
    learned,
    mature,
    young: learned - mature,
    streak,
    retention: recall && recall.reviewed > 0 ? recall.recalled / recall.reviewed : null,
    dueToday: due?.dueToday ?? 0,
    dueTomorrow: due?.dueTomorrow ?? 0,
    reviewsByDay: byDay
  };
}

/** Every distinct UTC day (unbounded, no time-window filter) the user has ever reviewed on. */
function allActivityDays(db: Db, userId: number, dayCol: ReturnType<typeof sql<string>>): Set<string> {
  const rows = db
    .select({ date: dayCol })
    .from(reviewLogs)
    .where(eq(reviewLogs.userId, userId))
    .groupBy(dayCol)
    .all();
  return new Set(rows.map((r) => r.date));
}

/**
 * Consecutive UTC days with >= 1 review, ending today if today already has
 * one, otherwise ending yesterday (so an unstudied morning doesn't zero out
 * an active streak). `days` is the set of ISO day strings with activity —
 * the caller decides whether that set is windowed or unbounded.
 */
function computeStreak(days: Set<string>, now: Date): number {
  let cursor = days.has(isoDay(now)) ? utcDayStart(now) : utcDayStart(now, -1);
  let streak = 0;
  while (days.has(isoDay(cursor))) {
    streak++;
    cursor = utcDayStart(cursor, -1);
  }
  return streak;
}
