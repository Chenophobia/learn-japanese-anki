export type RevalidateInput = {
  /** The `persisted` flag from a `pageshow` event — a bfcache restore. */
  restoredFromBfcache: boolean;
  /** The document was hidden at some point since the last revalidation. */
  wasHidden: boolean;
  /** A rating POST is currently awaiting its response. */
  ratingInFlight: boolean;
};

/**
 * Whether a client-side revalidation (invalidateAll) is warranted.
 *
 * Extracted as a pure function because the two events that drive it —
 * bfcache restore and visibilitychange — cannot be exercised without a real
 * browser, and none is available in this environment. The decision is tested
 * here; the event wiring is verified by hand on the iPad.
 */
export function shouldRevalidate({
  restoredFromBfcache,
  wasHidden,
  ratingInFlight
}: RevalidateInput): boolean {
  if (ratingInFlight) return false;
  return restoredFromBfcache || wasHidden;
}
