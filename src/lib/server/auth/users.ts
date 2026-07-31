import { eq } from 'drizzle-orm';
import type { Db } from '../db/connect';
import { users } from '../db/schema';

/** Pre-check used to produce a clean "taken" message on the common (non-racing) path. */
export function usernameTaken(db: Db, username: string): boolean {
  const [taken] = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1)
    .all();
  return !!taken;
}

/**
 * Inserts a new user, tolerating a `username` uniqueness race.
 *
 * `usernameTaken` above already rejects the common case, but two concurrent
 * signups for the same username can both pass that check before either
 * inserts. `onConflictDoNothing` makes the losing insert a no-op instead of
 * throwing a raw SQLite UNIQUE constraint error — callers detect the race by
 * checking for a `null` return rather than catching an exception.
 */
export function insertUser(
  db: Db,
  username: string,
  passwordHash: string,
  createdAt: string
): { id: number; username: string } | null {
  const inserted = db
    .insert(users)
    .values({ username, passwordHash, createdAt })
    .onConflictDoNothing({ target: users.username })
    .returning()
    .all();
  return inserted[0] ?? null;
}
