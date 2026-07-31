import { and, asc, eq, gte, sql } from 'drizzle-orm';
import type { Db } from './db/connect';
import { userCards, reviewLogs } from './db/schema';
import { MATURE_STABILITY_DAYS, REVIEW_STATE } from './progress';

export type Stats = {
  learned: number; // user_cards rows (cards introduced)
  mature: number; // Review state and stability >= MATURE_STABILITY_DAYS
  young: number; // introduced but not mature
  streak: number; // consecutive UTC days ending today (or yesterday) with >= 1 review
  retention: number | null; // share of Review-state reviews rated >= Hard; null with no data
  dueToday: number;
  dueTomorrow: number;
  reviewsByDay: Array<{ date: string; count: number }>; // last 365 days, only non-zero days
};

const HEATMAP_WINDOW_DAYS = 365;

/** Midnight UTC on `date`, optionally shifted by `offsetDays`. */
function utcDayStart(date: Date, offsetDays = 0): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + offsetDays));
}

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

  const dayCol = sql<string>`substr(${reviewLogs.reviewedAt}, 1, 10)`;
  const byDay = db
    .select({ date: dayCol, count: sql<number>`count(*)` })
    .from(reviewLogs)
    .where(
      and(
        eq(reviewLogs.userId, userId),
        gte(reviewLogs.reviewedAt, utcDayStart(now, -(HEATMAP_WINDOW_DAYS - 1)).toISOString())
      )
    )
    .groupBy(dayCol)
    .orderBy(asc(dayCol))
    .all();

  return {
    learned,
    mature,
    young: learned - mature,
    streak: computeStreak(new Set(byDay.map((d) => d.date)), now),
    retention: recall && recall.reviewed > 0 ? recall.recalled / recall.reviewed : null,
    dueToday: due?.dueToday ?? 0,
    dueTomorrow: due?.dueTomorrow ?? 0,
    reviewsByDay: byDay
  };
}

/**
 * Consecutive UTC days with >= 1 review, ending today if today already has
 * one, otherwise ending yesterday (so an unstudied morning doesn't zero out
 * an active streak). `days` is the set of ISO day strings with activity —
 * bounded to the same 365-day window as `reviewsByDay`, so a streak longer
 * than that window reports as 365, not its true length.
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
