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

    expect(db.select().from(chapters).all()).toHaveLength(4);
    expect(db.select().from(units).all()).toHaveLength(expectedUnits);
    expect(db.select().from(cards).all()).toHaveLength(expectedCards);
  });

  it('assigns 1-based order within each parent', () => {
    const db = createTestDb();
    seedIfEmpty(db);
    expect(db.select().from(chapters).all().map((c) => c.order)).toEqual([1, 2, 3, 4]);
    const firstChapterUnits = db.select().from(units).all().filter((u) => u.chapterId === 1);
    expect(firstChapterUnits.map((u) => u.order)).toEqual([1, 2, 3, 4, 5]);
  });

  it('is idempotent — a second call inserts nothing', () => {
    const db = createTestDb();
    seedIfEmpty(db);
    const before = db.select().from(cards).all().length;
    seedIfEmpty(db);
    expect(db.select().from(cards).all()).toHaveLength(before);
  });

  it('stores faces as parseable JSON', () => {
    const db = createTestDb();
    seedIfEmpty(db);
    const [first] = db.select().from(cards).all();
    expect(JSON.parse(first.frontJson)).toHaveProperty('char');
  });
});
