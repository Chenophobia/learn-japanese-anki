import { describe, it, expect } from 'vitest';
import { createTestDb } from '../db/test-db';
import { chapters, units, cards } from '../db/schema';
import { seedIfEmpty } from './run';
import { curriculum } from './index';

describe('seedIfEmpty', () => {
  it('inserts every chapter, unit and card', () => {
    const db = createTestDb();
    seedIfEmpty(db);

    const expectedUnits = curriculum.reduce((n, c) => n + c.units.length, 0);
    const expectedCards = curriculum.reduce((n, c) => n + c.units.reduce((m, u) => m + u.cards.length, 0), 0);

    expect(db.select().from(chapters).all()).toHaveLength(curriculum.length);
    expect(db.select().from(units).all()).toHaveLength(expectedUnits);
    expect(db.select().from(cards).all()).toHaveLength(expectedCards);
  });

  it('assigns 1-based order within each parent', () => {
    const db = createTestDb();
    seedIfEmpty(db);
    expect(db.select().from(chapters).all().map((c) => c.order)).toEqual(
      curriculum.map((_, i) => i + 1)
    );
    const firstChapterUnits = db.select().from(units).all().filter((u) => u.chapterId === 1);
    expect(firstChapterUnits.map((u) => u.order)).toEqual([1, 2, 3, 4, 5]);
  });

  it('assigns contiguous 1-based order for units within every chapter, and cards within every unit', () => {
    const db = createTestDb();
    seedIfEmpty(db);
    const allChapters = db.select().from(chapters).all();
    const allUnits = db.select().from(units).all();
    const allCards = db.select().from(cards).all();

    for (const chapter of allChapters) {
      const chapterUnits = allUnits.filter((u) => u.chapterId === chapter.id);
      expect(chapterUnits.map((u) => u.order)).toEqual(chapterUnits.map((_, i) => i + 1));

      for (const unit of chapterUnits) {
        const unitCards = allCards.filter((c) => c.unitId === unit.id);
        expect(unitCards.map((c) => c.order)).toEqual(unitCards.map((_, i) => i + 1));
      }
    }
  });

  it('is idempotent — a second call inserts nothing', () => {
    const db = createTestDb();
    seedIfEmpty(db);
    const before = db.select().from(cards).all().length;
    seedIfEmpty(db);
    expect(db.select().from(cards).all()).toHaveLength(before);
  });

  it('is idempotent when the emptiness check runs inside the write transaction', () => {
    // Regression guard for the check-then-act race: the guard now reads
    // `chapters` from inside the same immediate-mode transaction that does the
    // inserts, rather than as a separate read before the transaction opens.
    // We can't spin up two real OS processes racing the same file inside a
    // single Vitest process, but we can prove the guard still short-circuits
    // correctly against an already-populated database, which is the behavior
    // the atomicity fix depends on.
    const db = createTestDb();
    seedIfEmpty(db);
    const chaptersBefore = db.select().from(chapters).all().length;
    const unitsBefore = db.select().from(units).all().length;
    const cardsBefore = db.select().from(cards).all().length;

    seedIfEmpty(db);
    seedIfEmpty(db);

    expect(db.select().from(chapters).all()).toHaveLength(chaptersBefore);
    expect(db.select().from(units).all()).toHaveLength(unitsBefore);
    expect(db.select().from(cards).all()).toHaveLength(cardsBefore);
  });

  it('stores faces as parseable JSON', () => {
    const db = createTestDb();
    seedIfEmpty(db);
    const [first] = db.select().from(cards).all();
    expect(JSON.parse(first.frontJson)).toHaveProperty('char');
  });

  it('round-trips every card front/back exactly against the source curriculum', () => {
    const db = createTestDb();
    seedIfEmpty(db);

    const sourceCards = curriculum.flatMap((chapter) =>
      chapter.units.flatMap((unit) => unit.cards)
    );
    const storedCards = db.select().from(cards).orderBy(cards.id).all();

    expect(storedCards).toHaveLength(sourceCards.length);
    storedCards.forEach((stored, i) => {
      expect(JSON.parse(stored.frontJson)).toEqual(sourceCards[i].front);
      expect(JSON.parse(stored.backJson)).toEqual(sourceCards[i].back);
    });
  });
});
