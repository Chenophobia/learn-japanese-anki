import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { SESSION_COOKIE, invalidateSession } from '$lib/server/auth/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
  const id = cookies.get(SESSION_COOKIE);
  if (id) await invalidateSession(db, id);
  cookies.delete(SESSION_COOKIE, { path: '/' });
  throw redirect(303, '/login');
};
