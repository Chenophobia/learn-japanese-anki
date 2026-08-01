# Japanese Flashcard App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Docker-deployable, multi-user spaced-repetition flashcard web app for the JLPT N4 curriculum, scheduled by FSRS-6, served at `<app-hostname>`.

**Architecture:** SvelteKit (`adapter-node`) server-rendered app. All scheduling math, queue assembly, and auth run server-side; the browser only renders and posts form actions. State lives in one bind-mounted SQLite file accessed through Drizzle ORM. Static curriculum content (chapters → units → cards) is seeded once from TypeScript modules; per-user progress lives in `user_cards` + append-only `review_logs`.

**Tech Stack:** SvelteKit 2 + Svelte 5, TypeScript, Tailwind CSS 4, `better-sqlite3` + Drizzle ORM, `ts-fsrs`, `@node-rs/argon2`, Vitest, Docker (node:22-slim multi-stage).

## Global Constraints

- Reference documents — read before implementing: `docs/superpowers/specs/2026-07-31-flashcard-app-design.md` (the spec), `docs/fsrs-algorithm.md` (scheduling), `docs/curriculum-plan.md` (all card content).
- Node 22. Package manager: `npm` (lockfile committed).
- Container port and host publish port are both **3001** (3000 is taken by the sibling `sibling-app` app on the same host).
- SQLite file path comes from env: `DATA_DIR` (default `/app/data` in container, `./data` in dev). DB file is `${DATA_DIR}/app.db`.
- Session cookie name: `session`. Attributes: `httpOnly`, `secure` (except when `NODE_ENV !== 'production'`), `sameSite: 'lax'`, `path: '/'`.
- Session lifetime: `remember=0` → 1 day; `remember=1` → 365 days.
- **Light theme is the default** (matches `sibling-app`). Theme is persisted in a non-httpOnly `theme` cookie so SSR emits the correct class with no flash.
- All timestamps stored as ISO 8601 strings in UTC (`new Date().toISOString()`).
- FSRS parameters are the library defaults with `enable_fuzz: true` (see `docs/fsrs-algorithm.md` §5, §8). No per-user parameter training in v1.
- Never import `ts-fsrs`, `better-sqlite3`, or anything under `src/lib/server/` into a `.svelte` component or a `+page.ts` — server-only modules live under `src/lib/server/` and SvelteKit enforces this.
- Tests: Vitest, colocated as `*.test.ts` next to the module under test. Run with `npm test`.
- Commit style: conventional commits (`feat:`, `test:`, `chore:`, `docs:`), matching sibling project.

---

## File Structure

```
Dockerfile                          multi-stage build
docker-compose.yml                  service definition, port 3001, ./data bind mount
.env.example                        documented env vars
.dockerignore
README.md                           stack, dev commands, deploy + nginx block
drizzle.config.ts                   Drizzle Kit config
svelte.config.js                    adapter-node
vite.config.ts                      SvelteKit + Vitest config
tailwind.config.ts                  darkMode: 'class'
src/app.css                         Tailwind entry + CSS variables
src/app.html                        %theme% placeholder on <html>
src/hooks.server.ts                 session resolution + theme resolution → event.locals
src/app.d.ts                        App.Locals typing
src/lib/server/db/connect.ts        open a SQLite file + apply migrations
src/lib/server/db/index.ts          production Drizzle singleton, seeds on boot
src/lib/server/db/test-db.ts        in-memory database factory (tests only)
src/lib/server/db/schema.ts         all 7 tables
src/lib/server/auth/password.ts     hash / verify
src/lib/server/auth/session.ts      create / validate / invalidate session
src/lib/server/seed/types.ts        SeedChapter / SeedUnit / SeedCard types
src/lib/server/seed/hiragana.ts     Chapter 1 content
src/lib/server/seed/katakana.ts     Chapter 2 content
src/lib/server/seed/kanji.ts        Chapter 3a content
src/lib/server/seed/vocab.ts        Chapter 3b content
src/lib/server/seed/grammar.ts      Chapter 4 content
src/lib/server/seed/index.ts        assembles the 4 chapters
src/lib/server/seed/run.ts          idempotent seed loader
src/lib/server/scheduler.ts         ts-fsrs wrapper: row ⇄ Card mapping, preview, apply
src/lib/server/queue.ts             current-unit detection, new-card + review selection
src/lib/server/stats.ts             all /stats aggregations
src/lib/cards.ts                    shared front/back JSON types + parse helpers (isomorphic)
src/routes/+layout.server.ts        exposes user + theme
src/routes/+layout.svelte           shell: nav, theme toggle
src/routes/+page.svelte             chapter map
src/routes/+page.server.ts          chapter map data
src/routes/login/+page.svelte
src/routes/login/+page.server.ts
src/routes/signup/+page.svelte
src/routes/signup/+page.server.ts
src/routes/logout/+server.ts
src/routes/study/+page.svelte
src/routes/study/+page.server.ts    load = next card + previews; actions = rate
src/routes/stats/+page.svelte
src/routes/stats/+page.server.ts
src/routes/api/theme/+server.ts     POST theme cookie
src/lib/components/Card.svelte      renders front/back by unit kind
src/lib/components/ThemeToggle.svelte
src/lib/components/ProgressBar.svelte
src/lib/components/Heatmap.svelte
```

---

## Task 1: Project scaffold, Tailwind, and test harness

**Files:**
- Create: `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `src/app.css`, `src/app.html`, `src/routes/+layout.svelte`, `src/routes/+page.svelte`, `.gitignore`, `.env.example`
- Test: `src/lib/smoke.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a buildable SvelteKit project where `npm run build`, `npm run dev`, and `npm test` all succeed; Tailwind classes work; `dark:` variants are driven by a `class` on `<html>`.

- [ ] **Step 1: Scaffold the SvelteKit project in place**

The repo already contains `docs/` and `.git`. Scaffold without wiping them:

```bash
cd ~/Hosted/learn-japanese
npx sv create . --template minimal --types ts --no-add-ons --install npm
```

If `sv` refuses because the directory is non-empty, answer its prompt to continue; it only writes new files.

- [ ] **Step 2: Install runtime and dev dependencies**

```bash
npm i @sveltejs/adapter-node better-sqlite3 drizzle-orm ts-fsrs @node-rs/argon2
npm i -D drizzle-kit @types/better-sqlite3 tailwindcss @tailwindcss/vite vitest
```

- [ ] **Step 3: Configure adapter-node**

`svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: { adapter: adapter() }
};
```

- [ ] **Step 4: Configure Vite with Tailwind and Vitest**

`vite.config.ts`:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node'
  }
});
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 5: Set up Tailwind with class-based dark mode**

`src/app.css`:

```css
@import 'tailwindcss';

@custom-variant dark (&:where(.dark, .dark *));

:root {
  color-scheme: light;
}
.dark {
  color-scheme: dark;
}
```

`src/app.html` — the `%theme%` placeholder is replaced in `hooks.server.ts` (Task 8):

```html
<!doctype html>
<html lang="en" class="%theme%">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="%sveltekit.assets%/favicon.png" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover" class="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

`src/routes/+layout.svelte`:

```svelte
<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

{@render children()}
```

- [ ] **Step 6: Write a smoke test**

`src/lib/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('test harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 7: Verify the toolchain**

```bash
npm test
npm run build
```

Expected: the smoke test passes, and the build produces a `build/` directory containing `index.js`.

- [ ] **Step 8: Add .gitignore and .env.example**

`.gitignore`:

```
node_modules
/build
/.svelte-kit
/data
.env
```

`.env.example`:

```
# Directory holding app.db (bind-mounted in Docker)
DATA_DIR=./data
# Random 32+ byte secret; generate with: openssl rand -base64 48
SESSION_SECRET=changeme
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold SvelteKit project with Tailwind and Vitest"
```

---

## Task 2: Database schema and Drizzle client

**Files:**
- Create: `src/lib/server/db/schema.ts`, `src/lib/server/db/connect.ts`, `src/lib/server/db/index.ts`, `src/lib/server/db/test-db.ts`, `drizzle.config.ts`
- Test: `src/lib/server/db/schema.test.ts`

**Interfaces:**
- Consumes: Task 1's project scaffold.
- Produces:
  - `src/lib/server/db/schema.ts` exporting tables `chapters`, `units`, `cards`, `users`, `sessions`, `userCards`, `reviewLogs`.
  - `src/lib/server/db/connect.ts` exporting `type Db = BetterSQLite3Database<typeof schema>` and `connect(file: string): Db` — opens the file and applies migrations.
  - `src/lib/server/db/index.ts` exporting `db: Db`, bound to `${DATA_DIR}/app.db`.
  - `src/lib/server/db/test-db.ts` exporting `createTestDb(): Db` — a fresh in-memory database with migrations applied.

**`index.ts` and `test-db.ts` are separate on purpose.** `index.ts` opens a real file and (from Task 5) seeds the whole curriculum at import time. Tests must never trigger that, so every test imports `createTestDb` from `./test-db`, which pulls in `connect.ts` only. Do not re-export `createTestDb` from `index.ts`.

- [ ] **Step 1: Write the schema**

`src/lib/server/db/schema.ts`:

```ts
import { sqliteTable, integer, text, real, primaryKey, index } from 'drizzle-orm/sqlite-core';

export const chapters = sqliteTable('chapters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  order: integer('order').notNull(),
  title: text('title').notNull(),
  kind: text('kind').notNull() // 'kana' | 'kanji_vocab' | 'grammar'
});

export const units = sqliteTable('units', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chapterId: integer('chapter_id').notNull().references(() => chapters.id),
  order: integer('order').notNull(),
  title: text('title').notNull(),
  kind: text('kind').notNull(), // 'kana' | 'kanji' | 'vocab' | 'grammar'
  dailyCap: integer('daily_cap').notNull()
});

export const cards = sqliteTable('cards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  unitId: integer('unit_id').notNull().references(() => units.id),
  order: integer('order').notNull(),
  frontJson: text('front_json').notNull(),
  backJson: text('back_json').notNull()
}, (t) => [index('cards_unit_order_idx').on(t.unitId, t.order)]);

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').notNull()
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  expiresAt: text('expires_at').notNull(),
  remember: integer('remember').notNull(),
  createdAt: text('created_at').notNull()
});

export const userCards = sqliteTable('user_cards', {
  userId: integer('user_id').notNull().references(() => users.id),
  cardId: integer('card_id').notNull().references(() => cards.id),
  state: integer('state').notNull(),
  stability: real('stability').notNull(),
  difficulty: real('difficulty').notNull(),
  due: text('due').notNull(),
  scheduledDays: integer('scheduled_days').notNull(),
  learningSteps: integer('learning_steps').notNull(),
  reps: integer('reps').notNull(),
  lapses: integer('lapses').notNull(),
  lastReview: text('last_review')
}, (t) => [
  primaryKey({ columns: [t.userId, t.cardId] }),
  index('user_cards_due_idx').on(t.userId, t.due)
]);

export const reviewLogs = sqliteTable('review_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  cardId: integer('card_id').notNull().references(() => cards.id),
  rating: integer('rating').notNull(),
  reviewedAt: text('reviewed_at').notNull(),
  state: integer('state').notNull(),
  stability: real('stability').notNull(),
  difficulty: real('difficulty').notNull(),
  scheduledDays: integer('scheduled_days').notNull()
}, (t) => [index('review_logs_user_time_idx').on(t.userId, t.reviewedAt)]);
```

- [ ] **Step 2: Configure Drizzle Kit and generate the migration**

`drizzle.config.ts`:

```ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: { url: './data/app.db' }
} satisfies Config;
```

Add to `package.json` scripts: `"db:generate": "drizzle-kit generate"`. Then run:

```bash
mkdir -p data && npm run db:generate
```

Expected: a `drizzle/0000_*.sql` file plus `drizzle/meta/` are created. Commit these — they ship in the image.

- [ ] **Step 3: Write the failing test for the DB client**

`src/lib/server/db/schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createTestDb } from './test-db';
import { chapters, units, cards } from './schema';

describe('createTestDb', () => {
  it('creates a migrated in-memory database', () => {
    const db = createTestDb();
    const [chapter] = db.insert(chapters).values({ order: 1, title: 'Hiragana', kind: 'kana' }).returning().all();
    const [unit] = db.insert(units).values({
      chapterId: chapter.id, order: 1, title: 'Base gojuon', kind: 'kana', dailyCap: 15
    }).returning().all();
    db.insert(cards).values({
      unitId: unit.id, order: 1, frontJson: '{"char":"あ"}', backJson: '{"romaji":"a","mnemonic":"an apple"}'
    }).run();

    expect(db.select().from(cards).all()).toHaveLength(1);
  });
});
```

- [ ] **Step 4: Run the test and confirm it fails**

Run: `npx vitest run src/lib/server/db/schema.test.ts`
Expected: FAIL — cannot resolve `./test-db`.

- [ ] **Step 5: Implement the DB client across three modules**

`src/lib/server/db/connect.ts`:

```ts
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

export type Db = BetterSQLite3Database<typeof schema>;

const MIGRATIONS_FOLDER = './drizzle';

export function connect(file: string): Db {
  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}
```

`src/lib/server/db/test-db.ts`:

```ts
import { connect, type Db } from './connect';

/** Fresh in-memory database with migrations applied — for tests only. */
export function createTestDb(): Db {
  return connect(':memory:');
}
```

`src/lib/server/db/index.ts`:

```ts
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { connect, type Db } from './connect';

function open(): Db {
  const dir = process.env.DATA_DIR ?? './data';
  mkdirSync(dir, { recursive: true });
  return connect(join(dir, 'app.db'));
}

export const db: Db = open();
export type { Db };
```

- [ ] **Step 6: Run the test and confirm it passes**

Run: `npx vitest run src/lib/server/db/schema.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add SQLite schema and Drizzle client"
```

---

## Task 3: Card content types and seed data for Chapters 1–2 (kana)

**Files:**
- Create: `src/lib/cards.ts`, `src/lib/server/seed/types.ts`, `src/lib/server/seed/hiragana.ts`, `src/lib/server/seed/katakana.ts`
- Test: `src/lib/server/seed/kana.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (pure data + types).
- Produces:
  - `src/lib/cards.ts` exporting types `KanaFront`, `KanaBack`, `KanjiFront`, `KanjiBack`, `VocabFront`, `VocabBack`, `GrammarFront`, `GrammarBack`, the union `UnitKind = 'kana' | 'kanji' | 'vocab' | 'grammar'`, and `parseCardFaces(kind, frontJson, backJson): { front: ..., back: ... }`.
  - `src/lib/server/seed/types.ts` exporting `SeedCard`, `SeedUnit`, `SeedChapter`.
  - `src/lib/server/seed/hiragana.ts` exporting `hiraganaChapter: SeedChapter`.
  - `src/lib/server/seed/katakana.ts` exporting `katakanaChapter: SeedChapter`.

- [ ] **Step 1: Write the shared card face types**

`src/lib/cards.ts`:

```ts
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
  kind: UnitKind,
  frontJson: string,
  backJson: string
): { front: CardFront; back: CardBack } {
  void kind; // shapes are discriminated by the unit's kind at render time
  return { front: JSON.parse(frontJson), back: JSON.parse(backJson) };
}
```

- [ ] **Step 2: Write the seed types**

`src/lib/server/seed/types.ts`:

```ts
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
```

- [ ] **Step 3: Write the failing test for kana seed shape**

`src/lib/server/seed/kana.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hiraganaChapter } from './hiragana';
import { katakanaChapter } from './katakana';
import type { SeedChapter } from './types';

