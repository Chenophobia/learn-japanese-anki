import { describe, it, expect } from 'vitest';
import { hiraganaChapter } from './hiragana';
import { katakanaChapter } from './katakana';
import type { SeedChapter } from './types';

function allCards(chapter: SeedChapter) {
  return chapter.units.flatMap((u) => u.cards);
}

describe('kana chapters', () => {
  it('hiragana has the five expected units', () => {
    expect(hiraganaChapter.units.map((u) => u.title)).toEqual([
      'Base gojuon',
      'Dakuten & handakuten',
      'Combination kana (youon)',
      'Special characters',
      'Anchor verbs'
    ]);
  });

  it('hiragana unit card counts match the curriculum', () => {
    expect(hiraganaChapter.units.map((u) => u.cards.length)).toEqual([46, 25, 33, 3, 12]);
  });

  it('katakana unit card counts match the curriculum', () => {
    expect(katakanaChapter.units.map((u) => u.cards.length)).toEqual([46, 25, 33, 8, 25]);
  });

  it('every kana card has a non-empty char, romaji and mnemonic', () => {
    const kanaUnits = [...hiraganaChapter.units, ...katakanaChapter.units].filter(
      (u) => u.kind === 'kana'
    );
    for (const unit of kanaUnits) {
      for (const card of unit.cards) {
        expect((card.front as { char: string }).char).toBeTruthy();
        expect((card.back as { romaji: string }).romaji).toBeTruthy();
        expect((card.back as { mnemonic: string }).mnemonic).toBeTruthy();
      }
    }
  });

  it('has no duplicate fronts within a chapter', () => {
    for (const chapter of [hiraganaChapter, katakanaChapter]) {
      const fronts = allCards(chapter).map((c) => JSON.stringify(c.front));
      expect(new Set(fronts).size).toBe(fronts.length);
    }
  });
});
