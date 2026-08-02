import type { SeedUnit, SeedCard } from './types';

const vocab = (
  word: string,
  reading: string,
  meaning: string,
  example_sentence: string
): SeedCard => ({
  front: { word },
  back: { reading, meaning, example_sentence }
});

const week13: SeedCard[] = [
  vocab('起きる', 'おきる', 'to wake up', '毎朝七時に起きます。(I wake up at 7 every morning.)'),
  vocab('寝る', 'ねる', 'to sleep', '十一時に寝ます。(I go to sleep at 11.)'),
  vocab('食べる', 'たべる', 'to eat', '朝ご飯を食べます。(I eat breakfast.)'),
  vocab('飲む', 'のむ', 'to drink', '水を飲みます。(I drink water.)'),
  vocab('着る', 'きる', 'to wear (on the upper body)', 'コートを着ます。(I put on a coat.)'),
  vocab('履く', 'はく', 'to wear (on the feet)', '靴を履きます。(I put on my shoes.)'),
  vocab('洗う', 'あらう', 'to wash', '手を洗います。(I wash my hands.)'),
  vocab('作る', 'つくる', 'to make', '晩ご飯を作ります。(I make dinner.)'),
  vocab('掃除する', 'そうじする', 'to clean', '部屋を掃除します。(I clean my room.)'),
  vocab(
    '洗濯する',
    'せんたくする',
    'to do laundry',
    '週末に洗濯します。(I do laundry on the weekend.)'
  ),
  vocab('料理する', 'りょうりする', 'to cook', '毎日料理します。(I cook every day.)'),
  vocab('出かける', 'でかける', 'to go out', '友達と出かけます。(I go out with a friend.)'),
  vocab('帰る', 'かえる', 'to return home', "六時に家に帰ります。(I return home at six o'clock.)"),
  vocab('休む', 'やすむ', 'to rest', '日曜日は休みます。(I rest on Sunday.)'),
  vocab('働く', 'はたらく', 'to work', '会社で働きます。(I work at a company.)'),
  vocab(
    '勉強する',
    'べんきょうする',
    'to study',
    '毎日日本語を勉強します。(I study Japanese every day.)'
  )
];

const week14: SeedCard[] = [
  vocab('今日', 'きょう', 'today', '今日は忙しいです。(Today I am busy.)'),
  vocab('明日', 'あした', 'tomorrow', '明日友達に会います。(Tomorrow I will meet my friend.)'),
  vocab('昨日', 'きのう', 'yesterday', '昨日映画を見ました。(Yesterday I watched a movie.)'),
  vocab('今週', 'こんしゅう', 'this week', '今週は忙しいです。(This week is busy.)'),
  vocab('来週', 'らいしゅう', 'next week', '来週旅行に行きます。(Next week I will go on a trip.)'),
  vocab(
    '先週',
    'せんしゅう',
    'last week',
    '先週病院に行きました。(Last week I went to the hospital.)'
  ),
  vocab('今月', 'こんげつ', 'this month', '今月試験があります。(This month there is an exam.)'),
  vocab('来月', 'らいげつ', 'next month', '来月誕生日です。(Next month is my birthday.)'),
  vocab(
    '今年',
    'ことし',
    'this year',
    '今年日本語を勉強しています。(This year I am studying Japanese.)'
  ),
  vocab('来年', 'らいねん', 'next year', '来年日本に行きます。(Next year I will go to Japan.)'),
  vocab('毎日', 'まいにち', 'every day', '毎日勉強します。(I study every day.)'),
  vocab('毎週', 'まいしゅう', 'every week', '毎週映画を見ます。(I watch a movie every week.)'),
  vocab('いつも', 'いつも', 'always', 'いつも忙しいです。(I am always busy.)'),
  vocab('ときどき', 'ときどき', 'sometimes', 'ときどき料理します。(I sometimes cook.)'),
  vocab('たまに', 'たまに', 'occasionally', 'たまに映画を見ます。(I occasionally watch a movie.)'),
  vocab('もう', 'もう', 'already/not anymore', 'もう晩ご飯を食べました。(I already ate dinner.)')
];

