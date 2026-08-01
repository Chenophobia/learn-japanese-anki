import { describe, it, expect } from 'vitest';
import { safeNextPath } from './safe-redirect';

describe('safeNextPath', () => {
  it('honours a plain same-origin path', () => {
    expect(safeNextPath('/stats')).toBe('/stats');
  });

  it('honours a path with a query string and fragment', () => {
    expect(safeNextPath('/stats?range=30#top')).toBe('/stats?range=30#top');
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

  it('falls back to / for a percent-encoded protocol-relative URL once decoded', () => {
    // url.searchParams.get() already percent-decodes, so a `next=%2F%2Fevil.com`
    // query param arrives here as the literal string "//evil.com".
    expect(safeNextPath('//evil.com')).toBe('/');
  });

  it('falls back to / for a backslash-leading variant', () => {
    expect(safeNextPath('/\\evil.com')).toBe('/');
  });

  it('falls back to / for a bare backslash-leading value with no leading slash', () => {
    expect(safeNextPath('\\\\evil.com')).toBe('/');
  });

  it('falls back to / for an absolute URL', () => {
    expect(safeNextPath('https://evil.com')).toBe('/');
  });

  it('falls back to / for a path that does not start with a slash', () => {
    expect(safeNextPath('evil.com')).toBe('/');
  });

  it('falls back to / for a value containing a control character that a browser would strip', () => {
    // Browsers strip ASCII tab/LF/CR from a URL wherever they occur before
    // parsing it, so these all resolve to "//evil.com" client-side despite
    // passing the plain startsWith('/') / startsWith('//') checks here.
    expect(safeNextPath('/\t/evil.com')).toBe('/');
    expect(safeNextPath('/\n/evil.com')).toBe('/');
    expect(safeNextPath('/\r/evil.com')).toBe('/');
    expect(safeNextPath('/stats\t/evil.com')).toBe('/');
  });
});
