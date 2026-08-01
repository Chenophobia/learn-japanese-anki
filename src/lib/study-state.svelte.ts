/**
 * Whether a rating POST is awaiting its response.
 *
 * Lives outside the study page because the *layout* owns the revalidation
 * listeners (staleness affects every page) while the study page owns the
 * submission. A `.svelte.ts` module is the narrowest way to share one
 * reactive boolean between them without threading it through props.
 */
export const rating = $state({ inFlight: false });