function allCards(chapter: SeedChapter) {
  return chapter.units.flatMap((u) => u.cards);
}

describe('kana chapters', () => {
  it('hiragana has the five expected units', () => {
    expect(hiraganaChapter.units.map((u) => u.title)).toEqual([
      'Base gojuon',
      'Dakuten & handakuten',
      'Combination kana (youon)',
      'Special characters',
      'Anchor verbs'
    ]);
  });

  it('hiragana unit card counts match the curriculum', () => {
    expect(hiraganaChapter.units.map((u) => u.cards.length)).toEqual([46, 25, 33, 3, 12]);
  });

  it('katakana unit card counts match the curriculum', () => {
    expect(katakanaChapter.units.map((u) => u.cards.length)).toEqual([46, 25, 33, 8, 25]);
  });

  it('every kana card has a non-empty char, romaji and mnemonic', () => {
    const kanaUnits = [...hiraganaChapter.units, ...katakanaChapter.units].filter((u) => u.kind === 'kana');
    for (const unit of kanaUnits) {
      for (const card of unit.cards) {
        expect((card.front as { char: string }).char).toBeTruthy();
        expect((card.back as { romaji: string }).romaji).toBeTruthy();
        expect((card.back as { mnemonic: string }).mnemonic).toBeTruthy();
      }
    }
  });

  it('has no duplicate fronts within a chapter', () => {
    for (const chapter of [hiraganaChapter, katakanaChapter]) {
      const fronts = allCards(chapter).map((c) => JSON.stringify(c.front));
      expect(new Set(fronts).size).toBe(fronts.length);
    }
  });
});
```

- [ ] **Step 4: Run the test and confirm it fails**

Run: `npx vitest run src/lib/server/seed/kana.test.ts`
Expected: FAIL — cannot resolve `./hiragana`.

- [ ] **Step 5: Write the hiragana chapter**

Source: `docs/curriculum-plan.md` "Chapter 1 — Hiragana". Write out all 119 cards explicitly — no loops that generate romaji, because the irregular readings (し=shi, ち=chi, つ=tsu, ふ=fu, を=wo, じ=ji, ず=zu, ぢ=ji, づ=zu) would be wrong. Mnemonics are short memory hooks you author; keep them under ~60 characters.

`src/lib/server/seed/hiragana.ts` — structure, with the first entries of each unit shown; fill in every remaining character from the curriculum tables:

```ts
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
  // … き く け こ さ し す せ そ た ち つ て と な に ぬ ね の
  // … は ひ ふ へ ほ ま み む め も や ゆ よ ら り る れ ろ わ を ん
];

const dakuten: SeedCard[] = [
  kana('が', 'ga', 'か plus two marks — voiced ka'),
  kana('ぎ', 'gi', 'き plus two marks — voiced ki'),
  // … ぐ げ ご ざ じ ず ぜ ぞ だ ぢ づ で ど ば び ぶ べ ぼ ぱ ぴ ぷ ぺ ぽ
];

const youon: SeedCard[] = [
  kana('きゃ', 'kya', 'き + small ゃ — one syllable, "kya"'),
  // … きゅ きょ しゃ しゅ しょ ちゃ ちゅ ちょ にゃ にゅ にょ ひゃ ひゅ ひょ
  // … みゃ みゅ みょ りゃ りゅ りょ ぎゃ ぎゅ ぎょ じゃ じゅ じょ びゃ びゅ びょ ぴゃ ぴゅ ぴょ
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
  // … いく くる みる きく かう かえる おきる ねる はなす よむ
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
```

Two collisions to avoid, both caught by the duplicate-front tests:

- `ん` is the 46th gojuon character, so it belongs in `base`. The Special-characters unit therefore teaches its *nasal assimilation rule* under the distinct front `'ん + b/p'`, not the bare character again.
- `ー` is taught once, here in Chapter 1, and must **not** be repeated in Chapter 2's Extended katakana unit.

The 46 base characters are あいうえお・かきくけこ・さしすせそ・たちつてと・なにぬねの・はひふへほ・まみむめも・やゆよ・らりるれろ・わ・を・ん. Count them as you write; the test asserts exactly 46.

- [ ] **Step 6: Write the katakana chapter**

Source: `docs/curriculum-plan.md` "Chapter 2 — Katakana". The base-46 mnemonics are already written out in that document's table — copy them verbatim. Units:

| Unit | kind | dailyCap | Cards |
|---|---|---|---|
| Base 46 | kana | 15 | ア…ン, mnemonics from the curriculum table (see the note below — that table lists only 45) |
| Dakuten & handakuten | kana | 15 | ガギグゲゴ ザジズゼゾ ダヂヅデド バビブベボ パピプペポ (25) |
| Combination kana (youon) | kana | 15 | キャ…ピョ, same 33 combinations as hiragana |
| Extended katakana | kana | 15 | ヴ, ファ, フィ, フェ, フォ, ティ, ディ, ウォ (8) |
| Loanwords | vocab | 8 | 25 words (see below) |

The 25 loanwords are the 13 from the curriculum's loanword table (コーヒー, タクシー, テスト, アイスクリーム, カメラ, コンサート, スーパー, ノート, ホテル, ハンバーガー, ニュース, フルーツ, ナイフ) plus the 12 additional words from the Week 7 fluency drill that are not already in that table (スマートフォン, インターネット, レストラン, コンビニ, バス, テレビ, ラジオ, ゲーム, スポーツ, サッカー, テニス, バスケット). Vocab backs need `reading` (the katakana itself), `meaning`, and `example_sentence` — write a short natural sentence for each, e.g.:

```ts
verb('コーヒー', 'コーヒー', 'coffee', 'コーヒーをのみます。(I drink coffee.)'),
```

Two corrections to make while transcribing:

- The curriculum's katakana table lists only **45** characters — `ヲ` (wo) is missing. Add it between `ワ` and `ン` so the unit has the 46 the test expects. Mnemonic: "ワ with an extra shelf on top".
- `ー` is **not** in the Extended katakana unit; Chapter 1's Special characters unit already teaches it. The eighth extended form is `ウォ` (wo, as in ウォーター).

For the two hardest pairs the curriculum flags, put the disambiguation directly in the mnemonic: シ vs ツ and ソ vs ン (horizontal-leaning strokes = shi/so, vertical-leaning = tsu/n).

- [ ] **Step 7: Run the test and confirm it passes**

Run: `npx vitest run src/lib/server/seed/kana.test.ts`
Expected: PASS — all five assertions green.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add hiragana and katakana seed content"
```

---

## Task 4: Seed data for Chapters 3–4 (kanji, vocab, grammar)

**Files:**
- Create: `src/lib/server/seed/kanji.ts`, `src/lib/server/seed/vocab.ts`, `src/lib/server/seed/grammar.ts`, `src/lib/server/seed/index.ts`
- Test: `src/lib/server/seed/content.test.ts`

**Interfaces:**
- Consumes: `SeedChapter`/`SeedUnit`/`SeedCard` from Task 3.
- Produces:
  - `src/lib/server/seed/kanji.ts` exporting `kanjiUnits: SeedUnit[]` (4 units).
  - `src/lib/server/seed/vocab.ts` exporting `vocabUnits: SeedUnit[]` (19 units).
  - `src/lib/server/seed/grammar.ts` exporting `grammarChapter: SeedChapter`.
  - `src/lib/server/seed/index.ts` exporting `curriculum: SeedChapter[]` — exactly 4 chapters, in display order.

- [ ] **Step 1: Write the failing test**

`src/lib/server/seed/content.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { curriculum } from './index';

describe('curriculum', () => {
  it('has four chapters in order', () => {
    expect(curriculum.map((c) => c.title)).toEqual([
      'Hiragana',
      'Katakana',
      'Kanji & Vocabulary',
      'Grammar & Reading'
    ]);
  });

  it('has 4 kanji units of 20 cards each', () => {
    const kanji = curriculum[2].units.filter((u) => u.kind === 'kanji');
    expect(kanji).toHaveLength(4);
    expect(kanji.every((u) => u.cards.length === 20)).toBe(true);
    expect(kanji.every((u) => u.dailyCap === 3)).toBe(true);
  });

  it('has 19 vocab units in chapter 3, all capped at 8/day', () => {
    const vocab = curriculum[2].units.filter((u) => u.kind === 'vocab');
    expect(vocab).toHaveLength(19);
    expect(vocab.every((u) => u.dailyCap === 8)).toBe(true);
    expect(vocab.every((u) => u.cards.length >= 10)).toBe(true);
  });

  it('has 17 grammar units', () => {
    expect(curriculum[3].units).toHaveLength(17);
    expect(curriculum[3].units.every((u) => u.kind === 'grammar')).toBe(true);
  });

  it('every card has non-empty front and back fields', () => {
    for (const chapter of curriculum) {
      for (const unit of chapter.units) {
        expect(unit.cards.length).toBeGreaterThan(0);
        for (const card of unit.cards) {
          for (const value of [...Object.values(card.front), ...Object.values(card.back)]) {
            expect(String(value).trim()).not.toBe('');
          }
        }
      }
    }
  });

  it('has no duplicate card fronts across the whole curriculum', () => {
    const fronts = curriculum.flatMap((c) => c.units.flatMap((u) => u.cards.map((k) => JSON.stringify(k.front))));
    const dupes = fronts.filter((f, i) => fronts.indexOf(f) !== i);
    expect(dupes).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/lib/server/seed/content.test.ts`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 3: Write the kanji units**

Source: `docs/curriculum-plan.md` §3a — four tables of 20 rows each (80 kanji total; the prose "76" in that document undercounts its own tables — the tables are authoritative). Each row gives readings and a meaning-plus-example; map them as:

```ts
import type { SeedUnit, SeedCard } from './types';

const kanji = (char: string, meaning: string, reading: string, example_word: string): SeedCard => ({
  front: { char },
  back: { meaning, reading, example_word }
});

const set1: SeedCard[] = [
  kanji('日', 'day, sun', 'にち / ひ', '日本 (にほん — Japan)'),
  kanji('本', 'book, origin', 'ほん / もと', '日本 (にほん — Japan)'),
  // … 人 月 年 大 学 生 先 私 国 今 時 何 食 飲 行 来 見 聞
];
// set2, set3, set4 the same way

export const kanjiUnits: SeedUnit[] = [
  { title: 'Kanji Set 1 — Core & most useful', kind: 'kanji', dailyCap: 3, cards: set1 },
  { title: 'Kanji Set 2 — Numbers, time & money', kind: 'kanji', dailyCap: 3, cards: set2 },
  { title: 'Kanji Set 3 — Daily-life verbs & adjectives', kind: 'kanji', dailyCap: 3, cards: set3 },
  { title: 'Kanji Set 4 — Places, directions & nature', kind: 'kanji', dailyCap: 3, cards: set4 }
];
```

Two source rows need fixing as you transcribe: `時間` in Set 2 is a compound word, not a single kanji — replace it with `間` (meaning "interval, between", reading `かん / あいだ`, example `時間 (じかん — duration)`). Set 4's `右` and `左` rows are missing their example column in the source — supply `右手 (みぎて — right hand)` and `左手 (ひだりて — left hand)`.

- [ ] **Step 4: Write the vocab units**

Source: `docs/curriculum-plan.md` §3b — 19 themed weeks (13–31). Each unit title is the theme without the week number, e.g. `'Daily verbs'`, `'Time expressions'`, `'Food & restaurants'`, …, `'Particles deep dive'`, `'Reading vocabulary'`. Each word becomes:

```ts
const vocab = (word: string, reading: string, meaning: string, example_sentence: string): SeedCard => ({
  front: { word },
  back: { reading, meaning, example_sentence }
});

const week13: SeedCard[] = [
  vocab('起きる', 'おきる', 'to wake up', '毎朝七時に起きます。(I wake up at 7 every morning.)'),
  vocab('寝る', 'ねる', 'to sleep', '十一時に寝ます。(I go to sleep at 11.)'),
  // … 14 more
];
```

The curriculum lists reading and meaning for every word but no example sentences — you author one short sentence per word using only vocabulary and kanji introduced at or before that week, with an English gloss in parentheses. For entries with no kanji form (`いつも`, `ちょっと`, `コンビニ`) set `reading` to the word itself. For particle and grammar-fragment entries in the Particles and Reading-vocabulary units (`〜によると`, `しか〜ない`), the `word` is the fragment as written and the example sentence carries the whole usage.

**Duplicate rule:** two cards collide only when their front JSON is byte-identical. Kanji cards use `{ char }` and vocab cards use `{ word }`, so 右 as a kanji card and 右 as a vocab word are distinct and both stay; likewise Chapter 1's kana-only `たべる` and Week 13's `食べる`. A genuine collision is the same word listed in two vocab units — **`もう` appears in both Week 14 (Time expressions) and Week 26 (Frequency & quantity adverbs); keep it in Week 14 and drop it from Week 26.** Scan for others as you transcribe; the duplicate-front test in Step 1 is the backstop.

Export as `vocabUnits: SeedUnit[]`, each `{ title, kind: 'vocab', dailyCap: 8, cards }`.

- [ ] **Step 5: Write the grammar chapter**

Source: `docs/curriculum-plan.md` "Chapter 4" table, weeks 33–49 (17 rows; weeks 50–52 are reading/exam/review weeks with no new cards and are omitted from the seed). One unit per row; one card per distinct pattern within the row, so a row listing three patterns yields three cards sharing that row's meaning split across them:

```ts
import type { SeedChapter, SeedCard } from './types';

const grammar = (pattern: string, meaning: string, example: string): SeedCard => ({
  front: { pattern },
  back: { meaning, example }
});

export const grammarChapter: SeedChapter = {
  title: 'Grammar & Reading',
  kind: 'grammar',
  units: [
    {
      title: 'Sequence — after doing',
      kind: 'grammar',
      dailyCap: 2,
      cards: [
        grammar('〜てから', 'after doing (then …)', '食べてから歯を磨きます。(After eating, I brush my teeth.)'),
        grammar('〜た後で', 'after doing (more formal)', '仕事が終わった後で映画を見ます。(After work ends, I watch a movie.)')
      ]
    },
    // … 16 more units, one per week 34–49
  ]
};
```

Use the curriculum's own example sentence for the first pattern in each row; author an equivalent one for the row's remaining patterns.

- [ ] **Step 6: Assemble the curriculum index**

`src/lib/server/seed/index.ts`:

```ts
import type { SeedChapter } from './types';
import { hiraganaChapter } from './hiragana';
import { katakanaChapter } from './katakana';
import { kanjiUnits } from './kanji';
import { vocabUnits } from './vocab';
import { grammarChapter } from './grammar';

const kanjiVocabChapter: SeedChapter = {
  title: 'Kanji & Vocabulary',
  kind: 'kanji_vocab',
  units: [...kanjiUnits, ...vocabUnits]
};

export const curriculum: SeedChapter[] = [
  hiraganaChapter,
  katakanaChapter,
  kanjiVocabChapter,
  grammarChapter
];

export type { SeedChapter, SeedUnit, SeedCard } from './types';
```

- [ ] **Step 7: Run the tests and confirm they pass**

Run: `npm test`
Expected: PASS — both `kana.test.ts` and `content.test.ts` green.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add kanji, vocabulary and grammar seed content"
```

---

## Task 5: Idempotent seed loader

**Files:**
- Create: `src/lib/server/seed/run.ts`
- Modify: `src/lib/server/db/index.ts` (call the seeder after migrations on boot)
- Test: `src/lib/server/seed/run.test.ts`

**Interfaces:**
- Consumes: `Db` (Task 2), `createTestDb` (Task 2), `curriculum` (Task 4), schema tables (Task 2).
- Produces: `seedIfEmpty(database: Db): void` — inserts the full curriculum only when the `chapters` table is empty; returns silently otherwise.

- [ ] **Step 1: Write the failing test**

`src/lib/server/seed/run.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createTestDb } from '../db/test-db';
import { chapters, units, cards } from '../db/schema';
import { seedIfEmpty } from './run';
import { curriculum } from './index';

