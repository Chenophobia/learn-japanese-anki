import type { UnitKind, CardFront, CardBack } from '$lib/cards';

export type SeedCard = { front: CardFront; back: CardBack };

export type SeedUnit = {
  title: string;
  kind: UnitKind;
  dailyCap: number;
  cards: SeedCard[];
};

/**
 * A chapter's kind is its track — the heading it appears under on the course
 * map. It is a grouping label, not a constraint on its units: the Hiragana
 * and Katakana chapters each contain one `vocab` unit.
 */
export type ChapterKind = 'kana' | 'kanji' | 'vocab' | 'grammar';

export type SeedChapter = {
  title: string;
  kind: ChapterKind;
  units: SeedUnit[];
};
