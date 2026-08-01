export type UnitKind = 'kana' | 'kanji' | 'vocab' | 'grammar';

export type KanaFront = { char: string };
export type KanaBack = { romaji: string; mnemonic: string };

export type KanjiFront = { char: string };
export type KanjiBack = { meaning: string; reading: string; example_word: string };

export type VocabFront = { word: string };
export type VocabBack = { reading: string; meaning: string; example_sentence: string };

export type GrammarFront = { pattern: string };
export type GrammarBack = { meaning: string; example: string };

export type CardFront = KanaFront | KanjiFront | VocabFront | GrammarFront;
export type CardBack = KanaBack | KanjiBack | VocabBack | GrammarBack;

export function parseCardFaces(
  frontJson: string,
  backJson: string
): { front: CardFront; back: CardBack } {
  return { front: JSON.parse(frontJson), back: JSON.parse(backJson) };
}
