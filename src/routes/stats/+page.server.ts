import { db } from '$lib/server/db';
import { userStats } from '$lib/server/stats';
import { chapterProgress } from '$lib/server/progress';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const userId = locals.user!.id; // hooks.server.ts guarantees a user on this route
  return {
    stats: userStats(db, userId),
    chapters: chapterProgress(db, userId)
  };
};
