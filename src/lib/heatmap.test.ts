import { describe, it, expect } from 'vitest';
import {
  heatmapRange,
  monthLabelColumns,
  HEATMAP_WEEKS,
  HEATMAP_WINDOW_DAYS,
  MIN_LABEL_COLUMNS
} from './heatmap';

/** The month index of each week-column's Sunday, for a grid ending at `end`. */
function monthsForGrid(end: Date): number[] {
  return Array.from({ length: HEATMAP_WEEKS }, (_, w) => {
    const date = new Date(end);
    date.setUTCDate(date.getUTCDate() - ((HEATMAP_WEEKS - 1 - w) * 7 + 6));
    return date.getUTCMonth();
  });
}

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

  it('never labels two columns closer together than a label is wide', () => {
    // Every possible grid end date across a leap year and a normal one, so
    // this covers whatever weekday and month boundary the grid opens on.
    for (const year of [2024, 2026]) {
      for (let day = 0; day < 366; day++) {
        const end = new Date(Date.UTC(year, 0, 1 + day));
        const labelled = monthLabelColumns(monthsForGrid(end));

        const columns = labelled.flatMap((show, i) => (show ? [i] : []));
        for (let i = 1; i < columns.length; i++) {
          expect(columns[i] - columns[i - 1]).toBeGreaterThanOrEqual(MIN_LABEL_COLUMNS);
        }
      }
    }
  });

  it('leaves room after the last label so it cannot overflow the right edge', () => {
    for (let day = 0; day < 366; day++) {
      const end = new Date(Date.UTC(2026, 0, 1 + day));
      const labelled = monthLabelColumns(monthsForGrid(end));

      const last = labelled.lastIndexOf(true);
      expect(HEATMAP_WEEKS - last).toBeGreaterThanOrEqual(MIN_LABEL_COLUMNS);
    }
  });

  it('still labels most of the year — the spacing rule must not swallow months', () => {
    for (let day = 0; day < 366; day += 29) {
      const end = new Date(Date.UTC(2026, 0, 1 + day));
      const shown = monthLabelColumns(monthsForGrid(end)).filter(Boolean).length;
      // 53 weeks spans 12 or 13 month starts; dropping the crowded first or
      // last one should still leave at least 11.
      expect(shown).toBeGreaterThanOrEqual(11);
    }
  });

  it('drops the leading partial month that used to collide with the next one', () => {
    // A grid whose first column is the tail of a month, with the next month
    // starting only one column later — the "Jul"/"Aug" case.
    const months = [6, 7, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 9];
    const labelled = monthLabelColumns(months);

    expect(labelled[0]).toBe(false);
    expect(labelled[1]).toBe(true);
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
