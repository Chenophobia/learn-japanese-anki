import { describe, it, expect } from 'vitest';
import { curriculum } from './index';

/**
 * The curriculum's naming scheme, enforced mechanically.
 *
 * Titles were authored in three passes and drifted apart every time: "Kanji
 * Set 1 — …" carried positional numbering, vocabulary used colons where
 * grammar used em dashes, and the Hiragana and Katakana chapters named the
 * same material differently. Asserting an explicit list of titles (as
 * content.test.ts does) catches a title *changing*; it does not catch a
 * newly added unit inventing a fourth convention. These rules do.
 *
 * See docs/superpowers/specs/2026-08-02-curriculum-naming-and-icon-design.md.
 */

const chapterTitles = curriculum.map((c) => c.title);
const unitTitles = curriculum.flatMap((c) => c.units.map((u) => u.title));
const allTitles = [...chapterTitles, ...unitTitles];

describe('curriculum naming scheme', () => {
  it('numbers nothing positionally', () => {
    // Order is already carried by the `order` columns and by the on-screen
    // sequence. Baking it into the title means renumbering by hand whenever
    // the curriculum is reordered — and a stale number is invisible.
    const numbered = allTitles.filter((t) => /\b(set|unit|week|part|chapter|lesson)\s*\d/i.test(t));
    expect(numbered).toEqual([]);
  });

  it('uses a spaced em dash for glosses, never a colon', () => {
    expect(allTitles.filter((t) => t.includes(':'))).toEqual([]);

    // An em dash that is not spaced on both sides reads as a hyphen at small
    // sizes, which is the ambiguity the separator exists to avoid.
    expect(allTitles.filter((t) => /\S—|—\S/.test(t))).toEqual([]);
  });

  it('uses "&" rather than "and"', () => {
    expect(allTitles.filter((t) => /\band\b/i.test(t))).toEqual([]);
  });

  it('is written in English, with no CJK characters', () => {
    // Card *fronts* are Japanese; titles are the navigation layer and stay
    // readable to someone who cannot yet read the script they are about to
    // learn. "Listing actions — 〜たり〜たりする" failed exactly that test.
    // CJK punctuation (covers the wave dash), kana, ideographs, and
    // fullwidth forms. Written as escapes because the ideographic space at
    // the start of the range is invisible as a literal - and eslint
    // rejects it outright as irregular whitespace.
    const CJK = /[\u3000-\u30ff\u4e00-\u9fff\uff00-\uffef]/;
    expect(allTitles.filter((t) => CJK.test(t))).toEqual([]);
  });

  it('titles chapters in Title Case and units in sentence case', () => {
    // Sentence case = only the first word is capitalised, except for proper
    // nouns and initialisms, which are spelled with an internal capital or
    // are fully upper-case ("N4", "I think").
    const isSentenceCase = (title: string) =>
      title
        .split(/[\s—/,]+/)
        .slice(1)
        .filter(Boolean)
        .every((word) => !/^[A-Z][a-z]+$/.test(word));

    expect(unitTitles.filter((t) => !isSentenceCase(t))).toEqual([]);

    // Chapters are the opposite: every significant word is capitalised.
    const MINOR = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'for', '&']);
    const isTitleCase = (title: string) =>
      title
        .split(/[\s,]+/)
        .filter(Boolean)
        .every((word, i) => i === 0 || MINOR.has(word.toLowerCase()) || /^[A-Z0-9]/.test(word));

    expect(chapterTitles.filter((t) => !isTitleCase(t))).toEqual([]);
  });

  it('never prefixes a unit with its own track or chapter name', () => {
    // "Kanji Set 1 — Core & most useful" sat under a "Kanji" track heading
    // and a "Basic Kanji" chapter title, both already on screen directly
    // above it. The prefix was three words of pure repetition.
    //
    // Deliberately a *prefix* rule, not a shared-word rule. Chapters whose
    // titles enumerate their own themes legitimately share words with their
    // units — "Work & school" inside "People, Places & Work" is the
    // curriculum working as intended, not a naming defect.
    const TRACKS = ['kana', 'hiragana', 'katakana', 'kanji', 'vocab', 'vocabulary', 'grammar'];

    const offenders = curriculum.flatMap((chapter) =>
      chapter.units
        .filter((unit) => {
          const lower = unit.title.toLowerCase();
          const first = lower.split(/[\s—:,]+/)[0];
          return TRACKS.includes(first) || lower.startsWith(chapter.title.toLowerCase() + ' ');
        })
        .map((unit) => `${chapter.title} / ${unit.title}`)
    );

    expect(offenders).toEqual([]);
  });

  it('gives the Hiragana and Katakana chapters parallel unit names', () => {
    // These two chapters teach the same structure in two scripts. Where the
    // material is identical the names are identical; where it genuinely
    // differs (unit 4 and 5) the names still share a shape.
    const [hiragana, katakana] = curriculum;
    const h = hiragana.units.map((u) => u.title);
    const k = katakana.units.map((u) => u.title);

    expect(h).toHaveLength(k.length);
    expect(h.slice(0, 3)).toEqual(k.slice(0, 3));
    expect(h.at(-1)).toMatch(/^First /);
    expect(k.at(-1)).toMatch(/^First /);
  });

  it('has no leading, trailing, or doubled whitespace', () => {
    expect(allTitles.filter((t) => t !== t.trim() || /\s\s/.test(t))).toEqual([]);
  });
});
