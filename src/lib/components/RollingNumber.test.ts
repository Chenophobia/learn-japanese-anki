import { describe, it, expect } from 'vitest';
import { Tween } from 'svelte/motion';
import { cubicOut } from 'svelte/easing';
import { motionDuration } from '$lib/motion';

/**
 * RollingNumber.svelte itself cannot be mounted here: `vitest.config.ts` runs
 * this suite under `environment: 'node'` (no DOM), and this task may not add
 * a new dependency (jsdom/happy-dom) to change that. So instead of importing
 * the component, these tests exercise the exact production pieces it wires
 * together — the real `Tween` class from `svelte/motion` and the real
 * `motionDuration` helper from `$lib/motion` — under `duration: 0`, which is
 * what `motionDuration(500, true)` (a reduced-motion viewer) produces.
 *
 * That is not a workaround limited to the reduced-motion case: Tween's
 * internal animation loop only advances via `requestAnimationFrame`, which
 * doesn't exist outside a browser, so under Vitest's node environment a
 * `duration > 0` tween never progresses at all (verified by hand: `.current`
 * stays at its initial value forever, no matter how long you wait). The
 * `duration: 0` branch is a real, synchronous, unmocked code path through the
 * same `Tween` class RollingNumber uses — it is just the only one this suite
 * can drive to completion. It directly covers the property that matters most:
 * whatever the counter's target does, `Math.round(tween.current)` must reach
 * exactly that integer, never a stale or interpolated one.
 */

describe('RollingNumber settling contract (via real Tween + motionDuration)', () => {
  it('settles synchronously and exactly under reduced motion', () => {
    const tween = new Tween(3, { duration: motionDuration(500, true), easing: cubicOut });

    tween.set(11);

    expect(Math.round(tween.current)).toBe(11);
    // duration 0 means no fractional step is even possible.
    expect(tween.current).toBe(11);
  });

  it('always lands on the true value after rapid successive ratings, never a stale one', () => {
    const tween = new Tween(0, { duration: motionDuration(500, true), easing: cubicOut });

    // Simulate rating several cards back-to-back, faster than any animation
    // could settle — each set() must still land exactly, immediately.
    for (const next of [5, 4, 6, 3, 3, 2, 0, 7]) {
      tween.set(next);
      expect(Math.round(tween.current)).toBe(next);
    }
  });
});

/**
 * Pure fallback per the task brief: verifies the mathematical property that
 * makes `Math.round(tween.current)` a safe choice for a fractional,
 * mid-flight tween value — it always recovers the nearest integer, including
 * through the kind of floating-point fuzz repeated interpolation can produce
 * (e.g. 2.999999999999998 instead of a clean 3). This does not import or
 * exercise our source (there is nothing of ours to mutate here); it
 * documents why `Math.round`, not `Math.trunc`/`Math.floor`/`| 0`, is the
 * correct operation in RollingNumber's `shown` derivation.
 */
describe('rounding contract: Math.round always recovers the true integer from float fuzz', () => {
  it.each([
    [2.999999999999998, 3],
    [3.0000000000000004, 3],
    [0.49999999999999994, 0],
    [6.999999999999999, 7],
    [0, 0],
    [12, 12]
  ])('rounds %f to %i', (fractional, expected) => {
    expect(Math.round(fractional)).toBe(expected);
  });
});
