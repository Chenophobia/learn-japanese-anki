import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isRedirect, type RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/server/db', async () => {
  const { createTestDb } = await import('../../lib/server/db/test-db');
  return { db: createTestDb() };
});

import { db } from '$lib/server/db';
import { users, sessions } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth/password';
import { SESSION_COOKIE, sessionMaxAge } from '$lib/server/auth/session';
import { actions } from './+page.server';

type SetCall = { name: string; value: string; opts: { maxAge?: number; httpOnly?: boolean } };

function makeEvent(fields: Record<string, string>, next?: string) {
  const setCalls: SetCall[] = [];
  const url = new URL(`http://localhost/login${next ? `?next=${encodeURIComponent(next)}` : ''}`);
  const event = {
    request: new Request(url, { method: 'POST', body: new URLSearchParams(fields) }),
    url,
    cookies: {
      set: (name: string, value: string, opts: SetCall['opts']) => {
        setCalls.push({ name, value, opts });
      }
    }
  };
  return {
    event: event as unknown as RequestEvent & Parameters<typeof actions.default>[0],
    setCalls
  };
}

async function seedUser(username: string, password: string): Promise<number> {
  const [user] = db
    .insert(users)
    .values({
      username,
      passwordHash: await hashPassword(password),
      createdAt: new Date().toISOString()
    })
    .returning()
    .all();
  return user.id;
}

beforeEach(() => {
  db.delete(sessions).run();
  db.delete(users).run();
});

describe('login action', () => {
  it('rejects a wrong password but preserves the typed username', async () => {
    await seedUser('kana-fan', 'right-password');
    const { event } = makeEvent({ username: 'kana-fan', password: 'wrong' });
    const result = await actions.default(event);
    expect(result).toMatchObject({ status: 400, data: { username: 'kana-fan' } });
    expect(db.select().from(sessions).all()).toHaveLength(0);
  });

  it('rejects an unknown username the same way', async () => {
    const { event } = makeEvent({ username: 'nobody', password: 'whatever' });
    const result = await actions.default(event);
    expect(result).toMatchObject({ status: 400 });
  });

  it('trims surrounding whitespace from the username', async () => {
    await seedUser('kana-fan', 'pw');
    const { event } = makeEvent({ username: '  kana-fan  ', password: 'pw' });
    await expect(actions.default(event)).rejects.toSatisfy(isRedirect);
  });

  it('creates a session, sets the cookie, and redirects home on success', async () => {
    const userId = await seedUser('kana-fan', 'pw');
    const { event, setCalls } = makeEvent({ username: 'kana-fan', password: 'pw' });
    await expect(actions.default(event)).rejects.toSatisfy(
      (e) => isRedirect(e) && e.status === 303 && e.location === '/'
    );

    const rows = db.select().from(sessions).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(userId);

    expect(setCalls).toHaveLength(1);
    expect(setCalls[0].name).toBe(SESSION_COOKIE);
    expect(setCalls[0].value).toBe(rows[0].id);
    expect(setCalls[0].opts.httpOnly).toBe(true);
    expect(setCalls[0].opts.maxAge).toBe(sessionMaxAge(false));
  });

  it('extends the session lifetime when remember-me is checked', async () => {
    await seedUser('kana-fan', 'pw');
    const { event, setCalls } = makeEvent({ username: 'kana-fan', password: 'pw', remember: 'on' });
    await expect(actions.default(event)).rejects.toSatisfy(isRedirect);
    expect(setCalls[0].opts.maxAge).toBe(sessionMaxAge(true));
  });

  it('honors a same-origin next target', async () => {
    await seedUser('kana-fan', 'pw');
    const { event } = makeEvent({ username: 'kana-fan', password: 'pw' }, '/stats?range=30');
    await expect(actions.default(event)).rejects.toSatisfy(
      (e) => isRedirect(e) && e.location === '/stats?range=30'
    );
  });

  it('falls back to home for an off-site next target', async () => {
    await seedUser('kana-fan', 'pw');
    const { event } = makeEvent({ username: 'kana-fan', password: 'pw' }, 'https://evil.example');
    await expect(actions.default(event)).rejects.toSatisfy(
      (e) => isRedirect(e) && e.location === '/'
    );
  });
});
