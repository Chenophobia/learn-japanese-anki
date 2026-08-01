import { and, asc, eq, gt, isNull, lte, sql } from 'drizzle-orm';
import type { Db } from './db/connect';
import type { UnitKind } from '$lib/cards';
import { chapters, units, cards, userCards, reviewLogs } from './db/schema';
import { applyRating, newUserCard, type UserCardRow } from './scheduler';
import { utcDayStart } from './utc-day';

export type QueueItem = {
  cardId: number;
  unitId: number;
  unitTitle: string;
  unitKind: UnitKind;
  frontJson: string;
  backJson: string;
  row: UserCardRow;
  isNew: boolean;
};

function dayStart(now: Date): string {
  return utcDayStart(now).toISOString();
}

export function currentUnitId(db: Db, userId: number): number | null {
  const [row] = db
    .select({ unitId: units.id })
    .from(units)
    .innerJoin(chapters, eq(chapters.id, units.chapterId))
    .innerJoin(cards, eq(cards.unitId, units.id))
    .leftJoin(userCards, and(eq(userCards.cardId, cards.id), eq(userCards.userId, userId)))
    .where(isNull(userCards.cardId))
    .orderBy(asc(chapters.order), asc(units.order), asc(cards.order))
    .limit(1)
    .all();
  return row?.unitId ?? null;
}

/**
 * How many new cards this user has introduced today, across every unit —
 * NOT scoped to the current unit. The daily cap is a per-user-per-day
 * allowance: once a unit is fully introduced mid-day, the next unit must
 * not start counting from zero, or the cap composes into a second full
 * allowance on the same day (see Finding 1 of the final branch review).
 */
function introducedToday(db: Db, userId: number, now: Date): number {
  const [row] = db
    .select({ n: sql<number>`count(*)` })
    .from(reviewLogs)
    .where(
      and(
        eq(reviewLogs.userId, userId),
        eq(reviewLogs.state, 0), // State.New — the log snapshots the pre-review state
        sql`${reviewLogs.reviewedAt} >= ${dayStart(now)}`
      )
    )
    .all();
  return row?.n ?? 0;
}

/**
 * Computes the current unit and how many new cards it can still offer today.
 * Shared by `queueCounts` and `nextQueueItem` so the two can never disagree
 * about the cap: both read the same unit id and the same `newAvailable` value
 * from a single call, rather than each recomputing it independently.
 *
 * The allowance is clamped by the *current* unit's `dailyCap`, but how much
 * of that cap is already spent is a per-user-per-day count spanning every
 * unit (see `introducedToday`) — a user who used up a smaller unit's cap
 * and rolled into a larger-cap unit still only gets the difference, never a
 * fresh full allowance. `Math.max(0, ...)` floors that difference so a user
 * who over-spent a smaller cap before landing in a unit with an even
 * smaller `dailyCap` gets zero, not a negative that would invert into extra
 * cards via `Math.min`.
 */
function capState(
  db: Db,
  userId: number,
  now: Date
): { unitId: number | null; newAvailable: number } {
  const unitId = currentUnitId(db, userId);
  if (unitId === null) return { unitId: null, newAvailable: 0 };

  const [unit] = db.select().from(units).where(eq(units.id, unitId)).all();
  const remainingInUnit = db
    .select({ id: cards.id })
    .from(cards)
    .leftJoin(userCards, and(eq(userCards.cardId, cards.id), eq(userCards.userId, userId)))
    .where(and(eq(cards.unitId, unitId), isNull(userCards.cardId)))
    .all().length;

  const capLeft = Math.max(0, unit.dailyCap - introducedToday(db, userId, now));
  return { unitId, newAvailable: Math.min(capLeft, remainingInUnit) };
}

export function queueCounts(
  db: Db,
  userId: number,
  now: Date = new Date()
): { due: number; newAvailable: number } {
  const [dueRow] = db
    .select({ n: sql<number>`count(*)` })
    .from(userCards)
    .where(and(eq(userCards.userId, userId), lte(userCards.due, now.toISOString())))
    .all();

  const { newAvailable } = capState(db, userId, now);
  return { due: dueRow?.n ?? 0, newAvailable };
}

