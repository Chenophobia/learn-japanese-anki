import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/connect';
import { users, sessions } from '../db/schema';

export const SESSION_COOKIE = 'session';

const DAY_SECONDS = 60 * 60 * 24;

export function sessionMaxAge(remember: boolean): number {
  return remember ? DAY_SECONDS * 365 : DAY_SECONDS;
}

export async function createSession(
  db: Db,
  userId: number,
  remember: boolean,
  now: Date = new Date()
): Promise<{ id: string; expiresAt: string }> {
  const id = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + sessionMaxAge(remember) * 1000).toISOString();
  db.insert(sessions)
    .values({
      id,
      userId,
      expiresAt,
      remember: remember ? 1 : 0,
      createdAt: now.toISOString()
    })
    .run();
  return { id, expiresAt };
}

export async function validateSession(
  db: Db,
  id: string,
  now: Date = new Date()
): Promise<{ id: number; username: string } | null> {
  const [row] = db
    .select({ userId: users.id, username: users.username, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .limit(1)
    .all();

  if (!row) return null;
  if (new Date(row.expiresAt).getTime() <= now.getTime()) {
    db.delete(sessions).where(eq(sessions.id, id)).run();
    return null;
  }
  return { id: row.userId, username: row.username };
}

export async function invalidateSession(db: Db, id: string): Promise<void> {
  db.delete(sessions).where(eq(sessions.id, id)).run();
}
