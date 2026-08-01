import { describe, it, expect } from 'vitest';
import { shouldRevalidate } from './revalidate';

const input = (over: Partial<Parameters<typeof shouldRevalidate>[0]> = {}) => ({
  restoredFromBfcache: false,
  wasHidden: false,
  ratingInFlight: false,
  ...over
});

describe('shouldRevalidate', () => {
  it('revalidates a tab restored from the back/forward cache', () => {
    // Safari on iOS reinstates the DOM without re-running load, so the page
    // shows whatever card was current when it was last foregrounded.
    expect(shouldRevalidate(input({ restoredFromBfcache: true }))).toBe(true);
  });

  it('revalidates a tab that was hidden and came back', () => {
    expect(shouldRevalidate(input({ wasHidden: true }))).toBe(true);
  });

  it('does nothing when the tab was never hidden', () => {
    // visibilitychange also fires for reasons that do not imply staleness.
    // Revalidating on those would refetch every load on an idle page.
    expect(shouldRevalidate(input())).toBe(false);
  });

  it('never revalidates while a rating is in flight', () => {
    // The rating's own handler calls update()/invalidateAll() when it
    // resolves. A second concurrent load would race it, and the loser's
    // result decides which card is displayed.
    expect(shouldRevalidate(input({ restoredFromBfcache: true, ratingInFlight: true }))).toBe(false);
    expect(shouldRevalidate(input({ wasHidden: true, ratingInFlight: true }))).toBe(false);
  });
});
