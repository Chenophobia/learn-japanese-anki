import { describe, it, expect } from 'vitest';
import { createTestDb } from './test-db';
import { chapters, units, cards } from './schema';

describe('createTestDb', () => {
  it('creates a migrated in-memory database', () => {
    const db = createTestDb();
    const [chapter] = db
      .insert(chapters)
      .values({ order: 1, title: 'Hiragana', kind: 'kana' })
      .returning()
      .all();
    const [unit] = db
      .insert(units)
      .values({
        chapterId: chapter.id,
        order: 1,
        title: 'Base gojuon',
        kind: 'kana',
        dailyCap: 15
      })
      .returning()
      .all();
    db.insert(cards)
      .values({
        unitId: unit.id,
        order: 1,
        frontJson: '{"char":"あ"}',
        backJson: '{"romaji":"a","mnemonic":"an apple"}'
      })
      .run();

    expect(db.select().from(cards).all()).toHaveLength(1);
  });
});
