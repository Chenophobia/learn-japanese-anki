# Curriculum plan — content roadmap for the app

> **Note (post-restructure):** this doc predates the curriculum restructure and still describes the original 4-chapter shape below as if it shipped that way. It didn't: the app now has **11 chapters across 4 tracks** — Alphabet (Hiragana, Katakana), Kanji (Basic Kanji), Vocabulary (Everyday Life; People, Places & Work; Describing & Feeling; Toward N4), Grammar (Linking Actions; Intention & Attempt; Thoughts, Guessing & Conditions; Advanced Verb Forms). The content inventory below (kana lists, kanji sets, vocab words, grammar patterns) is still accurate as _source material_ — it's only the chapter/track grouping that's stale. For the authoritative current grouping, see `src/lib/server/seed/index.ts` (`CHAPTER_SPECS`), which throws at seed time if a unit title is unknown, claimed twice, or unclaimed, so it can't drift from what's actually loaded.

Source: `Japanese_N4_Full_Course.pdf` (52-week self-study course, 3 phases, targets JLPT N4). This doc extracts every deck/card-worthy piece of content from that PDF and remaps it into **app chapters**, with hiragana and katakana pulled forward as Chapter 1 and 2 (the PDF already teaches them first as "Phase 1, Weeks 1–7" — we're just renaming/reorganizing the container, not changing the pedagogical order).

This is the seed-data roadmap. Nothing here is code yet — it's what the decks/cards need to contain before we design the schema. The chapter map immediately below reflects the _original_ 4-chapter proposal, not the shipped structure — see the note above.

## Chapter map

| App Chapter                | Source (PDF)                                             | Content                                                                                                                    | Card count (approx)    |
| -------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **1 — Hiragana**           | Phase 1, Weeks 1–2                                       | Full 46 base kana + 25 dakuten/handakuten + 33 combination kana (youon) + 3 special characters                             | ~107                   |
| **2 — Katakana**           | Phase 1, Weeks 3–7                                       | Same structure as hiragana (46 + 25 + 33) + special extended katakana + loanword vocab                                     | ~104 + ~19 loanwords   |
| **3 — Kanji & Vocabulary** | Phase 1 Weeks 8–12 (kanji) + Phase 2 Weeks 13–32 (vocab) | 76 core kanji in 4 thematic sets + ~230 vocabulary words across 17 themed units                                            | ~76 kanji + ~230 vocab |
| **4 — Grammar & Reading**  | Phase 3, Weeks 33–52                                     | 17 grammar patterns/points (course advertises "15", actual distinct patterns counted below) + reading practice + exam prep | ~30 pattern cards      |

The PDF's own "Pareto" framing (page 1) is worth keeping as product copy: 92 kana + top 150 kanji + 400 high-frequency words + 8 core grammar patterns cover 80% of everyday Japanese. Front-load those.

---

## Chapter 1 — Hiragana

The PDF doesn't enumerate every base hiragana character (it just points to the Tofugu guide) — only the dakuten and combination rows are spelled out explicitly, because those are what a listening-first learner (the user's stated situation) is expected to already partially know. **For the app to be self-contained (no dependency on an external site for card content), Chapter 1 needs the full standard set below**, not just the gaps.

**Base gojuon (46):**

```
あ い う え お
か き く け こ
さ し す せ そ
た ち つ て と
な に ぬ ね の
は ひ ふ へ ほ
ま み む め も
や 　 ゆ 　 よ
ら り る れ ろ
わ 　 　 　 を
ん
```

**Dakuten / handakuten (25)** — voiced/semi-voiced variants:

```
が ぎ ぐ げ ご  (ga gi gu ge go)
ざ じ ず ぜ ぞ  (za ji zu ze zo)
だ ぢ づ で ど  (da di du de do)
ば び ぶ べ ぼ  (ba bi bu be bo)
ぱ ぴ ぷ ぺ ぽ  (pa pi pu pe po)
```

**Combination kana / youon (33)** — small ゃゅょ combined with i-row consonants:

```
きゃ きゅ きょ   しゃ しゅ しょ   ちゃ ちゅ ちょ
にゃ にゅ にょ   ひゃ ひゅ ひょ   みゃ みゅ みょ
りゃ りゅ りょ   ぎゃ ぎゅ ぎょ   じゃ じゅ じょ
びゃ びゅ びょ   ぴゃ ぴゅ ぴょ
```