const week15: SeedCard[] = [
  vocab('ご飯', 'ごはん', 'rice/meal', '毎朝ご飯を食べます。(I eat rice every morning.)'),
  vocab('パン', 'パン', 'bread', '朝はパンを食べます。(In the morning I eat bread.)'),
  vocab('肉', 'にく', 'meat', '肉が好きです。(I like meat.)'),
  vocab('魚', 'さかな', 'fish', "魚は食べません。(I don't eat fish.)"),
  vocab('野菜', 'やさい', 'vegetables', "野菜を食べましょう。(Let's eat vegetables.)"),
  vocab('果物', 'くだもの', 'fruit', '果物が好きです。(I like fruit.)'),
  vocab('卵', 'たまご', 'egg', '卵を一つください。(One egg, please.)'),
  vocab('牛乳', 'ぎゅうにゅう', 'milk', '牛乳を飲みます。(I drink milk.)'),
  vocab('水', 'みず', 'water', '水を飲みます。(I drink water.)'),
  vocab('お茶', 'おちゃ', 'green tea', 'お茶を飲みます。(I drink green tea.)'),
  vocab('おいしい', 'おいしい', 'delicious', 'このケーキはおいしいです。(This cake is delicious.)'),
  vocab('まずい', 'まずい', 'bad tasting', 'この料理はまずいです。(This dish tastes bad.)'),
  vocab('辛い', 'からい', 'spicy', 'このカレーは辛いです。(This curry is spicy.)'),
  vocab('甘い', 'あまい', 'sweet', 'このケーキは甘いです。(This cake is sweet.)'),
  vocab('注文する', 'ちゅうもんする', 'to order', 'ラーメンを注文します。(I will order ramen.)'),
  vocab('会計', 'かいけい', 'the bill', '会計をお願いします。(Check, please.)')
];

const week16: SeedCard[] = [
  vocab('いくら', 'いくら', 'how much', 'これはいくらですか。(How much is this?)'),
  vocab('高い', 'たかい', 'expensive', 'このかばんは高いです。(This bag is expensive.)'),
  vocab('安い', 'やすい', 'cheap', 'この店は安いです。(This shop is cheap.)'),
  vocab('払う', 'はらう', 'to pay', 'クレジットカードで払います。(I will pay by credit card.)'),
  vocab(
    '買い物',
    'かいもの',
    'shopping',
    'デパートで買い物します。(I shop at the department store.)'
  ),
  vocab('財布', 'さいふ', 'wallet', '財布を忘れました。(I forgot my wallet.)'),
  vocab(
    'クレジットカード',
    'クレジットカード',
    'credit card',
    'クレジットカードを使います。(I use a credit card.)'
  ),
  vocab('レシート', 'レシート', 'receipt', 'レシートをください。(Please give me the receipt.)'),
  vocab('〜円', 'えん', 'yen', '百円ください。(100 yen, please.)'),
  vocab(
    '一つ/二つ/三つ',
    'ひとつ/ふたつ/みっつ',
    'counter: things',
    '卵を一つください。(One egg, please.)'
  ),
  vocab('〜枚', 'まい', 'flat things', 'レシートを一枚ください。(One receipt, please.)'),
  vocab('〜本', 'ほん', 'long thin things', 'ペンを一本ください。(One pen, please.)'),
  vocab('〜杯', 'はい', 'cups/glasses', 'コーヒーを一杯ください。(One cup of coffee, please.)'),
  vocab('〜個', 'こ', 'small objects', 'パンを一個ください。(One piece of bread, please.)'),
  vocab('〜台', 'だい', 'machines/vehicles', 'テレビを一台ください。(One television, please.)'),
  vocab('〜冊', 'さつ', 'books', '本を一冊ください。(One book, please.)')
];

const week17: SeedCard[] = [
  vocab('電車', 'でんしゃ', 'train', '電車で会社に行きます。(I go to the company by train.)'),
  vocab('地下鉄', 'ちかてつ', 'subway', '地下鉄で駅に行きます。(I go to the station by subway.)'),
  vocab('駅', 'えき', 'station', '駅で待ちます。(I will wait at the station.)'),
  vocab('空港', 'くうこう', 'airport', '空港まで行きます。(I will go to the airport.)'),
  vocab('右', 'みぎ', 'right', '右に曲がってください。(Please turn right.)'),
  vocab('左', 'ひだり', 'left', '左に曲がってください。(Please turn left.)'),
  vocab(
    'まっすぐ',
    'まっすぐ',
    'straight ahead',
    'まっすぐ行ってください。(Please go straight ahead.)'
  ),
  vocab('曲がる', 'まがる', 'to turn', '次の角を曲がります。(I will turn at the next corner.)'),
  vocab('乗る', 'のる', 'to get on / ride', '電車に乗ります。(I get on the train.)'),
  vocab('降りる', 'おりる', 'to get off', '駅で降ります。(I get off at the station.)'),
  vocab(
    '乗り換える',
    'のりかえる',
    'to transfer trains',
    '駅で乗り換えます。(I transfer trains at the station.)'
  ),
  vocab('切符', 'きっぷ', 'ticket', '切符を買います。(I buy a ticket.)'),
  vocab(
    '〜番線',
    'ばんせん',
    'platform number',
    '三番線から出ます。(It departs from platform three.)'
  ),
  vocab('出口', 'でぐち', 'exit', '出口はどこですか。(Where is the exit?)')
];

