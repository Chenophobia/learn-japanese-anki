import type { SeedChapter } from './types';
import { groupIntoChapters, type ChapterSpec } from './group';
import { hiraganaChapter } from './hiragana';
import { katakanaChapter } from './katakana';
import { kanjiUnits } from './kanji';
import { vocabUnits } from './vocab';
import { grammarUnits } from './grammar';

/**
 * Chapter composition for the kanji, vocabulary, and grammar tracks.
 *
 * Units are named, never sliced by index — see groupIntoChapters, which
 * throws if a title is unknown, claimed twice, or claimed by nobody. That
 * check is why this list can be reordered safely.
 *
 * Chapters are declared in track order (kanji, then vocab, then grammar) and
 * the two kana chapters lead the curriculum. The course map draws a track
 * heading wherever `kind` changes, so contiguity here is what stops a
 * heading from repeating. `content.test.ts` asserts it.
 *
 * Grouping is thematic, which reorders some units relative to the previous
 * curriculum ("Work & school" now precedes "Adjectives"). That is safe
 * because vocabulary buckets and N4 grammar points do not depend on each
 * other. Card order *within* a unit is untouched.
 */
const CHAPTER_SPECS: ChapterSpec[] = [
  {
    title: 'Basic Kanji',
    kind: 'kanji',
    // "Basic" is deliberate: these four units are a foundational subset, not
    // comprehensive kanji coverage.
    unitTitles: [
      'Core & most useful',
      'Numbers, time & money',
      'Daily-life verbs & adjectives',
      'Places, directions & nature'
    ]
  },
  {
    title: 'Everyday Life',
    kind: 'vocab',
    unitTitles: [
      'Daily verbs',
      'Time expressions',
      'Food & restaurants',
      'Shopping & money',
      'Transport & directions'
    ]
  },
  {
    title: 'People, Places & Work',
    kind: 'vocab',
    unitTitles: [
      'People & relationships',
      'Health & body',
      'Home & living spaces',
      'Weather & seasons',
      'Work & school',
      'City life & entertainment'
    ]
  },
  {
    title: 'Describing & Feeling',
    kind: 'vocab',
    unitTitles: ['Adjectives', 'Feelings & emotions', 'Frequency & quantity adverbs']
  },
  {
    title: 'Toward N4',
    kind: 'vocab',
    unitTitles: [
      'Verbs — motion, change & giving',
      'Verbs — communication & thought',
      'Nouns — abstract & everyday',
      'Particles',
      'Reading vocabulary'
    ]
  },
  {
    title: 'Linking Actions',
    kind: 'grammar',
    unitTitles: [
      'Sequence — after doing',
      'Purpose — in order to',
      'Simultaneous actions — while doing',
      'Listing actions — doing this & that'
    ]
  },
  {
    title: 'Intention & Attempt',
    kind: 'grammar',
    unitTitles: [
      'Trying — try doing & want to try',
      'Change of state — become able to / stop doing',
      'Completion — end up doing'
    ]
  },
  {
    title: 'Thoughts, Guessing & Conditions',
    kind: 'grammar',
    unitTitles: [
      'Reported thoughts — I think / they said',
      'Speculation — might be, probably, should be',
      'Hearsay & appearance — apparently, looks like',
      'Comparison — as much as, to the extent that',
      'Conditionals — if',
      'Contrast — even though'
    ]
  },
  {
    title: 'Advanced Verb Forms',
    kind: 'grammar',
    unitTitles: [
      'Favors — giving & receiving',
      'Causative — make/let someone do',
      'Passive — it was done to me',
      'Ability — potential form'
    ]
  }
];

export const curriculum: SeedChapter[] = [
  hiraganaChapter,
  katakanaChapter,
  ...groupIntoChapters([...kanjiUnits, ...vocabUnits, ...grammarUnits], CHAPTER_SPECS)
];

export type { SeedChapter, SeedUnit, SeedCard, ChapterKind } from './types';
