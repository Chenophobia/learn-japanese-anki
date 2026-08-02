import type { SeedChapter, SeedCard } from './types';

const kana = (char: string, romaji: string, mnemonic: string): SeedCard => ({
  front: { char },
  back: { romaji, mnemonic }
});

const base: SeedCard[] = [
  kana('ア', 'a', 'looks like a capital A'),
  kana('イ', 'i', 'two lines — Roman numeral II'),
  kana('ウ', 'u', 'a fish with a crown'),
  kana('エ', 'e', 'I-beam with two crossbars'),
  kana('オ', 'o', 'a person carrying a cross'),
  kana('カ', 'ka', 'a katakana bird shape'),
  kana('キ', 'ki', 'a key sticking up'),
  kana('ク', 'ku', 'a bird beak — "koo"'),
  kana('ケ', 'ke', 'K with lower arm detached'),
  kana('コ', 'ko', 'two sides of a corner'),
  kana('サ', 'sa', 'a cursive s'),
  kana('シ', 'shi', 'three lines smiling, horizontal-leaning — a happy face (shi, not tsu)'),
  kana('ス', 'su', "a swan's neck"),
  kana('セ', 'se', 'a bent antenna'),
  kana('ソ', 'so', 'two diagonal slashes, horizontal-leaning — so (not n)'),
  kana('タ', 'ta', 'a stylised ta'),
  kana('チ', 'chi', 'cheerleader arm raised'),
  kana('ツ', 'tsu', 'three dots and a stroke, vertical-leaning — tsu (not shi)'),
  kana('テ', 'te', 'letter T with a hat'),
  kana('ト', 'to', 'a toe stubbing a wall'),
  kana('ナ', 'na', 'a nail hit sideways'),
  kana('ニ', 'ni', 'two strokes — like kanji 2'),
  kana('ヌ', 'nu', 'a noodle shape'),
  kana('ネ', 'ne', "a cat's face"),
  kana('ノ', 'no', 'a single slanted stroke'),
  kana('ハ', 'ha', 'two legs spread wide'),
  kana('ヒ', 'hi', 'letter F with longer arm'),
  kana('フ', 'fu', 'a fishhook'),
  kana('ヘ', 'he', 'looks exactly like hiragana へ'),
  kana('ホ', 'ho', 'a cross plus two lines — ho ho ho'),
  kana('マ', 'ma', "a thumb's up"),
  kana('ミ', 'mi', 'three short strokes'),
  kana('ム', 'mu', 'a cow\'s face — "muu"'),
  kana('メ', 'me', 'crossed eyes'),
  kana('モ', 'mo', 'more lines than ma'),
  kana('ヤ', 'ya', 'arms raised in a ya!'),
  kana('ユ', 'yu', 'U shape with top line'),
  kana('ヨ', 'yo', 'three lines on one side'),
  kana('ラ', 'ra', 'like ku with bottom arm'),
  kana('リ', 'ri', 'two downward strokes'),
  kana('ル', 'ru', 'a route on a map'),
  kana('レ', 're', 'a single swooping line'),
  kana('ロ', 'ro', 'a rectangle — mouth'),
  kana('ワ', 'wa', 'W with right leg removed'),
  kana('ヲ', 'wo', 'ワ with an extra shelf on top'),
  kana('ン', 'n', 'like so (ソ) but mirrored, vertical-leaning — n (not so)')
];

