import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from '../db/test-db';
import { chapters, units, cards, users, userCards } from '../db/schema';
import { seedIfEmpty } from './run';
import { syncCurriculumTitles } from './sync-titles';
import { curriculum } from './index';
import type { Db } from '../db/connect';

/** A seeded database whose titles are stale, as a pre-rename deploy's would be. */
function seededWithOldTitles(): Db {
  const db = createTestDb();
  seedIfEmpty(db);
  db.update(chapters).set({ title: 'Old Chapter' }).where(eq(chapters.order, 1)).run();
  const [first] = db.select().from(units).orderBy(units.id).limit(1).all();
  db.update(units).set({ title: 'Base gojuon' }).where(eq(units.id, first.id)).run();
  return db;
}

describe('syncCurriculumTitles', () => {
  it('rewrites stale titles to match the curriculum', () => {
    const db = seededWithOldTitles();

    const result = syncCurriculumTitles(db);

    expect(result).toEqual({ status: 'synced', renamed: 2 });
    const [chapter] = db.select().from(chapters).orderBy(chapters.order).limit(1).all();
    expect(chapter.title).toBe('Hiragana');
    const [unit] = db.select().from(units).orderBy(units.id).limit(1).all();
    expect(unit.title).toBe('Base 46');
  });

  it('leaves a freshly seeded database alone', () => {
    const db = createTestDb();
    seedIfEmpty(db);

    expect(syncCurriculumTitles(db)).toEqual({ status: 'synced', renamed: 0 });
  });

  it('is idempotent — the second run writes nothing', () => {
    const db = seededWithOldTitles();

    expect(syncCurriculumTitles(db)).toEqual({ status: 'synced', renamed: 2 });
    expect(syncCurriculumTitles(db)).toEqual({ status: 'synced', renamed: 0 });
  });

  it('preserves study progress and card identity', () => {
    // The whole reason this exists rather than a reseed: `cards.id` must
    // survive, because `user_cards` and `review_logs` reference it.
    const db = seededWithOldTitles();
    const [user] = db
      .insert(users)
      .values({ username: 'a', passwordHash: 'x', createdAt: '2026-08-02T00:00:00Z' })
      .returning()
      .all();
    const before = db.select().from(cards).orderBy(cards.id).all();
    db.insert(userCards)
      .values({
        userId: user.id,
        cardId: before[0].id,
        state: 2,
        stability: 12.5,
        difficulty: 5.1,
        due: '2026-08-09T00:00:00Z',
        scheduledDays: 7,
        learningSteps: 0,
        reps: 4,
        lapses: 1,
        lastReview: '2026-08-02T00:00:00Z'
      })
      .run();

    syncCurriculumTitles(db);

    expect(db.select().from(cards).orderBy(cards.id).all()).toEqual(before);
    const progress = db.select().from(userCards).all();
    expect(progress).toHaveLength(1);
    expect(progress[0]).toMatchObject({ cardId: before[0].id, stability: 12.5, reps: 4 });
  });

  it('writes nothing when the chapter count has diverged', () => {
    const db = seededWithOldTitles();
    const [extra] = db
      .insert(chapters)
      .values({ order: curriculum.length + 1, title: 'Extra', kind: 'grammar' })
      .returning()
      .all();

    const result = syncCurriculumTitles(db);

    expect(result.status).toBe('skipped');
    const [chapter] = db.select().from(chapters).orderBy(chapters.order).limit(1).all();
    expect(chapter.title).toBe('Old Chapter');
    expect(extra.title).toBe('Extra');
  });

  it('writes nothing when a chapter has gained a unit', () => {
    const db = seededWithOldTitles();
    const [first] = db.select().from(chapters).orderBy(chapters.order).limit(1).all();
    const existing = db.select().from(units).where(eq(units.chapterId, first.id)).all();
    db.insert(units)
      .values({
        chapterId: first.id,
        order: existing.length + 1,
        title: 'Bonus',
        kind: 'kana',
        dailyCap: 5
      })
      .run();

    const result = syncCurriculumTitles(db);

    expect(result.status).toBe('skipped');
    const [unit] = db.select().from(units).orderBy(units.id).limit(1).all();
    expect(unit.title).toBe('Base gojuon');
  });

  it('writes nothing when unit order values have gaps', () => {
    // A gap means position no longer identifies the same unit, which is the
    // one assumption a positional rename cannot survive.
    const db = seededWithOldTitles();
    const [last] = db.select().from(units).orderBy(units.id).limit(1).all();
    db.update(units).set({ order: 99 }).where(eq(units.id, last.id)).run();

    const result = syncCurriculumTitles(db);

    expect(result.status).toBe('skipped');
    expect(result).toMatchObject({ reason: expect.stringContaining('1..n') });
  });

  it('skips an empty database without complaint', () => {
    expect(syncCurriculumTitles(createTestDb())).toEqual({
      status: 'skipped',
      reason: 'empty database'
    });
  });
});
