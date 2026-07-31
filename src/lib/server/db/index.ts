import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { connect, type Db } from './connect';
import { seedIfEmpty } from '../seed/run';

function open(): Db {
  const dir = process.env.DATA_DIR ?? './data';
  mkdirSync(dir, { recursive: true });
  const database = connect(join(dir, 'app.db'));
  seedIfEmpty(database);
  return database;
}

export const db: Db = open();
export type { Db };