const week18: SeedCard[] = [
  vocab('家族', 'かぞく', 'family', '家族は四人です。(My family has four people.)'),
  vocab('父', 'ちち', 'my father', '父は会社員です。(My father is a company employee.)'),
  vocab('母', 'はは', 'my mother', '母は先生です。(My mother is a teacher.)'),
  vocab(
    'お父さん',
    'おとうさん',
    "someone's father",
    'お父さんは元気ですか。(Is your father well?)'
  ),
  vocab(
    'お母さん',
    'おかあさん',
    "someone's mother",
    'お母さんはやさしいです。(Your mother is kind.)'
  ),
  vocab('兄', 'あに', 'older brother', '兄は医者です。(My older brother is a doctor.)'),
  vocab('姉', 'あね', 'older sister', '姉は学生です。(My older sister is a student.)'),
  vocab(
    '弟',
    'おとうと',
    'younger brother',
    '弟は学校に行きます。(My younger brother goes to school.)'
  ),
  vocab('妹', 'いもうと', 'younger sister', '妹は音楽が好きです。(My younger sister likes music.)'),
  vocab('友達', 'ともだち', 'friend', '友達と話します。(I talk with my friend.)'),
  vocab('彼氏', 'かれし', 'boyfriend', '彼氏に会います。(I will meet my boyfriend.)'),
  vocab('彼女', 'かのじょ', 'girlfriend/she', '彼女は優しいです。(She is kind.)'),
  vocab(
    '同僚',
    'どうりょう',
    'colleague',
    '同僚と昼ご飯を食べます。(I eat lunch with my colleague.)'
  ),
  vocab('上司', 'じょうし', 'boss', '上司に相談します。(I will consult with my boss.)'),
  vocab('部下', 'ぶか', 'subordinate', '部下に頼みます。(I will ask my subordinate.)'),
  vocab('知り合い', 'しりあい', 'acquaintance', '彼は知り合いです。(He is an acquaintance.)')
];

const week19: SeedCard[] = [
  vocab('頭', 'あたま', 'head', '頭が痛いです。(My head hurts.)'),
  vocab('目', 'め', 'eye', '目が痛いです。(My eyes hurt.)'),
  vocab('耳', 'みみ', 'ear', '耳が痛いです。(My ear hurts.)'),
  vocab('鼻', 'はな', 'nose', '鼻が痛いです。(My nose hurts.)'),
  vocab('口', 'くち', 'mouth', '口を開けてください。(Please open your mouth.)'),
  vocab('手', 'て', 'hand', '手を洗います。(I wash my hands.)'),
  vocab('足', 'あし', 'foot/leg', '足が痛いです。(My leg hurts.)'),
  vocab('お腹', 'おなか', 'stomach', 'お腹が痛いです。(My stomach hurts.)'),
  vocab('痛い', 'いたい', 'painful', '足がとても痛いです。(My leg really hurts.)'),
  vocab('熱', 'ねつ', 'fever', '熱があります。(I have a fever.)'),
  vocab('風邪', 'かぜ', 'cold-illness', '風邪をひきました。(I caught a cold.)'),
  vocab('薬', 'くすり', 'medicine', '薬を飲みます。(I take medicine.)'),
  vocab('病院', 'びょういん', 'hospital', '病院に行きます。(I go to the hospital.)'),
  vocab('医者', 'いしゃ', 'doctor', '医者に見てもらいます。(I will have the doctor look at me.)'),
  vocab('大丈夫', 'だいじょうぶ', 'okay/fine', '大丈夫ですか。(Are you okay?)'),
  vocab('疲れた', 'つかれた', 'tired', '今日はとても疲れました。(Today I was very tired.)')
];

