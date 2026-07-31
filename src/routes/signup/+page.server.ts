import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { hashPassword } from '$lib/server/auth/password';
import { validateCredentials } from '$lib/server/auth/credentials';
import { usernameTaken, insertUser } from '$lib/server/auth/users';
import { createSession, SESSION_COOKIE, sessionMaxAge } from '$lib/server/auth/session';
import { safeNextPath } from '$lib/server/auth/safe-redirect';
import type { Actions } from './$types';

const USERNAME_TAKEN_ERROR = 'That username is already taken.';

export const actions: Actions = {
  default: async ({ request, cookies, url }) => {
    const form = await request.formData();
    const username = String(form.get('username') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const remember = form.get('remember') === 'on';

    const problem = validateCredentials(username, password);
    if (problem) return fail(400, { username, error: problem });

    // Common-path check: gives a clean message before doing any hashing work.
    if (usernameTaken(db, username)) {
      return fail(400, { username, error: USERNAME_TAKEN_ERROR });
    }

    // insertUser tolerates the rare race where two signups for the same
    // username both pass the check above before either inserts — it returns
    // null instead of throwing a raw SQLite UNIQUE constraint error.
    const user = insertUser(db, username, await hashPassword(password), new Date().toISOString());
    if (!user) {
      return fail(400, { username, error: USERNAME_TAKEN_ERROR });
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
