import type { Db } from '../db/connect';
import { chapters, units, cards } from '../db/schema';
import { curriculum } from './index';

export function seedIfEmpty(database: Db): void {
  // BEGIN IMMEDIATE takes the write lock before the emptiness check runs, so a
  // concurrent process cannot observe an empty `chapters` table, also decide to
  // seed, and race this transaction to a doubled curriculum. The check and the
  // inserts are one atomic unit.
  //
  // Checking only `chapters` for emptiness relies on the seed itself being
  // transactional: a populated `chapters` table can only exist alongside fully
  // populated `units` and `cards`, because this transaction is the only writer
  // and it either inserts all three or none of them.
  database.transaction(
    (tx) => {
      const existing = tx.select({ id: chapters.id }).from(chapters).limit(1).all();
      if (existing.length > 0) return;

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
    },
    { behavior: 'immediate' }
  );
}