const week20: SeedCard[] = [
  vocab('家', 'いえ', 'house', '家に帰ります。(I return home.)'),
  vocab('部屋', 'へや', 'room', '部屋を掃除します。(I clean my room.)'),
  vocab('台所', 'だいどころ', 'kitchen', '台所で料理します。(I cook in the kitchen.)'),
  vocab('お風呂', 'おふろ', 'bath', 'お風呂に入ります。(I take a bath.)'),
  vocab('トイレ', 'トイレ', 'toilet', 'トイレはどこですか。(Where is the toilet?)'),
  vocab(
    '玄関',
    'げんかん',
    'entrance hall',
    '玄関で靴を脱ぎます。(I take off my shoes at the entrance.)'
  ),
  vocab('窓', 'まど', 'window', '窓を開けます。(I open the window.)'),
  vocab('ドア', 'ドア', 'door', 'ドアを閉めます。(I close the door.)'),
  vocab('机', 'つくえ', 'desk', '机の上に本があります。(There is a book on the desk.)'),
  vocab('椅子', 'いす', 'chair', '椅子に座ります。(I sit on the chair.)'),
  vocab(
    '冷蔵庫',
    'れいぞうこ',
    'refrigerator',
    '冷蔵庫に卵があります。(There are eggs in the refrigerator.)'
  ),
  vocab(
    '洗濯機',
    'せんたくき',
    'washing machine',
    '洗濯機で洗濯します。(I do laundry with the washing machine.)'
  ),
  vocab(
    'エアコン',
    'エアコン',
    'air conditioner',
    'エアコンをつけます。(I turn on the air conditioner.)'
  ),
  vocab('電気', 'でんき', 'electricity/lights', '電気を消します。(I turn off the lights.)'),
  vocab('鍵', 'かぎ', 'key/lock', '鍵をかけます。(I lock the door.)'),
  vocab('隣', 'となり', 'next door/neighbour', '隣の部屋にいます。(I am in the next room.)')
];

const week21: SeedCard[] = [
  vocab('天気', 'てんき', 'weather', '今日は天気がいいです。(The weather is nice today.)'),
  vocab('晴れ', 'はれ', 'sunny', '明日は晴れです。(Tomorrow will be sunny.)'),
  vocab('曇り', 'くもり', 'cloudy', '今日は曇りです。(Today is cloudy.)'),
  vocab('雨', 'あめ', 'rain', '雨が降っています。(It is raining.)'),
  vocab('雪', 'ゆき', 'snow', '雪が降っています。(It is snowing.)'),
  vocab('風', 'かぜ', 'wind', '風が強いです。(The wind is strong.)'),
  vocab('暑い', 'あつい', 'hot', '今日は暑いです。(Today is hot.)'),
  vocab('寒い', 'さむい', 'cold', '今日は寒いです。(Today is cold.)'),
  vocab('暖かい', 'あたたかい', 'warm', '春は暖かいです。(Spring is warm.)'),
  vocab('涼しい', 'すずしい', 'cool', '秋は涼しいです。(Autumn is cool.)'),
  vocab('春', 'はる', 'spring', '春が好きです。(I like spring.)'),
  vocab('夏', 'なつ', 'summer', '夏は暑いです。(Summer is hot.)'),
  vocab('秋', 'あき', 'autumn', '秋は涼しいです。(Autumn is cool.)'),
  vocab('冬', 'ふゆ', 'winter', '冬は寒いです。(Winter is cold.)'),
  vocab('台風', 'たいふう', 'typhoon', '台風が来ます。(A typhoon is coming.)'),
  vocab('湿気', 'しっけ', 'humidity', '夏は湿気が多いです。(Summer has a lot of humidity.)')
];

const week22: SeedCard[] = [
  vocab('大きい', 'おおきい', 'big', 'この家は大きいです。(This house is big.)'),
  vocab('小さい', 'ちいさい', 'small', 'この部屋は小さいです。(This room is small.)'),
  vocab('長い', 'ながい', 'long', 'この道は長いです。(This road is long.)'),
  vocab('短い', 'みじかい', 'short', '髪が短いです。(My hair is short.)'),
  vocab('重い', 'おもい', 'heavy', 'このかばんは重いです。(This bag is heavy.)'),
  vocab('軽い', 'かるい', 'light', 'このノートは軽いです。(This notebook is light.)'),
  vocab('難しい', 'むずかしい', 'difficult', '日本語は難しいです。(Japanese is difficult.)'),
  vocab('やさしい', 'やさしい', 'easy/kind', 'この問題はやさしいです。(This problem is easy.)'),
  vocab(
    '面白い',
    'おもしろい',
    'interesting/funny',
    'この映画は面白いです。(This movie is interesting.)'
  ),
  vocab('つまらない', 'つまらない', 'boring', 'この本はつまらないです。(This book is boring.)'),
  vocab('便利', 'べんり', 'convenient — na-adj', 'このアプリは便利です。(This app is convenient.)'),
  vocab('不便', 'ふべん', 'inconvenient', 'この駅は不便です。(This station is inconvenient.)'),
  vocab('大切', 'たいせつ', 'important — na-adj', '家族は大切です。(Family is important.)'),
  vocab('有名', 'ゆうめい', 'famous', '彼は有名です。(He is famous.)'),
  vocab('親切', 'しんせつ', 'kind — na-adj', '彼女は親切です。(She is kind.)'),
  vocab('丈夫', 'じょうぶ', 'sturdy/strong', 'この机は丈夫です。(This desk is sturdy.)')
];

