import { describe, it, expect } from 'vitest';
import { curriculum } from './index';
import type { SeedUnit } from './types';

const allUnits = (): SeedUnit[] => curriculum.flatMap((c) => c.units);

describe('curriculum', () => {
  it('has eleven chapters in track order', () => {
    expect(curriculum.map((c) => c.title)).toEqual([
      'Hiragana',
      'Katakana',
      'Basic Kanji',
      'Everyday Life',
      'People, Places & Work',
      'Describing & Feeling',
      'Toward N4',
      'Linking Actions',
      'Intention & Attempt',
      'Thoughts, Guessing & Conditions',
      'Advanced Verb Forms'
    ]);
  });

  it('groups chapters into four contiguous tracks', () => {
    // The course map draws a heading whenever `kind` differs from the
    // previous chapter's. That rule only produces one heading per track if
    // the tracks are contiguous — otherwise a track's heading repeats.
    const kinds = curriculum.map((c) => c.kind);
    expect(kinds).toEqual([
      'kana',
      'kana',
      'kanji',
      'vocab',
      'vocab',
      'vocab',
      'vocab',
      'grammar',
      'grammar',
      'grammar',
      'grammar'
    ]);

    const headings = kinds.filter((kind, i) => kind !== kinds[i - 1]);
    expect(headings).toEqual(['kana', 'kanji', 'vocab', 'grammar']);
  });

  it('keeps all 50 units, and regroups the 40 non-kana ones without loss', () => {
    // The regroup must not drop, duplicate, or invent a unit. Chapter
    // membership changed; the set of units did not.
    expect(allUnits()).toHaveLength(50);

    // Uniqueness is asserted only over the regrouped units. Unit titles are
    // NOT unique across the whole curriculum — the Hiragana and Katakana
    // chapters each contain a "Dakuten & handakuten" and a "Combination kana
    // (youon)" — but they are unique within the pool groupIntoChapters keys
    // by, which is the property that matters.
    const regrouped = curriculum
      .filter((c) => c.kind !== 'kana')
      .flatMap((c) => c.units.map((u) => u.title));
    expect(regrouped).toHaveLength(40);
    expect(new Set(regrouped).size).toBe(40);
  });

  it('keeps all 667 cards', () => {
    const total = allUnits().reduce((sum, u) => sum + u.cards.length, 0);
    expect(total).toBe(667);
  });

  it('keeps the four kanji units together in Basic Kanji, 20 cards each', () => {
    const kanji = curriculum.find((c) => c.title === 'Basic Kanji')!;
    expect(kanji.units).toHaveLength(4);
    expect(kanji.units.every((u) => u.kind === 'kanji')).toBe(true);
    expect(kanji.units.every((u) => u.cards.length === 20)).toBe(true);
    expect(kanji.units.every((u) => u.dailyCap === 3)).toBe(true);
  });

  it('spreads the 19 vocab units across four chapters, all capped at 8/day', () => {
    const chapters = curriculum.filter((c) => c.kind === 'vocab');
    expect(chapters.map((c) => c.units.length)).toEqual([5, 6, 3, 5]);

    const units = chapters.flatMap((c) => c.units);
    expect(units).toHaveLength(19);
    expect(units.every((u) => u.kind === 'vocab')).toBe(true);
    expect(units.every((u) => u.dailyCap === 8)).toBe(true);
  });

  it('spreads the 17 grammar units across four chapters', () => {
    const chapters = curriculum.filter((c) => c.kind === 'grammar');
    expect(chapters.map((c) => c.units.length)).toEqual([4, 3, 6, 4]);

    const units = chapters.flatMap((c) => c.units);
    expect(units).toHaveLength(17);
    expect(units.every((u) => u.kind === 'grammar')).toBe(true);
  });

  it('leaves the two kana chapters untouched, vocab unit and all', () => {
    const [hiragana, katakana] = curriculum;
    expect(hiragana.units.map((u) => u.title)).toEqual([
      'Base gojuon',
      'Dakuten & handakuten',
      'Combination kana (youon)',
      'Special characters',
      'Anchor verbs'
    ]);
    expect(katakana.units.map((u) => u.title)).toEqual([
      'Base 46',
      'Dakuten & handakuten',
      'Combination kana (youon)',
      'Extended katakana',
      'Loanwords'
    ]);
    // A chapter's kind is a track label, not a claim about its units.
    expect(hiragana.units.at(-1)!.kind).toBe('vocab');
    expect(hiragana.kind).toBe('kana');
  });

  it('every card has non-empty front and back fields', () => {
    for (const unit of allUnits()) {
      expect(unit.cards.length).toBeGreaterThan(0);
      for (const card of unit.cards) {
        for (const value of [...Object.values(card.front), ...Object.values(card.back)]) {
          expect(String(value).trim()).not.toBe('');
        }
      }
    }
  });

  it('has no duplicate card fronts across the whole curriculum', () => {
    const fronts = allUnits().flatMap((u) => u.cards.map((c) => JSON.stringify(c.front)));
    const dupes = fronts.filter((f, i) => fronts.indexOf(f) !== i);
    expect(dupes).toEqual([]);
  });
});