const dakuten: SeedCard[] = [
  kana('ガ', 'ga', 'カ plus two marks — voiced ka'),
  kana('ギ', 'gi', 'キ plus two marks — voiced ki'),
  kana('グ', 'gu', 'ク plus two marks — voiced ku'),
  kana('ゲ', 'ge', 'ケ plus two marks — voiced ke'),
  kana('ゴ', 'go', 'コ plus two marks — voiced ko'),
  kana('ザ', 'za', 'サ plus two marks — voiced sa'),
  kana('ジ', 'ji', 'シ plus two marks — voiced shi becomes ji'),
  kana('ズ', 'zu', 'ス plus two marks — voiced su becomes zu'),
  kana('ゼ', 'ze', 'セ plus two marks — voiced se'),
  kana('ゾ', 'zo', 'ソ plus two marks — voiced so'),
  kana('ダ', 'da', 'タ plus two marks — voiced ta'),
  kana('ヂ', 'ji', 'チ plus two marks — voiced chi becomes ji, rare'),
  kana('ヅ', 'zu', 'ツ plus two marks — voiced tsu becomes zu, rare'),
  kana('デ', 'de', 'テ plus two marks — voiced te'),
  kana('ド', 'do', 'ト plus two marks — voiced to'),
  kana('バ', 'ba', 'ハ plus two marks — voiced ha becomes ba'),
  kana('ビ', 'bi', 'ヒ plus two marks — voiced hi becomes bi'),
  kana('ブ', 'bu', 'フ plus two marks — voiced fu becomes bu'),
  kana('ベ', 'be', 'ヘ plus two marks — voiced he becomes be'),
  kana('ボ', 'bo', 'ホ plus two marks — voiced ho becomes bo'),
  kana('パ', 'pa', 'ハ plus a circle — half-voiced ha becomes pa'),
  kana('ピ', 'pi', 'ヒ plus a circle — half-voiced hi becomes pi'),
  kana('プ', 'pu', 'フ plus a circle — half-voiced fu becomes pu'),
  kana('ペ', 'pe', 'ヘ plus a circle — half-voiced he becomes pe'),
  kana('ポ', 'po', 'ホ plus a circle — half-voiced ho becomes po')
];

const youon: SeedCard[] = [
  kana('キャ', 'kya', 'キ + small ャ — one syllable, "kya"'),
  kana('キュ', 'kyu', 'キ + small ュ — one syllable, "kyu"'),
  kana('キョ', 'kyo', 'キ + small ョ — one syllable, "kyo"'),
  kana('シャ', 'sha', 'シ + small ャ — one syllable, "sha"'),
  kana('シュ', 'shu', 'シ + small ュ — one syllable, "shu"'),
  kana('ショ', 'sho', 'シ + small ョ — one syllable, "sho"'),
  kana('チャ', 'cha', 'チ + small ャ — one syllable, "cha"'),
  kana('チュ', 'chu', 'チ + small ュ — one syllable, "chu"'),
  kana('チョ', 'cho', 'チ + small ョ — one syllable, "cho"'),
  kana('ニャ', 'nya', 'ニ + small ャ — one syllable, "nya" (cat sound)'),
  kana('ニュ', 'nyu', 'ニ + small ュ — one syllable, "nyu"'),
  kana('ニョ', 'nyo', 'ニ + small ョ — one syllable, "nyo"'),
  kana('ヒャ', 'hya', 'ヒ + small ャ — one syllable, "hya"'),
  kana('ヒュ', 'hyu', 'ヒ + small ュ — one syllable, "hyu"'),
  kana('ヒョ', 'hyo', 'ヒ + small ョ — one syllable, "hyo"'),
  kana('ミャ', 'mya', 'ミ + small ャ — one syllable, "mya"'),
  kana('ミュ', 'myu', 'ミ + small ュ — one syllable, "myu"'),
  kana('ミョ', 'myo', 'ミ + small ョ — one syllable, "myo"'),
  kana('リャ', 'rya', 'リ + small ャ — one syllable, "rya"'),
  kana('リュ', 'ryu', 'リ + small ュ — one syllable, "ryu"'),
  kana('リョ', 'ryo', 'リ + small ョ — one syllable, "ryo"'),
  kana('ギャ', 'gya', 'ギ + small ャ — one syllable, "gya"'),
  kana('ギュ', 'gyu', 'ギ + small ュ — one syllable, "gyu"'),
  kana('ギョ', 'gyo', 'ギ + small ョ — one syllable, "gyo"'),
  kana('ジャ', 'ja', 'ジ + small ャ — one syllable, "ja"'),
  kana('ジュ', 'ju', 'ジ + small ュ — one syllable, "ju"'),
  kana('ジョ', 'jo', 'ジ + small ョ — one syllable, "jo"'),
  kana('ビャ', 'bya', 'ビ + small ャ — one syllable, "bya"'),
  kana('ビュ', 'byu', 'ビ + small ュ — one syllable, "byu"'),
  kana('ビョ', 'byo', 'ビ + small ョ — one syllable, "byo"'),
  kana('ピャ', 'pya', 'ピ + small ャ — one syllable, "pya"'),
  kana('ピュ', 'pyu', 'ピ + small ュ — one syllable, "pyu"'),
  kana('ピョ', 'pyo', 'ピ + small ョ — one syllable, "pyo"')
];

