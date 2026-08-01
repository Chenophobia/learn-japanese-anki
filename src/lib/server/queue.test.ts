import { describe, it, expect } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { Rating } from './scheduler';
import { createTestDb } from './db/test-db';
import { chapters, units, cards, users, userCards } from './db/schema';
import { currentUnitId, nextDueTime, nextQueueItem, queueCounts, recordReview } from './queue';

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

describe('daily cap composes across unit boundaries', () => {
  // A dedicated fixture whose units are exactly `dailyCap`-sized, so a unit
  // can become fully introduced through the real serving path (nextQueueItem
  // + recordReview) in a single UTC day, the same way a real user would hit
  // it — unlike the shared `fixture()` above, whose 3-card units can't be
  // finished in one day at cap 2 without bypassing the cap.
  function twoCardUnitsFixture(dailyCaps: [number, number] = [2, 2]) {
    const db = createTestDb();
    const [user] = db.insert(users).values({ username: 'u2', passwordHash: 'x', createdAt: NOW.toISOString() }).returning().all();
    const [ch] = db.insert(chapters).values({ order: 1, title: 'Ch', kind: 'kana' }).returning().all();
    const [u1] = db
      .insert(units)
      .values({ chapterId: ch.id, order: 1, title: 'U1', kind: 'kana', dailyCap: dailyCaps[0] })
      .returning()
      .all();
    const [u2] = db
      .insert(units)
      .values({ chapterId: ch.id, order: 2, title: 'U2', kind: 'kana', dailyCap: dailyCaps[1] })
      .returning()
      .all();

    const made: Record<number, number[]> = { [u1.id]: [], [u2.id]: [] };
    for (const unit of [u1, u2]) {
      for (let i = 1; i <= 2; i++) {
        const [card] = db.insert(cards).values({
          unitId: unit.id, order: i,
          frontJson: JSON.stringify({ char: `${unit.title}-${i}` }),
          backJson: JSON.stringify({ romaji: 'x', mnemonic: 'y' })
        }).returning().all();
        made[unit.id].push(card.id);
      }
    }
    return { db, userId: user.id, u1, u2, made };
  }

  it('does not grant a fresh allowance when the current unit finishes mid-day', () => {
    const { db, userId, u1, u2 } = twoCardUnitsFixture([2, 2]);

    // Introduce u1's 2 cards — its full card count and its full daily cap —
    // through the real serving path, exactly as a user would in one sitting.
    // Rating Easy (not Good) so each card graduates straight to a multi-day
    // Review interval rather than a short learning step — otherwise it would
    // come due again within 24h and confound the "resets tomorrow" check
    // below with a review-takes-priority-over-new artifact unrelated to the
    // cap composition this test is pinning.
    for (let i = 0; i < 2; i++) {
      const item = nextQueueItem(db, userId, NOW);
      expect(item?.unitId).toBe(u1.id);
      expect(item?.isNew).toBe(true);
      recordReview(db, userId, item!.cardId, Rating.Easy, NOW);
    }

    // u1 is now fully introduced, so the current unit rolls to u2 mid-session.
    expect(currentUnitId(db, userId)).toBe(u2.id);

    // The 2 cards already introduced today must count against u2's cap too:
    // no further new cards until the next UTC day, even though u2 itself
    // has never had a card introduced from it yet.
    expect(queueCounts(db, userId, NOW).newAvailable).toBe(0);
    expect(nextQueueItem(db, userId, NOW)).toBeNull();

    // The cap resets the next UTC day.
    const tomorrow = new Date('2026-03-11T09:00:00.000Z');
    expect(queueCounts(db, userId, tomorrow).newAvailable).toBe(2);
    const tomorrowItem = nextQueueItem(db, userId, tomorrow);
    expect(tomorrowItem?.unitId).toBe(u2.id);
    expect(tomorrowItem?.isNew).toBe(true);
  });

  it('floors newAvailable at zero when rolling into a unit with a smaller cap than already spent', () => {
    const { db, userId, u1, u2, made } = twoCardUnitsFixture([2, 1]);

    // Introduce both of u1's cards today (fully spends u1's cap of 2).
    recordReview(db, userId, made[u1.id][0], Rating.Good, NOW);
    recordReview(db, userId, made[u1.id][1], Rating.Good, NOW);
    expect(currentUnitId(db, userId)).toBe(u2.id);

    // u2's cap is only 1 — smaller than what's already been introduced
    // today (2). The composed count must floor at zero, not go negative and
    // invert into extra cards via Math.min.
    expect(queueCounts(db, userId, NOW).newAvailable).toBe(0);
    expect(nextQueueItem(db, userId, NOW)).toBeNull();
  });
});

describe('nextDueTime', () => {
  it('is null when nothing has been introduced', () => {
    const { db, userId } = fixture();
    expect(nextDueTime(db, userId, NOW)).toBeNull();
  });

  it('finds the earliest future due time across every unit', () => {
    const { db, userId, u1, u2, made } = fixture();
    // A short learning-step lapse on u1 comes due in 10 minutes.
    recordReview(db, userId, made[u1.id][0], Rating.Again, NOW);
    // A longer-interval review on u2 comes due much later.
    recordReview(db, userId, made[u2.id][0], Rating.Easy, NOW);

    const next = nextDueTime(db, userId, NOW);
    expect(next).not.toBeNull();
    expect(next!.getTime()).toBeGreaterThan(NOW.getTime());

    // It's the earlier of the two, not just whichever unit is scanned first.
    const [row] = db.select().from(userCards).where(and(eq(userCards.userId, userId), eq(userCards.cardId, made[u1.id][0]))).all();
    expect(next!.toISOString()).toBe(row.due);
  });

  it('ignores cards already due (nextQueueItem would serve those instead)', () => {
    const { db, userId, u1, made } = fixture();
    recordReview(db, userId, made[u1.id][0], Rating.Again, NOW);
    const later = new Date('2026-03-11T09:00:00.000Z'); // past the 10-minute lapse due time
    expect(nextDueTime(db, userId, later)).toBeNull();
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
