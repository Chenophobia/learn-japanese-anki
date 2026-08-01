import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

export type Db = BetterSQLite3Database<typeof schema>;

const MIGRATIONS_FOLDER = './drizzle';

export function connect(file: string): Db {
  const sqlite = new Database(file);
  // Rollback journal, NOT WAL. In production app.db lives on a Docker Desktop
  // bind mount (virtiofs), where SQLite's WAL shared-memory index (-shm) does
  // not work across processes: two connections each believe they are the only
  // one. When the second closes it "knows" it is the last writer, checkpoints,
  // and unlinks -wal/-shm out from under the first — which keeps writing into
  // an unlinked file that vanishes on restart. This was observed live: the
  // running app held `app.db-wal (deleted)`.
  //
  // DELETE mode uses no shared memory, only POSIX fcntl locks, which virtiofs
  // does implement. Contention degrades to a `SQLITE_BUSY` error instead of
  // silent divergence. The app is a single synchronous better-sqlite3 process,
  // so WAL's concurrent-reader benefit bought us nothing here anyway.
  sqlite.pragma('journal_mode = DELETE');
  sqlite.pragma('synchronous = FULL');
  // Wait rather than fail instantly if the operator script overlaps the app.
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}