const week23: SeedCard[] = [
  vocab('会社', 'かいしゃ', 'company', '会社で働きます。(I work at the company.)'),
  vocab('仕事', 'しごと', 'work/job', '仕事が忙しいです。(Work is busy.)'),
  vocab('会議', 'かいぎ', 'meeting', '会議に行きます。(I will go to the meeting.)'),
  vocab('報告', 'ほうこく', 'report', '報告をします。(I will make a report.)'),
  vocab('締め切り', 'しめきり', 'deadline', '締め切りは明日です。(The deadline is tomorrow.)'),
  vocab('休憩', 'きゅうけい', 'break', '少し休憩します。(I will rest a bit.)'),
  vocab('学校', 'がっこう', 'school', '学校に行きます。(I go to school.)'),
  vocab('授業', 'じゅぎょう', 'class', '授業があります。(I have class.)'),
  vocab('宿題', 'しゅくだい', 'homework', '宿題をします。(I will do my homework.)'),
  vocab('試験', 'しけん', 'exam', '試験を受けます。(I will take the exam.)'),
  vocab('成績', 'せいせき', 'grades', '成績がいいです。(My grades are good.)'),
  vocab(
    '卒業する',
    'そつぎょうする',
    'to graduate',
    '大学を卒業します。(I will graduate from university.)'
  ),
  vocab(
    '入学する',
    'にゅうがくする',
    'to enter school',
    '大学に入学します。(I will enter university.)'
  ),
  vocab('遅刻する', 'ちこくする', 'to be late', '学校に遅刻しました。(I was late for school.)'),
  vocab(
    '欠席する',
    'けっせきする',
    'to be absent',
    '授業を欠席しました。(I was absent from class.)'
  ),
  vocab('予定', 'よてい', 'schedule/plans', '明日の予定があります。(I have plans for tomorrow.)')
];

const week24: SeedCard[] = [
  vocab('映画', 'えいが', 'movie', '映画を見ます。(I watch a movie.)'),
  vocab('音楽', 'おんがく', 'music', '音楽を聞きます。(I listen to music.)'),
  vocab('公園', 'こうえん', 'park', '公園で遊びます。(I play at the park.)'),
  vocab('図書館', 'としょかん', 'library', '図書館で本を読みます。(I read a book at the library.)'),
  vocab('郵便局', 'ゆうびんきょく', 'post office', '郵便局に行きます。(I go to the post office.)'),
  vocab('銀行', 'ぎんこう', 'bank', '銀行でお金をおろします。(I withdraw money at the bank.)'),
  vocab(
    'デパート',
    'デパート',
    'department store',
    'デパートで買い物します。(I shop at the department store.)'
  ),
  vocab('旅行', 'りょこう', 'travel', '来週旅行に行きます。(Next week I will go on a trip.)'),
  vocab(
    '予約する',
    'よやくする',
    'to make a reservation',
    'レストランを予約します。(I will make a reservation at the restaurant.)'
  ),
  vocab(
    '入場料',
    'にゅうじょうりょう',
    'admission fee',
    '入場料は千円です。(The admission fee is 1,000 yen.)'
  ),
  vocab(
    '営業時間',
    'えいぎょうじかん',
    'business hours',
    '営業時間は九時から五時までです。(Business hours are from nine to five.)'
  ),
  vocab(
    '定休日',
    'ていきゅうび',
    'regular closing day',
    '定休日は月曜日です。(The regular closing day is Monday.)'
  ),
  vocab(
    '混む',
    'こむ',
    'to be crowded',
    'この店はいつも混んでいます。(This shop is always crowded.)'
  ),
  vocab(
    '並ぶ',
    'ならぶ',
    'to queue up',
    'レストランの前に並びます。(I line up in front of the restaurant.)'
  )
];

