import { describe, it, expect } from 'vitest';
import { utcDayStart } from './utc-day';

describe('utcDayStart', () => {
  it('truncates to midnight UTC', () => {
    expect(utcDayStart(new Date('2026-03-10T09:15:30.123Z')).toISOString()).toBe(
      '2026-03-10T00:00:00.000Z'
    );
  });

  it('is a fixed point at exactly midnight', () => {
    expect(utcDayStart(new Date('2026-03-10T00:00:00.000Z')).toISOString()).toBe(
      '2026-03-10T00:00:00.000Z'
    );
  });

  it('keeps 23:59:59.999 on the same day', () => {
    expect(utcDayStart(new Date('2026-03-10T23:59:59.999Z')).toISOString()).toBe(
      '2026-03-10T00:00:00.000Z'
    );
  });

  it('shifts forward across a month boundary', () => {
    expect(utcDayStart(new Date('2026-01-31T12:00:00.000Z'), 1).toISOString()).toBe(
      '2026-02-01T00:00:00.000Z'
    );
  });

  it('shifts backward across a year boundary', () => {
    expect(utcDayStart(new Date('2026-01-01T05:00:00.000Z'), -1).toISOString()).toBe(
      '2025-12-31T00:00:00.000Z'
    );
  });

  it('handles leap-day arithmetic', () => {
    expect(utcDayStart(new Date('2028-02-28T22:00:00.000Z'), 1).toISOString()).toBe(
      '2028-02-29T00:00:00.000Z'
    );
  });
});