**Special characters (3):**

- ん (n/m) — syllable-final nasal; sounds like "m" before b/p sounds.
- っ (small tsu) — doubles the following consonant, brief pause.
- ー (long vowel mark) — extends the preceding vowel (katakana context mainly, but conceptually taught here too).

**Anchor vocabulary (12 verbs, PDF Week 2)** — used to bridge "I know this sound" → "I can read this":

| Word   | Reading | Meaning         |
| ------ | ------- | --------------- |
| たべる | たべる  | to eat          |
| のむ   | のむ    | to drink        |
| いく   | いく    | to go           |
| くる   | くる    | to come         |
| みる   | みる    | to see / watch  |
| きく   | きく    | to listen / ask |
| かう   | かう    | to buy          |
| かえる | かえる  | to return home  |
| おきる | おきる  | to wake up      |
| ねる   | ねる    | to sleep        |
| はなす | はなす  | to speak        |
| よむ   | よむ    | to read         |

**Card template:** Front = single kana character. Back = romaji + a memory-mnemonic image/phrase (e.g. ぬ → "nu — looks like a noodle being slurped"). For the 12-verb set: Front = Japanese, Back = English meaning (reading is redundant — pure hiragana already IS the reading).

---

## Chapter 2 — Katakana

Same structural pattern as hiragana (46 base + 25 dakuten + 33 combination), since katakana is phonetically a parallel alphabet. PDF explicitly enumerates the base 46 with mnemonics (reproduced below), which is more complete than its hiragana treatment.

**Base 46 with mnemonics (from PDF, rows a–n):**

| Kana | Reading | Mnemonic                           |
| ---- | ------- | ---------------------------------- |
| ア   | a       | looks like a capital A             |
| イ   | i       | two lines — Roman numeral II       |
| ウ   | u       | a fish with a crown                |
| エ   | e       | I-beam with two crossbars          |
| オ   | o       | a person carrying a cross          |
| カ   | ka      | a katakana bird shape              |
| キ   | ki      | a key sticking up                  |
| ク   | ku      | a bird beak — "koo"                |
| ケ   | ke      | K with lower arm detached          |
| コ   | ko      | two sides of a corner              |
| サ   | sa      | a cursive s                        |
| シ   | shi     | three lines smiling — a happy face |
| ス   | su      | a swan's neck                      |
| セ   | se      | a bent antenna                     |
| ソ   | so      | two diagonal slashes               |
| タ   | ta      | a stylised ta                      |
| チ   | chi     | cheerleader arm raised             |
| ツ   | tsu     | three dots and a stroke            |
| テ   | te      | letter T with a hat                |
| ト   | to      | a toe stubbing a wall              |
| ナ   | na      | a nail hit sideways                |
| ニ   | ni      | two strokes — like kanji 2         |
| ヌ   | nu      | a noodle shape                     |
| ネ   | ne      | a cat's face                       |
| ノ   | no      | a single slanted stroke            |
| ハ   | ha      | two legs spread wide               |
| ヒ   | hi      | letter F with longer arm           |
| フ   | fu      | a fishhook                         |
| ヘ   | he      | looks exactly like hiragana へ     |
| ホ   | ho      | a cross plus two lines — ho ho ho  |
| マ   | ma      | a thumb's up                       |
| ミ   | mi      | three short strokes                |
| ム   | mu      | a cow's face — "muu"               |
| メ   | me      | crossed eyes                       |
| モ   | mo      | more lines than ma                 |
| ヤ   | ya      | arms raised in a ya!               |
| ユ   | yu      | U shape with top line              |
| ヨ   | yo      | three lines on one side            |
| ラ   | ra      | like ku with bottom arm            |
| リ   | ri      | two downward strokes               |
| ル   | ru      | a route on a map                   |
| レ   | re      | a single swooping line             |
| ロ   | ro      | a rectangle — mouth                |
| ワ   | wa      | W with right leg removed           |
| ン   | n       | like so (ソ) but mirrored          |

**Hardest pairs (PDF flags explicitly):** シ (shi) vs ツ (tsu), ソ (so) vs ン (n). Rule of thumb: horizontal-leaning strokes = shi/so; vertical-leaning strokes = tsu/n.

**Dakuten (25)** and **combination kana (33)** — same pattern as hiragana, katakana equivalents (ガギグゲゴ, ザジズゼゾ, ダヂヅデド, バビブベボ, パピプペポ; キャキュキョ etc.).