const week25: SeedCard[] = [
  vocab('嬉しい', 'うれしい', 'happy', '会えて嬉しいです。(I am happy to meet you.)'),
  vocab('悲しい', 'かなしい', 'sad', 'その話は悲しいです。(That story is sad.)'),
  vocab('怖い', 'こわい', 'scary', 'この映画は怖いです。(This movie is scary.)'),
  vocab('恥ずかしい', 'はずかしい', 'embarrassed', '恥ずかしいです。(I am embarrassed.)'),
  vocab('寂しい', 'さびしい', 'lonely', '一人で寂しいです。(I am lonely by myself.)'),
  vocab('楽しい', 'たのしい', 'fun', '旅行は楽しいです。(The trip is fun.)'),
  vocab('退屈', 'たいくつ', 'bored — na-adj', 'この授業は退屈です。(This class is boring.)'),
  vocab(
    '緊張する',
    'きんちょうする',
    'to be nervous',
    '試験の前に緊張します。(I get nervous before the exam.)'
  ),
  vocab(
    '安心する',
    'あんしんする',
    'to feel relieved',
    '結果を聞いて安心しました。(I felt relieved to hear the result.)'
  ),
  vocab(
    '心配する',
    'しんぱいする',
    'to worry',
    '天気が心配です。(I am worried about the weather.)'
  ),
  vocab(
    'びっくりする',
    'びっくりする',
    'to be surprised',
    'そのニュースにびっくりしました。(I was surprised by that news.)'
  ),
  vocab(
    '困る',
    'こまる',
    'to be in trouble',
    'お金がなくて困っています。(I am in trouble because I have no money.)'
  ),
  vocab('怒る', 'おこる', 'to get angry', '先生が怒りました。(The teacher got angry.)'),
  vocab('泣く', 'なく', 'to cry', '悲しくて泣きました。(I cried because I was sad.)'),
  vocab(
    '笑う',
    'わらう',
    'to laugh/smile',
    '面白くて笑いました。(I laughed because it was funny.)'
  ),
  vocab('愛する', 'あいする', 'to love', '家族を愛しています。(I love my family.)')
];

const week26: SeedCard[] = [
  vocab('たくさん', 'たくさん', 'many', '水をたくさん飲みます。(I drink a lot of water.)'),
  vocab('少し', 'すこし', 'a little', '少し疲れました。(I am a little tired.)'),
  vocab(
    'ちょっと',
    'ちょっと',
    'a little, casual',
    'ちょっと待ってください。(Please wait a moment.)'
  ),
  vocab('全部', 'ぜんぶ', 'all/everything', '全部食べました。(I ate everything.)'),
  vocab(
    '全然〜ない',
    'ぜんぜん〜ない',
    'not at all',
    '全然疲れていません。(I am not tired at all.)'
  ),
  vocab(
    'あまり〜ない',
    'あまり〜ない',
    'not very much',
    'あまり忙しくないです。(I am not very busy.)'
  ),
  vocab('とても', 'とても', 'very', 'とても暑いです。(It is very hot.)'),
  vocab('かなり', 'かなり', 'quite', 'かなり難しいです。(It is quite difficult.)'),
  vocab(
    'だいたい',
    'だいたい',
    'approximately',
    'だいたい分かりました。(I understood approximately.)'
  ),
  vocab('もっと', 'もっと', 'more', 'もっと食べたいです。(I want to eat more.)'),
  vocab(
    'まだ',
    'まだ',
    'still/not yet',
    "まだ宿題をしていません。(I haven't done my homework yet.)"
  ),
  vocab('ほとんど', 'ほとんど', 'almost/mostly', 'ほとんど終わりました。(It is almost finished.)'),
  vocab('特に', 'とくに', 'especially', '特に忙しいです。(I am especially busy.)'),
  vocab(
    'やはり/やっぱり',
    'やはり/やっぱり',
    'as expected',
    'やっぱり日本語は難しいです。(As expected, Japanese is difficult.)'
  ),
  vocab(
    'なかなか',
    'なかなか',
    'quite/not easily',
    "日本語はなかなか上手になりません。(Japanese doesn't easily get better.)"
  )
];

const week27: SeedCard[] = [
  vocab('変わる', 'かわる', 'change-intr', '天気が変わりました。(The weather changed.)'),
  vocab('変える', 'かえる', 'change-trans', '予定を変えました。(I changed the plan.)'),
  vocab('始まる', 'はじまる', 'begin-intr', '授業が始まります。(Class begins.)'),
  vocab('始める', 'はじめる', 'begin-trans', '勉強を始めます。(I will begin studying.)'),
  vocab('終わる', 'おわる', 'end-intr', '仕事が終わりました。(Work has ended.)'),
  vocab('入る', 'はいる', 'enter', '部屋に入ります。(I enter the room.)'),
  vocab('出る', 'でる', 'exit/leave', '部屋を出ます。(I leave the room.)'),
  vocab('渡る', 'わたる', 'cross', '道を渡ります。(I cross the road.)'),
  vocab('渡す', 'わたす', 'hand over', '本を渡します。(I hand over the book.)'),
  vocab(
    'あげる',
    'あげる',
    'give-to other',
    '友達にプレゼントをあげました。(I gave my friend a present.)'
  ),
  vocab(
    'もらう',
    'もらう',
    'receive',
    '友達にプレゼントをもらいました。(I received a present from my friend.)'
  ),
  vocab(
    'くれる',
    'くれる',
    'give-to me',
    '友達がプレゼントをくれました。(My friend gave me a present.)'
  ),
  vocab('貸す', 'かす', 'lend', '本を貸します。(I will lend the book.)'),
  vocab('借りる', 'かりる', 'borrow', '本を借ります。(I will borrow the book.)'),
  vocab('返す', 'かえす', 'return item', '本を返します。(I will return the book.)'),
  vocab('集める', 'あつめる', 'collect', '切手を集めます。(I collect stamps.)')
];