const extended: SeedCard[] = [
  kana('ヴ', 'vu', 'ウ plus two marks — for foreign "v" sounds, e.g. violin'),
  kana('ファ', 'fa', 'フ + small ァ — "fa" as in fashion'),
  kana('フィ', 'fi', 'フ + small ィ — "fi" as in cafe'),
  kana('フェ', 'fe', 'フ + small ェ — "fe" as in cafe'),
  kana('フォ', 'fo', 'フ + small ォ — "fo" as in fork'),
  kana('ティ', 'ti', 'テ + small ィ — "ti" as in party'),
  kana('ディ', 'di', 'デ + small ィ — "di" as in radio'),
  kana('ウォ', 'wo', 'ウ + small ォ — "wo" as in ウォーター (water)')
];

const verb = (
  word: string,
  reading: string,
  meaning: string,
  example_sentence: string
): SeedCard => ({
  front: { word },
  back: { reading, meaning, example_sentence }
});

const loanwords: SeedCard[] = [
  verb('コーヒー', 'コーヒー', 'coffee', 'コーヒーをのみます。(I drink coffee.)'),
  verb('タクシー', 'タクシー', 'taxi', 'タクシーにのります。(I get in a taxi.)'),
  verb('テスト', 'テスト', 'test', 'あしたテストがあります。(There is a test tomorrow.)'),
  verb(
    'アイスクリーム',
    'アイスクリーム',
    'ice cream',
    'アイスクリームをたべます。(I eat ice cream.)'
  ),
  verb('カメラ', 'カメラ', 'camera', 'カメラでしゃしんをとります。(I take a photo with a camera.)'),
  verb('コンサート', 'コンサート', 'concert', 'コンサートにいきます。(I go to a concert.)'),
  verb(
    'スーパー',
    'スーパー',
    'supermarket',
    'スーパーでかいものをします。(I shop at the supermarket.)'
  ),
  verb('ノート', 'ノート', 'notebook', 'ノートにかきます。(I write in a notebook.)'),
  verb('ホテル', 'ホテル', 'hotel', 'ホテルにとまります。(I stay at a hotel.)'),
  verb('ハンバーガー', 'ハンバーガー', 'hamburger', 'ハンバーガーをたべます。(I eat a hamburger.)'),
  verb('ニュース', 'ニュース', 'news', 'ニュースをみます。(I watch the news.)'),
  verb('フルーツ', 'フルーツ', 'fruit', 'フルーツがすきです。(I like fruit.)'),
  verb('ナイフ', 'ナイフ', 'knife', 'ナイフをつかいます。(I use a knife.)'),
  verb(
    'スマートフォン',
    'スマートフォン',
    'smartphone',
    'スマートフォンをつかいます。(I use a smartphone.)'
  ),
  verb(
    'インターネット',
    'インターネット',
    'internet',
    'インターネットでしらべます。(I look it up on the internet.)'
  ),
  verb('レストラン', 'レストラン', 'restaurant', 'レストランでたべます。(I eat at a restaurant.)'),
  verb(
    'コンビニ',
    'コンビニ',
    'convenience store',
    'コンビニでべんとうをかいます。(I buy a bento at the convenience store.)'
  ),
  verb('バス', 'バス', 'bus', 'バスにのります。(I get on the bus.)'),
  verb('テレビ', 'テレビ', 'television', 'テレビをみます。(I watch television.)'),
  verb('ラジオ', 'ラジオ', 'radio', 'ラジオをききます。(I listen to the radio.)'),
  verb('ゲーム', 'ゲーム', 'game', 'ゲームをします。(I play a game.)'),
  verb('スポーツ', 'スポーツ', 'sports', 'スポーツがすきです。(I like sports.)'),
  verb('サッカー', 'サッカー', 'soccer', 'サッカーをします。(I play soccer.)'),
  verb('テニス', 'テニス', 'tennis', 'テニスをします。(I play tennis.)'),
  verb('バスケット', 'バスケット', 'basketball', 'バスケットをします。(I play basketball.)')
];

export const katakanaChapter: SeedChapter = {
  title: 'Katakana',
  kind: 'kana',
  units: [
    { title: 'Base 46', kind: 'kana', dailyCap: 15, cards: base },
    { title: 'Dakuten & handakuten', kind: 'kana', dailyCap: 15, cards: dakuten },
    { title: 'Combination kana', kind: 'kana', dailyCap: 15, cards: youon },
    { title: 'Extended sounds', kind: 'kana', dailyCap: 15, cards: extended },
    { title: 'First loanwords', kind: 'vocab', dailyCap: 8, cards: loanwords }
  ]
};
