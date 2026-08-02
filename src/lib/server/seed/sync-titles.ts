import { eq } from 'drizzle-orm';
import type { Db } from '../db/connect';
import { chapters, units } from '../db/schema';
import { curriculum } from './index';

export type SyncResult =
  { status: 'synced'; renamed: number } | { status: 'skipped'; reason: string };

/**
 * Rewrites chapter and unit titles in place from the curriculum.
 *
 * Renaming a unit does not change a single card, so it has no business going
 * through `reseed` — which drops and re-inserts `cards`, and with them every
 * user's FSRS state, streak, and review history, because `cards.id` is an
 * autoincrement key a reseed cannot preserve. This touches only the `title`
 * column, so progress survives by construction.
 *
 * Rows are matched by position (`chapters.order`, then `units.order` within a
 * chapter) rather than by title, because the titles are precisely what is
 * changing. That makes position the load-bearing assumption, so the shape is
 * verified before anything is written: same chapter count, same unit count
 * per chapter, and `order` values forming 1..n on both levels. On any
 * mismatch this writes nothing and returns `skipped` — a database whose
 * shape has diverged is one where position no longer identifies the same
 * unit, and renaming by position would silently retitle the wrong rows.
 * Adding, removing, or reordering units is still a `reseed`.
 *
 * Idempotent: a second run finds every title already correct and writes
 * nothing.
 */
export function syncCurriculumTitles(database: Db): SyncResult {
  return database.transaction(
    (tx) => {
      const dbChapters = tx.select().from(chapters).orderBy(chapters.order).all();

      // An empty database is not a mismatch — `seedIfEmpty` has either just
      // filled it, in which case titles are already current, or declined to.
      // Neither case warrants a warning.
      if (dbChapters.length === 0) {
        return { status: 'skipped', reason: 'empty database' } as const;
      }
      if (dbChapters.length !== curriculum.length) {
        return {
          status: 'skipped',
          reason: `chapter count differs — database ${dbChapters.length}, curriculum ${curriculum.length}`
        } as const;
      }

      const pairs = dbChapters.map((row, index) => ({
        row,
        index,
        spec: curriculum[index],
        dbUnits: tx
          .select()
          .from(units)
          .where(eq(units.chapterId, row.id))
          .orderBy(units.order)
          .all()
      }));

      for (const { row, index, spec, dbUnits } of pairs) {
        const at = `chapter ${index + 1}`;
        if (row.order !== index + 1) {
          return {
            status: 'skipped',
            reason: `${at}: order values are not 1..n (found ${row.order})`
          } as const;
        }
        if (dbUnits.length !== spec.units.length) {
          return {
            status: 'skipped',
            reason: `${at}: unit count differs — database ${dbUnits.length}, curriculum ${spec.units.length}`
          } as const;
        }
        const misordered = dbUnits.findIndex((u, j) => u.order !== j + 1);
        if (misordered !== -1) {
          return {
            status: 'skipped',
            reason: `${at}: unit order values are not 1..n (found ${dbUnits[misordered].order})`
          } as const;
        }
      }

      let renamed = 0;
      for (const { row, spec, dbUnits } of pairs) {
        if (row.title !== spec.title) {
          tx.update(chapters).set({ title: spec.title }).where(eq(chapters.id, row.id)).run();
          renamed++;
        }
        dbUnits.forEach((unit, j) => {
          const wanted = spec.units[j].title;
          if (unit.title !== wanted) {
            tx.update(units).set({ title: wanted }).where(eq(units.id, unit.id)).run();
            renamed++;
          }
        });
      }

      return { status: 'synced', renamed } as const;
    },
    { behavior: 'immediate' }
  );
}
