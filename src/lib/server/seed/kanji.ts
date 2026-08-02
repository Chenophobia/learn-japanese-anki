import type { SeedUnit, SeedCard } from './types';

const kanji = (char: string, meaning: string, reading: string, example_word: string): SeedCard => ({
  front: { char },
  back: { meaning, reading, example_word }
});

const set1: SeedCard[] = [
  kanji('日', 'day, sun', 'にち / ひ', '日本 (にほん — Japan)'),
  kanji('本', 'book, origin', 'ほん / もと', '日本 (にほん — Japan)'),
  kanji('人', 'person', 'じん / ひと', '日本人 (にほんじん — Japanese person)'),
  kanji('月', 'moon, month', 'つき / がつ', '一月 (いちがつ — January)'),
  kanji('年', 'year', 'ねん / とし', '今年 (ことし — this year)'),
  kanji('大', 'big, great', 'だい / おお', '大学 (だいがく — university)'),
  kanji('学', 'study', 'がく / まな', '大学 (だいがく — university)'),
  kanji('生', 'life, birth', 'せい / い', '学生 (がくせい — student)'),
  kanji('先', 'ahead, previous', 'せん / さき', '先生 (せんせい — teacher)'),
  kanji('私', 'I, me', 'わたし', '私は (わたしは — I am)'),
  kanji('国', 'country', 'くに / こく', '外国 (がいこく — foreign country)'),
  kanji('今', 'now', 'いま / こん', '今日 (きょう — today)'),
  kanji('時', 'time, hour', 'じ / とき', '何時 (なんじ — what time)'),
  kanji('何', 'what', 'なに / なん', '何時 (なんじ — what time)'),
  kanji('食', 'eat, food', 'た / しょく', '食べる (たべる — to eat)'),
  kanji('飲', 'drink', 'の / いん', '飲む (のむ — to drink)'),
  kanji('行', 'go', 'い / こう', '行く (いく — to go)'),
  kanji('来', 'come', 'く / らい', '来る (くる — to come)'),
  kanji('見', 'see', 'み / けん', '見る (みる — to see)'),
  kanji('聞', 'listen, ask', 'き / もん', '聞く (きく — to listen)')
];

const set2: SeedCard[] = [
  kanji('一', 'one', 'いち / ひと', '一つ (ひとつ — one thing)'),
  kanji('二', 'two', 'に / ふた', '二つ (ふたつ — two things)'),
  kanji('三', 'three', 'さん / み', "三時 (さんじ — 3 o'clock)"),
  kanji('四', 'four', 'し / よ', '四月 (しがつ — April)'),
  kanji('五', 'five', 'ご / いつ', '五月 (ごがつ — May)'),
  kanji('六', 'six', 'ろく / むっ', "六時 (ろくじ — 6 o'clock)"),
  kanji('七', 'seven', 'しち / なな', '七月 (しちがつ — July)'),
  kanji('八', 'eight', 'はち / やっ', '八月 (はちがつ — August)'),
  kanji('九', 'nine', 'く / きゅう', "九時 (くじ — 9 o'clock)"),
  kanji('十', 'ten', 'じゅう / とお', '十月 (じゅうがつ — October)'),
  kanji('百', 'hundred', 'ひゃく', '三百円 (さんびゃくえん — 300 yen)'),
  kanji('千', 'thousand', 'せん', '千円 (せんえん — 1,000 yen)'),
  kanji('万', 'ten thousand', 'まん', '一万円 (いちまんえん — 10,000 yen)'),
  kanji('円', 'yen', 'えん', '百円 (ひゃくえん — 100 yen)'),
  kanji('間', 'interval, between', 'かん / あいだ', '時間 (じかん — duration)'),
  kanji('分', 'minute', 'ふん / ぶん', '三十分 (さんじゅっぷん — 30 minutes)'),
  kanji('半', 'half', 'はん', '三時半 (さんじはん — 3:30)'),
  kanji('前', 'before, front', 'まえ / ぜん', '午前 (ごぜん — a.m.)'),
  kanji('後', 'after', 'あと / ご', '午後 (ごご — p.m.)'),
  kanji('駅', 'station', 'えき', '東京駅 (とうきょうえき — Tokyo Station)')
];

