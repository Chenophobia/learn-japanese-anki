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
/**
 * Replaces an existing user's password hash. Returns false if no such user.
 *
 * There is no self-service password reset — this is the operator's only way to
 * change a password, and the only alternative to deleting the account (which
 * would take the user's review history with it).
 */
export function setPasswordHash(db: Db, username: string, passwordHash: string): boolean {
  const updated = db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.username, username))
    .returning({ id: users.id })
    .all();
  return updated.length > 0;
}

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
