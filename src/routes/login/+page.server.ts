import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { verifyPassword } from '$lib/server/auth/password';
import { createSession, SESSION_COOKIE, sessionMaxAge } from '$lib/server/auth/session';
import { safeNextPath } from '$lib/server/auth/safe-redirect';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, cookies, url }) => {
    const form = await request.formData();
    const username = String(form.get('username') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const remember = form.get('remember') === 'on';

    const [user] = db.select().from(users).where(eq(users.username, username)).limit(1).all();
    const ok = user ? await verifyPassword(user.passwordHash, password) : false;
    if (!user || !ok) {
      return fail(400, { username, error: 'Incorrect username or password.' });
    }

    const session = await createSession(db, user.id, remember);
    cookies.set(SESSION_COOKIE, session.id, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionMaxAge(remember)
    });

    throw redirect(303, safeNextPath(url.searchParams.get('next')));
  }
};
