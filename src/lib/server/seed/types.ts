import type { UnitKind, CardFront, CardBack } from '$lib/cards';

export type SeedCard = { front: CardFront; back: CardBack };

export type SeedUnit = {
  title: string;
  kind: UnitKind;
  dailyCap: number;
  cards: SeedCard[];
};

export type SeedChapter = {
  title: string;
  kind: 'kana' | 'kanji_vocab' | 'grammar';
  units: SeedUnit[];
};
