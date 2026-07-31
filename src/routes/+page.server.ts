import { db } from '$lib/server/db';
import { chapterProgress } from '$lib/server/progress';
import { queueCounts } from '$lib/server/queue';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const userId = locals.user!.id; // hooks.server.ts guarantees a user on this route
  return {
    chapters: chapterProgress(db, userId),
    counts: queueCounts(db, userId)
  };
};
