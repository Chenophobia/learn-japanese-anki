import { describe, it, expect } from 'vitest';
import { groupIntoChapters } from './group';
import type { SeedUnit } from './types';

const unit = (title: string): SeedUnit => ({
  title,
  kind: 'vocab',
  dailyCap: 8,
  cards: [{ front: { word: title }, back: { reading: 'r', meaning: 'm', example_sentence: 'e' } }]
});

describe('groupIntoChapters', () => {
  it('places each named unit in its chapter, in the order named', () => {
    const chapters = groupIntoChapters(
      [unit('a'), unit('b'), unit('c')],
      [
        { title: 'First', kind: 'vocab', unitTitles: ['c', 'a'] },
        { title: 'Second', kind: 'vocab', unitTitles: ['b'] }
      ]
    );

    expect(chapters.map((c) => c.title)).toEqual(['First', 'Second']);
    expect(chapters[0].units.map((u) => u.title)).toEqual(['c', 'a']);
    expect(chapters[1].units.map((u) => u.title)).toEqual(['b']);
  });

  it('carries the unit object through unchanged, not a copy', () => {
    // The regroup must never edit a unit's cards or cap. Identity is the
    // strongest available assertion that it did not.
    const a = unit('a');
    const [chapter] = groupIntoChapters([a], [{ title: 'C', kind: 'vocab', unitTitles: ['a'] }]);
    expect(chapter.units[0]).toBe(a);
  });

  it('throws when a chapter names a unit that does not exist', () => {
    expect(() =>
      groupIntoChapters([unit('a')], [{ title: 'C', kind: 'vocab', unitTitles: ['typo'] }])
    ).toThrow(/no unit titled "typo"/);
  });

  it('throws when a unit is left out of every chapter', () => {
    // The failure this whole helper exists to prevent: a unit quietly
    // vanishing from the curriculum during a regroup.
    expect(() =>
      groupIntoChapters([unit('a'), unit('orphan')], [{ title: 'C', kind: 'vocab', unitTitles: ['a'] }])
    ).toThrow(/left out of every chapter: orphan/);
  });

  it('throws when a unit is claimed by two chapters', () => {
    expect(() =>
      groupIntoChapters(
        [unit('a')],
        [
          { title: 'C1', kind: 'vocab', unitTitles: ['a'] },
          { title: 'C2', kind: 'vocab', unitTitles: ['a'] }
        ]
      )
    ).toThrow(/used twice/);
  });

  it('throws when the pool itself has duplicate titles, since titles are the key', () => {
    expect(() =>
      groupIntoChapters([unit('a'), unit('a')], [{ title: 'C', kind: 'vocab', unitTitles: ['a'] }])
    ).toThrow(/duplicate unit titles/);
  });
});
