import type { SeedChapter, SeedCard } from './types';

const kana = (char: string, romaji: string, mnemonic: string): SeedCard => ({
  front: { char },
  back: { romaji, mnemonic }
});

const base: SeedCard[] = [
  kana('あ', 'a', 'An "A" with an extra loop — say "ahh"'),
  kana('い', 'i', 'Two eels swimming side by side — "ee"'),
  kana('う', 'u', 'A face in profile going "oooh"'),
  kana('え', 'e', 'An exotic bird with a long neck'),
  kana('お', 'o', 'Like あ but with a golf tee — "oh!"'),
  kana('か', 'ka', 'A kite with a string trailing'),
  kana('き', 'ki', 'A key with a loop and a tooth'),
  kana('く', 'ku', 'A bird beak opening — "coo"'),
  kana('け', 'ke', 'A tall pole with a flag — "keh"'),
  kana('こ', 'ko', 'Two short lines like a comb'),
  kana('さ', 'sa', 'A fishing hook with a slash — "sah"'),
  kana('し', 'shi', 'A single fishhook curving up — "shee"'),
  kana('す', 'su', 'A swirl like a spring — "soo"'),
  kana('せ', 'se', 'A well with a crossbar — "seh"'),
  kana('そ', 'so', 'A zigzag stitch — "so"'),
  kana('た', 'ta', 'A cross with a tail — "tah"'),
  kana('ち', 'chi', 'A little curl like a number 5 — "chee"'),
  kana('つ', 'tsu', 'A wave or tsunami curling — "tsoo"'),
  kana('て', 'te', 'A hand reaching out — "teh"'),
  kana('と', 'to', 'A toe kicking a corner — "toh"'),
  kana('な', 'na', 'A cross with a curl — "nah"'),
  kana('に', 'ni', 'Two chopsticks side by side — "nee"'),
  kana('ぬ', 'nu', 'A noodle being slurped — "noo"'),
  kana('ね', 'ne', 'A cat curling its tail — "neh"'),
  kana('の', 'no', 'A single loop like the word "no" spiraling'),
  kana('は', 'ha', 'A stick figure laughing — "hah"'),
  kana('ひ', 'hi', 'A smiling face in profile — "hee"'),
  kana('ふ', 'fu', 'Mount Fuji\'s silhouette — "foo"'),
  kana('へ', 'he', 'A gentle slope — "heh"'),
  kana('ほ', 'ho', 'A pole with two flags — "ho ho ho"'),
  kana('ま', 'ma', 'A loop with a knot — "mah"'),
  kana('み', 'mi', 'A curl like a swan\'s neck — "mee"'),
  kana('む', 'mu', 'A cow\'s face chewing — "moo"'),
  kana('め', 'me', 'An eye winking shut — "meh"'),
  kana('も', 'mo', 'A fishhook with an extra bar — "moh"'),
  kana('や', 'ya', 'A slingshot — "yah"'),
  kana('ゆ', 'yu', 'A hot spring bucket — "yoo"'),
  kana('よ', 'yo', 'A fishing float bobbing — "yoh"'),
  kana('ら', 'ra', 'A rabbit\'s ear flopping — "rah"'),
  kana('り', 'ri', 'Two thin strokes standing — "ree"'),
  kana('る', 'ru', 'A loop like a spiral — "roo"'),
  kana('れ', 're', 'A person leaning back — "reh"'),
  kana('ろ', 'ro', 'A rolled-up scroll — "roh"'),
  kana('わ', 'wa', 'A swan floating — "wah"'),
  kana('を', 'wo', 'A wo-man dancing, rarely used except as a particle'),
  kana('ん', 'n', 'A single curl with no vowel — the only standalone "n"')
];

const dakuten: SeedCard[] = [
  kana('が', 'ga', 'か plus two marks — voiced ka'),
  kana('ぎ', 'gi', 'き plus two marks — voiced ki'),
  kana('ぐ', 'gu', 'く plus two marks — voiced ku'),
  kana('げ', 'ge', 'け plus two marks — voiced ke'),
  kana('ご', 'go', 'こ plus two marks — voiced ko'),
  kana('ざ', 'za', 'さ plus two marks — voiced sa'),
  kana('じ', 'ji', 'し plus two marks — voiced shi becomes ji'),
  kana('ず', 'zu', 'す plus two marks — voiced su becomes zu'),
  kana('ぜ', 'ze', 'せ plus two marks — voiced se'),
  kana('ぞ', 'zo', 'そ plus two marks — voiced so'),
  kana('だ', 'da', 'た plus two marks — voiced ta'),
  kana('ぢ', 'ji', 'ち plus two marks — voiced chi becomes ji, rare'),
  kana('づ', 'zu', 'つ plus two marks — voiced tsu becomes zu, rare'),
  kana('で', 'de', 'て plus two marks — voiced te'),
  kana('ど', 'do', 'と plus two marks — voiced to'),
  kana('ば', 'ba', 'は plus two marks — voiced ha becomes ba'),
  kana('び', 'bi', 'ひ plus two marks — voiced hi becomes bi'),
  kana('ぶ', 'bu', 'ふ plus two marks — voiced fu becomes bu'),
  kana('べ', 'be', 'へ plus two marks — voiced he becomes be'),
  kana('ぼ', 'bo', 'ほ plus two marks — voiced ho becomes bo'),
  kana('ぱ', 'pa', 'は plus a circle — half-voiced ha becomes pa'),
  kana('ぴ', 'pi', 'ひ plus a circle — half-voiced hi becomes pi'),
  kana('ぷ', 'pu', 'ふ plus a circle — half-voiced fu becomes pu'),
  kana('ぺ', 'pe', 'へ plus a circle — half-voiced he becomes pe'),
  kana('ぽ', 'po', 'ほ plus a circle — half-voiced ho becomes po')
];

