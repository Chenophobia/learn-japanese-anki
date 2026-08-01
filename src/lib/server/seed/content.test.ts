import { describe, it, expect } from 'vitest';
import { curriculum } from './index';

describe('curriculum', () => {
  it('has four chapters in order', () => {
    expect(curriculum.map((c) => c.title)).toEqual([
      'Hiragana',
      'Katakana',
      'Kanji & Vocabulary',
      'Grammar & Reading'
    ]);
  });

  it('has 4 kanji units of 20 cards each', () => {
    const kanji = curriculum[2].units.filter((u) => u.kind === 'kanji');
    expect(kanji).toHaveLength(4);
    expect(kanji.every((u) => u.cards.length === 20)).toBe(true);
    expect(kanji.every((u) => u.dailyCap === 3)).toBe(true);
  });

  it('has 19 vocab units in chapter 3, all capped at 8/day', () => {
    const vocab = curriculum[2].units.filter((u) => u.kind === 'vocab');
    expect(vocab).toHaveLength(19);
    expect(vocab.every((u) => u.dailyCap === 8)).toBe(true);
    expect(vocab.every((u) => u.cards.length >= 10)).toBe(true);
  });

  it('has 17 grammar units', () => {
    expect(curriculum[3].units).toHaveLength(17);
    expect(curriculum[3].units.every((u) => u.kind === 'grammar')).toBe(true);
  });

  it('every card has non-empty front and back fields', () => {
    for (const chapter of curriculum) {
      for (const unit of chapter.units) {
        expect(unit.cards.length).toBeGreaterThan(0);
        for (const card of unit.cards) {
          for (const value of [...Object.values(card.front), ...Object.values(card.back)]) {
            expect(String(value).trim()).not.toBe('');
          }
        }
      }
    }
  });

  it('has no duplicate card fronts across the whole curriculum', () => {
    const fronts = curriculum.flatMap((c) => c.units.flatMap((u) => u.cards.map((k) => JSON.stringify(k.front))));
    const dupes = fronts.filter((f, i) => fronts.indexOf(f) !== i);
    expect(dupes).toEqual([]);
  });
});
