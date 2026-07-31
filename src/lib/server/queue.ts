import { and, asc, eq, isNull, lte, sql } from 'drizzle-orm';
import type { Db } from './db/connect';
import type { UnitKind } from '$lib/cards';
import { chapters, units, cards, userCards, reviewLogs } from './db/schema';
import { applyRating, newUserCard, type UserCardRow } from './scheduler';

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
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
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

function introducedToday(db: Db, userId: number, unitId: number, now: Date): number {
  const [row] = db
    .select({ n: sql<number>`count(*)` })
    .from(reviewLogs)
    .innerJoin(cards, eq(cards.id, reviewLogs.cardId))
    .where(
      and(
        eq(reviewLogs.userId, userId),
        eq(cards.unitId, unitId),
        eq(reviewLogs.state, 0), // State.New — the log snapshots the pre-review state
        sql`${reviewLogs.reviewedAt} >= ${dayStart(now)}`
      )
    )
    .all();
  return row?.n ?? 0;
}

export function queueCounts(db: Db, userId: number, now: Date = new Date()): { due: number; newAvailable: number } {
  const [dueRow] = db
    .select({ n: sql<number>`count(*)` })
    .from(userCards)
    .where(and(eq(userCards.userId, userId), lte(userCards.due, now.toISOString())))
    .all();

  const unitId = currentUnitId(db, userId);
  if (unitId === null) return { due: dueRow?.n ?? 0, newAvailable: 0 };

  const [unit] = db.select().from(units).where(eq(units.id, unitId)).all();
  const remainingInUnit = db
    .select({ id: cards.id })
    .from(cards)
    .leftJoin(userCards, and(eq(userCards.cardId, cards.id), eq(userCards.userId, userId)))
    .where(and(eq(cards.unitId, unitId), isNull(userCards.cardId)))
    .all().length;

  const capLeft = Math.max(0, unit.dailyCap - introducedToday(db, userId, unitId, now));
  return { due: dueRow?.n ?? 0, newAvailable: Math.min(capLeft, remainingInUnit) };
}

export function nextQueueItem(db: Db, userId: number, now: Date = new Date()): QueueItem | null {
  const [review] = db
    .select({
      cardId: cards.id, unitId: units.id, unitTitle: units.title, unitKind: units.kind,
      frontJson: cards.frontJson, backJson: cards.backJson, uc: userCards
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

  if (queueCounts(db, userId, now).newAvailable === 0) return null;

  const unitId = currentUnitId(db, userId);
  if (unitId === null) return null;

  const [fresh] = db
    .select({
      cardId: cards.id, unitTitle: units.title, unitKind: units.kind,
      frontJson: cards.frontJson, backJson: cards.backJson
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

function toRow(uc: typeof userCards.$inferSelect): UserCardRow {
  return {
    state: uc.state, stability: uc.stability, difficulty: uc.difficulty, due: uc.due,
    scheduledDays: uc.scheduledDays, learningSteps: uc.learningSteps,
    reps: uc.reps, lapses: uc.lapses, lastReview: uc.lastReview
  };
}

export function recordReview(db: Db, userId: number, cardId: number, rating: number, now: Date = new Date()): void {
  db.transaction((tx) => {
    const [existing] = tx
      .select()
      .from(userCards)
      .where(and(eq(userCards.userId, userId), eq(userCards.cardId, cardId)))
      .all();

    const current = existing ? toRow(existing) : newUserCard(now);
    const { next, log } = applyRating(current, rating, now);

    if (existing) {
      tx.update(userCards).set(next).where(and(eq(userCards.userId, userId), eq(userCards.cardId, cardId))).run();
    } else {
      tx.insert(userCards).values({ userId, cardId, ...next }).run();
    }

    tx.insert(reviewLogs).values({ userId, cardId, ...log }).run();
  });
}