**Special extended katakana** (for loanwords, PDF Week 6):

| Form                | Reading     | Usage                                                   |
| ------------------- | ----------- | ------------------------------------------------------- |
| ー                  | long vowel  | extends previous vowel — e.g. コーヒー (koohii, coffee) |
| ヴ                  | vu          | foreign names — e.g. violin                             |
| ファ フィ フェ フォ | fa fi fe fo | fashion, cafe, etc.                                     |
| ティ ディ           | ti di       | party (パーティー), etc.                                |

**Loanword vocabulary (practice reading, ~19 words):**

| Word           | Reading     | Meaning     |
| -------------- | ----------- | ----------- |
| コーヒー       | koohii      | coffee      |
| タクシー       | takushii    | taxi        |
| テスト         | tesuto      | test        |
| アイスクリーム | aisukuriimu | ice cream   |
| カメラ         | kamera      | camera      |
| コンサート     | konsaato    | concert     |
| スーパー       | suupaa      | supermarket |
| ノート         | nooto       | notebook    |
| ホテル         | hoteru      | hotel       |
| ハンバーガー   | hanbaagaa   | hamburger   |
| ニュース       | nyuusu      | news        |
| フルーツ       | furuutsu    | fruit       |
| ナイフ         | naifu       | knife       |

Plus a fluency drill sentence (Week 7): スマートフォン、インターネット、レストラン、コンビニ、スーパー、バス、タクシー、ホテル、コーヒー、アイスクリーム、テレビ、ラジオ、カメラ、ノート、テスト、ゲーム、スポーツ、サッカー、テニス、バスケット

**Card template:** identical to hiragana — Front = kana, Back = romaji + mnemonic.

**Milestone (end of Ch. 2):** read any hiragana or katakana with no hesitation (<1 sec/char), even without knowing meaning.

---

## Chapter 3 — Kanji & Vocabulary

> As shipped, this content is split across five chapters in two different tracks, not one: the Kanji track's "Basic Kanji" chapter (3a below) and the Vocabulary track's four chapters — Everyday Life, People/Places & Work, Describing & Feeling, and Toward N4 — which regroup the 17 vocab units thematically (3b below). See `src/lib/server/seed/index.ts` for the exact grouping.

### 3a. Kanji (76 total, in 4 thematic sets of ~19–20)

**Set 1 — Core/most useful (Week 8):**

| Kanji | Readings    | Meaning / example                            |
| ----- | ----------- | -------------------------------------------- |
| 日    | にち / ひ   | day, sun — 日本 (Japan), 今日 (today)        |
| 本    | ほん / もと | book, origin — 日本 (Japan)                  |
| 人    | じん / ひと | person — 日本人 (Japanese person)            |
| 月    | つき / がつ | moon, month — 一月 (January)                 |
| 年    | ねん / とし | year — 今年 (this year), 来年 (next year)    |
| 大    | だい / おお | big, great — 大学 (university), 大きい (big) |
| 学    | がく / まな | study — 大学 (university), 学生 (student)    |
| 生    | せい / い   | life, birth — 学生 (student), 先生 (teacher) |
| 先    | せん / さき | ahead, previous — 先生 (teacher)             |
| 私    | わたし      | I, me — 私は (I am)                          |
| 国    | くに / こく | country — 外国 (foreign country)             |
| 今    | いま / こん | now — 今日 (today), 今年 (this year)         |
| 時    | じ / とき   | time, hour — 何時 (what time)                |
| 何    | なに / なん | what — 何時 (what time)                      |
| 食    | た / しょく | eat, food — 食べる (to eat)                  |
| 飲    | の / いん   | drink — 飲む (to drink)                      |
| 行    | い / こう   | go — 行く (to go), 銀行 (bank)               |
| 来    | く / らい   | come — 来る (to come), 来週 (next week)      |
| 見    | み / けん   | see — 見る (to see)                          |
| 聞    | き / もん   | listen, ask — 聞く (to listen)               |

**Set 2 — Numbers, time, money (Week 9):**

