/**
 * Destructive curriculum rebuild.
 *
 * `seedIfEmpty` only seeds when `chapters` is empty, so changing the
 * curriculum's shape means clearing the old one first. Because `user_cards`
 * and `review_logs` reference `cards.id` — an autoincrement key a reseed
 * does not preserve — clearing the curriculum necessarily destroys every
 * user's study progress. There is no partial version of this operation.
 *
 * `users` and `sessions` are left alone, so accounts and logins survive.
 *
 * Usage — stop the app first, so exactly one process touches app.db:
 *
 *   docker compose stop
 *   docker compose run --rm -e RESEED_CONFIRM=yes app npm run reseed
 *   docker compose start
 *
 * The app must not be running: a live page holds card ids that will not
 * exist afterwards, and its next rating would be rejected.
 *
 * The durable fix — matching seed rows on natural keys so `cards.id`
 * survives a content edit — is deliberately deferred. See the design spec's
 * "Known limitation".
 */
import { sql } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { db } from '../src/lib/server/db';
import { chapters, units, cards, userCards, reviewLogs } from '../src/lib/server/db/schema';
import { seedIfEmpty } from '../src/lib/server/seed/run';

function count(table: SQLiteTable): number {
  const [row] = db.select({ n: sql<number>`count(*)` }).from(table).all();
  return row?.n ?? 0;
}

function main() {
  const progress = count(userCards);
  const logs = count(reviewLogs);

  console.log(
    `About to destroy: ${count(chapters)} chapters, ${count(units)} units, ` +
      `${count(cards)} cards, ${progress} card-progress rows, ${logs} review logs.`
  );

  if (process.env.RESEED_CONFIRM !== 'yes') {
    console.error(
      '\nRefusing to run. This permanently destroys all study progress —\n' +
        'card scheduling state, streaks, and review history for every user.\n' +
        'Accounts and sessions are not affected.\n\n' +
        'Re-run with RESEED_CONFIRM=yes to proceed.'
    );
    process.exit(1);
  }

  // One transaction: a half-cleared curriculum would leave `seedIfEmpty`
  // seeing a non-empty `chapters` table and declining to reseed, which is
  // the one state with no obvious way out.
  db.transaction((tx) => {
    // Child-first, so foreign keys hold at every point (PRAGMA
    // foreign_keys=ON is set in connect.ts).
    tx.delete(reviewLogs).run();
    tx.delete(userCards).run();
    tx.delete(cards).run();
    tx.delete(units).run();
    tx.delete(chapters).run();
  });

  seedIfEmpty(db);

  console.log(
    `Reseeded: ${count(chapters)} chapters, ${count(units)} units, ${count(cards)} cards.`
  );
  process.exit(0);
}

main();