export function nextQueueItem(db: Db, userId: number, now: Date = new Date()): QueueItem | null {
  const [review] = db
    .select({
      cardId: cards.id,
      unitId: units.id,
      unitTitle: units.title,
      unitKind: units.kind,
      frontJson: cards.frontJson,
      backJson: cards.backJson,
      uc: userCards
    })
    .from(userCards)
    .innerJoin(cards, eq(cards.id, userCards.cardId))
    .innerJoin(units, eq(units.id, cards.unitId))
    .where(and(eq(userCards.userId, userId), lte(userCards.due, now.toISOString())))
    .orderBy(asc(userCards.due))
    .limit(1)
    .all();

  if (review) {
    return {
      cardId: review.cardId,
      unitId: review.unitId,
      unitTitle: review.unitTitle,
      unitKind: review.unitKind as UnitKind,
      frontJson: review.frontJson,
      backJson: review.backJson,
      row: toRow(review.uc),
      isNew: false
    };
  }

  const { unitId, newAvailable } = capState(db, userId, now);
  if (unitId === null || newAvailable === 0) return null;

  const [fresh] = db
    .select({
      cardId: cards.id,
      unitTitle: units.title,
      unitKind: units.kind,
      frontJson: cards.frontJson,
      backJson: cards.backJson
    })
    .from(cards)
    .innerJoin(units, eq(units.id, cards.unitId))
    .leftJoin(userCards, and(eq(userCards.cardId, cards.id), eq(userCards.userId, userId)))
    .where(and(eq(cards.unitId, unitId), isNull(userCards.cardId)))
    .orderBy(asc(cards.order))
    .limit(1)
    .all();

  if (!fresh) return null;
  return {
    cardId: fresh.cardId,
    unitId,
    unitTitle: fresh.unitTitle,
    unitKind: fresh.unitKind as UnitKind,
    frontJson: fresh.frontJson,
    backJson: fresh.backJson,
    row: newUserCard(now),
    isNew: true
  };
}

/**
 * The earliest future `due` timestamp among this user's introduced cards, or
 * null if none exist. Used only when `nextQueueItem` has nothing to serve
 * right now, to tell "genuinely done for today" (nothing comes due later
 * today) apart from "more will surface later today" — see Finding 3 of the
 * final branch review. Deliberately not called on the hot path where a card
 * IS available.
 */
export function nextDueTime(db: Db, userId: number, now: Date): Date | null {
  const [row] = db
    .select({ due: userCards.due })
    .from(userCards)
    .where(and(eq(userCards.userId, userId), gt(userCards.due, now.toISOString())))
    .orderBy(asc(userCards.due))
    .limit(1)
    .all();
  return row ? new Date(row.due) : null;
}

function toRow(uc: typeof userCards.$inferSelect): UserCardRow {
  return {
    state: uc.state,
    stability: uc.stability,
    difficulty: uc.difficulty,
    due: uc.due,
    scheduledDays: uc.scheduledDays,
    learningSteps: uc.learningSteps,
    reps: uc.reps,
    lapses: uc.lapses,
    lastReview: uc.lastReview
  };
}

export function recordReview(
  db: Db,
  userId: number,
  cardId: number,
  rating: number,
  now: Date = new Date()
): void {
  db.transaction((tx) => {
    const [existing] = tx
      .select()
      .from(userCards)
      .where(and(eq(userCards.userId, userId), eq(userCards.cardId, cardId)))
      .all();

    const current = existing ? toRow(existing) : newUserCard(now);
    const { next, log } = applyRating(current, rating, now);

    if (existing) {
      tx.update(userCards)
        .set(next)
        .where(and(eq(userCards.userId, userId), eq(userCards.cardId, cardId)))
        .run();
    } else {
      tx.insert(userCards)
        .values({ userId, cardId, ...next })
        .run();
    }

    tx.insert(reviewLogs)
      .values({ userId, cardId, ...log })
      .run();
  });
}
