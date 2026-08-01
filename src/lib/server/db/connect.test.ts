import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import Database from 'better-sqlite3';
import { connect } from './connect';

const dirs: string[] = [];

function tempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'connect-test-'));
  dirs.push(dir);
  return join(dir, 'app.db');
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('connect', () => {
  it('does not use WAL, whose -shm index is unreliable on the production bind mount', () => {
    const file = tempDbPath();
    connect(file);

    // Read the mode back through a separate handle: journal_mode is a property
    // of the file, so this reflects what a restarted process would find.
    const probe = new Database(file, { readonly: true });
    const rows = probe.pragma('journal_mode') as Array<{ journal_mode: string }>;
    const mode = rows[0].journal_mode;
    probe.close();

    expect(mode).toBe('delete');
  });

  it('leaves no -wal/-shm sidecar files that a second process could unlink', () => {
    const file = tempDbPath();
    const db = connect(file);
    // Force a write so any journal sidecars would have been created by now.
    db.run(sql`create table probe (id integer primary key)`);
    db.run(sql`insert into probe values (1)`);

    expect(existsSync(`${file}-wal`)).toBe(false);
    expect(existsSync(`${file}-shm`)).toBe(false);
  });

  it('persists committed writes to app.db itself, so a restart cannot lose them', () => {
    const file = tempDbPath();
    const db = connect(file);
    db.run(sql`create table probe (id integer primary key)`);
    db.run(sql`insert into probe values (42)`);

    // A restarted container gets only what survived in the directory. If the
    // commit lived in a sidecar (or an unlinked one), it would not be here.
    expect(readdirSync(join(file, '..'))).toEqual(['app.db']);
    const reopened = new Database(file, { readonly: true });
    const row = reopened.prepare('select id from probe').get() as { id: number };
    reopened.close();

    expect(row.id).toBe(42);
  });
});
