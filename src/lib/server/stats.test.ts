import { describe, it, expect } from 'vitest';
import { createTestDb } from './db/test-db';
import { users, chapters, units, cards, userCards, reviewLogs } from './db/schema';
import { userStats } from './stats';

const NOW = new Date('2026-03-10T09:00:00.000Z');

function fixture() {
  const db = createTestDb();
  const [user] = db.insert(users).values({ username: 'u', passwordHash: 'x', createdAt: NOW.toISOString() }).returning().all();
  const [ch] = db.insert(chapters).values({ order: 1, title: 'Ch1', kind: 'kana' }).returning().all();
  const [unit] = db.insert(units).values({ chapterId: ch.id, order: 1, title: 'U1', kind: 'kana', dailyCap: 5 }).returning().all();
  const ids: number[] = [];
  for (let i = 1; i <= 4; i++) {
    const [card] = db.insert(cards).values({
      unitId: unit.id, order: i, frontJson: '{"char":"あ"}', backJson: '{"romaji":"a","mnemonic":"m"}'
    }).returning().all();
    ids.push(card.id);
  }
  return { db, userId: user.id, ids };
}

function introduce(db: ReturnType<typeof createTestDb>, userId: number, cardId: number, over: Partial<typeof userCards.$inferInsert> = {}) {
  db.insert(userCards).values({
    userId, cardId, state: 2, stability: 5, difficulty: 5,
    due: NOW.toISOString(), scheduledDays: 5, learningSteps: 0, reps: 1, lapses: 0,
    lastReview: NOW.toISOString(), ...over
  }).run();
}

function log(db: ReturnType<typeof createTestDb>, userId: number, cardId: number, rating: number, at: string, state = 2) {
  db.insert(reviewLogs).values({
    userId, cardId, rating, reviewedAt: at, state, stability: 5, difficulty: 5, scheduledDays: 5
  }).run();
}

describe('userStats', () => {
  it('is all zeros for a fresh user', () => {
    const { db, userId } = fixture();
    const stats = userStats(db, userId, NOW);
    expect(stats.learned).toBe(0);
    expect(stats.mature).toBe(0);
    expect(stats.streak).toBe(0);
    expect(stats.retention).toBeNull();
  });

  it('splits learned cards into mature and young', () => {
    const { db, userId, ids } = fixture();
    introduce(db, userId, ids[0], { stability: 30 });
    introduce(db, userId, ids[1], { stability: 3 });
    introduce(db, userId, ids[2], { state: 1, stability: 40 }); // Learning, not Review → young
    const stats = userStats(db, userId, NOW);
    expect(stats.learned).toBe(3);
    expect(stats.mature).toBe(1);
    expect(stats.young).toBe(2);
  });

  it('computes retention from Review-state reviews only', () => {
    const { db, userId, ids } = fixture();
    log(db, userId, ids[0], 3, '2026-03-10T08:00:00.000Z');
    log(db, userId, ids[1], 1, '2026-03-10T08:01:00.000Z');
    log(db, userId, ids[2], 4, '2026-03-10T08:02:00.000Z');
    log(db, userId, ids[3], 1, '2026-03-10T08:03:00.000Z', 0); // New-state review is excluded
    expect(userStats(db, userId, NOW).retention).toBeCloseTo(2 / 3, 5);
  });

  it('counts a streak of consecutive days ending today', () => {
    const { db, userId, ids } = fixture();
    log(db, userId, ids[0], 3, '2026-03-08T20:00:00.000Z');
    log(db, userId, ids[0], 3, '2026-03-09T20:00:00.000Z');
    log(db, userId, ids[0], 3, '2026-03-10T08:00:00.000Z');
    expect(userStats(db, userId, NOW).streak).toBe(3);
  });

  it('keeps the streak alive when today has no reviews yet but yesterday did', () => {
    const { db, userId, ids } = fixture();
    log(db, userId, ids[0], 3, '2026-03-08T20:00:00.000Z');
    log(db, userId, ids[0], 3, '2026-03-09T20:00:00.000Z');
    expect(userStats(db, userId, NOW).streak).toBe(2);
  });

  it('breaks the streak after a missed day', () => {
    const { db, userId, ids } = fixture();
    log(db, userId, ids[0], 3, '2026-03-06T20:00:00.000Z');
    log(db, userId, ids[0], 3, '2026-03-08T20:00:00.000Z');
    expect(userStats(db, userId, NOW).streak).toBe(0);
  });

  it('handles a streak spanning a month boundary', () => {
    const { db, userId, ids } = fixture();
    const feb = new Date('2026-03-01T09:00:00.000Z');
    log(db, userId, ids[0], 3, '2026-02-27T20:00:00.000Z');
    log(db, userId, ids[0], 3, '2026-02-28T20:00:00.000Z');
    log(db, userId, ids[0], 3, '2026-03-01T08:00:00.000Z');
    expect(userStats(db, userId, feb).streak).toBe(3);
  });

  it('counts cards due today and tomorrow', () => {
    const { db, userId, ids } = fixture();
    introduce(db, userId, ids[0], { due: '2026-03-10T06:00:00.000Z' }); // overdue
    introduce(db, userId, ids[1], { due: '2026-03-10T23:00:00.000Z' }); // later today
    introduce(db, userId, ids[2], { due: '2026-03-11T10:00:00.000Z' }); // tomorrow
    introduce(db, userId, ids[3], { due: '2026-03-20T10:00:00.000Z' }); // neither
    const stats = userStats(db, userId, NOW);
    expect(stats.dueToday).toBe(2);
    expect(stats.dueTomorrow).toBe(1);
  });

  it('buckets reviews by UTC day for the heatmap', () => {
    const { db, userId, ids } = fixture();
    log(db, userId, ids[0], 3, '2026-03-09T23:30:00.000Z');
    log(db, userId, ids[1], 3, '2026-03-10T00:30:00.000Z');
    log(db, userId, ids[2], 3, '2026-03-10T08:00:00.000Z');
    expect(userStats(db, userId, NOW).reviewsByDay).toEqual([
      { date: '2026-03-09', count: 1 },
      { date: '2026-03-10', count: 2 }
    ]);
  });

  it('never reviewed has a streak of zero, not a crash', () => {
    const { db, userId } = fixture();
    expect(userStats(db, userId, NOW).streak).toBe(0);
  });
});
