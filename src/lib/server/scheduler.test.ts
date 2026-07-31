import { describe, it, expect } from 'vitest';
import { State, Rating } from 'ts-fsrs';
import { newUserCard, previewRatings, applyRating, formatInterval } from './scheduler';

const NOW = new Date('2026-01-01T09:00:00.000Z');

describe('newUserCard', () => {
  it('starts in the New state, due now, never reviewed', () => {
    const row = newUserCard(NOW);
    expect(row.state).toBe(State.New);
    expect(row.due).toBe(NOW.toISOString());
    expect(row.reps).toBe(0);
    expect(row.lapses).toBe(0);
    expect(row.lastReview).toBeNull();
  });
});

describe('previewRatings', () => {
  it('returns four options labelled Again through Easy', () => {
    const previews = previewRatings(newUserCard(NOW), NOW);
    expect(previews.map((p) => p.label)).toEqual(['Again', 'Hard', 'Good', 'Easy']);
    expect(previews.map((p) => p.rating)).toEqual([1, 2, 3, 4]);
  });

  it('gives every option a non-empty interval label', () => {
    for (const preview of previewRatings(newUserCard(NOW), NOW)) {
      expect(preview.interval).toMatch(/\S/);
    }
  });

  it('never schedules Easy sooner than Good', () => {
    let row = newUserCard(NOW);
    row = applyRating(row, Rating.Good, NOW).next;
    const later = new Date('2026-01-05T09:00:00.000Z');
    row = applyRating(row, Rating.Good, later).next;

    const much = new Date('2026-01-20T09:00:00.000Z');
    const good = applyRating(row, Rating.Good, much).next;
    const easy = applyRating(row, Rating.Easy, much).next;
    expect(new Date(easy.due).getTime()).toBeGreaterThan(new Date(good.due).getTime());
  });

  it('keeps the button ordering invariant hard <= good < easy across many card states', () => {
    // The library clamps so hard_interval <= good_interval < easy_interval. Verify it
    // holds for the four preview outcomes across a spread of card ages/states, since
    // fuzz makes any single check non-conclusive.
    const seeds = [
      NOW,
      new Date('2026-01-03T09:00:00.000Z'),
      new Date('2026-01-10T09:00:00.000Z'),
      new Date('2026-02-15T09:00:00.000Z'),
      new Date('2026-06-01T09:00:00.000Z')
    ];
    let row = newUserCard(NOW);
    for (const at of seeds) {
      const previews = previewRatings(row, at);
      const [, hard, good, easy] = previews;
      expect(hard.rating).toBe(Rating.Hard);
      expect(good.rating).toBe(Rating.Good);
      expect(easy.rating).toBe(Rating.Easy);

      const hardDue = applyRating(row, Rating.Hard, at).next.due;
      const goodDue = applyRating(row, Rating.Good, at).next.due;
      const easyDue = applyRating(row, Rating.Easy, at).next.due;
      expect(new Date(hardDue).getTime()).toBeLessThanOrEqual(new Date(goodDue).getTime());
      expect(new Date(goodDue).getTime()).toBeLessThan(new Date(easyDue).getTime());

      row = applyRating(row, Rating.Good, at).next;
    }
  });
});

describe('applyRating', () => {
  it('advances reps and stamps lastReview', () => {
    const { next } = applyRating(newUserCard(NOW), Rating.Good, NOW);
    expect(next.reps).toBe(1);
    expect(next.lastReview).toBe(NOW.toISOString());
    expect(next.state).not.toBe(State.New);
  });

  it('pushes the due date into the future', () => {
    const { next } = applyRating(newUserCard(NOW), Rating.Good, NOW);
    expect(new Date(next.due).getTime()).toBeGreaterThan(NOW.getTime());
  });

  it('counts a lapse when a Review-state card is rated Again', () => {
    let row = newUserCard(NOW);
    row = applyRating(row, Rating.Easy, NOW).next; // Easy graduates immediately
    expect(row.state).toBe(State.Review);
    const later = new Date('2026-02-01T09:00:00.000Z');
    const { next } = applyRating(row, Rating.Again, later);
    expect(next.lapses).toBe(1);
    expect(next.state).toBe(State.Relearning);
  });

  it('produces a log snapshotting the pre-review state', () => {
    const row = newUserCard(NOW);
    const { log } = applyRating(row, Rating.Good, NOW);
    expect(log.rating).toBe(Rating.Good);
    expect(log.reviewedAt).toBe(NOW.toISOString());
    expect(log.state).toBe(State.New);
  });

  it('round-trips through ISO strings without drift', () => {
    let row = newUserCard(NOW);
    for (const [i, rating] of [Rating.Good, Rating.Hard, Rating.Good, Rating.Easy].entries()) {
      const at = new Date(new Date(row.due).getTime() + i * 1000);
      row = applyRating(row, rating, at).next;
      expect(Number.isFinite(new Date(row.due).getTime())).toBe(true);
      expect(Number.isFinite(row.stability)).toBe(true);
      expect(Number.isFinite(row.difficulty)).toBe(true);
    }
  });
});

describe('formatInterval', () => {
  const from = new Date('2026-01-01T00:00:00.000Z');
  const plus = (ms: number) => new Date(from.getTime() + ms);

  it('formats minutes, hours, days, months and years', () => {
    expect(formatInterval(from, plus(30 * 1000))).toBe('<1m');
    expect(formatInterval(from, plus(10 * 60 * 1000))).toBe('10m');
    expect(formatInterval(from, plus(3 * 60 * 60 * 1000))).toBe('3h');
    expect(formatInterval(from, plus(5 * 24 * 60 * 60 * 1000))).toBe('5d');
    expect(formatInterval(from, plus(70 * 24 * 60 * 60 * 1000))).toBe('2.3mo');
    expect(formatInterval(from, plus(500 * 24 * 60 * 60 * 1000))).toBe('1.4y');
  });
});
