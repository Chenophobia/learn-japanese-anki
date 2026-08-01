import type { SeedChapter } from './types';
import { hiraganaChapter } from './hiragana';
import { katakanaChapter } from './katakana';
import { kanjiUnits } from './kanji';
import { vocabUnits } from './vocab';
import { grammarChapter } from './grammar';

const kanjiVocabChapter: SeedChapter = {
  title: 'Kanji & Vocabulary',
  kind: 'vocab',
  units: [...kanjiUnits, ...vocabUnits]
};

export const curriculum: SeedChapter[] = [
  hiraganaChapter,
  katakanaChapter,
  kanjiVocabChapter,
  grammarChapter
];

export type { SeedChapter, SeedUnit, SeedCard } from './types';
