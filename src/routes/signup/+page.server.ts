import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth/password';
import { validateCredentials } from '$lib/server/auth/credentials';
import { createSession, SESSION_COOKIE, sessionMaxAge } from '$lib/server/auth/session';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const form = await request.formData();
    const username = String(form.get('username') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const remember = form.get('remember') === 'on';

    const problem = validateCredentials(username, password);
    if (problem) return fail(400, { username, error: problem });

    const [taken] = db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1).all();
    if (taken) return fail(400, { username, error: 'That username is already taken.' });

    const [user] = db
      .insert(users)
      .values({ username, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() })
      .returning()
      .all();

    const session = await createSession(db, user.id, remember);
    cookies.set(SESSION_COOKIE, session.id, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionMaxAge(remember)
    });

    throw redirect(303, '/');
  }
};
