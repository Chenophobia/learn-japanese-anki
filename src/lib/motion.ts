/**
 * Duration for a JS-driven animation, honouring the reduced-motion setting.
 *
 * `app.css` already forces CSS transitions and animations to ~0 under
 * `prefers-reduced-motion: reduce`, so pure-CSS effects need nothing. Svelte's
 * JS transitions and tweens run their own timers and ignore that rule
 * entirely — they must ask here instead.
 *
 * Reduced motion means zero duration, never a disabled feature: the card
 * still flips, the number still reaches its new value, they just arrive
 * immediately.
 */
export function motionDuration(ms: number, reduced: boolean): number {
  return reduced ? 0 : ms;
}

/**
 * The viewer's reduced-motion preference. Returns false during SSR, where
 * there is no viewer to ask — components re-evaluate on the client.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
