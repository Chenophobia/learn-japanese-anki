import { describe, it, expect } from 'vitest';
import { motionDuration } from './motion';

describe('motionDuration', () => {
  it('passes the duration through when motion is welcome', () => {
    expect(motionDuration(250, false)).toBe(250);
  });

  it('collapses to zero under reduced motion', () => {
    // Zero, not "a bit shorter": the effect must vanish, while whatever it
    // was animating stays fully functional.
    expect(motionDuration(250, true)).toBe(0);
  });

  it('collapses every duration, including long ones', () => {
    expect(motionDuration(2000, true)).toBe(0);
  });
});
