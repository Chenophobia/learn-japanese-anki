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
    // "Basic" is deliberate: these four sets are a foundational subset, not
    // comprehensive kanji coverage.
    unitTitles: [
      'Kanji Set 1 — Core & most useful',
      'Kanji Set 2 — Numbers, time & money',
      'Kanji Set 3 — Daily-life verbs & adjectives',
      'Kanji Set 4 — Places, directions & nature'
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
      'N4 verbs: motion, change & giving',
      'N4 verbs: communication & thought',
      'N4 nouns: abstract & everyday concepts',
      'Particles deep dive',
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
      'Listing actions — 〜たり〜たりする'
    ]
  },
  {
    title: 'Intention & Attempt',
    kind: 'grammar',
    unitTitles: [
      'Trying and wanting to try',
      'Change of state — become able to / stop doing',
      'Completion and regret — end up doing'
    ]
  },
  {
    title: 'Thoughts, Guessing & Conditions',
    kind: 'grammar',
    unitTitles: [
      'Reporting thoughts and hearsay — I think / was saying',
      'Speculation — might be, probably, should be',
      'Hearsay and appearance — apparently, looks like',
      'Comparison — as much as, about, to the extent that',
      'Conditionals — if',
      'Contrast — even though'
    ]
  },
  {
    title: 'Advanced Verb Forms',
    kind: 'grammar',
    unitTitles: [
      'Giving and receiving favors',
      'Causative — make/let someone do',
      'Passive voice',
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
