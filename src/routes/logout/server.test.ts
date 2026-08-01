import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isRedirect } from '@sveltejs/kit';

vi.mock('$lib/server/db', async () => {
  const { createTestDb } = await import('../../lib/server/db/test-db');
  return { db: createTestDb() };
});

import { db } from '$lib/server/db';
import { users, sessions } from '$lib/server/db/schema';
import { createSession, SESSION_COOKIE } from '$lib/server/auth/session';
import { POST } from './+server';

function makeEvent(cookieEntries: Record<string, string> = {}) {
  const jar = new Map(Object.entries(cookieEntries));
  const deleted: string[] = [];
  const event = {
    cookies: {
      get: (name: string) => jar.get(name),
      delete: (name: string) => {
        jar.delete(name);
        deleted.push(name);
      }
    }
  };
  return { event: event as unknown as Parameters<typeof POST>[0], deleted };
}

beforeEach(() => {
  db.delete(sessions).run();
  db.delete(users).run();
});

describe('logout', () => {
  it('invalidates the session, clears the cookie, and redirects to /login', async () => {
    const [user] = db
      .insert(users)
      .values({ username: 'u', passwordHash: 'x', createdAt: new Date().toISOString() })
      .returning()
      .all();
    const session = await createSession(db, user.id, false);
    const { event, deleted } = makeEvent({ [SESSION_COOKIE]: session.id });

    await expect(POST(event)).rejects.toSatisfy(
      (e) => isRedirect(e) && e.status === 303 && e.location === '/login'
    );
    expect(db.select().from(sessions).all()).toHaveLength(0);
    expect(deleted).toContain(SESSION_COOKIE);
  });

  it('still redirects cleanly when no session cookie is present', async () => {
    const { event, deleted } = makeEvent();
    await expect(POST(event)).rejects.toSatisfy(isRedirect);
    expect(deleted).toContain(SESSION_COOKIE);
  });
});
