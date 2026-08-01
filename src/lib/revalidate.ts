export type RevalidateInput = {
  /** The `persisted` flag from a `pageshow` event — a bfcache restore. */
  restoredFromBfcache: boolean;
  /** The document was hidden at some point since the last revalidation. */
  wasHidden: boolean;
  /** A rating POST is currently awaiting its response. */
  ratingInFlight: boolean;
  /** The study page's current card has its answer showing, unrated. */
  answerRevealed: boolean;
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
  ratingInFlight,
  answerRevealed
}: RevalidateInput): boolean {
  if (ratingInFlight) return false;
  // If the answer is revealed but unrated, the server would serve back the
  // very same card — revalidating here only destroys the user's reading
  // position and gains nothing. The one thing it costs is revealing here
  // *and* rating that same card on another device before returning to this
  // one; that's rare, and self-corrects on this tab's next rating (which
  // does its own invalidateAll).
  if (answerRevealed) return false;
  return restoredFromBfcache || wasHidden;
}