describe('seedIfEmpty', () => {
  it('inserts every chapter, unit and card', () => {
    const db = createTestDb();
    seedIfEmpty(db);

    const expectedUnits = curriculum.reduce((n, c) => n + c.units.length, 0);
    const expectedCards = curriculum.reduce((n, c) => n + c.units.reduce((m, u) => m + u.cards.length, 0), 0);

    expect(db.select().from(chapters).all()).toHaveLength(4);
    expect(db.select().from(units).all()).toHaveLength(expectedUnits);
    expect(db.select().from(cards).all()).toHaveLength(expectedCards);
  });

  it('assigns 1-based order within each parent', () => {
    const db = createTestDb();
    seedIfEmpty(db);
    expect(db.select().from(chapters).all().map((c) => c.order)).toEqual([1, 2, 3, 4]);
    const firstChapterUnits = db.select().from(units).all().filter((u) => u.chapterId === 1);
    expect(firstChapterUnits.map((u) => u.order)).toEqual([1, 2, 3, 4, 5]);
  });

  it('is idempotent — a second call inserts nothing', () => {
    const db = createTestDb();
    seedIfEmpty(db);
    const before = db.select().from(cards).all().length;
    seedIfEmpty(db);
    expect(db.select().from(cards).all()).toHaveLength(before);
  });

  it('stores faces as parseable JSON', () => {
    const db = createTestDb();
    seedIfEmpty(db);
    const [first] = db.select().from(cards).all();
    expect(JSON.parse(first.frontJson)).toHaveProperty('char');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/lib/server/seed/run.test.ts`
Expected: FAIL — cannot resolve `./run`.

- [ ] **Step 3: Implement the loader**

`src/lib/server/seed/run.ts`:

```ts
import type { Db } from '../db/connect';
import { chapters, units, cards } from '../db/schema';
import { curriculum } from './index';

export function seedIfEmpty(database: Db): void {
  const existing = database.select({ id: chapters.id }).from(chapters).limit(1).all();
  if (existing.length > 0) return;

  database.transaction((tx) => {
    curriculum.forEach((chapter, chapterIndex) => {
      const [insertedChapter] = tx
        .insert(chapters)
        .values({ order: chapterIndex + 1, title: chapter.title, kind: chapter.kind })
        .returning()
        .all();

      chapter.units.forEach((unit, unitIndex) => {
        const [insertedUnit] = tx
          .insert(units)
          .values({
            chapterId: insertedChapter.id,
            order: unitIndex + 1,
            title: unit.title,
            kind: unit.kind,
            dailyCap: unit.dailyCap
          })
          .returning()
          .all();

        const rows = unit.cards.map((card, cardIndex) => ({
          unitId: insertedUnit.id,
          order: cardIndex + 1,
          frontJson: JSON.stringify(card.front),
          backJson: JSON.stringify(card.back)
        }));
        tx.insert(cards).values(rows).run();
      });
    });
  });
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run src/lib/server/seed/run.test.ts`
Expected: PASS — all four assertions green.

- [ ] **Step 5: Wire the seeder into boot**

In `src/lib/server/db/index.ts`, change `open()` to seed after connecting:

```ts
import { seedIfEmpty } from '../seed/run';

function open(): Db {
  const dir = process.env.DATA_DIR ?? './data';
  mkdirSync(dir, { recursive: true });
  const database = connect(join(dir, 'app.db'));
  seedIfEmpty(database);
  return database;
}
```

This is exactly why `createTestDb` lives in `test-db.ts` and not here: seeding 900+ cards is a module-load side effect of importing `index.ts`, and no test should pay it. `createTestDb()` stays unseeded — tests that need content call `seedIfEmpty` themselves, so the queue, progress, and stats tests build minimal fixtures instead.

- [ ] **Step 6: Verify the full suite still passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: seed curriculum content on first boot"
```

---

## Task 6: Password hashing and session management

**Files:**
- Create: `src/lib/server/auth/password.ts`, `src/lib/server/auth/session.ts`
- Test: `src/lib/server/auth/password.test.ts`, `src/lib/server/auth/session.test.ts`

**Interfaces:**
- Consumes: `createTestDb` and the `users`/`sessions` tables (Task 2).
- Produces:
  - `password.ts`: `hashPassword(plain: string): Promise<string>`, `verifyPassword(hash: string, plain: string): Promise<boolean>`.
  - `session.ts`: `SESSION_COOKIE = 'session'`; `sessionMaxAge(remember: boolean): number` (seconds); `createSession(db, userId: number, remember: boolean, now?: Date): Promise<{ id: string; expiresAt: string }>`; `validateSession(db, id: string, now?: Date): Promise<{ id: number; username: string } | null>`; `invalidateSession(db, id: string): Promise<void>`.

- [ ] **Step 1: Write the failing password test**

`src/lib/server/auth/password.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('produces a verifiable hash', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(await verifyPassword(hash, 'correct horse battery')).toBe(true);
  });

  it('rejects the wrong password', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(await verifyPassword(hash, 'wrong horse battery')).toBe(false);
  });

  it('salts — the same password hashes differently each time', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });

  it('returns false rather than throwing on a malformed hash', async () => {
    expect(await verifyPassword('not-a-hash', 'anything')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/server/auth/password.test.ts`
Expected: FAIL — cannot resolve `./password`.

- [ ] **Step 3: Implement password hashing**

`src/lib/server/auth/password.ts`:

```ts
import { hash, verify } from '@node-rs/argon2';

const OPTIONS = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 };

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTIONS);
}

export async function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashed, plain, OPTIONS);
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run src/lib/server/auth/password.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing session test**

`src/lib/server/auth/session.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createTestDb } from '../db/test-db';
import { users, sessions } from '../db/schema';
import { createSession, validateSession, invalidateSession, sessionMaxAge } from './session';

function setup() {
  const db = createTestDb();
  const [user] = db
    .insert(users)
    .values({ username: 'yao', passwordHash: 'x', createdAt: new Date().toISOString() })
    .returning()
    .all();
  return { db, user };
}

describe('sessionMaxAge', () => {
  it('is one day without remember-me', () => {
    expect(sessionMaxAge(false)).toBe(60 * 60 * 24);
  });

  it('is one year with remember-me', () => {
    expect(sessionMaxAge(true)).toBe(60 * 60 * 24 * 365);
  });
});

describe('sessions', () => {
  it('creates a session that validates back to its user', async () => {
    const { db, user } = setup();
    const session = await createSession(db, user.id, false);
    expect(await validateSession(db, session.id)).toEqual({ id: user.id, username: 'yao' });
  });

  it('generates unguessable ids', async () => {
    const { db, user } = setup();
    const a = await createSession(db, user.id, false);
    const b = await createSession(db, user.id, false);
    expect(a.id).not.toBe(b.id);
    expect(a.id.length).toBeGreaterThanOrEqual(32);
  });

  it('rejects an unknown session id', async () => {
    const { db } = setup();
    expect(await validateSession(db, 'nope')).toBeNull();
  });

  it('rejects and deletes an expired session', async () => {
    const { db, user } = setup();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const session = await createSession(db, user.id, false, now);
    const later = new Date('2026-01-03T00:00:00.000Z');
    expect(await validateSession(db, session.id, later)).toBeNull();
    expect(db.select().from(sessions).all()).toHaveLength(0);
  });

  it('honours the remember flag in expiry', async () => {
    const { db, user } = setup();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const remembered = await createSession(db, user.id, true, now);
    const monthsLater = new Date('2026-06-01T00:00:00.000Z');
    expect(await validateSession(db, remembered.id, monthsLater)).not.toBeNull();
  });

  it('invalidates a session', async () => {
    const { db, user } = setup();
    const session = await createSession(db, user.id, false);
    await invalidateSession(db, session.id);
    expect(await validateSession(db, session.id)).toBeNull();
  });
});
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `npx vitest run src/lib/server/auth/session.test.ts`
Expected: FAIL — cannot resolve `./session`.

- [ ] **Step 7: Implement session management**

`src/lib/server/auth/session.ts`:

```ts
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/connect';
import { users, sessions } from '../db/schema';

export const SESSION_COOKIE = 'session';

const DAY_SECONDS = 60 * 60 * 24;

export function sessionMaxAge(remember: boolean): number {
  return remember ? DAY_SECONDS * 365 : DAY_SECONDS;
}

export async function createSession(
  db: Db,
  userId: number,
  remember: boolean,
  now: Date = new Date()
): Promise<{ id: string; expiresAt: string }> {
  const id = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + sessionMaxAge(remember) * 1000).toISOString();
  db.insert(sessions)
    .values({
      id,
      userId,
      expiresAt,
      remember: remember ? 1 : 0,
      createdAt: now.toISOString()
    })
    .run();
  return { id, expiresAt };
}

export async function validateSession(
  db: Db,
  id: string,
  now: Date = new Date()
): Promise<{ id: number; username: string } | null> {
  const [row] = db
    .select({ userId: users.id, username: users.username, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .limit(1)
    .all();

  if (!row) return null;
  if (new Date(row.expiresAt).getTime() <= now.getTime()) {
    db.delete(sessions).where(eq(sessions.id, id)).run();
    return null;
  }
  return { id: row.userId, username: row.username };
}

export async function invalidateSession(db: Db, id: string): Promise<void> {
  db.delete(sessions).where(eq(sessions.id, id)).run();
}
```

`SESSION_SECRET` is not used to sign the cookie: the session id is 32 bytes of CSPRNG output looked up server-side, which is not forgeable, so an HMAC adds nothing. Keep the env var documented in `.env.example` as reserved but do not read it — do not add signing code for it.

- [ ] **Step 8: Run it and confirm it passes**

Run: `npx vitest run src/lib/server/auth/session.test.ts`
Expected: PASS — all seven assertions green.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add password hashing and session management"
```

---

## Task 7: Auth routes, hooks, and route guarding

**Files:**
- Create: `src/lib/server/auth/credentials.ts`, `src/hooks.server.ts`, `src/app.d.ts`, `src/routes/+layout.server.ts`, `src/routes/login/+page.server.ts`, `src/routes/login/+page.svelte`, `src/routes/signup/+page.server.ts`, `src/routes/signup/+page.svelte`, `src/routes/logout/+server.ts`, `src/routes/api/theme/+server.ts`
- Modify: `src/routes/+layout.svelte` (accept the `data` prop; the shell itself comes in Task 10)
- Test: `src/routes/signup/validate.test.ts`

**Interfaces:**
- Consumes: `db` (Task 2), `hashPassword`/`verifyPassword` (Task 6), `createSession`/`validateSession`/`invalidateSession`/`SESSION_COOKIE`/`sessionMaxAge` (Task 6).
- Produces:
  - `src/lib/server/auth/credentials.ts` exporting `validateCredentials(username: string, password: string): string | null` — returns an error message or `null` when valid.
  - `event.locals.user: { id: number; username: string } | null` and `event.locals.theme: 'light' | 'dark'` available in every server load and action.
  - Working `/login`, `/signup`, `/logout`, and `POST /api/theme`.

- [ ] **Step 1: Write the failing credential-validation test**

`src/routes/signup/validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateCredentials } from '$lib/server/auth/credentials';

describe('validateCredentials', () => {
  it('accepts a reasonable username and password', () => {
    expect(validateCredentials('yao', 'hunter2hunter2')).toBeNull();
  });

  it('rejects a username shorter than 3 characters', () => {
    expect(validateCredentials('ab', 'hunter2hunter2')).toMatch(/username/i);
  });

  it('rejects a username with spaces or symbols', () => {
    expect(validateCredentials('yao chen', 'hunter2hunter2')).toMatch(/username/i);
    expect(validateCredentials('yao/chen', 'hunter2hunter2')).toMatch(/username/i);
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(validateCredentials('yao', 'short')).toMatch(/password/i);
  });

  it('rejects a username longer than 32 characters', () => {
    expect(validateCredentials('y'.repeat(33), 'hunter2hunter2')).toMatch(/username/i);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/routes/signup/validate.test.ts`
Expected: FAIL — cannot resolve `$lib/server/auth/credentials`.

- [ ] **Step 3: Implement credential validation**

`src/lib/server/auth/credentials.ts`:

```ts
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;

export function validateCredentials(username: string, password: string): string | null {
  if (!USERNAME_PATTERN.test(username)) {
    return 'Username must be 3–32 characters, letters, numbers, hyphen or underscore only.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  return null;
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run src/routes/signup/validate.test.ts`
Expected: PASS.

- [ ] **Step 5: Type the app locals**

`src/app.d.ts`:

```ts
declare global {
  namespace App {
    interface Locals {
      user: { id: number; username: string } | null;
      theme: 'light' | 'dark';
    }
  }
}

export {};
```

- [ ] **Step 6: Implement hooks — session resolution, theme, and the route guard**

`src/hooks.server.ts`:

```ts
import { redirect, type Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { SESSION_COOKIE, validateSession } from '$lib/server/auth/session';

const PUBLIC_ROUTES = ['/login', '/signup'];

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get(SESSION_COOKIE);
  event.locals.user = sessionId ? await validateSession(db, sessionId) : null;
  if (sessionId && !event.locals.user) {
    event.cookies.delete(SESSION_COOKIE, { path: '/' });
  }

  event.locals.theme = event.cookies.get('theme') === 'dark' ? 'dark' : 'light';

  const isPublic = PUBLIC_ROUTES.includes(event.url.pathname);
  if (!event.locals.user && !isPublic) {
    throw redirect(303, `/login?next=${encodeURIComponent(event.url.pathname)}`);
  }
  if (event.locals.user && isPublic) {
    throw redirect(303, '/');
  }

  return resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace('%theme%', event.locals.theme === 'dark' ? 'dark' : '')
  });
};
```

`/api/theme` must stay reachable while logged in — it is not in `PUBLIC_ROUTES`, and that is correct: only authenticated users toggle the theme from the app shell. The login and signup pages render in the cookie's theme without needing the endpoint.

- [ ] **Step 7: Expose user and theme to the layout**

`src/routes/+layout.server.ts`:

```ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => ({
  user: locals.user,
  theme: locals.theme
});
```

- [ ] **Step 8: Implement the login route**

`src/routes/login/+page.server.ts`:

```ts
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { verifyPassword } from '$lib/server/auth/password';
import { createSession, SESSION_COOKIE, sessionMaxAge } from '$lib/server/auth/session';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, cookies, url }) => {
    const form = await request.formData();
    const username = String(form.get('username') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const remember = form.get('remember') === 'on';

    const [user] = db.select().from(users).where(eq(users.username, username)).limit(1).all();
    const ok = user ? await verifyPassword(user.passwordHash, password) : false;
    if (!user || !ok) {
      return fail(400, { username, error: 'Incorrect username or password.' });
    }

    const session = await createSession(db, user.id, remember);
    cookies.set(SESSION_COOKIE, session.id, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionMaxAge(remember)
    });

    const next = url.searchParams.get('next');
    throw redirect(303, next && next.startsWith('/') ? next : '/');
  }
};
```

The lookup-then-verify order leaks timing on whether a username exists. That is acceptable for a self-hosted app with open signup (an attacker can enumerate usernames through the signup form's uniqueness error anyway) — do not add a dummy-hash mitigation.

`src/routes/login/+page.svelte` — a centered card, one column, `max-w-sm`, works down to 320px wide:

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  let { form } = $props();
</script>

<div class="flex min-h-screen items-center justify-center p-6">
  <form method="POST" use:enhance class="w-full max-w-sm space-y-4">
    <h1 class="text-2xl font-semibold">Sign in</h1>

    {#if form?.error}
      <p class="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{form.error}</p>
    {/if}

    <label class="block space-y-1">
      <span class="text-sm font-medium">Username</span>
      <input name="username" value={form?.username ?? ''} autocomplete="username" required
        class="w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900" />
    </label>

    <label class="block space-y-1">
      <span class="text-sm font-medium">Password</span>
      <input name="password" type="password" autocomplete="current-password" required
        class="w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900" />
    </label>

    <label class="flex items-center gap-2 text-sm">
      <input name="remember" type="checkbox" class="rounded" />
      Keep me signed in on this device
    </label>

    <button class="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white dark:bg-slate-100 dark:text-slate-900">
      Sign in
    </button>

    <p class="text-center text-sm text-slate-500">No account? <a href="/signup" class="underline">Sign up</a></p>
  </form>
</div>
```

- [ ] **Step 9: Implement the signup route**

`src/routes/signup/+page.server.ts` — same shape as login, but validates first, checks username uniqueness, hashes, inserts, then creates the session and redirects to `/`:

```ts
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth/password';
import { validateCredentials } from '$lib/server/auth/credentials';
import { createSession, SESSION_COOKIE, sessionMaxAge } from '$lib/server/auth/session';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const form = await request.formData();
    const username = String(form.get('username') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const remember = form.get('remember') === 'on';

    const problem = validateCredentials(username, password);
    if (problem) return fail(400, { username, error: problem });

    const [taken] = db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1).all();
    if (taken) return fail(400, { username, error: 'That username is already taken.' });

    const [user] = db
      .insert(users)
      .values({ username, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() })
      .returning()
      .all();

    const session = await createSession(db, user.id, remember);
    cookies.set(SESSION_COOKIE, session.id, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionMaxAge(remember)
    });

    throw redirect(303, '/');
  }
};
```

`src/routes/signup/+page.svelte` is the login page with the heading changed to "Create account", `autocomplete="new-password"`, and the footer link pointing at `/login`.

- [ ] **Step 10: Implement logout and the theme endpoint**

`src/routes/logout/+server.ts`:

```ts
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { SESSION_COOKIE, invalidateSession } from '$lib/server/auth/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
  const id = cookies.get(SESSION_COOKIE);
  if (id) await invalidateSession(db, id);
  cookies.delete(SESSION_COOKIE, { path: '/' });
  throw redirect(303, '/login');
};
```

`src/routes/api/theme/+server.ts`:

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { theme } = await request.json();
  const value = theme === 'dark' ? 'dark' : 'light';
  cookies.set('theme', value, {
    path: '/',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365
  });
  return json({ theme: value });
};
```

- [ ] **Step 11: Verify the auth flow by hand**

```bash
npm run dev
```

Visit `http://localhost:5173/` — expect a redirect to `/login?next=%2F`. Create an account at `/signup`, confirm you land on `/` (the placeholder page from Task 1). Restart the dev server and reload — with "Keep me signed in" checked you stay logged in. Check the cookie in devtools: `HttpOnly` set, `Max-Age` ≈ 31536000. Repeat without the checkbox and confirm `Max-Age` ≈ 86400.

- [ ] **Step 12: Run the suite and commit**

```bash
npm test
git add -A
git commit -m "feat: add login, signup, logout and session hooks"
```

---

## Task 8: FSRS scheduler wrapper

**Files:**
- Create: `src/lib/server/scheduler.ts`
- Test: `src/lib/server/scheduler.test.ts`

**Interfaces:**
- Consumes: the `userCards`/`reviewLogs` table shapes (Task 2).
- Produces:
  - `type UserCardRow` — the row shape of `userCards` minus `userId`/`cardId`.
  - `newUserCard(now: Date): UserCardRow` — an un-reviewed card's initial row.
  - `previewRatings(row: UserCardRow, now: Date): Array<{ rating: 1|2|3|4; label: 'Again'|'Hard'|'Good'|'Easy'; interval: string }>` — the four button previews, ordered Again→Easy.
  - `applyRating(row: UserCardRow, rating: number, now: Date): { next: UserCardRow; log: { rating: number; reviewedAt: string; state: number; stability: number; difficulty: number; scheduledDays: number } }`.
  - `formatInterval(from: Date, to: Date): string` — `"<1m"`, `"10m"`, `"1h"`, `"3d"`, `"2mo"`, `"1.4y"`.

The wrapper's job is translation only: DB rows are ISO strings and plain numbers, `ts-fsrs` wants `Date` objects and its own `Card` type. All scheduling decisions stay inside the library (`docs/fsrs-algorithm.md` §8).

- [ ] **Step 1: Write the failing test**

`src/lib/server/scheduler.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { State, Rating } from 'ts-fsrs';
import { newUserCard, previewRatings, applyRating, formatInterval } from './scheduler';

const NOW = new Date('2026-01-01T09:00:00.000Z');

describe('newUserCard', () => {
  it('starts in the New state, due now, never reviewed', () => {
    const row = newUserCard(NOW);
    expect(row.state).toBe(State.New);
    expect(row.due).toBe(NOW.toISOString());
    expect(row.reps).toBe(0);
    expect(row.lapses).toBe(0);
    expect(row.lastReview).toBeNull();
  });
});

describe('previewRatings', () => {
  it('returns four options labelled Again through Easy', () => {
    const previews = previewRatings(newUserCard(NOW), NOW);
    expect(previews.map((p) => p.label)).toEqual(['Again', 'Hard', 'Good', 'Easy']);
    expect(previews.map((p) => p.rating)).toEqual([1, 2, 3, 4]);
  });

  it('gives every option a non-empty interval label', () => {
    for (const preview of previewRatings(newUserCard(NOW), NOW)) {
      expect(preview.interval).toMatch(/\S/);
    }
  });

  it('never schedules Easy sooner than Good', () => {
    let row = newUserCard(NOW);
    row = applyRating(row, Rating.Good, NOW).next;
    const later = new Date('2026-01-05T09:00:00.000Z');
    row = applyRating(row, Rating.Good, later).next;

    const much = new Date('2026-01-20T09:00:00.000Z');
    const good = applyRating(row, Rating.Good, much).next;
    const easy = applyRating(row, Rating.Easy, much).next;
    expect(new Date(easy.due).getTime()).toBeGreaterThan(new Date(good.due).getTime());
  });
});

describe('applyRating', () => {
  it('advances reps and stamps lastReview', () => {
    const { next } = applyRating(newUserCard(NOW), Rating.Good, NOW);
    expect(next.reps).toBe(1);
    expect(next.lastReview).toBe(NOW.toISOString());
    expect(next.state).not.toBe(State.New);
  });

  it('pushes the due date into the future', () => {
    const { next } = applyRating(newUserCard(NOW), Rating.Good, NOW);
    expect(new Date(next.due).getTime()).toBeGreaterThan(NOW.getTime());
  });

  it('counts a lapse when a Review-state card is rated Again', () => {
    let row = newUserCard(NOW);
    row = applyRating(row, Rating.Easy, NOW).next; // Easy graduates immediately
    expect(row.state).toBe(State.Review);
    const later = new Date('2026-02-01T09:00:00.000Z');
    const { next } = applyRating(row, Rating.Again, later);
    expect(next.lapses).toBe(1);
    expect(next.state).toBe(State.Relearning);
  });

  it('produces a log snapshotting the pre-review state', () => {
    const row = newUserCard(NOW);
    const { log } = applyRating(row, Rating.Good, NOW);
    expect(log.rating).toBe(Rating.Good);
    expect(log.reviewedAt).toBe(NOW.toISOString());
    expect(log.state).toBe(State.New);
  });

  it('round-trips through ISO strings without drift', () => {
    let row = newUserCard(NOW);
    for (const [i, rating] of [Rating.Good, Rating.Hard, Rating.Good, Rating.Easy].entries()) {
      const at = new Date(new Date(row.due).getTime() + i * 1000);
      row = applyRating(row, rating, at).next;
      expect(Number.isFinite(new Date(row.due).getTime())).toBe(true);
      expect(Number.isFinite(row.stability)).toBe(true);
      expect(Number.isFinite(row.difficulty)).toBe(true);
    }
  });
});

describe('formatInterval', () => {
  const from = new Date('2026-01-01T00:00:00.000Z');
  const plus = (ms: number) => new Date(from.getTime() + ms);

  it('formats minutes, hours, days, months and years', () => {
    expect(formatInterval(from, plus(30 * 1000))).toBe('<1m');
    expect(formatInterval(from, plus(10 * 60 * 1000))).toBe('10m');
    expect(formatInterval(from, plus(3 * 60 * 60 * 1000))).toBe('3h');
    expect(formatInterval(from, plus(5 * 24 * 60 * 60 * 1000))).toBe('5d');
    expect(formatInterval(from, plus(70 * 24 * 60 * 60 * 1000))).toBe('2.3mo');
    expect(formatInterval(from, plus(500 * 24 * 60 * 60 * 1000))).toBe('1.4y');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/server/scheduler.test.ts`
Expected: FAIL — cannot resolve `./scheduler`.

- [ ] **Step 3: Implement the wrapper**

`src/lib/server/scheduler.ts`:

```ts
import { fsrs, generatorParameters, createEmptyCard, State, Rating, type Card, type Grade } from 'ts-fsrs';

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

export type UserCardRow = {
  state: number;
  stability: number;
  difficulty: number;
  due: string;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  lastReview: string | null;
};

export type ReviewLogFields = {
  rating: number;
  reviewedAt: string;
  state: number;
  stability: number;
  difficulty: number;
  scheduledDays: number;
};

function toCard(row: UserCardRow): Card {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: 0,
    scheduled_days: row.scheduledDays,
    learning_steps: row.learningSteps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as State,
    last_review: row.lastReview ? new Date(row.lastReview) : undefined
  } as Card;
}

function toRow(card: Card): UserCardRow {
  return {
    state: card.state,
    stability: card.stability,
    difficulty: card.difficulty,
    due: card.due.toISOString(),
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    lastReview: card.last_review ? card.last_review.toISOString() : null
  };
}

export function newUserCard(now: Date): UserCardRow {
  return toRow(createEmptyCard(now));
}

const LABELS = { [Rating.Again]: 'Again', [Rating.Hard]: 'Hard', [Rating.Good]: 'Good', [Rating.Easy]: 'Easy' } as const;
const GRADES: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];

export function previewRatings(row: UserCardRow, now: Date) {
  const outcomes = scheduler.repeat(toCard(row), now);
  return GRADES.map((grade) => ({
    rating: grade as 1 | 2 | 3 | 4,
    label: LABELS[grade],
    interval: formatInterval(now, outcomes[grade].card.due)
  }));
}

export function applyRating(
  row: UserCardRow,
  rating: number,
  now: Date
): { next: UserCardRow; log: ReviewLogFields } {
  const outcome = scheduler.repeat(toCard(row), now)[rating as Grade];
  return {
    next: toRow(outcome.card),
    log: {
      rating,
      reviewedAt: now.toISOString(),
      state: row.state,
      stability: outcome.card.stability,
      difficulty: outcome.card.difficulty,
      scheduledDays: outcome.card.scheduled_days
    }
  };
}

export function formatInterval(from: Date, to: Date): string {
  const minutes = (to.getTime() - from.getTime()) / 60000;
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  if (days < 30) return `${Math.round(days)}d`;
  const months = days / 30.44;
  if (months < 12) return `${round1(months)}mo`;
  return `${round1(days / 365.25)}y`;
}

function round1(value: number): string {
  return (Math.round(value * 10) / 10).toString();
}

export { State, Rating };
```

If `ts-fsrs`'s `Card` type gains or loses a field between versions, fix `toCard`/`toRow` — those two functions are the only place the library's shape is touched.

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run src/lib/server/scheduler.test.ts`
Expected: PASS. If `formatInterval`'s month/year cases fail by a rounding digit, adjust the divisors — not the assertions' shape.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: wrap ts-fsrs with row mapping and interval previews"
```

---

## Task 9: Daily queue logic

**Files:**
- Create: `src/lib/server/queue.ts`
- Test: `src/lib/server/queue.test.ts`

**Interfaces:**
- Consumes: `db`/`createTestDb` + tables (Task 2), `newUserCard`/`applyRating`/`UserCardRow` (Task 8).
- Produces:
  - `currentUnitId(db, userId: number): number | null` — first unit in `(chapter.order, unit.order)` with an un-introduced card; `null` when the whole curriculum is introduced.
  - `nextQueueItem(db, userId: number, now?: Date): QueueItem | null` where `QueueItem = { cardId: number; unitId: number; unitTitle: string; unitKind: UnitKind; frontJson: string; backJson: string; row: UserCardRow; isNew: boolean }`.
  - `queueCounts(db, userId: number, now?: Date): { due: number; newAvailable: number }`.
  - `recordReview(db, userId: number, cardId: number, rating: number, now?: Date): void` — upserts `user_cards` and appends to `review_logs` in one transaction.

Rules implemented here, straight from the spec: reviews come before new cards; reviews are unbounded across every introduced unit; new cards come only from the current unit, capped at that unit's `daily_cap` per calendar day (UTC), counted as *cards first introduced today*.

- [ ] **Step 1: Write the failing test**

`src/lib/server/queue.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Rating } from 'ts-fsrs';
import { createTestDb } from './db/test-db';
import { chapters, units, cards, users, userCards } from './db/schema';
import { currentUnitId, nextQueueItem, queueCounts, recordReview } from './queue';

const NOW = new Date('2026-03-10T09:00:00.000Z');

function fixture() {
  const db = createTestDb();
  const [user] = db.insert(users).values({ username: 'u', passwordHash: 'x', createdAt: NOW.toISOString() }).returning().all();

  const [ch1] = db.insert(chapters).values({ order: 1, title: 'Ch1', kind: 'kana' }).returning().all();
  const [ch2] = db.insert(chapters).values({ order: 2, title: 'Ch2', kind: 'kana' }).returning().all();
  const [u1] = db.insert(units).values({ chapterId: ch1.id, order: 1, title: 'U1', kind: 'kana', dailyCap: 2 }).returning().all();
  const [u2] = db.insert(units).values({ chapterId: ch1.id, order: 2, title: 'U2', kind: 'kana', dailyCap: 2 }).returning().all();
  const [u3] = db.insert(units).values({ chapterId: ch2.id, order: 1, title: 'U3', kind: 'kana', dailyCap: 2 }).returning().all();

  const made: Record<number, number[]> = { [u1.id]: [], [u2.id]: [], [u3.id]: [] };
  for (const unit of [u1, u2, u3]) {
    for (let i = 1; i <= 3; i++) {
      const [card] = db.insert(cards).values({
        unitId: unit.id, order: i,
        frontJson: JSON.stringify({ char: `${unit.title}-${i}` }),
        backJson: JSON.stringify({ romaji: 'x', mnemonic: 'y' })
      }).returning().all();
      made[unit.id].push(card.id);
    }
  }
  return { db, userId: user.id, u1, u2, u3, made };
}

describe('currentUnitId', () => {
  it('is the first unit when nothing is introduced', () => {
    const { db, userId, u1 } = fixture();
    expect(currentUnitId(db, userId)).toBe(u1.id);
  });

  it('advances only once every card in a unit is introduced', () => {
    const { db, userId, u1, u2, made } = fixture();
    recordReview(db, userId, made[u1.id][0], Rating.Good, NOW);
    recordReview(db, userId, made[u1.id][1], Rating.Good, NOW);
    expect(currentUnitId(db, userId)).toBe(u1.id);
    recordReview(db, userId, made[u1.id][2], Rating.Again, NOW);
    expect(currentUnitId(db, userId)).toBe(u2.id);
  });

  it('crosses chapter boundaries in global order', () => {
    const { db, userId, u1, u2, u3, made } = fixture();
    for (const id of [...made[u1.id], ...made[u2.id]]) recordReview(db, userId, id, Rating.Good, NOW);
    expect(currentUnitId(db, userId)).toBe(u3.id);
  });

  it('is null when the curriculum is exhausted', () => {
    const { db, userId, u1, u2, u3, made } = fixture();
    for (const id of [...made[u1.id], ...made[u2.id], ...made[u3.id]]) recordReview(db, userId, id, Rating.Good, NOW);
    expect(currentUnitId(db, userId)).toBeNull();
  });
});

describe('queueCounts', () => {
  it('offers new cards up to the unit daily cap', () => {
    const { db, userId } = fixture();
    expect(queueCounts(db, userId, NOW).newAvailable).toBe(2);
  });

  it('decrements the cap as cards are introduced today', () => {
    const { db, userId, u1, made } = fixture();
    recordReview(db, userId, made[u1.id][0], Rating.Good, NOW);
    expect(queueCounts(db, userId, NOW).newAvailable).toBe(1);
    recordReview(db, userId, made[u1.id][1], Rating.Good, NOW);
    expect(queueCounts(db, userId, NOW).newAvailable).toBe(0);
  });

  it('resets the cap the next day', () => {
    const { db, userId, u1, made } = fixture();
    recordReview(db, userId, made[u1.id][0], Rating.Good, NOW);
    recordReview(db, userId, made[u1.id][1], Rating.Good, NOW);
    const tomorrow = new Date('2026-03-11T09:00:00.000Z');
    expect(queueCounts(db, userId, tomorrow).newAvailable).toBe(1); // only 1 card left in u1
  });

  it('counts due reviews across every introduced unit', () => {
    const { db, userId, u1, made } = fixture();
    recordReview(db, userId, made[u1.id][0], Rating.Again, NOW);
    const later = new Date('2026-03-11T09:00:00.000Z');
    expect(queueCounts(db, userId, later).due).toBe(1);
  });
});

describe('nextQueueItem', () => {
  it('serves a due review before a new card', () => {
    const { db, userId, u1, made } = fixture();
    recordReview(db, userId, made[u1.id][0], Rating.Again, NOW);
    const later = new Date('2026-03-11T09:00:00.000Z');
    const item = nextQueueItem(db, userId, later);
    expect(item?.cardId).toBe(made[u1.id][0]);
    expect(item?.isNew).toBe(false);
  });

  it('serves new cards in card order when nothing is due', () => {
    const { db, userId, u1, made } = fixture();
    const item = nextQueueItem(db, userId, NOW);
    expect(item?.cardId).toBe(made[u1.id][0]);
    expect(item?.isNew).toBe(true);
    expect(item?.unitKind).toBe('kana');
  });

  it('returns null when the cap is spent and nothing is due', () => {
    const { db, userId, u1, made } = fixture();
    recordReview(db, userId, made[u1.id][0], Rating.Easy, NOW);
    recordReview(db, userId, made[u1.id][1], Rating.Easy, NOW);
    expect(nextQueueItem(db, userId, NOW)).toBeNull();
  });

  it('never pulls a new card from a later unit', () => {
    const { db, userId, u1, u2, made } = fixture();
    for (const id of made[u1.id]) recordReview(db, userId, id, Rating.Easy, NOW);
    const item = nextQueueItem(db, userId, NOW);
    expect(item === null || made[u2.id].includes(item.cardId)).toBe(true);
  });
});

describe('recordReview', () => {
  it('creates a user_cards row on first review and updates it on the second', () => {
    const { db, userId, u1, made } = fixture();
    recordReview(db, userId, made[u1.id][0], Rating.Good, NOW);
    const [first] = db.select().from(userCards).all();
    expect(first.reps).toBe(1);

    const later = new Date('2026-03-12T09:00:00.000Z');
    recordReview(db, userId, made[u1.id][0], Rating.Good, later);
    const rows = db.select().from(userCards).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].reps).toBe(2);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/server/queue.test.ts`
Expected: FAIL — cannot resolve `./queue`.

- [ ] **Step 3: Implement the queue**

`src/lib/server/queue.ts`:

```ts
import { and, asc, eq, isNull, lte, sql } from 'drizzle-orm';
import type { Db } from './db/connect';
import type { UnitKind } from '$lib/cards';
import { chapters, units, cards, userCards, reviewLogs } from './db/schema';
import { applyRating, newUserCard, type UserCardRow } from './scheduler';

export type QueueItem = {
  cardId: number;
  unitId: number;
  unitTitle: string;
  unitKind: UnitKind;
  frontJson: string;
  backJson: string;
  row: UserCardRow;
  isNew: boolean;
};

function dayStart(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export function currentUnitId(db: Db, userId: number): number | null {
  const [row] = db
    .select({ unitId: units.id })
    .from(units)
    .innerJoin(chapters, eq(chapters.id, units.chapterId))
    .innerJoin(cards, eq(cards.unitId, units.id))
    .leftJoin(userCards, and(eq(userCards.cardId, cards.id), eq(userCards.userId, userId)))
    .where(isNull(userCards.cardId))
    .orderBy(asc(chapters.order), asc(units.order), asc(cards.order))
    .limit(1)
    .all();
  return row?.unitId ?? null;
}

function introducedToday(db: Db, userId: number, unitId: number, now: Date): number {
  const [row] = db
    .select({ n: sql<number>`count(*)` })
    .from(reviewLogs)
    .innerJoin(cards, eq(cards.id, reviewLogs.cardId))
    .where(
      and(
        eq(reviewLogs.userId, userId),
        eq(cards.unitId, unitId),
        eq(reviewLogs.state, 0), // State.New — the log snapshots the pre-review state
        sql`${reviewLogs.reviewedAt} >= ${dayStart(now)}`
      )
    )
    .all();
  return row?.n ?? 0;
}

export function queueCounts(db: Db, userId: number, now: Date = new Date()): { due: number; newAvailable: number } {
  const [dueRow] = db
    .select({ n: sql<number>`count(*)` })
    .from(userCards)
    .where(and(eq(userCards.userId, userId), lte(userCards.due, now.toISOString())))
    .all();

  const unitId = currentUnitId(db, userId);
  if (unitId === null) return { due: dueRow?.n ?? 0, newAvailable: 0 };

  const [unit] = db.select().from(units).where(eq(units.id, unitId)).all();
  const remainingInUnit = db
    .select({ id: cards.id })
    .from(cards)
    .leftJoin(userCards, and(eq(userCards.cardId, cards.id), eq(userCards.userId, userId)))
    .where(and(eq(cards.unitId, unitId), isNull(userCards.cardId)))
    .all().length;

  const capLeft = Math.max(0, unit.dailyCap - introducedToday(db, userId, unitId, now));
  return { due: dueRow?.n ?? 0, newAvailable: Math.min(capLeft, remainingInUnit) };
}

export function nextQueueItem(db: Db, userId: number, now: Date = new Date()): QueueItem | null {
  const [review] = db
    .select({
      cardId: cards.id, unitId: units.id, unitTitle: units.title, unitKind: units.kind,
      frontJson: cards.frontJson, backJson: cards.backJson, uc: userCards
    })
    .from(userCards)
    .innerJoin(cards, eq(cards.id, userCards.cardId))
    .innerJoin(units, eq(units.id, cards.unitId))
    .where(and(eq(userCards.userId, userId), lte(userCards.due, now.toISOString())))
    .orderBy(asc(userCards.due))
    .limit(1)
    .all();

  if (review) {
    return {
      cardId: review.cardId,
      unitId: review.unitId,
      unitTitle: review.unitTitle,
      unitKind: review.unitKind as UnitKind,
      frontJson: review.frontJson,
      backJson: review.backJson,
      row: toRow(review.uc),
      isNew: false
    };
  }

  if (queueCounts(db, userId, now).newAvailable === 0) return null;

  const unitId = currentUnitId(db, userId);
  if (unitId === null) return null;

  const [fresh] = db
    .select({
      cardId: cards.id, unitTitle: units.title, unitKind: units.kind,
      frontJson: cards.frontJson, backJson: cards.backJson
    })
    .from(cards)
    .innerJoin(units, eq(units.id, cards.unitId))
    .leftJoin(userCards, and(eq(userCards.cardId, cards.id), eq(userCards.userId, userId)))
    .where(and(eq(cards.unitId, unitId), isNull(userCards.cardId)))
    .orderBy(asc(cards.order))
    .limit(1)
    .all();

  if (!fresh) return null;
  return {
    cardId: fresh.cardId,
    unitId,
    unitTitle: fresh.unitTitle,
    unitKind: fresh.unitKind as UnitKind,
    frontJson: fresh.frontJson,
    backJson: fresh.backJson,
    row: newUserCard(now),
    isNew: true
  };
}

function toRow(uc: typeof userCards.$inferSelect): UserCardRow {
  return {
    state: uc.state, stability: uc.stability, difficulty: uc.difficulty, due: uc.due,
    scheduledDays: uc.scheduledDays, learningSteps: uc.learningSteps,
    reps: uc.reps, lapses: uc.lapses, lastReview: uc.lastReview
  };
}

export function recordReview(db: Db, userId: number, cardId: number, rating: number, now: Date = new Date()): void {
  db.transaction((tx) => {
    const [existing] = tx
      .select()
      .from(userCards)
      .where(and(eq(userCards.userId, userId), eq(userCards.cardId, cardId)))
      .all();

    const current = existing ? toRow(existing) : newUserCard(now);
    const { next, log } = applyRating(current, rating, now);

    if (existing) {
      tx.update(userCards).set(next).where(and(eq(userCards.userId, userId), eq(userCards.cardId, cardId))).run();
    } else {
      tx.insert(userCards).values({ userId, cardId, ...next }).run();
    }

    tx.insert(reviewLogs).values({ userId, cardId, ...log }).run();
  });
}
```

`introducedToday` counts `review_logs` rows whose snapshotted `state` is `New` — that is exactly "cards first introduced today", and it survives a card later lapsing back to Relearning. Do not count `user_cards` rows by creation time; there is no created-at column and adding one would duplicate information the log already holds.

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run src/lib/server/queue.test.ts`
Expected: PASS — all thirteen assertions green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add daily queue selection and review recording"
```

---

## Task 10: App shell — nav, theme toggle, responsive layout

**Files:**
- Create: `src/lib/components/ThemeToggle.svelte`
- Modify: `src/routes/+layout.svelte`
- Test: manual (visual); no unit test — this task has no logic worth asserting beyond what Task 7's endpoint test already covers.

**Interfaces:**
- Consumes: `data.user` and `data.theme` from `+layout.server.ts` (Task 7), `POST /api/theme` (Task 7).
- Produces: an app shell rendered around every authenticated page — a top bar with three links (Map, Study, Stats), the theme toggle, and a sign-out button; `<main class="mx-auto w-full max-w-3xl p-4 sm:p-6">` wrapping the page content.

- [ ] **Step 1: Build the theme toggle**

`src/lib/components/ThemeToggle.svelte`:

```svelte
<script lang="ts">
  let { theme }: { theme: 'light' | 'dark' } = $props();
  let current = $state(theme);

  async function toggle() {
    current = current === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', current === 'dark');
    await fetch('/api/theme', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ theme: current })
    });
  }
</script>

<button
  onclick={toggle}
  aria-label={current === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
  class="rounded-md p-2 text-lg hover:bg-slate-100 dark:hover:bg-slate-800"
>
  {current === 'dark' ? '☀' : '☾'}
</button>
```

The class is flipped optimistically on the client so the change is instant; the fetch only persists the cookie for the next SSR. There is no flash on reload because `hooks.server.ts` already stamps the class into `app.html`.

- [ ] **Step 2: Build the shell**

`src/routes/+layout.svelte`:

```svelte
<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';

  let { data, children } = $props();

  const links = [
    { href: '/', label: 'Map' },
    { href: '/study', label: 'Study' },
    { href: '/stats', label: 'Stats' }
  ];
</script>

{#if data.user}
  <header class="border-b border-slate-200 dark:border-slate-800">
    <nav class="mx-auto flex w-full max-w-3xl items-center gap-1 p-3 sm:gap-2 sm:p-4">
      {#each links as link}
        <a
          href={link.href}
          class="rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
          class:bg-slate-100={page.url.pathname === link.href}
          class:dark:bg-slate-800={page.url.pathname === link.href}
        >
          {link.label}
        </a>
      {/each}

      <div class="ml-auto flex items-center gap-1">
        <ThemeToggle theme={data.theme} />
        <form method="POST" action="/logout">
          <button class="rounded-md px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            Sign out
          </button>
        </form>
      </div>
    </nav>
  </header>
{/if}

<main class="mx-auto w-full max-w-3xl p-4 sm:p-6">
  {@render children()}
</main>
```

- [ ] **Step 3: Verify by hand**

```bash
npm run dev
```

Sign in, then: toggle the theme and confirm the whole page flips instantly; hard-reload and confirm it comes back in the chosen theme with no white flash; narrow the window to 320px and confirm the nav does not overflow horizontally; click Sign out and confirm you land on `/login`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add app shell with nav and theme toggle"
```

---

## Task 11: Chapter map page

**Files:**
- Create: `src/lib/server/progress.ts`, `src/lib/components/ProgressBar.svelte`, `src/routes/+page.server.ts`
- Modify: `src/routes/+page.svelte`
- Test: `src/lib/server/progress.test.ts`

**Interfaces:**
- Consumes: tables (Task 2), `currentUnitId` (Task 9), `recordReview` for test setup (Task 9).
- Produces: `chapterProgress(db, userId: number): ChapterProgress[]` where

```ts
type UnitProgress = {
  id: number; title: string; kind: UnitKind;
  total: number; introduced: number; mature: number;
  status: 'done' | 'current' | 'locked';
};
type ChapterProgress = {
  id: number; title: string;
  total: number; introduced: number;
  units: UnitProgress[];
};
```

Definitions, fixed here so the stats page reuses them: **introduced** = a `user_cards` row exists. **mature** = `state = 2` (Review) *and* `stability >= 21`. **status** = `current` for the unit `currentUnitId` returns; `locked` for any unit ordered after it; `done` for any unit ordered before it.

- [ ] **Step 1: Write the failing test**

`src/lib/server/progress.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Rating } from 'ts-fsrs';
import { createTestDb } from './db/test-db';
import { chapters, units, cards, users, userCards } from './db/schema';
import { recordReview } from './queue';
import { chapterProgress } from './progress';

const NOW = new Date('2026-03-10T09:00:00.000Z');

function fixture() {
  const db = createTestDb();
  const [user] = db.insert(users).values({ username: 'u', passwordHash: 'x', createdAt: NOW.toISOString() }).returning().all();
  const [ch] = db.insert(chapters).values({ order: 1, title: 'Ch1', kind: 'kana' }).returning().all();
  const [u1] = db.insert(units).values({ chapterId: ch.id, order: 1, title: 'U1', kind: 'kana', dailyCap: 5 }).returning().all();
  const [u2] = db.insert(units).values({ chapterId: ch.id, order: 2, title: 'U2', kind: 'kana', dailyCap: 5 }).returning().all();
  const made: Record<number, number[]> = { [u1.id]: [], [u2.id]: [] };
  for (const unit of [u1, u2]) {
    for (let i = 1; i <= 2; i++) {
      const [card] = db.insert(cards).values({
        unitId: unit.id, order: i, frontJson: '{"char":"あ"}', backJson: '{"romaji":"a","mnemonic":"m"}'
      }).returning().all();
      made[unit.id].push(card.id);
    }
  }
  return { db, userId: user.id, ch, u1, u2, made };
}

describe('chapterProgress', () => {
  it('reports zero progress and marks the first unit current', () => {
    const { db, userId, u1, u2 } = fixture();
    const [chapter] = chapterProgress(db, userId);
    expect(chapter.total).toBe(4);
    expect(chapter.introduced).toBe(0);
    expect(chapter.units.map((u) => u.status)).toEqual(['current', 'locked']);
    expect(chapter.units.map((u) => u.id)).toEqual([u1.id, u2.id]);
    expect(chapter.units[0].total).toBe(2);
  });

  it('counts introduced cards', () => {
    const { db, userId, u1, made } = fixture();
    recordReview(db, userId, made[u1.id][0], Rating.Good, NOW);
    const [chapter] = chapterProgress(db, userId);
    expect(chapter.introduced).toBe(1);
    expect(chapter.units[0].introduced).toBe(1);
  });

  it('marks a fully introduced unit done and advances current', () => {
    const { db, userId, u1, made } = fixture();
    for (const id of made[u1.id]) recordReview(db, userId, id, Rating.Good, NOW);
    const [chapter] = chapterProgress(db, userId);
    expect(chapter.units.map((u) => u.status)).toEqual(['done', 'current']);
  });

  it('counts a card as mature only at stability >= 21 in Review state', () => {
    const { db, userId, u1, made } = fixture();
    recordReview(db, userId, made[u1.id][0], Rating.Easy, NOW);
    db.update(userCards).set({ state: 2, stability: 20.9 }).run();
    expect(chapterProgress(db, userId)[0].units[0].mature).toBe(0);
    db.update(userCards).set({ state: 2, stability: 21 }).run();
    expect(chapterProgress(db, userId)[0].units[0].mature).toBe(1);
    db.update(userCards).set({ state: 3, stability: 40 }).run();
    expect(chapterProgress(db, userId)[0].units[0].mature).toBe(0);
  });

  it('marks every unit done when the curriculum is finished', () => {
    const { db, userId, u1, u2, made } = fixture();
    for (const id of [...made[u1.id], ...made[u2.id]]) recordReview(db, userId, id, Rating.Good, NOW);
    const [chapter] = chapterProgress(db, userId);
    expect(chapter.units.map((u) => u.status)).toEqual(['done', 'done']);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/server/progress.test.ts`
Expected: FAIL — cannot resolve `./progress`.

- [ ] **Step 3: Implement progress aggregation**

`src/lib/server/progress.ts`:

```ts
import { and, asc, eq, sql } from 'drizzle-orm';
import type { Db } from './db/connect';
import type { UnitKind } from '$lib/cards';
import { chapters, units, cards, userCards } from './db/schema';
import { currentUnitId } from './queue';

export const MATURE_STABILITY_DAYS = 21;
export const REVIEW_STATE = 2;

export type UnitProgress = {
  id: number; title: string; kind: UnitKind;
  total: number; introduced: number; mature: number;
  status: 'done' | 'current' | 'locked';
};

export type ChapterProgress = {
  id: number; title: string;
  total: number; introduced: number;
  units: UnitProgress[];
};

export function chapterProgress(db: Db, userId: number): ChapterProgress[] {
  const rows = db
    .select({
      chapterId: chapters.id,
      chapterTitle: chapters.title,
      unitId: units.id,
      unitTitle: units.title,
      unitKind: units.kind,
      total: sql<number>`count(${cards.id})`,
      introduced: sql<number>`count(${userCards.cardId})`,
      mature: sql<number>`sum(case when ${userCards.state} = ${REVIEW_STATE}
        and ${userCards.stability} >= ${MATURE_STABILITY_DAYS} then 1 else 0 end)`
    })
    .from(chapters)
    .innerJoin(units, eq(units.chapterId, chapters.id))
    .innerJoin(cards, eq(cards.unitId, units.id))
    .leftJoin(userCards, and(eq(userCards.cardId, cards.id), eq(userCards.userId, userId)))
    .groupBy(chapters.id, units.id)
    .orderBy(asc(chapters.order), asc(units.order))
    .all();

  const current = currentUnitId(db, userId);
  const currentIndex = current === null ? rows.length : rows.findIndex((r) => r.unitId === current);

  const byChapter = new Map<number, ChapterProgress>();
  rows.forEach((row, index) => {
    let chapter = byChapter.get(row.chapterId);
    if (!chapter) {
      chapter = { id: row.chapterId, title: row.chapterTitle, total: 0, introduced: 0, units: [] };
      byChapter.set(row.chapterId, chapter);
    }
    chapter.total += row.total;
    chapter.introduced += row.introduced;
    chapter.units.push({
      id: row.unitId,
      title: row.unitTitle,
      kind: row.unitKind as UnitKind,
      total: row.total,
      introduced: row.introduced,
      mature: row.mature ?? 0,
      status: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'locked'
    });
  });

  return [...byChapter.values()];
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run src/lib/server/progress.test.ts`
Expected: PASS — all five assertions green.

- [ ] **Step 5: Build the progress bar component**

`src/lib/components/ProgressBar.svelte`:

```svelte
<script lang="ts">
  let { value, total }: { value: number; total: number } = $props();
  let percent = $derived(total === 0 ? 0 : Math.round((value / total) * 100));
</script>

<div class="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar"
  aria-valuenow={value} aria-valuemin={0} aria-valuemax={total}>
  <div class="h-full rounded-full bg-emerald-500 transition-all" style="width: {percent}%"></div>
</div>
```

- [ ] **Step 6: Load and render the chapter map**

`src/routes/+page.server.ts`:

```ts
import { db } from '$lib/server/db';
import { chapterProgress } from '$lib/server/progress';
import { queueCounts } from '$lib/server/queue';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const userId = locals.user!.id; // hooks.server.ts guarantees a user on this route
  return {
    chapters: chapterProgress(db, userId),
    counts: queueCounts(db, userId)
  };
};
```

`src/routes/+page.svelte` — chapters as `<details>` elements so expand/collapse needs no JS state; the current chapter opens by default:

```svelte
<script lang="ts">
  import ProgressBar from '$lib/components/ProgressBar.svelte';
  let { data } = $props();

  const currentChapterId = $derived(
    data.chapters.find((c) => c.units.some((u) => u.status === 'current'))?.id
  );
</script>

<h1 class="mb-1 text-2xl font-semibold">Course map</h1>
<p class="mb-6 text-sm text-slate-500">
  {data.counts.due} due · {data.counts.newAvailable} new available today
  <a href="/study" class="ml-2 underline">Start studying</a>
</p>

<div class="space-y-3">
  {#each data.chapters as chapter}
    <details open={chapter.id === currentChapterId} class="rounded-lg border border-slate-200 dark:border-slate-800">
      <summary class="cursor-pointer list-none p-4">
        <div class="flex items-baseline justify-between gap-3">
          <h2 class="font-medium">{chapter.title}</h2>
          <span class="text-sm tabular-nums text-slate-500">{chapter.introduced} / {chapter.total}</span>
        </div>
        <div class="mt-2"><ProgressBar value={chapter.introduced} total={chapter.total} /></div>
      </summary>

      <ul class="border-t border-slate-200 dark:border-slate-800">
        {#each chapter.units as unit}
          <li class="flex items-center gap-3 px-4 py-3 text-sm
            {unit.status === 'locked' ? 'opacity-40' : ''}
            {unit.status === 'current' ? 'bg-emerald-50 dark:bg-emerald-950/40' : ''}">
            <span class="w-5 shrink-0 text-center">
              {unit.status === 'done' ? '✓' : unit.status === 'current' ? '▸' : '·'}
            </span>
            <span class="min-w-0 flex-1 truncate">{unit.title}</span>
            <span class="shrink-0 tabular-nums text-slate-500">{unit.introduced} / {unit.total}</span>
            <span class="hidden w-20 shrink-0 text-right tabular-nums text-slate-400 sm:inline">{unit.mature} mature</span>
          </li>
        {/each}
      </ul>
    </details>
  {/each}
</div>
```

Locked units are dimmed and are not links — there is nothing to click through to, because study always pulls from the queue rather than from a chosen unit.

- [ ] **Step 7: Verify by hand**

`npm run dev`, sign in, and confirm: Chapter 1 is expanded with unit 1 highlighted; all other units show `0 / n` and are dimmed; the header line reads `0 due · 15 new available today`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add chapter map page with per-unit progress"
```

---

## Task 12: Study page

**Files:**
- Create: `src/lib/components/Card.svelte`, `src/routes/study/+page.server.ts`, `src/routes/study/+page.svelte`
- Test: manual (the logic under this page is already covered by Tasks 8 and 9)

**Interfaces:**
- Consumes: `nextQueueItem`/`queueCounts`/`recordReview` (Task 9), `previewRatings` (Task 8), `parseCardFaces` (Task 3).
- Produces: `/study` — a load that returns the next card plus its four rating previews, and a `rate` form action that records the review and redirects back to `/study` for the next card.

- [ ] **Step 1: Build the card face component**

`src/lib/components/Card.svelte`:

```svelte
<script lang="ts">
  import type { UnitKind, CardFront, CardBack } from '$lib/cards';
  let { kind, front, back, revealed }: {
    kind: UnitKind; front: CardFront; back: CardBack; revealed: boolean;
  } = $props();
</script>

<div class="flex min-h-[14rem] flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 p-6 text-center dark:border-slate-800">
  {#if kind === 'kana' || kind === 'kanji'}
    <div class="text-7xl leading-none sm:text-8xl">{(front as { char: string }).char}</div>
  {:else if kind === 'vocab'}
    <div class="text-4xl leading-tight sm:text-5xl">{(front as { word: string }).word}</div>
  {:else}
    <div class="text-3xl leading-tight sm:text-4xl">{(front as { pattern: string }).pattern}</div>
  {/if}

  {#if revealed}
    <hr class="w-16 border-slate-200 dark:border-slate-800" />
    <div class="space-y-2">
      {#if kind === 'kana'}
        <p class="text-2xl font-medium">{(back as { romaji: string }).romaji}</p>
        <p class="text-sm text-slate-500">{(back as { mnemonic: string }).mnemonic}</p>
      {:else if kind === 'kanji'}
        <p class="text-2xl font-medium">{(back as { meaning: string }).meaning}</p>
        <p class="text-lg">{(back as { reading: string }).reading}</p>
        <p class="text-sm text-slate-500">{(back as { example_word: string }).example_word}</p>
      {:else if kind === 'vocab'}
        <p class="text-lg">{(back as { reading: string }).reading}</p>
        <p class="text-2xl font-medium">{(back as { meaning: string }).meaning}</p>
        <p class="text-sm text-slate-500">{(back as { example_sentence: string }).example_sentence}</p>
      {:else}
        <p class="text-2xl font-medium">{(back as { meaning: string }).meaning}</p>
        <p class="text-sm text-slate-500">{(back as { example: string }).example}</p>
      {/if}
    </div>
  {/if}
</div>
```

- [ ] **Step 2: Implement the study load and rate action**

`src/routes/study/+page.server.ts`:

```ts
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { nextQueueItem, queueCounts, recordReview } from '$lib/server/queue';
import { previewRatings } from '$lib/server/scheduler';
import { parseCardFaces } from '$lib/cards';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const userId = locals.user!.id;
  const now = new Date();
  const item = nextQueueItem(db, userId, now);
  const counts = queueCounts(db, userId, now);

  if (!item) return { item: null, counts };

  const { front, back } = parseCardFaces(item.unitKind, item.frontJson, item.backJson);
  return {
    counts,
    item: {
      cardId: item.cardId,
      unitTitle: item.unitTitle,
      unitKind: item.unitKind,
      isNew: item.isNew,
      front,
      back,
      previews: previewRatings(item.row, now)
    }
  };
};

export const actions: Actions = {
  rate: async ({ request, locals }) => {
    const form = await request.formData();
    const cardId = Number(form.get('cardId'));
    const rating = Number(form.get('rating'));
    if (!Number.isInteger(cardId) || ![1, 2, 3, 4].includes(rating)) {
      return fail(400, { error: 'Invalid review.' });
    }
    recordReview(db, locals.user!.id, cardId, rating, new Date());
    return { ok: true };
  }
};
```

The action returns `{ ok: true }` rather than redirecting; SvelteKit re-runs `load` after a successful form action, which fetches the next card. This keeps the URL stable at `/study` and gives a normal back-button.

The back face is sent to the client with the front. That is fine — this is a self-study tool with no cheating incentive, and it avoids a second round trip on reveal. Do not add a separate reveal endpoint.

- [ ] **Step 3: Build the study page**

`src/routes/study/+page.svelte`:

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import Card from '$lib/components/Card.svelte';

  let { data } = $props();
  let revealed = $state(false);

  // A new card object means a new question — hide the answer again.
  $effect(() => {
    void data.item?.cardId;
    revealed = false;
  });

  const RATING_STYLES: Record<number, string> = {
    1: 'bg-rose-500 hover:bg-rose-600',
    2: 'bg-amber-500 hover:bg-amber-600',
    3: 'bg-emerald-500 hover:bg-emerald-600',
    4: 'bg-sky-500 hover:bg-sky-600'
  };
</script>

{#if data.item}
  <p class="mb-3 flex items-baseline justify-between text-sm text-slate-500">
    <span>{data.item.unitTitle}{data.item.isNew ? ' · new' : ''}</span>
    <span class="tabular-nums">{data.counts.due} due · {data.counts.newAvailable} new</span>
  </p>

  <Card kind={data.item.unitKind} front={data.item.front} back={data.item.back} {revealed} />

  {#if revealed}
    <form method="POST" action="?/rate" use:enhance class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <input type="hidden" name="cardId" value={data.item.cardId} />
      {#each data.item.previews as preview}
        <button
          name="rating"
          value={preview.rating}
          class="rounded-lg px-3 py-3 font-medium text-white {RATING_STYLES[preview.rating]}"
        >
          {preview.label}
          <span class="block text-xs font-normal opacity-80">{preview.interval}</span>
        </button>
      {/each}
    </form>
  {:else}
    <button
      onclick={() => (revealed = true)}
      class="mt-4 w-full rounded-lg bg-slate-900 px-4 py-3 font-medium text-white dark:bg-slate-100 dark:text-slate-900"
    >
      Show answer
    </button>
  {/if}
{:else}
  <div class="rounded-xl border border-slate-200 p-8 text-center dark:border-slate-800">
    <p class="text-xl font-medium">Done for now</p>
    <p class="mt-2 text-sm text-slate-500">
      No cards are due and today's new cards are finished. Come back tomorrow.
    </p>
    <a href="/" class="mt-4 inline-block underline">Back to the map</a>
  </div>
{/if}
```

The four buttons are one `<form>` with four submit buttons sharing the `rating` name — no client-side rating state, and it degrades to working HTML without JS.

- [ ] **Step 4: Verify by hand**

`npm run dev`, sign in, go to `/study`:
- The first card shows あ with no answer. "Show answer" reveals `a` plus the mnemonic.
- The four buttons show intervals roughly matching `<1m`, `~6m`, `10m`, and a multi-day gap.
- Rating Good serves the next card, and the answer is hidden again.
- After 15 new cards the page shows "Done for now" (Chapter 1 unit 1 has `dailyCap: 15`).
- Rate a card Again, wait a minute, reload — it comes back as a due review, and the header count reflects it.
- Check the counts line decrements as you go.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add study page with FSRS rating previews"
```

---

## Task 13: Stats page

**Files:**
- Create: `src/lib/server/stats.ts`, `src/lib/components/Heatmap.svelte`, `src/routes/stats/+page.server.ts`, `src/routes/stats/+page.svelte`
- Test: `src/lib/server/stats.test.ts`

**Interfaces:**
- Consumes: tables (Task 2), `MATURE_STABILITY_DAYS`/`REVIEW_STATE`/`chapterProgress` (Task 11).
- Produces: `userStats(db, userId: number, now?: Date): Stats` where

```ts
type Stats = {
  learned: number;          // user_cards rows (cards introduced)
  mature: number;           // Review state and stability >= 21
  young: number;            // introduced but not mature
  streak: number;           // consecutive UTC days ending today (or yesterday) with >= 1 review
  retention: number | null; // share of Review-state reviews rated >= Hard; null with no data
  dueToday: number;
  dueTomorrow: number;
  reviewsByDay: Array<{ date: string; count: number }>; // last 365 days, only non-zero days
};
```

- [ ] **Step 1: Write the failing test**

`src/lib/server/stats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createTestDb } from './db/test-db';
import { users, chapters, units, cards, userCards, reviewLogs } from './db/schema';
import { userStats } from './stats';

const NOW = new Date('2026-03-10T09:00:00.000Z');

function fixture() {
  const db = createTestDb();
  const [user] = db.insert(users).values({ username: 'u', passwordHash: 'x', createdAt: NOW.toISOString() }).returning().all();
  const [ch] = db.insert(chapters).values({ order: 1, title: 'Ch1', kind: 'kana' }).returning().all();
  const [unit] = db.insert(units).values({ chapterId: ch.id, order: 1, title: 'U1', kind: 'kana', dailyCap: 5 }).returning().all();
  const ids: number[] = [];
  for (let i = 1; i <= 4; i++) {
    const [card] = db.insert(cards).values({
      unitId: unit.id, order: i, frontJson: '{"char":"あ"}', backJson: '{"romaji":"a","mnemonic":"m"}'
    }).returning().all();
    ids.push(card.id);
  }
  return { db, userId: user.id, ids };
}

function introduce(db: ReturnType<typeof createTestDb>, userId: number, cardId: number, over: Partial<typeof userCards.$inferInsert> = {}) {
  db.insert(userCards).values({
    userId, cardId, state: 2, stability: 5, difficulty: 5,
    due: NOW.toISOString(), scheduledDays: 5, learningSteps: 0, reps: 1, lapses: 0,
    lastReview: NOW.toISOString(), ...over
  }).run();
}

function log(db: ReturnType<typeof createTestDb>, userId: number, cardId: number, rating: number, at: string, state = 2) {
  db.insert(reviewLogs).values({
    userId, cardId, rating, reviewedAt: at, state, stability: 5, difficulty: 5, scheduledDays: 5
  }).run();
}

describe('userStats', () => {
  it('is all zeros for a fresh user', () => {
    const { db, userId } = fixture();
    const stats = userStats(db, userId, NOW);
    expect(stats.learned).toBe(0);
    expect(stats.mature).toBe(0);
    expect(stats.streak).toBe(0);
    expect(stats.retention).toBeNull();
  });

  it('splits learned cards into mature and young', () => {
    const { db, userId, ids } = fixture();
    introduce(db, userId, ids[0], { stability: 30 });
    introduce(db, userId, ids[1], { stability: 3 });
    introduce(db, userId, ids[2], { state: 1, stability: 40 }); // Learning, not Review → young
    const stats = userStats(db, userId, NOW);
    expect(stats.learned).toBe(3);
    expect(stats.mature).toBe(1);
    expect(stats.young).toBe(2);
  });

  it('computes retention from Review-state reviews only', () => {
    const { db, userId, ids } = fixture();
    log(db, userId, ids[0], 3, '2026-03-10T08:00:00.000Z');
    log(db, userId, ids[1], 1, '2026-03-10T08:01:00.000Z');
    log(db, userId, ids[2], 4, '2026-03-10T08:02:00.000Z');
    log(db, userId, ids[3], 1, '2026-03-10T08:03:00.000Z', 0); // New-state review is excluded
    expect(userStats(db, userId, NOW).retention).toBeCloseTo(2 / 3, 5);
  });

  it('counts a streak of consecutive days ending today', () => {
    const { db, userId, ids } = fixture();
    log(db, userId, ids[0], 3, '2026-03-08T20:00:00.000Z');
    log(db, userId, ids[0], 3, '2026-03-09T20:00:00.000Z');
    log(db, userId, ids[0], 3, '2026-03-10T08:00:00.000Z');
    expect(userStats(db, userId, NOW).streak).toBe(3);
  });

  it('keeps the streak alive when today has no reviews yet but yesterday did', () => {
    const { db, userId, ids } = fixture();
    log(db, userId, ids[0], 3, '2026-03-08T20:00:00.000Z');
    log(db, userId, ids[0], 3, '2026-03-09T20:00:00.000Z');
    expect(userStats(db, userId, NOW).streak).toBe(2);
  });

  it('breaks the streak after a missed day', () => {
    const { db, userId, ids } = fixture();
    log(db, userId, ids[0], 3, '2026-03-06T20:00:00.000Z');
    log(db, userId, ids[0], 3, '2026-03-08T20:00:00.000Z');
    expect(userStats(db, userId, NOW).streak).toBe(0);
  });

  it('counts cards due today and tomorrow', () => {
    const { db, userId, ids } = fixture();
    introduce(db, userId, ids[0], { due: '2026-03-10T06:00:00.000Z' }); // overdue
    introduce(db, userId, ids[1], { due: '2026-03-10T23:00:00.000Z' }); // later today
    introduce(db, userId, ids[2], { due: '2026-03-11T10:00:00.000Z' }); // tomorrow
    introduce(db, userId, ids[3], { due: '2026-03-20T10:00:00.000Z' }); // neither
    const stats = userStats(db, userId, NOW);
    expect(stats.dueToday).toBe(2);
    expect(stats.dueTomorrow).toBe(1);
  });

  it('buckets reviews by UTC day for the heatmap', () => {
    const { db, userId, ids } = fixture();
    log(db, userId, ids[0], 3, '2026-03-09T23:30:00.000Z');
    log(db, userId, ids[1], 3, '2026-03-10T00:30:00.000Z');
    log(db, userId, ids[2], 3, '2026-03-10T08:00:00.000Z');
    expect(userStats(db, userId, NOW).reviewsByDay).toEqual([
      { date: '2026-03-09', count: 1 },
      { date: '2026-03-10', count: 2 }
    ]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/server/stats.test.ts`
Expected: FAIL — cannot resolve `./stats`.

- [ ] **Step 3: Implement the aggregations**

`src/lib/server/stats.ts`:

```ts
import { and, asc, eq, gte, lt, sql } from 'drizzle-orm';
import type { Db } from './db/connect';
import { userCards, reviewLogs } from './db/schema';
import { MATURE_STABILITY_DAYS, REVIEW_STATE } from './progress';

export type Stats = {
  learned: number;
  mature: number;
  young: number;
  streak: number;
  retention: number | null;
  dueToday: number;
  dueTomorrow: number;
  reviewsByDay: Array<{ date: string; count: number }>;
};

function utcDayStart(date: Date, offsetDays = 0): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + offsetDays));
}

function isoDay(date: Date): string {
  return utcDayStart(date).toISOString().slice(0, 10);
}

export function userStats(db: Db, userId: number, now: Date = new Date()): Stats {
  const [totals] = db
    .select({
      learned: sql<number>`count(*)`,
      mature: sql<number>`sum(case when ${userCards.state} = ${REVIEW_STATE}
        and ${userCards.stability} >= ${MATURE_STABILITY_DAYS} then 1 else 0 end)`
    })
    .from(userCards)
    .where(eq(userCards.userId, userId))
    .all();

  const learned = totals?.learned ?? 0;
  const mature = totals?.mature ?? 0;

  const [recall] = db
    .select({
      reviewed: sql<number>`count(*)`,
      recalled: sql<number>`sum(case when ${reviewLogs.rating} >= 2 then 1 else 0 end)`
    })
    .from(reviewLogs)
    .where(and(eq(reviewLogs.userId, userId), eq(reviewLogs.state, REVIEW_STATE)))
    .all();

  const todayEnd = utcDayStart(now, 1).toISOString();
  const tomorrowEnd = utcDayStart(now, 2).toISOString();

  const countDue = (from: string | null, to: string) => {
    const [row] = db
      .select({ n: sql<number>`count(*)` })
      .from(userCards)
      .where(
        from === null
          ? and(eq(userCards.userId, userId), lt(userCards.due, to))
          : and(eq(userCards.userId, userId), gte(userCards.due, from), lt(userCards.due, to))
      )
      .all();
    return row?.n ?? 0;
  };

  const byDay = db
    .select({
      date: sql<string>`substr(${reviewLogs.reviewedAt}, 1, 10)`,
      count: sql<number>`count(*)`
    })
    .from(reviewLogs)
    .where(and(eq(reviewLogs.userId, userId), gte(reviewLogs.reviewedAt, utcDayStart(now, -364).toISOString())))
    .groupBy(sql`substr(${reviewLogs.reviewedAt}, 1, 10)`)
    .orderBy(asc(sql`substr(${reviewLogs.reviewedAt}, 1, 10)`))
    .all();

  return {
    learned,
    mature,
    young: learned - mature,
    streak: computeStreak(new Set(byDay.map((d) => d.date)), now),
    retention: recall && recall.reviewed > 0 ? recall.recalled / recall.reviewed : null,
    dueToday: countDue(null, todayEnd),
    dueTomorrow: countDue(todayEnd, tomorrowEnd),
    reviewsByDay: byDay
  };
}

function computeStreak(days: Set<string>, now: Date): number {
  // Today counts if reviewed; otherwise start from yesterday so an unstudied
  // morning doesn't zero out an active streak.
  let cursor = days.has(isoDay(now)) ? utcDayStart(now) : utcDayStart(now, -1);
  let streak = 0;
  while (days.has(isoDay(cursor))) {
    streak++;
    cursor = utcDayStart(cursor, -1);
  }
  return streak;
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run src/lib/server/stats.test.ts`
Expected: PASS — all eight assertions green.

- [ ] **Step 5: Build the heatmap component**

`src/lib/components/Heatmap.svelte` — 53 columns of 7 days, GitHub style, horizontally scrollable on narrow screens:

```svelte
<script lang="ts">
  let { days }: { days: Array<{ date: string; count: number }> } = $props();

  const counts = new Map(days.map((d) => [d.date, d.count]));
  const max = Math.max(1, ...days.map((d) => d.count));

  // 53 weeks back from the most recent Sunday on or after today.
  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));

  const cells = Array.from({ length: 53 * 7 }, (_, i) => {
    const date = new Date(end);
    date.setUTCDate(date.getUTCDate() - (53 * 7 - 1 - i));
    const key = date.toISOString().slice(0, 10);
    return { key, count: counts.get(key) ?? 0 };
  });

  function shade(count: number): string {
    if (count === 0) return 'bg-slate-100 dark:bg-slate-800';
    const level = count / max;
    if (level > 0.66) return 'bg-emerald-600';
    if (level > 0.33) return 'bg-emerald-500';
    return 'bg-emerald-300 dark:bg-emerald-800';
  }
</script>

<div class="overflow-x-auto">
  <div class="grid grid-flow-col grid-rows-7 gap-[3px]" style="width: max-content">
    {#each cells as cell}
      <div class="h-2.5 w-2.5 rounded-sm {shade(cell.count)}" title="{cell.key}: {cell.count} reviews"></div>
    {/each}
  </div>
</div>
```

- [ ] **Step 6: Build the stats page**

`src/routes/stats/+page.server.ts`:

```ts
import { db } from '$lib/server/db';
import { userStats } from '$lib/server/stats';
import { chapterProgress } from '$lib/server/progress';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const userId = locals.user!.id;
  return {
    stats: userStats(db, userId),
    chapters: chapterProgress(db, userId)
  };
};
```

`src/routes/stats/+page.svelte`:

```svelte
<script lang="ts">
  import Heatmap from '$lib/components/Heatmap.svelte';
  import ProgressBar from '$lib/components/ProgressBar.svelte';
  let { data } = $props();

  const cards = $derived([
    { label: 'Cards learned', value: String(data.stats.learned) },
    { label: 'Mature', value: String(data.stats.mature) },
    { label: 'Young', value: String(data.stats.young) },
    { label: 'Day streak', value: String(data.stats.streak) },
    { label: 'Retention', value: data.stats.retention === null ? '—' : `${Math.round(data.stats.retention * 100)}%` },
    { label: 'Due today', value: String(data.stats.dueToday) },
    { label: 'Due tomorrow', value: String(data.stats.dueTomorrow) }
  ]);
</script>

<h1 class="mb-6 text-2xl font-semibold">Your progress</h1>

<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
  {#each cards as card}
    <div class="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <p class="text-2xl font-semibold tabular-nums">{card.value}</p>
      <p class="text-xs text-slate-500">{card.label}</p>
    </div>
  {/each}
</div>

<h2 class="mt-8 mb-3 text-lg font-medium">Review activity</h2>
<Heatmap days={data.stats.reviewsByDay} />

<h2 class="mt-8 mb-3 text-lg font-medium">By chapter</h2>
<div class="space-y-5">
  {#each data.chapters as chapter}
    <div>
      <div class="flex items-baseline justify-between text-sm">
        <span class="font-medium">{chapter.title}</span>
        <span class="tabular-nums text-slate-500">{chapter.introduced} / {chapter.total}</span>
      </div>
      <div class="mt-1"><ProgressBar value={chapter.introduced} total={chapter.total} /></div>

      <ul class="mt-2 space-y-1">
        {#each chapter.units.filter((u) => u.introduced > 0) as unit}
          <li class="flex items-baseline justify-between text-xs text-slate-500">
            <span class="min-w-0 truncate">{unit.title}</span>
            <span class="shrink-0 tabular-nums">{unit.introduced} / {unit.total} · {unit.mature} mature</span>
          </li>
        {/each}
      </ul>
    </div>
  {/each}
</div>
```

- [ ] **Step 7: Verify by hand**

`npm run dev`, study a handful of cards, then open `/stats`. Confirm: `Cards learned` matches how many you reviewed; `Day streak` is 1; `Retention` shows `—` until you have re-reviewed a graduated card; the heatmap shows one filled square at the far right and scrolls horizontally on a narrow window without the page itself scrolling sideways.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add stats page with streak, retention and heatmap"
```

---

## Task 14: Docker image, compose, and deployment

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `README.md`
- Test: manual (build the image and exercise the running container)

**Interfaces:**
- Consumes: everything above — this task packages the finished app.
- Produces: a container listening on `0.0.0.0:3001` inside, published on `127.0.0.1:3001`, with the SQLite file under a bind-mounted `./data`, plus the nginx block to paste on the host.

- [ ] **Step 1: Write the Dockerfile**

`Dockerfile` — three stages, mirroring `sibling-app`. `better-sqlite3` is a native module, so the deps stage needs a toolchain; the run stage reuses the built `node_modules` rather than recompiling:

```dockerfile
FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3001 HOST=0.0.0.0 DATA_DIR=/app/data
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/package.json ./package.json
EXPOSE 3001
CMD ["node", "build/index.js"]
```

`drizzle/` must be copied — `src/lib/server/db/index.ts` runs `migrate()` against `./drizzle` at boot, and the working directory is `/app`.

- [ ] **Step 2: Write .dockerignore**

```
node_modules
.svelte-kit
build
data
.git
.env
docs
```

- [ ] **Step 3: Write docker-compose.yml**

```yaml
services:
  app:
    build: .
    container_name: learn-japanese
    ports:
      - "127.0.0.1:3001:3001"
    env_file: .env
    environment:
      DATA_DIR: /app/data
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

- [ ] **Step 4: Build and run the container locally**

```bash
cp .env.example .env
docker compose build
docker compose up -d
docker compose logs -f app
```

Expected: the log shows the server listening on 3001 with no migration errors. Then:

```bash
curl -sI http://127.0.0.1:3001/ | head -1
```

Expected: `HTTP/1.1 303 See Other` (the auth guard redirecting to `/login`).

- [ ] **Step 5: Verify persistence across a container restart**

Open `http://127.0.0.1:3001/signup` in a browser, create an account, study two cards, then:

```bash
docker compose restart app
```

Reload the page. Expected: still signed in (the session cookie resolves against the same DB file), `/stats` still shows the two cards, and `ls -la data/` shows `app.db` owned by the host user.

- [ ] **Step 6: Write the README**

`README.md` covering, in this order:

1. **What it is** — one paragraph: a self-hosted FSRS flashcard app for the JLPT N4 curriculum in `docs/curriculum-plan.md`.
2. **Stack** — SvelteKit 2 + Svelte 5, TypeScript, Tailwind 4, SQLite (better-sqlite3 + Drizzle), ts-fsrs, argon2, Docker.
3. **Development** — `npm install`, `npm run dev`, `npm test`, `npm run db:generate` (regenerate migrations after editing `schema.ts`).
4. **Environment variables** — the table from `.env.example`: `DATA_DIR`, `SESSION_SECRET` (reserved; not currently read).
5. **Deployment** — `docker compose up -d --build`; data lives in `./data/app.db`; back it up by copying that file plus its `-wal` sidecar while the container is stopped.
6. **nginx** — the host block below.
7. **Content** — curriculum content lives in `src/lib/server/seed/`; it loads on first boot only, so changing it after launch requires a manual migration (documented as a known limitation, see Step 8).

The nginx server block for the host (place in `/etc/nginx/sites-available/<app-hostname>`, symlink into `sites-enabled`, then `certbot --nginx -d <app-hostname>`):

```nginx
server {
    server_name <app-hostname>;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    listen 80;
}
```

`X-Forwarded-Proto` matters: without it SvelteKit sees the request as HTTP and `secure` cookies get dropped. If the deployment sits behind more than one proxy hop, also set `ORIGIN=https://<app-hostname>` in `.env` so SvelteKit's CSRF origin check passes.

- [ ] **Step 7: Deploy**

```bash
scp -r . <host>:/path/to/learn-japanese   # or git pull on the host
ssh <host> 'cd /path/to/learn-japanese && docker compose up -d --build'
sudo ln -s /etc/nginx/sites-available/<app-hostname> /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d <app-hostname>
```

Verify: `https://<app-hostname>` redirects to `/login`, signup works, the session cookie shows `Secure`, and studying a card persists across a page reload.

- [ ] **Step 8: Record the known limitation**

Add to the README a short "Known limitations" section:

- Curriculum content seeds only when the `chapters` table is empty. Editing `src/lib/server/seed/` after launch has no effect on an existing database; adding content later needs a hand-written migration or a wipe of `data/app.db` (which also destroys user progress).
- Day boundaries for the daily new-card cap and the streak are UTC, not the user's local timezone.
- No password reset. Recovering an account means editing `users.password_hash` directly in SQLite.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add Docker build, compose file and deployment docs"
```

---

## Verification checklist

After Task 14, confirm end to end:

- [ ] `npm test` — all suites pass.
- [ ] `npm run build` — clean build, no type errors.
- [ ] Two different accounts studying the same cards see independent progress on `/stats`.
- [ ] Signing in without "keep me signed in", closing the browser, and reopening within a day keeps the session; the cookie's `Max-Age` is 86400.
- [ ] The chapter map's current unit advances after every card in unit 1 has been introduced.
- [ ] Rating a card `Again` brings it back within the session; rating `Easy` on a graduated card pushes it weeks out.
- [ ] Every page is usable at 320px wide with no horizontal page scroll.
- [ ] Light and dark both render with no flash on reload.
