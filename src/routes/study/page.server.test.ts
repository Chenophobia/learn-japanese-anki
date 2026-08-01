import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { Rating } from '$lib/server/scheduler';

// The route module reads the app-wide db singleton at import time; swap it
// for an in-memory database so load/actions run against real queries.
vi.mock('$lib/server/db', async () => {
  const { createTestDb } = await import('../../lib/server/db/test-db');
  return { db: createTestDb() };
});

import { db } from '$lib/server/db';
import {
  chapters,
  units,
  cards,
  users,
  sessions,
  userCards,
  reviewLogs
} from '$lib/server/db/schema';
import { recordReview } from '$lib/server/queue';
import { load, actions } from './+page.server';

// load() and the rate action both call `new Date()` internally; pin the clock
// so "due later today" / "due tomorrow" assertions can't drift with wall time.
const NOW = new Date('2026-03-10T09:00:00.000Z');

function fixture(dailyCap = 2) {
  const [user] = db
    .insert(users)
    .values({ username: 'u', passwordHash: 'x', createdAt: NOW.toISOString() })
    .returning()
    .all();
  const [ch] = db
    .insert(chapters)
    .values({ order: 1, title: 'Ch1', kind: 'kana' })
    .returning()
    .all();
  const [unit] = db
    .insert(units)
    .values({ chapterId: ch.id, order: 1, title: 'U1', kind: 'kana', dailyCap })
    .returning()
    .all();
  const cardIds: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const [card] = db
      .insert(cards)
      .values({
        unitId: unit.id,
        order: i,
        frontJson: JSON.stringify({ char: `か${i}` }),
        backJson: JSON.stringify({ romaji: `ka${i}`, mnemonic: 'm' })
      })
      .returning()
      .all();
    cardIds.push(card.id);
  }
  return { userId: user.id, cardIds };
}

// The generated PageServerLoad signature admits `void`, but this load always
// returns data; narrow once here so assertions can dot into the result.
type LoadResult = Exclude<Awaited<ReturnType<typeof load>>, void>;
async function runLoad(event: Parameters<typeof load>[0]): Promise<LoadResult> {
  return (await load(event)) as LoadResult;
}

function loadEvent(userId: number) {
  const headers: Record<string, string> = {};
  const event = {
    locals: { user: { id: userId, username: 'u' }, theme: 'light' },
    setHeaders: (h: Record<string, string>) => Object.assign(headers, h)
  };
  return { event: event as unknown as Parameters<typeof load>[0], headers };
}

function rateEvent(userId: number, fields: Record<string, string>) {
  const request = new Request('http://localhost/study?/rate', {
    method: 'POST',
    body: new URLSearchParams(fields)
  });
  return {
    request,
    locals: { user: { id: userId, username: 'u' }, theme: 'light' }
  } as unknown as RequestEvent & Parameters<typeof actions.rate>[0];
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  for (const table of [reviewLogs, userCards, sessions, users, cards, units, chapters]) {
    db.delete(table).run();
  }
});

afterEach(() => {
  vi.useRealTimers();
});

describe('load', () => {
  it('serves the next card with parsed faces and four rating previews', async () => {
    const { userId, cardIds } = fixture();
    const { event, headers } = loadEvent(userId);
    const data = await runLoad(event);
    expect(headers['cache-control']).toBe('no-store');
    expect(data.item).not.toBeNull();
    expect(data.item!.cardId).toBe(cardIds[0]);
    expect(data.item!.isNew).toBe(true);
    expect(data.item!.front).toEqual({ char: 'か1' });
    expect(data.item!.back).toEqual({ romaji: 'ka1', mnemonic: 'm' });
    expect(data.item!.previews.map((p: { rating: number }) => p.rating)).toEqual([1, 2, 3, 4]);
  });

  it('reports cards coming back later today once the new-card cap is spent', async () => {
    const { userId, cardIds } = fixture();
    // Introduce today's two allowed new cards; Again puts them on a short
    // learning step, so they are not due at NOW but will be later today.
    recordReview(db, userId, cardIds[0], Rating.Again, NOW);
    recordReview(db, userId, cardIds[1], Rating.Again, NOW);
    const { event } = loadEvent(userId);
    const data = await runLoad(event);
    expect(data.item).toBeNull();
    expect(data.curriculumFinished).toBe(false);
    expect(data.laterToday).not.toBeNull();
    expect(new Date(data.laterToday!).getTime()).toBeGreaterThan(NOW.getTime());
  });

  it('flags a finished curriculum distinctly from an empty day', async () => {
    const { userId, cardIds } = fixture(3);
    for (const id of cardIds) recordReview(db, userId, id, Rating.Easy, NOW);
    const { event } = loadEvent(userId);
    const data = await runLoad(event);
    expect(data.item).toBeNull();
    expect(data.curriculumFinished).toBe(true);
  });
});

describe('rate action', () => {
  it('rejects a non-integer cardId', async () => {
    const { userId } = fixture();
    const result = await actions.rate(rateEvent(userId, { cardId: 'abc', rating: '3' }));
    expect(result).toMatchObject({ status: 400 });
  });

  it('rejects a rating outside 1-4', async () => {
    const { userId, cardIds } = fixture();
    const result = await actions.rate(
      rateEvent(userId, { cardId: String(cardIds[0]), rating: '5' })
    );
    expect(result).toMatchObject({ status: 400 });
  });

  it('rejects a stale card with 409 instead of rating the wrong card', async () => {
    const { userId, cardIds } = fixture();
    // The queue would serve cardIds[0]; a stale form posts cardIds[1].
    const result = await actions.rate(
      rateEvent(userId, { cardId: String(cardIds[1]), rating: '3' })
    );
    expect(result).toMatchObject({ status: 409 });
    expect(db.select().from(userCards).all()).toHaveLength(0);
  });

  it('records a review for the card the queue is actually serving', async () => {
    const { userId, cardIds } = fixture();
    const result = await actions.rate(
      rateEvent(userId, { cardId: String(cardIds[0]), rating: '3' })
    );
    expect(result).toEqual({ ok: true });
    const rows = db.select().from(userCards).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].cardId).toBe(cardIds[0]);
  });
});
