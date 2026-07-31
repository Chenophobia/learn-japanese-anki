import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { connect, type Db } from './connect';

function open(): Db {
  const dir = process.env.DATA_DIR ?? './data';
  mkdirSync(dir, { recursive: true });
  return connect(join(dir, 'app.db'));
}

export const db: Db = open();
export type { Db };
