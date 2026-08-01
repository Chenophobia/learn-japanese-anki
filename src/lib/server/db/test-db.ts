import { connect, type Db } from './connect';

/** Fresh in-memory database with migrations applied — for tests only. */
export function createTestDb(): Db {
  return connect(':memory:');
}
