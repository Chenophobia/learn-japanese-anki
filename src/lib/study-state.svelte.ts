/**
 * Cross-device revalidation needs to know two things about the in-progress
 * rating on this tab, neither of which the layout can observe on its own.
 *
 * Lives outside the study page because the *layout* owns the revalidation
 * listeners (staleness affects every page) while the study page owns both
 * flags: it sets `inFlight` around its own POST, and mirrors its local
 * `revealed` state onto `answerRevealed`. A `.svelte.ts` module is the
 * narrowest way to share reactive state between them without threading it
 * through props.
 *
 * - `inFlight`: a rating POST is currently awaiting its response.
 * - `answerRevealed`: the current card's answer is showing, unrated. A
 *   revalidation here would refetch the same card from the server and wipe
 *   the user's reveal — see `shouldRevalidate` for the full rationale.
 */
export const rating = $state({ inFlight: false, answerRevealed: false });