| Kanji | Readings      | Meaning / example                  |
| ----- | ------------- | ---------------------------------- |
| 一    | いち / ひと   | one — 一つ (one thing)             |
| 二    | に / ふた     | two — 二つ (two things)            |
| 三    | さん / み     | three — 三時 (3 o'clock)           |
| 四    | し / よ       | four — 四月 (April)                |
| 五    | ご / いつ     | five — 五月 (May)                  |
| 六    | ろく / むっ   | six — 六時 (6 o'clock)             |
| 七    | しち / なな   | seven — 七月 (July)                |
| 八    | はち / やっ   | eight — 八月 (August)              |
| 九    | く / きゅう   | nine — 九時 (9 o'clock)            |
| 十    | じゅう / とお | ten — 十月 (October)               |
| 百    | ひゃく        | hundred — 三百円 (300 yen)         |
| 千    | せん          | thousand — 千円 (1,000 yen)        |
| 万    | まん          | ten thousand — 一万円 (10,000 yen) |
| 円    | えん          | yen — 百円 (100 yen)               |
| 時間  | じかん        | duration — 一時間 (one hour)       |
| 分    | ふん / ぶん   | minute — 三十分 (30 minutes)       |
| 半    | はん          | half — 三時半 (3:30)               |
| 前    | まえ / ぜん   | before, front — 午前 (a.m.)        |
| 後    | あと / ご     | after — 午後 (p.m.)                |
| 駅    | えき          | station — 東京駅 (Tokyo Station)   |

**Set 3 — Daily-life verbs & adjectives (Week 10):**

| Kanji | Readings      | Meaning / example                         |
| ----- | ------------- | ----------------------------------------- |
| 言    | い / げん     | say — 言う (to say), 言葉 (word)          |
| 書    | か / しょ     | write — 書く (to write)                   |
| 読    | よ / どく     | read — 読む (to read)                     |
| 話    | はな / わ     | speak — 話す (to speak), 電話 (telephone) |
| 買    | か / ばい     | buy — 買う (to buy), 買い物 (shopping)    |
| 売    | う / ばい     | sell — 売る (to sell)                     |
| 使    | つか / し     | use — 使う (to use)                       |
| 思    | おも / し     | think — 思う (to think)                   |
| 知    | し / ち       | know — 知る (to know)                     |
| 待    | ま / たい     | wait — 待つ (to wait)                     |
| 好    | す / こう     | like — 好き (favourite)                   |
| 多    | おお / た     | many — 多い (many), 多分 (probably)       |
| 少    | すく / しょう | few — 少ない (few), 少し (a little)       |
| 高    | たか / こう   | high, expensive — 高い (expensive)        |
| 安    | やす / あん   | cheap — 安い (cheap), 安全 (safe)         |
| 新    | あたら / しん | new — 新しい (new), 新幹線 (shinkansen)   |
| 古    | ふる / こ     | old — 古い (old)                          |
| 長    | なが / ちょう | long — 長い (long)                        |
| 短    | みじか / たん | short — 短い (short)                      |
| 広    | ひろ / こう   | wide — 広い (wide), 広場 (plaza)          |

**Set 4 — Places, directions, nature (Week 11):**

| Kanji | Readings      | Meaning / example                            |
| ----- | ------------- | -------------------------------------------- |
| 店    | みせ / てん   | store — お店 (shop)                          |
| 道    | みち / どう   | road — 道 (road)                             |
| 電    | でん          | electricity — 電車 (train), 電話 (telephone) |
| 車    | くるま / しゃ | car — 電車 (train), 車 (car)                 |
| 気    | き / げ       | spirit — 天気 (weather), 元気 (healthy)      |
| 天    | てん / あま   | sky — 天気 (weather)                         |
| 水    | みず / すい   | water — 水曜日 (Wednesday)                   |
| 火    | ひ / か       | fire — 火曜日 (Tuesday)                      |
| 木    | き / もく     | tree — 木曜日 (Thursday)                     |
| 金    | かね / きん   | money — 金曜日 (Friday), お金 (money)        |
| 土    | つち / ど     | earth — 土曜日 (Saturday)                    |
| 上    | うえ / じょう | above — 上手 (skillful)                      |
| 下    | した / か     | below — 地下鉄 (subway)                      |
| 中    | なか / ちゅう | inside — 中国 (China)                        |
| 外    | そと / がい   | outside — 外国人 (foreigner)                 |
| 右    | みぎ / う     | right direction                              |
| 左    | ひだり / さ   | left direction                               |
| 東    | ひがし / とう | east — 東京 (Tokyo)                          |
| 西    | にし / せい   | west — 関西 (Kansai)                         |
| 南    | みなみ / なん | south — 南口 (south exit)                    |

**Card template:** Front = kanji alone. Back = meaning + main reading + 1 example word.

### 3b. Vocabulary (17 themed weekly units, 8–14 words each, ~230 words total)

Card template for all of these: **Front = Japanese word (with kanji). Back = reading in hiragana + English meaning + one example sentence.** The example sentence is the important part — shows the word in context.

**Week 13 — Daily verbs:** 起きる(おきる, wake up)・寝る(ねる, sleep)・食べる(たべる, eat)・飲む(のむ, drink)・着る(きる, wear-upper)・履く(はく, wear-shoes)・洗う(あらう, wash)・作る(つくる, make)・掃除する(そうじする, clean)・洗濯する(せんたくする, do laundry)・料理する(りょうりする, cook)・出かける(でかける, go out)・帰る(かえる, return home)・休む(やすむ, rest)・働く(はたらく, work)・勉強する(べんきょうする, study)

**Week 14 — Time expressions:** 今日(きょう, today)・明日(あした, tomorrow)・昨日(きのう, yesterday)・今週(こんしゅう, this week)・来週(らいしゅう, next week)・先週(せんしゅう, last week)・今月(こんげつ, this month)・来月(らいげつ, next month)・今年(ことし, this year)・来年(らいねん, next year)・毎日(まいにち, every day)・毎週(まいしゅう, every week)・いつも(always)・ときどき(sometimes)・たまに(occasionally)・もう(already/not anymore)

**Week 15 — Food & restaurants:** ご飯(ごはん, rice/meal)・パン(bread)・肉(にく, meat)・魚(さかな, fish)・野菜(やさい, vegetables)・果物(くだもの, fruit)・卵(たまご, egg)・牛乳(ぎゅうにゅう, milk)・水(みず, water)・お茶(おちゃ, green tea)・おいしい(delicious)・まずい(bad tasting)・辛い(からい, spicy)・甘い(あまい, sweet)・注文する(ちゅうもんする, to order)・会計(かいけい, the bill)

**Week 16 — Shopping & money (counters):** いくら(how much)・高い(たかい, expensive)・安い(やすい, cheap)・払う(はらう, to pay)・買い物(かいもの, shopping)・財布(さいふ, wallet)・クレジットカード(credit card)・レシート(receipt)・〜円(えん, yen)・一つ/二つ/三つ(ひとつ/ふたつ/みっつ, counter: things)・〜枚(まい, flat things)・〜本(ほん, long thin things)・〜杯(はい, cups/glasses)・〜個(こ, small objects)・〜台(だい, machines/vehicles)・〜冊(さつ, books)

**Week 17 — Transport & directions:** 電車(でんしゃ, train)・バス(bus)・地下鉄(ちかてつ, subway)・タクシー(taxi)・駅(えき, station)・空港(くうこう, airport)・右(みぎ, right)・左(ひだり, left)・まっすぐ(straight ahead)・曲がる(まがる, to turn)・乗る(のる, get on/ride)・降りる(おりる, get off)・乗り換える(のりかえる, transfer trains)・切符(きっぷ, ticket)・〜番線(ばんせん, platform number)・出口(でぐち, exit)

**Week 18 — People & relationships:** 家族(かぞく, family)・父(ちち, my father)・母(はは, my mother)・お父さん(おとうさん, someone's father)・お母さん(おかあさん, someone's mother)・兄(あに, older brother)・姉(あね, older sister)・弟(おとうと, younger brother)・妹(いもうと, younger sister)・友達(ともだち, friend)・彼氏(かれし, boyfriend)・彼女(かのじょ, girlfriend/she)・同僚(どうりょう, colleague)・上司(じょうし, boss)・部下(ぶか, subordinate)・知り合い(しりあい, acquaintance)

**Week 19 — Health & body:** 頭(あたま, head)・目(め, eye)・耳(みみ, ear)・鼻(はな, nose)・口(くち, mouth)・手(て, hand)・足(あし, foot/leg)・お腹(おなか, stomach)・痛い(いたい, painful)・熱(ねつ, fever)・風邪(かぜ, cold-illness)・薬(くすり, medicine)・病院(びょういん, hospital)・医者(いしゃ, doctor)・大丈夫(だいじょうぶ, okay/fine)・疲れた(つかれた, tired)

**Week 20 — Home & living spaces:** 家(いえ, house)・部屋(へや, room)・台所(だいどころ, kitchen)・お風呂(おふろ, bath)・トイレ(toilet)・玄関(げんかん, entrance hall)・窓(まど, window)・ドア(door)・机(つくえ, desk)・椅子(いす, chair)・冷蔵庫(れいぞうこ, refrigerator)・洗濯機(せんたくき, washing machine)・エアコン(air conditioner)・電気(でんき, electricity/lights)・鍵(かぎ, key/lock)・隣(となり, next door/neighbour)

**Week 21 — Weather & seasons:** 天気(てんき, weather)・晴れ(はれ, sunny)・曇り(くもり, cloudy)・雨(あめ, rain)・雪(ゆき, snow)・風(かぜ, wind)・暑い(あつい, hot)・寒い(さむい, cold)・暖かい(あたたかい, warm)・涼しい(すずしい, cool)・春(はる, spring)・夏(なつ, summer)・秋(あき, autumn)・冬(ふゆ, winter)・台風(たいふう, typhoon)・湿気(しっけ, humidity)

**Week 22 — Adjectives:** 大きい(おおきい, big)・小さい(ちいさい, small)・長い(ながい, long)・短い(みじかい, short)・重い(おもい, heavy)・軽い(かるい, light)・難しい(むずかしい, difficult)・やさしい(easy/kind)・面白い(おもしろい, interesting/funny)・つまらない(boring)・便利(べんり, convenient — na-adj)・不便(ふべん, inconvenient)・大切(たいせつ, important — na-adj)・有名(ゆうめい, famous)・親切(しんせつ, kind — na-adj)・丈夫(じょうぶ, sturdy/strong)

**Week 23 — Work & school:** 会社(かいしゃ, company)・仕事(しごと, work/job)・会議(かいぎ, meeting)・報告(ほうこく, report)・締め切り(しめきり, deadline)・休憩(きゅうけい, break)・学校(がっこう, school)・授業(じゅぎょう, class)・宿題(しゅくだい, homework)・試験(しけん, exam)・成績(せいせき, grades)・卒業する(そつぎょうする, graduate)・入学する(にゅうがくする, enter school)・遅刻する(ちこくする, be late)・欠席する(けっせきする, be absent)・予定(よてい, schedule/plans)

**Week 24 — City life & entertainment:** 映画(えいが, movie)・音楽(おんがく, music)・コンサート(concert)・公園(こうえん, park)・図書館(としょかん, library)・郵便局(ゆうびんきょく, post office)・銀行(ぎんこう, bank)・コンビニ(convenience store)・デパート(department store)・旅行(りょこう, travel)・予約する(よやくする, make a reservation)・入場料(にゅうじょうりょう, admission fee)・営業時間(えいぎょうじかん, business hours)・定休日(ていきゅうび, regular closing day)・混む(こむ, be crowded)・並ぶ(ならぶ, queue up)

**Week 25 — Feelings & emotions:** 嬉しい(うれしい, happy)・悲しい(かなしい, sad)・怖い(こわい, scary)・恥ずかしい(はずかしい, embarrassed)・寂しい(さびしい, lonely)・楽しい(たのしい, fun)・退屈(たいくつ, bored — na-adj)・緊張する(きんちょうする, be nervous)・安心する(あんしんする, feel relieved)・心配する(しんぱいする, worry)・びっくりする(be surprised)・困る(こまる, be in trouble)・怒る(おこる, get angry)・泣く(なく, cry)・笑う(わらう, laugh/smile)・愛する(あいする, love)

**Week 26 — Frequency & quantity adverbs:** たくさん(many)・少し(すこし, a little)・ちょっと(a little, casual)・全部(ぜんぶ, all/everything)・全然〜ない(ぜんぜん〜ない, not at all)・あまり〜ない(not very much)・とても(very)・かなり(quite)・だいたい(approximately)・もっと(more)・まだ(still/not yet)・もう(already)・ほとんど(almost/mostly)・特に(とくに, especially)・やはり/やっぱり(as expected)・なかなか(quite/not easily)

**Week 27 — N4 verbs: motion, change & giving:** 変わる(かわる, change-intr)・変える(かえる, change-trans)・始まる(はじまる, begin-intr)・始める(はじめる, begin-trans)・終わる(おわる, end-intr)・入る(はいる, enter)・出る(でる, exit/leave)・渡る(わたる, cross)・渡す(わたす, hand over)・あげる(give-to other)・もらう(receive)・くれる(give-to me)・貸す(かす, lend)・借りる(かりる, borrow)・返す(かえす, return item)・集める(あつめる, collect)

**Week 28 — N4 verbs: communication & thought:** 説明する(せつめいする, explain)・紹介する(しょうかいする, introduce)・確認する(かくにんする, confirm)・連絡する(れんらくする, contact)・約束する(やくそくする, promise)・比べる(くらべる, compare)・選ぶ(えらぶ, choose)・決める(きめる, decide)・忘れる(わすれる, forget)・覚える(おぼえる, remember)・考える(かんがえる, think/consider)・調べる(しらべる, investigate)・伝える(つたえる, convey/tell)・頼む(たのむ, ask/request)・断る(ことわる, refuse)・相談する(そうだんする, consult)

**Week 29 — N4 nouns: abstract & everyday concepts:** 理由(りゆう, reason)・方法(ほうほう, method)・場合(ばあい, case/situation)・問題(もんだい, problem)・答え(こたえ, answer)・意味(いみ, meaning)・目的(もくてき, purpose)・経験(けいけん, experience)・機会(きかい, opportunity)・準備(じゅんび, preparation)・練習(れんしゅう, practice)・生活(せいかつ, life/lifestyle)・習慣(しゅうかん, habit/custom)・文化(ぶんか, culture)・社会(しゃかい, society)・自然(しぜん, nature)

**Week 30 — Particles deep dive (beyond は/が/を):** に(to/at/for)・で(at, location of action / by means of)・から(from/because)・まで(until/as far as)・より(than)・ほど(to the extent of)・だけ(only)・しか〜ない(only, with negative)・も(also/even)・の(nominaliser)・と(and/with/quotation)・や(and, non-exhaustive list)・ね(right?/seeking agreement)・よ(assertion)・か(or/question marker)・って(casual quotation/topic marker)

**Week 31 — Reading vocabulary (NHK Web Easy specific):** 見出し(みだし, headline)・〜によると(according to)・〜という(called/which says)・〜について(about/regarding)・〜として(as, in the role of)・〜ため(because of/in order to)・〜場合(ばあい, in the case of)・〜以上(いじょう, more than/at least)・〜以下(いか, less than/at most)・〜中(じゅう, throughout/in the middle of)

**Week 32 — Phase review week.** No new content — pure consolidation. (App equivalent: a "review only, no new cards" week toggle.)

**Milestone (end of Ch. 3):** 600+ active vocabulary words, 76 kanji recognized, basic reading ability — ready for grammar-focused reading.

---

## Chapter 4 — Grammar & Reading

> As shipped, this content forms its own track (Grammar) split into four chapters — Linking Actions, Intention & Attempt, Thoughts/Guessing & Conditions, and Advanced Verb Forms — grouped thematically rather than by week. See `src/lib/server/seed/index.ts` for the exact grouping.

Card template: Front = grammar pattern. Back = meaning + example sentence (+ a second variant pattern where the week covers a pair/triplet, per the pairings below).

| Week | Pattern(s)                                            | Meaning                                                 | Example                                                           |
| ---- | ----------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| 33   | 〜てから / 〜た後で                                   | after doing / after doing (formal)                      | 食べてから歯を磨きます。(After eating, I brush my teeth.)         |
| 34   | 〜てみる / 〜てみたい                                 | try doing / want to try doing                           | 日本料理を作ってみました。(I tried making Japanese food.)         |
| 35   | Verb+ために / Noun+のために                           | in order to / for the sake of                           | 日本語を勉強するために毎日練習しています。                        |
| 36   | 〜ながら                                              | while doing (two simultaneous actions)                  | 音楽を聞きながら勉強します。                                      |
| 37   | 〜と思う / 〜と思っている / 〜と言っていた            | I think / I believe / was saying that                   | 明日は雨が降ると思います。                                        |
| 38   | 〜かもしれない / 〜でしょう / 〜はずだ                | might be / probably / should be                         | 明日は雨かもしれません。                                          |
| 39   | い-adj〜ければ / verb stem+ば / noun/na-adj+なら      | conditional (if)                                        | 安ければ買います。                                                |
| 40   | 〜のに (vs 〜が)                                      | even though (frustration/surprise)                      | 一生懸命勉強したのに試験に落ちた。                                |
| 41   | 〜ようになる / 〜なくなる                             | become able to / stop doing                             | 日本語が読めるようになりました。                                  |
| 42   | 〜てしまう / 〜ちゃった                               | end up doing (completion/regret) / casual form          | ケーキを全部食べてしまいました。                                  |
| 43   | 〜てあげる / 〜てもらう / 〜てくれる                  | do for someone / have done for me / someone does for me | 友達に日本語を教えてあげました。                                  |
| 44   | 〜らしい / 〜そうだ (hearsay) / 〜そうだ (appearance) | apparently / I heard that / looks like                  | 明日は雪が降るらしいです。                                        |
| 45   | 〜させる / 〜させてください / 〜させられる            | causative (make/let do) / please let me / be made to    | 子供に野菜を食べさせました。                                      |
| 46   | 受身形 〜れる / られる                                | passive voice                                           | 先生に褒められました。                                            |
| 47   | 〜ことができる / short potential form / 〜られない    | ability (be able to do / cannot do)                     | 日本語を話すことができます。 / 食べられる、飲める、読める、書ける |
| 48   | 〜たり〜たりする                                      | listing actions non-exhaustively                        | 週末は映画を見たり買い物したりします。                            |
| 49   | 〜ほど〜ない / 〜くらい / 〜ほど                      | not as much as / about, approx / to the extent that     | 東京ほど大きくないです。                                          |
| 50   | Reading week — no new grammar                         | full article comprehension practice                     | NHK Web Easy, 3 articles + Tadoku Level 1 reader                  |
| 51   | N4 exam strategy                                      | JLPT section breakdown                                  | 文字語彙 25min, 文法+読解 40min combined section, 聴解 30min      |
| 52   | Final review                                          | consolidation, free writing, "what's next" (N3 preview) | write 10 original sentences, no dictionary                        |

That's **17 distinct grammar patterns/pairings** across weeks 33–49 (course cover copy rounds to "15 grammar patterns" — close enough, some weeks bundle 2–3 related forms into one lesson).

**Milestone (end of Ch. 4 / end of course):** full N4 foundation — scripts, ~800 vocabulary words, ~200+ kanji (76 explicit + incidental exposure), all core N4 grammar. Ready for JLPT N4 practice tests and N3.

---

## Pacing & app-level scheduling notes

These are the PDF's own pacing numbers — useful defaults for the app's "new cards/day" settings per chapter, independent of the FSRS review-scheduling logic already documented in `docs/fsrs-algorithm.md`:

| Chapter        | New cards/day (source)                                                           | Session length |
| -------------- | -------------------------------------------------------------------------------- | -------------- |
| 1 — Hiragana   | Gap-filling only (not all 46 — only characters that take >2 sec to recall)       | ~15 min/day    |
| 2 — Katakana   | ~10 characters/week (a whole row), then a full week of speed-drill consolidation | ~15 min/day    |
| 3 — Kanji      | 3 new kanji/day                                                                  | ~15 min/day    |
| 3 — Vocabulary | 8 new words/day                                                                  | ~15 min/day    |
| 4 — Grammar    | 4 new vocab/day (continues) + 1–2 new grammar points/week                        | ~15–20 min/day |

Daily structure the source recommends (all phases): **Anki reviews first, always** (never skip — "the spaced repetition system breaks down when you skip") → new content block → 2–3 min producing 2–3 original sentences using what was just learned. Worth carrying into the app as a fixed "review → learn → produce" session shape, and worth surfacing a strong "reviews first" nudge in the UI given how explicitly the source calls this out as rule #1.

Review-only weeks exist by design (Week 12, Week 32, Week 50) — the app should support a "no new cards this session, review only" mode per chapter, not just a global pause.

## Open questions before schema design

- Do we store Chapter 3's kanji and vocabulary as separate deck types (kanji cards vs. vocab cards have different Front/Back shapes), or unify into one "vocabulary" deck with an optional kanji-only card variant? Leaning toward separate, since their card templates genuinely differ (kanji: character→meaning+reading+example word; vocab: word→reading+meaning+example sentence).
- Grammar cards (Chapter 4) don't fit the Card interface from `fsrs-algorithm.md` any differently — same FSRS scheduling applies, just a different template for what's displayed.
- Loanword/katakana practice vocab (Week 5–7) — fold into Chapter 2 as bonus cards, or promote into Chapter 3's vocab pool since they're real words with meanings? Leaning toward keeping them in Chapter 2 since their pedagogical purpose is katakana-reading fluency, not vocabulary acquisition.
