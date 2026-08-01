import { db } from '$lib/server/db';
import { chapterProgress } from '$lib/server/progress';
import { queueCounts } from '$lib/server/queue';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
  const userId = locals.user!.id; // hooks.server.ts guarantees a user on this route
  // Per-user content behind a session cookie: never store it. Without this
  // there is no explicit directive at all, which leaves staleness to
  // heuristics.
  setHeaders({ 'cache-control': 'no-store' });
  return {
    chapters: chapterProgress(db, userId),
    counts: queueCounts(db, userId)
  };
};
