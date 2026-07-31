import type { Db } from '../db/connect';
import { chapters, units, cards } from '../db/schema';
import { curriculum } from './index';

export function seedIfEmpty(database: Db): void {
  const existing = database.select({ id: chapters.id }).from(chapters).limit(1).all();
  if (existing.length > 0) return;

  database.transaction((tx) => {
    curriculum.forEach((chapter, chapterIndex) => {
      const [insertedChapter] = tx
        .insert(chapters)
        .values({ order: chapterIndex + 1, title: chapter.title, kind: chapter.kind })
        .returning()
        .all();

      chapter.units.forEach((unit, unitIndex) => {
        const [insertedUnit] = tx
          .insert(units)
          .values({
            chapterId: insertedChapter.id,
            order: unitIndex + 1,
            title: unit.title,
            kind: unit.kind,
            dailyCap: unit.dailyCap
          })
          .returning()
          .all();

        const rows = unit.cards.map((card, cardIndex) => ({
          unitId: insertedUnit.id,
          order: cardIndex + 1,
          frontJson: JSON.stringify(card.front),
          backJson: JSON.stringify(card.back)
        }));
        tx.insert(cards).values(rows).run();
      });
    });
  });
}
