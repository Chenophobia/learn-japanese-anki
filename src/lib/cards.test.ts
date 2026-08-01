import { describe, it, expect } from 'vitest';
import { parseCardFaces } from './cards';

describe('parseCardFaces', () => {
  it('round-trips a kana card', () => {
    const { front, back } = parseCardFaces(
      JSON.stringify({ char: 'あ' }),
      JSON.stringify({ romaji: 'a', mnemonic: 'An apple.' })
    );
    expect(front).toEqual({ char: 'あ' });
    expect(back).toEqual({ romaji: 'a', mnemonic: 'An apple.' });
  });

  it('round-trips a vocab card', () => {
    const { front, back } = parseCardFaces(
      JSON.stringify({ word: '水' }),
      JSON.stringify({ reading: 'みず', meaning: 'water', example_sentence: '水を飲む。' })
    );
    expect(front).toEqual({ word: '水' });
    expect(back).toEqual({ reading: 'みず', meaning: 'water', example_sentence: '水を飲む。' });
  });

  it('throws on malformed JSON rather than returning junk', () => {
    expect(() => parseCardFaces('{not json', '{}')).toThrow();
    expect(() => parseCardFaces('{}', 'nope')).toThrow();
  });
});
