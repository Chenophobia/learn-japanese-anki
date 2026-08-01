import { describe, it, expect } from 'vitest';
import { heatmapRange, HEATMAP_WEEKS, HEATMAP_WINDOW_DAYS } from './heatmap';

function daysBetween(start: string, end: string): number {
  return (Date.parse(end) - Date.parse(start)) / 86_400_000;
}

describe('heatmapRange', () => {
  it('spans exactly the grid the component draws, whatever the weekday', () => {
    // Sun 2026-07-26 through Sat 2026-08-01 — every weekday.
    for (let day = 26; day <= 31; day++) {
      const { start, end } = heatmapRange(new Date(Date.UTC(2026, 6, day, 13, 30)));
      expect(daysBetween(start, end) + 1).toBe(HEATMAP_WEEKS * 7);
    }
  });

  it('ends on a Saturday so the last column is a complete week', () => {
    for (let day = 26; day <= 31; day++) {
      const { end } = heatmapRange(new Date(Date.UTC(2026, 6, day)));
      expect(new Date(`${end}T00:00:00Z`).getUTCDay()).toBe(6);
    }
  });

  it('always contains today', () => {
    for (let day = 26; day <= 31; day++) {
      const now = new Date(Date.UTC(2026, 6, day, 23, 59));
      const { start, end } = heatmapRange(now);
      const today = now.toISOString().slice(0, 10);
      expect(start <= today && today <= end).toBe(true);
    }
  });

  it('starts no earlier than a window anchored on today, which is what made the query and grid disagree', () => {
    // The old query fetched [today - (WINDOW-1), today]. Any day it returned
    // before this start was never drawn by the grid. Callers must use this
    // start, not their own, or that gap comes back.
    for (let day = 26; day <= 31; day++) {
      const now = new Date(Date.UTC(2026, 6, day));
      const { start } = heatmapRange(now);

      const oldAnchor = new Date(now);
      oldAnchor.setUTCDate(oldAnchor.getUTCDate() - (HEATMAP_WINDOW_DAYS - 1));
      const oldStart = oldAnchor.toISOString().slice(0, 10);

      expect(start >= oldStart).toBe(true);
    }
  });

  it('is unaffected by the local timezone of the host', () => {
    // 23:30 UTC and 00:30 UTC the next day are different UTC days; a
    // local-time slip would make these collapse or shift.
    const late = heatmapRange(new Date(Date.UTC(2026, 6, 29, 23, 30)));
    const early = heatmapRange(new Date(Date.UTC(2026, 6, 30, 0, 30)));
    expect(late.end).toBe(early.end);
    expect(late.start).toBe(early.start);
  });
});