const set3: SeedCard[] = [
  kanji('言', 'say', 'い / げん', '言う (いう — to say)'),
  kanji('書', 'write', 'か / しょ', '書く (かく — to write)'),
  kanji('読', 'read', 'よ / どく', '読む (よむ — to read)'),
  kanji('話', 'speak', 'はな / わ', '話す (はなす — to speak)'),
  kanji('買', 'buy', 'か / ばい', '買う (かう — to buy)'),
  kanji('売', 'sell', 'う / ばい', '売る (うる — to sell)'),
  kanji('使', 'use', 'つか / し', '使う (つかう — to use)'),
  kanji('思', 'think', 'おも / し', '思う (おもう — to think)'),
  kanji('知', 'know', 'し / ち', '知る (しる — to know)'),
  kanji('待', 'wait', 'ま / たい', '待つ (まつ — to wait)'),
  kanji('好', 'like', 'す / こう', '好き (すき — favourite)'),
  kanji('多', 'many', 'おお / た', '多い (おおい — many)'),
  kanji('少', 'few', 'すく / しょう', '少ない (すくない — few)'),
  kanji('高', 'high, expensive', 'たか / こう', '高い (たかい — expensive)'),
  kanji('安', 'cheap', 'やす / あん', '安い (やすい — cheap)'),
  kanji('新', 'new', 'あたら / しん', '新しい (あたらしい — new)'),
  kanji('古', 'old', 'ふる / こ', '古い (ふるい — old)'),
  kanji('長', 'long', 'なが / ちょう', '長い (ながい — long)'),
  kanji('短', 'short', 'みじか / たん', '短い (みじかい — short)'),
  kanji('広', 'wide', 'ひろ / こう', '広い (ひろい — wide)')
];

const set4: SeedCard[] = [
  kanji('店', 'store', 'みせ / てん', 'お店 (おみせ — shop)'),
  kanji('道', 'road', 'みち / どう', '道 (みち — road)'),
  kanji('電', 'electricity', 'でん', '電車 (でんしゃ — train)'),
  kanji('車', 'car', 'くるま / しゃ', '電車 (でんしゃ — train)'),
  kanji('気', 'spirit', 'き / げ', '天気 (てんき — weather)'),
  kanji('天', 'sky', 'てん / あま', '天気 (てんき — weather)'),
  kanji('水', 'water', 'みず / すい', '水曜日 (すいようび — Wednesday)'),
  kanji('火', 'fire', 'ひ / か', '火曜日 (かようび — Tuesday)'),
  kanji('木', 'tree', 'き / もく', '木曜日 (もくようび — Thursday)'),
  kanji('金', 'money', 'かね / きん', '金曜日 (きんようび — Friday)'),
  kanji('土', 'earth', 'つち / ど', '土曜日 (どようび — Saturday)'),
  kanji('上', 'above', 'うえ / じょう', '上手 (じょうず — skillful)'),
  kanji('下', 'below', 'した / か', '地下鉄 (ちかてつ — subway)'),
  kanji('中', 'inside', 'なか / ちゅう', '中国 (ちゅうごく — China)'),
  kanji('外', 'outside', 'そと / がい', '外国人 (がいこくじん — foreigner)'),
  kanji('右', 'right direction', 'みぎ / う', '右手 (みぎて — right hand)'),
  kanji('左', 'left direction', 'ひだり / さ', '左手 (ひだりて — left hand)'),
  kanji('東', 'east', 'ひがし / とう', '東京 (とうきょう — Tokyo)'),
  kanji('西', 'west', 'にし / せい', '関西 (かんさい — Kansai)'),
  kanji('南', 'south', 'みなみ / なん', '南口 (みなみぐち — south exit)')
];

export const kanjiUnits: SeedUnit[] = [
  { title: 'Core & most useful', kind: 'kanji', dailyCap: 3, cards: set1 },
  { title: 'Numbers, time & money', kind: 'kanji', dailyCap: 3, cards: set2 },
  { title: 'Daily-life verbs & adjectives', kind: 'kanji', dailyCap: 3, cards: set3 },
  { title: 'Places, directions & nature', kind: 'kanji', dailyCap: 3, cards: set4 }
];