const week28: SeedCard[] = [
  vocab('説明する', 'せつめいする', 'explain', '先生が説明します。(The teacher explains.)'),
  vocab('紹介する', 'しょうかいする', 'introduce', '友達を紹介します。(I introduce my friend.)'),
  vocab('確認する', 'かくにんする', 'confirm', '予定を確認します。(I confirm the schedule.)'),
  vocab('連絡する', 'れんらくする', 'contact', '友達に連絡します。(I contact my friend.)'),
  vocab(
    '約束する',
    'やくそくする',
    'promise',
    '友達と約束します。(I make a promise with my friend.)'
  ),
  vocab('比べる', 'くらべる', 'compare', '二つを比べます。(I compare the two.)'),
  vocab('選ぶ', 'えらぶ', 'choose', '本を選びます。(I choose a book.)'),
  vocab('決める', 'きめる', 'decide', '予定を決めます。(I decide the schedule.)'),
  vocab('忘れる', 'わすれる', 'forget', '宿題を忘れました。(I forgot my homework.)'),
  vocab('覚える', 'おぼえる', 'remember', '漢字を覚えます。(I memorize kanji.)'),
  vocab('考える', 'かんがえる', 'think/consider', '将来を考えます。(I think about the future.)'),
  vocab('調べる', 'しらべる', 'investigate', '意味を調べます。(I look up the meaning.)'),
  vocab('伝える', 'つたえる', 'convey/tell', '気持ちを伝えます。(I convey my feelings.)'),
  vocab('頼む', 'たのむ', 'ask/request', '友達に頼みます。(I ask my friend for a favor.)'),
  vocab('断る', 'ことわる', 'refuse', '誘いを断ります。(I decline the invitation.)'),
  vocab('相談する', 'そうだんする', 'consult', '先生に相談します。(I consult with the teacher.)')
];

const week29: SeedCard[] = [
  vocab('理由', 'りゆう', 'reason', '理由を説明します。(I will explain the reason.)'),
  vocab('方法', 'ほうほう', 'method', '勉強の方法を考えます。(I think about a study method.)'),
  vocab(
    '場合',
    'ばあい',
    'case/situation',
    'その場合は連絡してください。(In that case, please contact me.)'
  ),
  vocab('問題', 'もんだい', 'problem', 'この問題は難しいです。(This problem is difficult.)'),
  vocab('答え', 'こたえ', 'answer', "答えが分かりません。(I don't know the answer.)"),
  vocab(
    '意味',
    'いみ',
    'meaning',
    "この言葉の意味が分かりません。(I don't understand the meaning of this word.)"
  ),
  vocab('目的', 'もくてき', 'purpose', '旅行の目的は何ですか。(What is the purpose of the trip?)'),
  vocab('経験', 'けいけん', 'experience', 'いい経験になりました。(It became a good experience.)'),
  vocab('機会', 'きかい', 'opportunity', "いい機会です。(It's a good opportunity.)"),
  vocab('準備', 'じゅんび', 'preparation', '旅行の準備をします。(I prepare for the trip.)'),
  vocab('練習', 'れんしゅう', 'practice', '毎日練習します。(I practice every day.)'),
  vocab('生活', 'せいかつ', 'life/lifestyle', '日本での生活は楽しいです。(Life in Japan is fun.)'),
  vocab('習慣', 'しゅうかん', 'habit/custom', 'いい習慣を作ります。(I will build a good habit.)'),
  vocab('文化', 'ぶんか', 'culture', '日本の文化が好きです。(I like Japanese culture.)'),
  vocab('社会', 'しゃかい', 'society', '社会について考えます。(I think about society.)'),
  vocab('自然', 'しぜん', 'nature', '自然が好きです。(I like nature.)')
];

