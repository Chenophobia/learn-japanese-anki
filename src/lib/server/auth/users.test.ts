import { describe, it, expect } from 'vitest';
import { createTestDb } from '../db/test-db';
import { usernameTaken, insertUser, setPasswordHash } from './users';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

function storedHash(db: ReturnType<typeof createTestDb>, username: string): string | undefined {
  return db
    .select({ h: users.passwordHash })
    .from(users)
    .where(eq(users.username, username))
    .all()[0]?.h;
}

describe('usernameTaken', () => {
  it('is false for an unused username', () => {
    const db = createTestDb();
    expect(usernameTaken(db, 'yao')).toBe(false);
  });

  it('is true once the username exists', () => {
    const db = createTestDb();
    insertUser(db, 'yao', 'hash', new Date().toISOString());
    expect(usernameTaken(db, 'yao')).toBe(true);
  });
});

describe('insertUser', () => {
  it('inserts a new user and returns its id and username', () => {
    const db = createTestDb();
    const user = insertUser(db, 'yao', 'hash', new Date().toISOString());
    expect(user).not.toBeNull();
    expect(user?.username).toBe('yao');
    expect(typeof user?.id).toBe('number');
  });

  it('returns null instead of throwing on a duplicate username (uniqueness race)', () => {
    const db = createTestDb();
    const first = insertUser(db, 'yao', 'hash-a', new Date().toISOString());
    expect(first).not.toBeNull();

    // Simulates the losing side of a race: usernameTaken's pre-check already
    // passed for both requests before either inserted.
    const second = insertUser(db, 'yao', 'hash-b', new Date().toISOString());
    expect(second).toBeNull();
  });

  it('leaves the existing password untouched when it refuses a duplicate', () => {
    const db = createTestDb();
    insertUser(db, 'yao', 'real-hash', new Date().toISOString());

    insertUser(db, 'yao', 'throwaway-hash', new Date().toISOString());

    expect(storedHash(db, 'yao')).toBe('real-hash');
  });
});

describe('setPasswordHash', () => {
  it('replaces the hash of an existing user', () => {
    const db = createTestDb();
    insertUser(db, 'yao', 'old-hash', new Date().toISOString());

    expect(setPasswordHash(db, 'yao', 'new-hash')).toBe(true);
    expect(storedHash(db, 'yao')).toBe('new-hash');
  });

  it('reports failure for an unknown username instead of silently doing nothing', () => {
    const db = createTestDb();
    expect(setPasswordHash(db, 'nobody', 'new-hash')).toBe(false);
  });

  it('changes only the named user', () => {
    const db = createTestDb();
    insertUser(db, 'yao', 'yao-hash', new Date().toISOString());
    insertUser(db, 'other', 'other-hash', new Date().toISOString());

    setPasswordHash(db, 'yao', 'new-hash');

    expect(storedHash(db, 'other')).toBe('other-hash');
  });
});
