import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { connect, type Db } from './connect';
import { seedIfEmpty } from '../seed/run';
import { syncCurriculumTitles } from '../seed/sync-titles';

function open(): Db {
  const dir = process.env.DATA_DIR ?? './data';
  mkdirSync(dir, { recursive: true });
  const database = connect(join(dir, 'app.db'));
  seedIfEmpty(database);

  // Titles are the one part of the curriculum that can be corrected without
  // destroying study progress, so they sync on every boot instead of waiting
  // for a `reseed`. A shape change is not a rename and is declined here —
  // that case is loud on purpose, because it means a deploy needs `reseed`.
  const sync = syncCurriculumTitles(database);
  if (sync.status === 'skipped' && sync.reason !== 'empty database') {
    console.warn(
      `[curriculum] titles not synced — ${sync.reason}. ` +
        'The database shape differs from the curriculum; run `npm run reseed` ' +
        '(destroys all study progress) to rebuild it.'
    );
  } else if (sync.status === 'synced' && sync.renamed > 0) {
    console.log(`[curriculum] renamed ${sync.renamed} chapter/unit titles`);
  }

  return database;
}

export const db: Db = open();
export type { Db };