const week30: SeedCard[] = [
  vocab('に', 'に', 'to/at/for', "七時に起きます。(I wake up at seven o'clock.)"),
  vocab(
    'で',
    'で',
    'at, location of action / by means of',
    '駅で待ちます。(I will wait at the station.)'
  ),
  vocab('から', 'から', 'from/because', "九時から働きます。(I work starting from nine o'clock.)"),
  vocab(
    'まで',
    'まで',
    'until/as far as',
    "五時まで会社にいます。(I'll be at the company until five o'clock.)"
  ),
  vocab('より', 'より', 'than', '今日は昨日より寒いです。(Today is colder than yesterday.)'),
  vocab(
    'ほど',
    'ほど',
    'to the extent of',
    'これはあれほど高くないです。(This is not as expensive as that.)'
  ),
  vocab('だけ', 'だけ', 'only', '水だけ飲みます。(I only drink water.)'),
  vocab(
    'しか〜ない',
    'しか〜ない',
    'only, with negative',
    '水しか飲みません。(I only drink water — nothing else.)'
  ),
  vocab('も', 'も', 'also/even', '私も学生です。(I am also a student.)'),
  vocab('の', 'の', 'nominaliser', "私の本です。(It's my book.)"),
  vocab('と', 'と', 'and/with/quotation', '友達と話します。(I talk with my friend.)'),
  vocab(
    'や',
    'や',
    'and, non-exhaustive list',
    '肉や魚を食べます。(I eat things like meat and fish, among others.)'
  ),
  vocab('ね', 'ね', 'right?/seeking agreement', "今日は寒いですね。(It's cold today, isn't it?)"),
  vocab('よ', 'よ', 'assertion', '明日は休みですよ。(Tomorrow is a day off, you know.)'),
  vocab('か', 'か', 'or/question marker', 'これは何ですか。(What is this?)'),
  vocab(
    'って',
    'って',
    'casual quotation/topic marker',
    "友達が来るって言っていました。(I heard my friend say they're coming.)"
  )
];

const week31: SeedCard[] = [
  vocab('見出し', 'みだし', 'headline', 'ニュースの見出しを読みます。(I read the news headline.)'),
  vocab(
    '〜によると',
    '〜によると',
    'according to',
    'ニュースによると明日は雨です。(According to the news, it will rain tomorrow.)'
  ),
  vocab(
    '〜という',
    '〜という',
    'called/which says',
    '「こんにちは」という言葉を知っています。(I know the word called "hello".)'
  ),
  vocab(
    '〜について',
    '〜について',
    'about/regarding',
    '日本について勉強します。(I study about Japan.)'
  ),
  vocab(
    '〜として',
    '〜として',
    'as, in the role of',
    '先生として働いています。(I work as a teacher.)'
  ),
  vocab(
    '〜ため',
    '〜ため',
    'because of/in order to',
    '家族のために働きます。(I work for the sake of my family.)'
  ),
  vocab(
    '〜場合',
    'ばあい',
    'in the case of',
    '雨の場合、コンサートは中止です。(In the case of rain, the concert is cancelled.)'
  ),
  vocab('〜以上', 'いじょう', 'more than/at least', '二十歳以上です。(Age twenty or above.)'),
  vocab('〜以下', 'いか', 'less than/at most', "千円以下です。(It's 1,000 yen or less.)"),
  vocab(
    '〜中',
    'じゅう',
    'throughout/in the middle of',
    '一日中勉強しました。(I studied all day long.)'
  )
];

export const vocabUnits: SeedUnit[] = [
  { title: 'Daily verbs', kind: 'vocab', dailyCap: 8, cards: week13 },
  { title: 'Time expressions', kind: 'vocab', dailyCap: 8, cards: week14 },
  { title: 'Food & restaurants', kind: 'vocab', dailyCap: 8, cards: week15 },
  { title: 'Shopping & money', kind: 'vocab', dailyCap: 8, cards: week16 },
  { title: 'Transport & directions', kind: 'vocab', dailyCap: 8, cards: week17 },
  { title: 'People & relationships', kind: 'vocab', dailyCap: 8, cards: week18 },
  { title: 'Health & body', kind: 'vocab', dailyCap: 8, cards: week19 },
  { title: 'Home & living spaces', kind: 'vocab', dailyCap: 8, cards: week20 },
  { title: 'Weather & seasons', kind: 'vocab', dailyCap: 8, cards: week21 },
  { title: 'Adjectives', kind: 'vocab', dailyCap: 8, cards: week22 },
  { title: 'Work & school', kind: 'vocab', dailyCap: 8, cards: week23 },
  { title: 'City life & entertainment', kind: 'vocab', dailyCap: 8, cards: week24 },
  { title: 'Feelings & emotions', kind: 'vocab', dailyCap: 8, cards: week25 },
  { title: 'Frequency & quantity adverbs', kind: 'vocab', dailyCap: 8, cards: week26 },
  { title: 'Verbs — motion, change & giving', kind: 'vocab', dailyCap: 8, cards: week27 },
  { title: 'Verbs — communication & thought', kind: 'vocab', dailyCap: 8, cards: week28 },
  { title: 'Nouns — abstract & everyday', kind: 'vocab', dailyCap: 8, cards: week29 },
  { title: 'Particles', kind: 'vocab', dailyCap: 8, cards: week30 },
  { title: 'Reading vocabulary', kind: 'vocab', dailyCap: 8, cards: week31 }
];