const youon: SeedCard[] = [
  kana('きゃ', 'kya', 'き + small ゃ — one syllable, "kya"'),
  kana('きゅ', 'kyu', 'き + small ゅ — one syllable, "kyu"'),
  kana('きょ', 'kyo', 'き + small ょ — one syllable, "kyo"'),
  kana('しゃ', 'sha', 'し + small ゃ — one syllable, "sha"'),
  kana('しゅ', 'shu', 'し + small ゅ — one syllable, "shu"'),
  kana('しょ', 'sho', 'し + small ょ — one syllable, "sho"'),
  kana('ちゃ', 'cha', 'ち + small ゃ — one syllable, "cha"'),
  kana('ちゅ', 'chu', 'ち + small ゅ — one syllable, "chu"'),
  kana('ちょ', 'cho', 'ち + small ょ — one syllable, "cho"'),
  kana('にゃ', 'nya', 'に + small ゃ — one syllable, "nya" (cat sound)'),
  kana('にゅ', 'nyu', 'に + small ゅ — one syllable, "nyu"'),
  kana('にょ', 'nyo', 'に + small ょ — one syllable, "nyo"'),
  kana('ひゃ', 'hya', 'ひ + small ゃ — one syllable, "hya"'),
  kana('ひゅ', 'hyu', 'ひ + small ゅ — one syllable, "hyu"'),
  kana('ひょ', 'hyo', 'ひ + small ょ — one syllable, "hyo"'),
  kana('みゃ', 'mya', 'み + small ゃ — one syllable, "mya"'),
  kana('みゅ', 'myu', 'み + small ゅ — one syllable, "myu"'),
  kana('みょ', 'myo', 'み + small ょ — one syllable, "myo"'),
  kana('りゃ', 'rya', 'り + small ゃ — one syllable, "rya"'),
  kana('りゅ', 'ryu', 'り + small ゅ — one syllable, "ryu"'),
  kana('りょ', 'ryo', 'り + small ょ — one syllable, "ryo"'),
  kana('ぎゃ', 'gya', 'ぎ + small ゃ — one syllable, "gya"'),
  kana('ぎゅ', 'gyu', 'ぎ + small ゅ — one syllable, "gyu"'),
  kana('ぎょ', 'gyo', 'ぎ + small ょ — one syllable, "gyo"'),
  kana('じゃ', 'ja', 'じ + small ゃ — one syllable, "ja"'),
  kana('じゅ', 'ju', 'じ + small ゅ — one syllable, "ju"'),
  kana('じょ', 'jo', 'じ + small ょ — one syllable, "jo"'),
  kana('びゃ', 'bya', 'び + small ゃ — one syllable, "bya"'),
  kana('びゅ', 'byu', 'び + small ゅ — one syllable, "byu"'),
  kana('びょ', 'byo', 'び + small ょ — one syllable, "byo"'),
  kana('ぴゃ', 'pya', 'ぴ + small ゃ — one syllable, "pya"'),
  kana('ぴゅ', 'pyu', 'ぴ + small ゅ — one syllable, "pyu"'),
  kana('ぴょ', 'pyo', 'ぴ + small ょ — one syllable, "pyo"')
];

const special: SeedCard[] = [
  kana('っ', 'tsu (small)', 'Doubles the next consonant — a brief pause'),
  kana('ー', 'long vowel', 'Extends the preceding vowel by one beat'),
  kana('ん + b/p', 'm', 'ん becomes an "m" sound before b and p — せんぱい is "sempai"')
];

const verb = (word: string, reading: string, meaning: string, example_sentence: string): SeedCard => ({
  front: { word },
  back: { reading, meaning, example_sentence }
});

const anchorVerbs: SeedCard[] = [
  verb('たべる', 'たべる', 'to eat', 'ごはんをたべる。(I eat rice.)'),
  verb('のむ', 'のむ', 'to drink', 'みずをのむ。(I drink water.)'),
  verb('いく', 'いく', 'to go', 'がっこうにいく。(I go to school.)'),
  verb('くる', 'くる', 'to come', 'ともだちがくる。(A friend comes.)'),
  verb('みる', 'みる', 'to see / watch', 'テレビをみる。(I watch TV.)'),
  verb('きく', 'きく', 'to listen / ask', 'おんがくをきく。(I listen to music.)'),
  verb('かう', 'かう', 'to buy', 'ほんをかう。(I buy a book.)'),
  verb('かえる', 'かえる', 'to return home', 'いえにかえる。(I return home.)'),
  verb('おきる', 'おきる', 'to wake up', 'あさおきる。(I wake up in the morning.)'),
  verb('ねる', 'ねる', 'to sleep', 'よるねる。(I sleep at night.)'),
  verb('はなす', 'はなす', 'to speak', 'にほんごをはなす。(I speak Japanese.)'),
  verb('よむ', 'よむ', 'to read', 'ほんをよむ。(I read a book.)')
];

export const hiraganaChapter: SeedChapter = {
  title: 'Hiragana',
  kind: 'kana',
  units: [
    { title: 'Base gojuon', kind: 'kana', dailyCap: 15, cards: base },
    { title: 'Dakuten & handakuten', kind: 'kana', dailyCap: 15, cards: dakuten },
    { title: 'Combination kana (youon)', kind: 'kana', dailyCap: 15, cards: youon },
    { title: 'Special characters', kind: 'kana', dailyCap: 15, cards: special },
    { title: 'Anchor verbs', kind: 'vocab', dailyCap: 8, cards: anchorVerbs }
  ]
};
