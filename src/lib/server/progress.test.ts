import { describe, it, expect } from 'vitest';
import { Rating } from 'ts-fsrs';
import { createTestDb } from './db/test-db';
import { chapters, units, cards, users, userCards } from './db/schema';
import { recordReview } from './queue';
import { chapterProgress } from './progress';

const NOW = new Date('2026-03-10T09:00:00.000Z');

function fixture() {
  const db = createTestDb();
  const [user] = db.insert(users).values({ username: 'u', passwordHash: 'x', createdAt: NOW.toISOString() }).returning().all();
  const [ch] = db.insert(chapters).values({ order: 1, title: 'Ch1', kind: 'kana' }).returning().all();
  const [u1] = db.insert(units).values({ chapterId: ch.id, order: 1, title: 'U1', kind: 'kana', dailyCap: 5 }).returning().all();
  const [u2] = db.insert(units).values({ chapterId: ch.id, order: 2, title: 'U2', kind: 'kana', dailyCap: 5 }).returning().all();
  const made: Record<number, number[]> = { [u1.id]: [], [u2.id]: [] };
  for (const unit of [u1, u2]) {
    for (let i = 1; i <= 2; i++) {
      const [card] = db.insert(cards).values({
        unitId: unit.id, order: i, frontJson: '{"char":"あ"}', backJson: '{"romaji":"a","mnemonic":"m"}'
      }).returning().all();
      made[unit.id].push(card.id);
    }
  }
  return { db, userId: user.id, ch, u1, u2, made };
}

describe('chapterProgress', () => {
  it('reports zero progress and marks the first unit current', () => {
    const { db, userId, u1, u2 } = fixture();
    const [chapter] = chapterProgress(db, userId);
    expect(chapter.total).toBe(4);
    expect(chapter.introduced).toBe(0);
    expect(chapter.units.map((u) => u.status)).toEqual(['current', 'locked']);
    expect(chapter.units.map((u) => u.id)).toEqual([u1.id, u2.id]);
    expect(chapter.units[0].total).toBe(2);
  });

  it('counts introduced cards', () => {
    const { db, userId, u1, made } = fixture();
    recordReview(db, userId, made[u1.id][0], Rating.Good, NOW);
    const [chapter] = chapterProgress(db, userId);
    expect(chapter.introduced).toBe(1);
    expect(chapter.units[0].introduced).toBe(1);
  });

  it('marks a fully introduced unit done and advances current', () => {
    const { db, userId, u1, made } = fixture();
    for (const id of made[u1.id]) recordReview(db, userId, id, Rating.Good, NOW);
    const [chapter] = chapterProgress(db, userId);
    expect(chapter.units.map((u) => u.status)).toEqual(['done', 'current']);
  });

  it('counts a card as mature only at stability >= 21 in Review state', () => {
    const { db, userId, u1, made } = fixture();
    recordReview(db, userId, made[u1.id][0], Rating.Easy, NOW);
    db.update(userCards).set({ state: 2, stability: 20.9 }).run();
    expect(chapterProgress(db, userId)[0].units[0].mature).toBe(0);
    db.update(userCards).set({ state: 2, stability: 21 }).run();
    expect(chapterProgress(db, userId)[0].units[0].mature).toBe(1);
    db.update(userCards).set({ state: 3, stability: 40 }).run();
    expect(chapterProgress(db, userId)[0].units[0].mature).toBe(0);
  });

  it('marks every unit done when the curriculum is finished', () => {
    const { db, userId, u1, u2, made } = fixture();
    for (const id of [...made[u1.id], ...made[u2.id]]) recordReview(db, userId, id, Rating.Good, NOW);
    const [chapter] = chapterProgress(db, userId);
    expect(chapter.units.map((u) => u.status)).toEqual(['done', 'done']);
  });
});
