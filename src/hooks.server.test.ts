import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isRedirect, type RequestEvent } from '@sveltejs/kit';

// hooks.server.ts imports the app-wide db singleton, which opens a file on
// disk at import time. Swap it for a fresh in-memory database so these tests
// exercise the real session lookup against real tables.
vi.mock('$lib/server/db', async () => {
  const { createTestDb } = await import('./lib/server/db/test-db');
  return { db: createTestDb() };
});

import { db } from '$lib/server/db';
import { users, sessions } from '$lib/server/db/schema';
import { createSession, SESSION_COOKIE } from '$lib/server/auth/session';
import { handle } from './hooks.server';

const NOW = new Date('2026-03-10T09:00:00.000Z');

function makeEvent(path: string, cookieEntries: Record<string, string> = {}) {
  const jar = new Map(Object.entries(cookieEntries));
  const deleted: string[] = [];
  const url = new URL(`http://localhost${path}`);
  const event = {
    cookies: {
      get: (name: string) => jar.get(name),
      delete: (name: string) => {
        jar.delete(name);
        deleted.push(name);
      }
    },
    url,
    locals: {} as App.Locals
  };
  return { event: event as unknown as RequestEvent, deleted };
}

// A stand-in for SvelteKit's own resolve: renders a page shell through
// transformPageChunk so tests can observe the %theme% substitution.
const resolve = async (
  _event: RequestEvent,
  opts?: { transformPageChunk?: (input: { html: string; done: boolean }) => string | undefined }
) => new Response(opts?.transformPageChunk?.({ html: '<html class="%theme%">', done: true }) ?? '');

async function run(event: RequestEvent) {
  return handle({ event, resolve: resolve as never });
}

function seedUser(): number {
  const [user] = db
    .insert(users)
    .values({ username: 'tester', passwordHash: 'x', createdAt: NOW.toISOString() })
    .returning()
    .all();
  return user.id;
}

beforeEach(() => {
  db.delete(sessions).run();
  db.delete(users).run();
});

describe('handle: auth guard', () => {
  it('redirects anonymous visitors to /login with the path as next', async () => {
    const { event } = makeEvent('/');
    await expect(run(event)).rejects.toSatisfy(
      (e) => isRedirect(e) && e.status === 303 && e.location === '/login?next=%2F'
    );
  });

  it('preserves the query string in next, not just the pathname', async () => {
    const { event } = makeEvent('/stats?range=30');
    await expect(run(event)).rejects.toSatisfy(
      (e) => isRedirect(e) && e.location === `/login?next=${encodeURIComponent('/stats?range=30')}`
    );
  });

  it('lets anonymous visitors reach /login', async () => {
    const { event } = makeEvent('/login');
    const res = await run(event);
    expect(res).toBeInstanceOf(Response);
    expect(event.locals.user).toBeNull();
  });

  it('populates locals.user for a valid session', async () => {
    const userId = seedUser();
    const session = await createSession(db, userId, false);
    const { event } = makeEvent('/', { [SESSION_COOKIE]: session.id });
    await run(event);
    expect(event.locals.user).toEqual({ id: userId, username: 'tester' });
  });

  it('bounces signed-in users away from /login', async () => {
    const userId = seedUser();
    const session = await createSession(db, userId, false);
    const { event } = makeEvent('/login', { [SESSION_COOKIE]: session.id });
    await expect(run(event)).rejects.toSatisfy(
      (e) => isRedirect(e) && e.status === 303 && e.location === '/'
    );
  });

  it('deletes a session cookie that no longer maps to a session', async () => {
    const { event, deleted } = makeEvent('/', { [SESSION_COOKIE]: 'gone-stale' });
    await expect(run(event)).rejects.toSatisfy(isRedirect);
    expect(deleted).toContain(SESSION_COOKIE);
  });
});

describe('handle: theme', () => {
  it('defaults to light and strips the %theme% placeholder', async () => {
    const userId = seedUser();
    const session = await createSession(db, userId, false);
    const { event } = makeEvent('/', { [SESSION_COOKIE]: session.id });
    const res = await run(event);
    expect(event.locals.theme).toBe('light');
    expect(await res.text()).toBe('<html class="">');
  });

  it('applies the dark class when the theme cookie says dark', async () => {
    const userId = seedUser();
    const session = await createSession(db, userId, false);
    const { event } = makeEvent('/', { [SESSION_COOKIE]: session.id, theme: 'dark' });
    const res = await run(event);
    expect(event.locals.theme).toBe('dark');
    expect(await res.text()).toBe('<html class="dark">');
  });

  it('treats any non-dark cookie value as light', async () => {
    const userId = seedUser();
    const session = await createSession(db, userId, false);
    const { event } = makeEvent('/', { [SESSION_COOKIE]: session.id, theme: 'hotdog' });
    await run(event);
    expect(event.locals.theme).toBe('light');
  });
});
