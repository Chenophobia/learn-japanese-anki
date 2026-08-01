import type { SeedUnit, SeedCard } from './types';

const grammar = (pattern: string, meaning: string, example: string): SeedCard => ({
  front: { pattern },
  back: { meaning, example }
});

export const grammarUnits: SeedUnit[] = [
  {
    title: 'Sequence — after doing',
    kind: 'grammar',
    dailyCap: 2,
    cards: [
      grammar('〜てから', 'after doing (then …)', '食べてから歯を磨きます。(After eating, I brush my teeth.)'),
      grammar('〜た後で', 'after doing (more formal)', '仕事が終わった後で映画を見ます。(After work ends, I watch a movie.)')
    ]
  },
  {
    title: 'Trying and wanting to try',
    kind: 'grammar',
    dailyCap: 2,
    cards: [
      grammar('〜てみる', 'try doing', '日本料理を作ってみました。(I tried making Japanese food.)'),
      grammar('〜てみたい', 'want to try doing', '新しい店に行ってみたいです。(I want to try going to a new store.)')
    ]
  },
  {
    title: 'Purpose — in order to',
    kind: 'grammar',
    dailyCap: 2,
    cards: [
      grammar('Verb+ために', 'in order to', '日本語を勉強するために毎日練習しています。(I practice every day in order to study Japanese.)'),
      grammar('Noun+のために', 'for the sake of', '家族のために働いています。(I work for the sake of my family.)')
    ]
  },
  {
    title: 'Simultaneous actions — while doing',
    kind: 'grammar',
    dailyCap: 2,
    cards: [grammar('〜ながら', 'while doing (two simultaneous actions)', '音楽を聞きながら勉強します。(I study while listening to music.)')]
  },
  {
    title: 'Reporting thoughts and hearsay — I think / was saying',
    kind: 'grammar',
    dailyCap: 2,
    cards: [
      grammar('〜と思う', 'I think', '明日は雨が降ると思います。(I think it will rain tomorrow.)'),
      grammar('〜と思っている', 'I believe (ongoing opinion)', '彼はいい人だと思っています。(I believe he is a good person.)'),
      grammar('〜と言っていた', 'was saying that', '友達は明日来ると言っていました。(My friend was saying that they\'ll come tomorrow.)')
    ]
  },
  {
    title: 'Speculation — might be, probably, should be',
    kind: 'grammar',
    dailyCap: 2,
    cards: [
      grammar('〜かもしれない', 'might be', '明日は雨かもしれません。(It might rain tomorrow.)'),
      grammar('〜でしょう', 'probably', '明日は晴れでしょう。(It will probably be sunny tomorrow.)'),
      grammar('〜はずだ', 'should be', '彼は学生のはずです。(He should be a student.)')
    ]
  },
  {
    title: 'Conditionals — if',
    kind: 'grammar',
    dailyCap: 2,
    cards: [
      grammar('い-adj〜ければ', 'conditional (if) — i-adjective', '安ければ買います。(If it\'s cheap, I\'ll buy it.)'),
      grammar('verb stem+ば', 'conditional (if) — verb', '雨が降れば、家にいます。(If it rains, I\'ll stay home.)'),
      grammar('noun/na-adj+なら', 'conditional (if) — noun/na-adjective', '好きなら食べてください。(If you like it, please eat it.)')
    ]
  },
  {
    title: 'Contrast — even though',
    kind: 'grammar',
    dailyCap: 2,
    cards: [
      grammar('〜のに', 'even though (frustration/surprise)', '一生懸命勉強したのに試験に落ちた。(Even though I studied hard, I failed the exam.)')
    ]
  },
  {
    title: 'Change of state — become able to / stop doing',
    kind: 'grammar',
    dailyCap: 2,
    cards: [
      grammar('〜ようになる', 'become able to', '日本語が読めるようになりました。(I have become able to read Japanese.)'),
      grammar('〜なくなる', 'stop doing / no longer', '甘い物を食べなくなりました。(I no longer eat sweets.)')
    ]
  },
  {
    title: 'Completion and regret — end up doing',
    kind: 'grammar',
    dailyCap: 2,
    cards: [
      grammar('〜てしまう', 'end up doing (completion/regret)', 'ケーキを全部食べてしまいました。(I ended up eating all the cake.)'),
      grammar('〜ちゃった', 'end up doing (casual form)', '宿題を忘れちゃった。(I forgot my homework, oops.)')
    ]
  },
  {
    title: 'Giving and receiving favors',
    kind: 'grammar',
    dailyCap: 2,
    cards: [
      grammar('〜てあげる', 'do something for someone', '友達に日本語を教えてあげました。(I taught my friend Japanese as a favor.)'),
      grammar('〜てもらう', 'have someone do something for me', '先生に日本語を教えてもらいました。(I had the teacher teach me Japanese.)'),
      grammar('〜てくれる', 'someone does something for me', '友達がケーキを作ってくれました。(My friend made a cake for me.)')
    ]
  },
  {
    title: 'Hearsay and appearance — apparently, looks like',
    kind: 'grammar',
    dailyCap: 2,
    cards: [
      grammar('〜らしい', 'apparently', '明日は雪が降るらしいです。(Apparently it will snow tomorrow.)'),
      grammar('〜そうだ (hearsay)', 'I heard that', 'ニュースで明日は寒いそうです。(According to the news, I heard it will be cold tomorrow.)'),
      grammar('〜そうだ (appearance)', 'looks like', 'このケーキはおいしそうです。(This cake looks delicious.)')
    ]
  },
  {
    title: 'Causative — make/let someone do',
    kind: 'grammar',
    dailyCap: 2,
    cards: [
      grammar('〜させる', 'causative (make/let someone do)', '子供に野菜を食べさせました。(I made the child eat vegetables.)'),
      grammar('〜させてください', 'please let me do', '私に話させてください。(Please let me speak.)'),
      grammar('〜させられる', 'be made to do (causative-passive)', '毎日野菜を食べさせられました。(I was made to eat vegetables every day.)')
    ]
  },
  {
    title: 'Passive voice',
    kind: 'grammar',
    dailyCap: 2,
    cards: [grammar('受身形 〜れる / られる', 'passive voice', '先生に褒められました。(I was praised by the teacher.)')]
  },
  {
    title: 'Ability — potential form',
    kind: 'grammar',
    dailyCap: 2,
    cards: [
      grammar('〜ことができる', 'ability (be able to do)', '日本語を話すことができます。(I am able to speak Japanese.)'),
      grammar('short potential form', 'ability (be able to do)', '食べられる、飲める、読める、書ける (can eat, can drink, can read, can write)'),
      grammar('〜られない', 'cannot do', '辛い物が食べられない。(I cannot eat spicy food.)')
    ]
  },
  {
    title: 'Listing actions — 〜たり〜たりする',
    kind: 'grammar',
    dailyCap: 2,
    cards: [
      grammar('〜たり〜たりする', 'listing actions non-exhaustively', '週末は映画を見たり買い物したりします。(On weekends I do things like watch movies and go shopping.)')
    ]
  },
  {
    title: 'Comparison — as much as, about, to the extent that',
    kind: 'grammar',
    dailyCap: 2,
    cards: [
      grammar('〜ほど〜ない', 'not as much as', '東京ほど大きくないです。(It is not as big as Tokyo.)'),
      grammar('〜くらい', 'about, approximately', '一時間くらい待ちました。(I waited for about an hour.)'),
      grammar('〜ほど', 'to the extent that', '見れば見るほど好きになりました。(The more I looked at it, the more I liked it.)')
    ]
  }
];
