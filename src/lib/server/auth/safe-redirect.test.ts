import { describe, it, expect } from 'vitest';
import { safeNextPath } from './safe-redirect';

describe('safeNextPath', () => {
  it('honours a plain same-origin path', () => {
    expect(safeNextPath('/stats')).toBe('/stats');
  });

  it('falls back to / for a missing next', () => {
    expect(safeNextPath(null)).toBe('/');
    expect(safeNextPath(undefined)).toBe('/');
    expect(safeNextPath('')).toBe('/');
  });

  it('falls back to / for a protocol-relative URL', () => {
    expect(safeNextPath('//evil.com')).toBe('/');
    expect(safeNextPath('//evil.com/phish')).toBe('/');
  });

  it('falls back to / for a backslash-leading variant', () => {
    expect(safeNextPath('/\\evil.com')).toBe('/');
  });

  it('falls back to / for an absolute URL', () => {
    expect(safeNextPath('https://evil.com')).toBe('/');
  });

  it('falls back to / for a path that does not start with a slash', () => {
    expect(safeNextPath('evil.com')).toBe('/');
  });
});
