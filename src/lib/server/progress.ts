import { and, asc, eq, sql } from 'drizzle-orm';
import type { Db } from './db/connect';
import type { UnitKind } from '$lib/cards';
import { chapters, units, cards, userCards } from './db/schema';
import { currentUnitId } from './queue';

export const MATURE_STABILITY_DAYS = 21;
export const REVIEW_STATE = 2;

export type UnitProgress = {
  id: number;
  title: string;
  kind: UnitKind;
  total: number;
  introduced: number;
  mature: number;
  status: 'done' | 'current' | 'locked';
};

export type ChapterProgress = {
  id: number;
  title: string;
  total: number;
  introduced: number;
  units: UnitProgress[];
};

/**
 * Aggregates per-chapter/per-unit progress for the chapter map page in a
 * single grouped query (plus the one query `currentUnitId` already runs),
 * rather than looping per unit — the real curriculum has 50 units and this
 * must not become 50+ round trips.
 */
export function chapterProgress(db: Db, userId: number): ChapterProgress[] {
  const rows = db
    .select({
      chapterId: chapters.id,
      chapterTitle: chapters.title,
      unitId: units.id,
      unitTitle: units.title,
      unitKind: units.kind,
      total: sql<number>`count(${cards.id})`,
      introduced: sql<number>`count(${userCards.cardId})`,
      mature: sql<number>`sum(case when ${userCards.state} = ${REVIEW_STATE}
        and ${userCards.stability} >= ${MATURE_STABILITY_DAYS} then 1 else 0 end)`
    })
    .from(chapters)
    .innerJoin(units, eq(units.chapterId, chapters.id))
    .innerJoin(cards, eq(cards.unitId, units.id))
    .leftJoin(userCards, and(eq(userCards.cardId, cards.id), eq(userCards.userId, userId)))
    .groupBy(chapters.id, units.id)
    .orderBy(asc(chapters.order), asc(units.order))
    .all();

  const current = currentUnitId(db, userId);
  const currentIndex = current === null ? rows.length : rows.findIndex((r) => r.unitId === current);

  const byChapter = new Map<number, ChapterProgress>();
  rows.forEach((row, index) => {
    let chapter = byChapter.get(row.chapterId);
    if (!chapter) {
      chapter = { id: row.chapterId, title: row.chapterTitle, total: 0, introduced: 0, units: [] };
      byChapter.set(row.chapterId, chapter);
    }
    chapter.total += row.total;
    chapter.introduced += row.introduced;
    chapter.units.push({
      id: row.unitId,
      title: row.unitTitle,
      kind: row.unitKind as UnitKind,
      total: row.total,
      introduced: row.introduced,
      mature: row.mature ?? 0,
      status: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'locked'
    });
  });

  return [...byChapter.values()];
}
