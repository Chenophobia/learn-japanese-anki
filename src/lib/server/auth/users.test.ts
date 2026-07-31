import { describe, it, expect } from 'vitest';
import { createTestDb } from '../db/test-db';
import { usernameTaken, insertUser } from './users';

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
});
