import { describe, it, expect } from 'vitest';
import { Rating } from './scheduler';
import { createTestDb } from './db/test-db';
import { chapters, units, cards, users, userCards } from './db/schema';
import { currentUnitId, nextQueueItem, queueCounts, recordReview } from './queue';

const NOW = new Date('2026-03-10T09:00:00.000Z');

function fixture() {
  const db = createTestDb();
  const [user] = db.insert(users).values({ username: 'u', passwordHash: 'x', createdAt: NOW.toISOString() }).returning().all();

  const [ch1] = db.insert(chapters).values({ order: 1, title: 'Ch1', kind: 'kana' }).returning().all();
  const [ch2] = db.insert(chapters).values({ order: 2, title: 'Ch2', kind: 'kana' }).returning().all();
  const [u1] = db.insert(units).values({ chapterId: ch1.id, order: 1, title: 'U1', kind: 'kana', dailyCap: 2 }).returning().all();
  const [u2] = db.insert(units).values({ chapterId: ch1.id, order: 2, title: 'U2', kind: 'kana', dailyCap: 2 }).returning().all();
  const [u3] = db.insert(units).values({ chapterId: ch2.id, order: 1, title: 'U3', kind: 'kana', dailyCap: 2 }).returning().all();

  const made: Record<number, number[]> = { [u1.id]: [], [u2.id]: [], [u3.id]: [] };
  for (const unit of [u1, u2, u3]) {
    for (let i = 1; i <= 3; i++) {
      const [card] = db.insert(cards).values({
        unitId: unit.id, order: i,
        frontJson: JSON.stringify({ char: `${unit.title}-${i}` }),
        backJson: JSON.stringify({ romaji: 'x', mnemonic: 'y' })
      }).returning().all();
      made[unit.id].push(card.id);
    }
  }
  return { db, userId: user.id, u1, u2, u3, made };
}

describe('currentUnitId', () => {
  it('is the first unit when nothing is introduced', () => {
    const { db, userId, u1 } = fixture();
    expect(currentUnitId(db, userId)).toBe(u1.id);
  });

  it('advances only once every card in a unit is introduced', () => {
    const { db, userId, u1, u2, made } = fixture();
    recordReview(db, userId, made[u1.id][0], Rating.Good, NOW);
    recordReview(db, userId, made[u1.id][1], Rating.Good, NOW);
    expect(currentUnitId(db, userId)).toBe(u1.id);
    recordReview(db, userId, made[u1.id][2], Rating.Again, NOW);
    expect(currentUnitId(db, userId)).toBe(u2.id);
  });

  it('crosses chapter boundaries in global order', () => {
    const { db, userId, u1, u2, u3, made } = fixture();
    for (const id of [...made[u1.id], ...made[u2.id]]) recordReview(db, userId, id, Rating.Good, NOW);
    expect(currentUnitId(db, userId)).toBe(u3.id);
  });

  it('is null when the curriculum is exhausted', () => {
    const { db, userId, u1, u2, u3, made } = fixture();
    for (const id of [...made[u1.id], ...made[u2.id], ...made[u3.id]]) recordReview(db, userId, id, Rating.Good, NOW);
    expect(currentUnitId(db, userId)).toBeNull();
  });
});

describe('queueCounts', () => {
  it('offers new cards up to the unit daily cap', () => {
    const { db, userId } = fixture();
    expect(queueCounts(db, userId, NOW).newAvailable).toBe(2);
  });

  it('decrements the cap as cards are introduced today', () => {
    const { db, userId, u1, made } = fixture();
    recordReview(db, userId, made[u1.id][0], Rating.Good, NOW);
    expect(queueCounts(db, userId, NOW).newAvailable).toBe(1);
    recordReview(db, userId, made[u1.id][1], Rating.Good, NOW);
    expect(queueCounts(db, userId, NOW).newAvailable).toBe(0);
  });

  it('resets the cap the next day', () => {
    const { db, userId, u1, made } = fixture();
    recordReview(db, userId, made[u1.id][0], Rating.Good, NOW);
    recordReview(db, userId, made[u1.id][1], Rating.Good, NOW);
    const tomorrow = new Date('2026-03-11T09:00:00.000Z');
    expect(queueCounts(db, userId, tomorrow).newAvailable).toBe(1); // only 1 card left in u1
  });

  it('counts due reviews across every introduced unit', () => {
    const { db, userId, u1, u2, made } = fixture();
    recordReview(db, userId, made[u1.id][0], Rating.Again, NOW);
    recordReview(db, userId, made[u2.id][0], Rating.Again, NOW);
    const later = new Date('2026-03-11T09:00:00.000Z');
    expect(queueCounts(db, userId, later).due).toBe(2);
  });
});

describe('nextQueueItem', () => {
  it('serves a due review before a new card', () => {
    const { db, userId, u1, made } = fixture();
    recordReview(db, userId, made[u1.id][0], Rating.Again, NOW);
    const later = new Date('2026-03-11T09:00:00.000Z');
    const item = nextQueueItem(db, userId, later);
    expect(item?.cardId).toBe(made[u1.id][0]);
    expect(item?.isNew).toBe(false);
  });

  it('serves new cards in card order when nothing is due', () => {
    const { db, userId, u1, made } = fixture();
    const item = nextQueueItem(db, userId, NOW);
    expect(item?.cardId).toBe(made[u1.id][0]);
    expect(item?.isNew).toBe(true);
    expect(item?.unitKind).toBe('kana');
  });

  it('returns null when the cap is spent and nothing is due', () => {
    const { db, userId, u1, made } = fixture();
    recordReview(db, userId, made[u1.id][0], Rating.Easy, NOW);
    recordReview(db, userId, made[u1.id][1], Rating.Easy, NOW);
    expect(nextQueueItem(db, userId, NOW)).toBeNull();
  });

  it('never pulls a new card from a later unit', () => {
    const { db, userId, u1, u2, made } = fixture();
    for (const id of made[u1.id]) recordReview(db, userId, id, Rating.Easy, NOW);
    const item = nextQueueItem(db, userId, NOW);
    expect(item === null || made[u2.id].includes(item.cardId)).toBe(true);
  });

  it('surfaces a due review from an earlier unit while the current unit is in a later chapter', () => {
    const { db, userId, u1, u2, u3, made } = fixture();
    // Lapse the first card of u1 so it comes due again soon.
    recordReview(db, userId, made[u1.id][0], Rating.Again, NOW);
    // Finish introducing the rest of u1 and all of u2 so the current unit advances to u3.
    recordReview(db, userId, made[u1.id][1], Rating.Easy, NOW);
    recordReview(db, userId, made[u1.id][2], Rating.Easy, NOW);
    for (const id of made[u2.id]) recordReview(db, userId, id, Rating.Easy, NOW);
    expect(currentUnitId(db, userId)).toBe(u3.id);

    const later = new Date('2026-03-11T09:00:00.000Z');
    const item = nextQueueItem(db, userId, later);
    expect(item?.cardId).toBe(made[u1.id][0]);
    expect(item?.unitId).toBe(u1.id);
    expect(item?.isNew).toBe(false);
  });
});

describe('recordReview', () => {
  it('creates a user_cards row on first review and updates it on the second', () => {
    const { db, userId, u1, made } = fixture();
    recordReview(db, userId, made[u1.id][0], Rating.Good, NOW);
    const [first] = db.select().from(userCards).all();
    expect(first.reps).toBe(1);

    const later = new Date('2026-03-12T09:00:00.000Z');
    recordReview(db, userId, made[u1.id][0], Rating.Good, later);
    const rows = db.select().from(userCards).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].reps).toBe(2);
  });
});
