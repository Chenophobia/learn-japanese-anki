import { describe, it, expect } from 'vitest';
import { createTestDb } from '../db/test-db';
import { users, sessions } from '../db/schema';
import { createSession, validateSession, invalidateSession, sessionMaxAge } from './session';

function setup() {
  const db = createTestDb();
  const [user] = db
    .insert(users)
    .values({ username: 'yao', passwordHash: 'x', createdAt: new Date().toISOString() })
    .returning()
    .all();
  return { db, user };
}

describe('sessionMaxAge', () => {
  it('is one day without remember-me', () => {
    expect(sessionMaxAge(false)).toBe(60 * 60 * 24);
  });

  it('is one year with remember-me', () => {
    expect(sessionMaxAge(true)).toBe(60 * 60 * 24 * 365);
  });
});

describe('sessions', () => {
  it('creates a session that validates back to its user', async () => {
    const { db, user } = setup();
    const session = await createSession(db, user.id, false);
    expect(await validateSession(db, session.id)).toEqual({ id: user.id, username: 'yao' });
  });

  it('generates unguessable ids', async () => {
    const { db, user } = setup();
    const a = await createSession(db, user.id, false);
    const b = await createSession(db, user.id, false);
    expect(a.id).not.toBe(b.id);
    expect(a.id.length).toBeGreaterThanOrEqual(32);
  });

  it('rejects an unknown session id', async () => {
    const { db } = setup();
    expect(await validateSession(db, 'nope')).toBeNull();
  });

  it('rejects and deletes an expired session', async () => {
    const { db, user } = setup();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const session = await createSession(db, user.id, false, now);
    const later = new Date('2026-01-03T00:00:00.000Z');
    expect(await validateSession(db, session.id, later)).toBeNull();
    expect(db.select().from(sessions).all()).toHaveLength(0);
  });

  it('honours the remember flag in expiry', async () => {
    const { db, user } = setup();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const remembered = await createSession(db, user.id, true, now);
    const monthsLater = new Date('2026-06-01T00:00:00.000Z');
    expect(await validateSession(db, remembered.id, monthsLater)).not.toBeNull();
  });

  it('invalidates a session', async () => {
    const { db, user } = setup();
    const session = await createSession(db, user.id, false);
    await invalidateSession(db, session.id);
    expect(await validateSession(db, session.id)).toBeNull();
  });
});
