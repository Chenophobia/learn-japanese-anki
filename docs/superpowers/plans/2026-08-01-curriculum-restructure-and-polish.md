# Curriculum Restructure, Cross-Device Continuity, and Motion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the 23-unit "Kanji & Vocabulary" chapter into eleven chapters under four track headings, close the two real cross-device staleness gaps, and add motion to the study loop and course map.

**Architecture:** Three independent workstreams sharing no code. The curriculum change is pure data regrouping — units and cards are untouched, only their assignment to chapters changes, enforced by a `groupIntoChapters` helper that names units instead of slicing by index. Cross-device work adds `cache-control: no-store` plus a bfcache/visibility revalidation hook. Motion is CSS-first (the app already zeroes CSS transitions under `prefers-reduced-motion`), with the two JS-driven effects routed through one `motionDuration` helper because Svelte's JS transitions ignore that CSS rule.

**Tech Stack:** SvelteKit 2, Svelte 5 (runes), TypeScript, Tailwind CSS 4, Drizzle ORM, better-sqlite3, Vitest, tsx.

Spec: `docs/superpowers/specs/2026-08-01-curriculum-restructure-and-polish-design.md`

## Global Constraints

- **Svelte 5 runes only.** `$props`, `$state`, `$derived`, `$derived.by`, `$effect`. No `export let`, no legacy stores. Shared reactive state lives in a `.svelte.ts` file.
- **Tests run with `npm test`** (`vitest run`). Vitest only collects `src/**/*.test.ts` — a test placed outside `src/` is silently never run.
- **`npm run check` must report 0 errors** before any commit.
- **Every new test must be mutation-checked**: after it passes, deliberately break the implementation, confirm the test fails, then restore. A test that passes against a broken implementation is worse than no test.
- **Unit titles and card content are never edited** by this plan. Only the grouping of units into chapters changes. Any diff touching a card's `front`/`back` is a bug.
- **Exact unit titles matter.** Titles contain em-dashes (`—`, U+2014) and Japanese text (`〜たり〜たりする`). Copy them verbatim; a typo becomes a thrown error at seed time, which is the intended behaviour but wastes a cycle.
- **Reduced motion collapses duration to zero; it never removes a feature.** `src/app.css` already forces `transition-duration` and `animation-duration` to `0.01ms` under `prefers-reduced-motion: reduce`, so pure-CSS effects are covered automatically. Svelte's JS transitions (`fly`, `Tween`) are **not** covered and must call `motionDuration` from Task 6.
- **Do not change** FSRS scheduling, `dailyCap` values, card order within a unit, or the study-page rating validation path.

---

## File Structure

**Created:**
- `src/lib/server/seed/group.ts` — `groupIntoChapters`: builds chapters from a flat unit pool by naming member units. Throws on unknown, duplicated, or orphaned units.
- `src/lib/server/seed/group.test.ts`
- `src/lib/motion.ts` — `motionDuration(ms, reduced)` and `prefersReducedMotion()`. The single place JS-driven animation asks "how long".
- `src/lib/motion.test.ts`
- `src/lib/revalidate.ts` — `shouldRevalidate(...)`: the pure decision behind bfcache/visibility revalidation.
- `src/lib/revalidate.test.ts`
- `src/lib/study-state.svelte.ts` — one shared rune flag so the layout knows a rating is in flight.
- `src/lib/components/RollingNumber.svelte` — a number that tweens to its new value and always settles exactly on it.
- `scripts/reseed.ts` — destructive curriculum rebuild.

**Modified:**
- `src/lib/server/seed/types.ts` — widen chapter `kind`.
- `src/lib/server/seed/grammar.ts` — export `grammarUnits` (flat) instead of `grammarChapter`.
- `src/lib/server/seed/index.ts` — the eleven-chapter curriculum.
- `src/lib/server/seed/content.test.ts` — rewritten for the new shape.
- `src/lib/server/db/schema.ts` — `kind` comment only.
- `src/lib/server/progress.ts` — expose `kind` on `ChapterProgress`.
- `src/lib/server/progress.test.ts` — cover it.
- `src/routes/+page.svelte` — track headings, path animation.
- `src/routes/+page.server.ts`, `src/routes/study/+page.server.ts`, `src/routes/stats/+page.server.ts` — `no-store`.
- `src/routes/+layout.svelte` — revalidation listeners.
- `src/routes/study/+page.svelte` — flip wiring, slide, in-flight flag.
- `src/lib/components/Card.svelte` — two-face flip.
- `src/lib/components/ProgressBar.svelte` — eased width.
- `src/app.css` — keyframes for the map path.
- `package.json`, `README.md` — the reseed script.

---

## Task 1: Unit grouping helper

The curriculum regroup could be written as index slicing (`vocabUnits.slice(0, 5)`). Don't. Index arithmetic silently reassigns units the moment the pool changes order, and that failure is invisible — the app still boots, just teaching the wrong things in the wrong chapters. Naming units fails loudly instead.

**Files:**
- Create: `src/lib/server/seed/group.ts`
- Test: `src/lib/server/seed/group.test.ts`
- Modify: `src/lib/server/seed/types.ts`

**Interfaces:**
- Consumes: `SeedUnit`, `SeedChapter` from `./types`.
- Produces: `ChapterSpec = { title: string; kind: ChapterKind; unitTitles: string[] }` and `groupIntoChapters(pool: SeedUnit[], specs: ChapterSpec[]): SeedChapter[]`. Task 2 calls this.

- [ ] **Step 1: Widen the chapter kind**

In `src/lib/server/seed/types.ts`, replace the `SeedChapter` type:

```ts
/**
 * A chapter's kind is its track — the heading it appears under on the course
 * map. It is a grouping label, not a constraint on its units: the Hiragana
 * and Katakana chapters each contain one `vocab` unit.
 */
export type ChapterKind = 'kana' | 'kanji' | 'vocab' | 'grammar';

export type SeedChapter = {
  title: string;
  kind: ChapterKind;
  units: SeedUnit[];
};
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/server/seed/group.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { groupIntoChapters } from './group';
import type { SeedUnit } from './types';

const unit = (title: string): SeedUnit => ({
  title,
  kind: 'vocab',
  dailyCap: 8,
  cards: [{ front: { word: title }, back: { reading: 'r', meaning: 'm', example_sentence: 'e' } }]
});

describe('groupIntoChapters', () => {
  it('places each named unit in its chapter, in the order named', () => {
    const chapters = groupIntoChapters(
      [unit('a'), unit('b'), unit('c')],
      [
        { title: 'First', kind: 'vocab', unitTitles: ['c', 'a'] },
        { title: 'Second', kind: 'vocab', unitTitles: ['b'] }
      ]
    );

    expect(chapters.map((c) => c.title)).toEqual(['First', 'Second']);
    expect(chapters[0].units.map((u) => u.title)).toEqual(['c', 'a']);
    expect(chapters[1].units.map((u) => u.title)).toEqual(['b']);
  });

  it('carries the unit object through unchanged, not a copy', () => {
    // The regroup must never edit a unit's cards or cap. Identity is the
    // strongest available assertion that it did not.
    const a = unit('a');
    const [chapter] = groupIntoChapters([a], [{ title: 'C', kind: 'vocab', unitTitles: ['a'] }]);
    expect(chapter.units[0]).toBe(a);
  });

  it('throws when a chapter names a unit that does not exist', () => {
    expect(() =>
      groupIntoChapters([unit('a')], [{ title: 'C', kind: 'vocab', unitTitles: ['typo'] }])
    ).toThrow(/no unit titled "typo"/);
  });

  it('throws when a unit is left out of every chapter', () => {
    // The failure this whole helper exists to prevent: a unit quietly
    // vanishing from the curriculum during a regroup.
    expect(() =>
      groupIntoChapters([unit('a'), unit('orphan')], [{ title: 'C', kind: 'vocab', unitTitles: ['a'] }])
    ).toThrow(/left out of every chapter: orphan/);
  });

  it('throws when a unit is claimed by two chapters', () => {
    expect(() =>
      groupIntoChapters(
        [unit('a')],
        [
          { title: 'C1', kind: 'vocab', unitTitles: ['a'] },
          { title: 'C2', kind: 'vocab', unitTitles: ['a'] }
        ]
      )
    ).toThrow(/used twice/);
  });

  it('throws when the pool itself has duplicate titles, since titles are the key', () => {
    expect(() =>
      groupIntoChapters([unit('a'), unit('a')], [{ title: 'C', kind: 'vocab', unitTitles: ['a'] }])
    ).toThrow(/duplicate unit titles/);
  });
});
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `npx vitest run src/lib/server/seed/group.test.ts`
Expected: FAIL — cannot resolve `./group`.

- [ ] **Step 4: Implement**

Create `src/lib/server/seed/group.ts`:

```ts
import type { ChapterKind, SeedChapter, SeedUnit } from './types';

export type ChapterSpec = {
  title: string;
  kind: ChapterKind;
  /** Exact `title` of each unit in this chapter, in teaching order. */
  unitTitles: string[];
};

/**
 * Builds chapters from a flat pool of units by naming which units go where.
 *
 * The obvious alternative — slicing the pool by index — silently reassigns
 * units whenever the pool's order changes, and nothing about the running app
 * looks wrong afterwards. Every way of getting this wrong throws here
 * instead: an unknown title, a unit claimed twice, a unit claimed by nobody.
 * That last one is the important one, and it is why the function needs the
 * whole pool rather than just the specs.
 */
export function groupIntoChapters(pool: SeedUnit[], specs: ChapterSpec[]): SeedChapter[] {
  const byTitle = new Map(pool.map((u) => [u.title, u]));
  if (byTitle.size !== pool.length) {
    throw new Error('groupIntoChapters: duplicate unit titles in pool — titles are the key');
  }

  const used = new Set<string>();
  const chapters = specs.map((spec) => ({
    title: spec.title,
    kind: spec.kind,
    units: spec.unitTitles.map((title) => {
      const found = byTitle.get(title);
      if (!found) throw new Error(`groupIntoChapters: no unit titled "${title}"`);
      if (used.has(title)) throw new Error(`groupIntoChapters: unit "${title}" used twice`);
      used.add(title);
      return found;
    })
  }));

  const orphans = pool.filter((u) => !used.has(u.title)).map((u) => u.title);
  if (orphans.length > 0) {
    throw new Error(`groupIntoChapters: units left out of every chapter: ${orphans.join(', ')}`);
  }

  return chapters;
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/lib/server/seed/group.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Mutation-check**

Delete the `orphans` block, re-run. Expected: the "left out of every chapter" test FAILS. Restore it and confirm green again.

- [ ] **Step 7: Typecheck and commit**

```bash
npm run check
git add src/lib/server/seed/group.ts src/lib/server/seed/group.test.ts src/lib/server/seed/types.ts
git commit -m "feat: add unit-grouping helper that names units instead of slicing by index"
```

---

## Task 2: The eleven-chapter curriculum

**Files:**
- Modify: `src/lib/server/seed/grammar.ts` (last ~8 lines and the export declaration)
- Modify: `src/lib/server/seed/index.ts` (whole file)
- Modify: `src/lib/server/db/schema.ts:7` (comment only)
- Test: `src/lib/server/seed/content.test.ts` (rewrite)

**Interfaces:**
- Consumes: `groupIntoChapters`, `ChapterSpec` from Task 1.
- Produces: `curriculum: SeedChapter[]` — 11 chapters, unchanged export name. `grammarUnits: SeedUnit[]` replaces the `grammarChapter` export.

- [ ] **Step 1: Flatten the grammar export**

`src/lib/server/seed/grammar.ts` currently ends with a `grammarChapter: SeedChapter` object wrapping a `units:` array. Unwrap it — the units array is kept verbatim, only the surrounding chapter object goes away.

Change the import line at the top from:

```ts
import type { SeedChapter, SeedCard } from './types';
```

to:

```ts
import type { SeedUnit, SeedCard } from './types';
```

Change the export declaration from:

```ts
export const grammarChapter: SeedChapter = {
  title: 'Grammar & Reading',
  kind: 'grammar',
  units: [
    {
      title: 'Sequence — after doing',
```

to:

```ts
export const grammarUnits: SeedUnit[] = [
  {
    title: 'Sequence — after doing',
```

and at the end of the file, drop one level of closing brackets: the file currently ends with `  ]\n};` — it must now end with `];`. Re-indent the unit objects one level left.

Do not touch any card. `git diff --stat` on this file should show only structural lines changed; verify with `git diff src/lib/server/seed/grammar.ts | grep '^[-+].*grammar('` returning nothing.

- [ ] **Step 2: Write the failing test**

Replace `src/lib/server/seed/content.test.ts` entirely:

```ts
import { describe, it, expect } from 'vitest';
import { curriculum } from './index';
import type { SeedUnit } from './types';

const allUnits = (): SeedUnit[] => curriculum.flatMap((c) => c.units);

describe('curriculum', () => {
  it('has eleven chapters in track order', () => {
    expect(curriculum.map((c) => c.title)).toEqual([
      'Hiragana',
      'Katakana',
      'Basic Kanji',
      'Everyday Life',
      'People, Places & Work',
      'Describing & Feeling',
      'Toward N4',
      'Linking Actions',
      'Intention & Attempt',
      'Thoughts, Guessing & Conditions',
      'Advanced Verb Forms'
    ]);
  });

  it('groups chapters into four contiguous tracks', () => {
    // The course map draws a heading whenever `kind` differs from the
    // previous chapter's. That rule only produces one heading per track if
    // the tracks are contiguous — otherwise a track's heading repeats.
    const kinds = curriculum.map((c) => c.kind);
    expect(kinds).toEqual([
      'kana', 'kana',
      'kanji',
      'vocab', 'vocab', 'vocab', 'vocab',
      'grammar', 'grammar', 'grammar', 'grammar'
    ]);

    const headings = kinds.filter((kind, i) => kind !== kinds[i - 1]);
    expect(headings).toEqual(['kana', 'kanji', 'vocab', 'grammar']);
  });

  it('keeps all 50 units, and regroups the 40 non-kana ones without loss', () => {
    // The regroup must not drop, duplicate, or invent a unit. Chapter
    // membership changed; the set of units did not.
    expect(allUnits()).toHaveLength(50);

    // Uniqueness is asserted only over the regrouped units. Unit titles are
    // NOT unique across the whole curriculum — the Hiragana and Katakana
    // chapters each contain a "Dakuten & handakuten" and a "Combination kana
    // (youon)" — but they are unique within the pool groupIntoChapters keys
    // by, which is the property that matters.
    const regrouped = curriculum
      .filter((c) => c.kind !== 'kana')
      .flatMap((c) => c.units.map((u) => u.title));
    expect(regrouped).toHaveLength(40);
    expect(new Set(regrouped).size).toBe(40);
  });

  it('keeps all 667 cards', () => {
    const total = allUnits().reduce((sum, u) => sum + u.cards.length, 0);
    expect(total).toBe(667);
  });

  it('keeps the four kanji units together in Basic Kanji, 20 cards each', () => {
    const kanji = curriculum.find((c) => c.title === 'Basic Kanji')!;
    expect(kanji.units).toHaveLength(4);
    expect(kanji.units.every((u) => u.kind === 'kanji')).toBe(true);
    expect(kanji.units.every((u) => u.cards.length === 20)).toBe(true);
    expect(kanji.units.every((u) => u.dailyCap === 3)).toBe(true);
  });

  it('spreads the 19 vocab units across four chapters, all capped at 8/day', () => {
    const chapters = curriculum.filter((c) => c.kind === 'vocab');
    expect(chapters.map((c) => c.units.length)).toEqual([5, 6, 3, 5]);

    const units = chapters.flatMap((c) => c.units);
    expect(units).toHaveLength(19);
    expect(units.every((u) => u.kind === 'vocab')).toBe(true);
    expect(units.every((u) => u.dailyCap === 8)).toBe(true);
  });

  it('spreads the 17 grammar units across four chapters', () => {
    const chapters = curriculum.filter((c) => c.kind === 'grammar');
    expect(chapters.map((c) => c.units.length)).toEqual([4, 3, 6, 4]);

    const units = chapters.flatMap((c) => c.units);
    expect(units).toHaveLength(17);
    expect(units.every((u) => u.kind === 'grammar')).toBe(true);
  });

  it('leaves the two kana chapters untouched, vocab unit and all', () => {
    const [hiragana, katakana] = curriculum;
    expect(hiragana.units.map((u) => u.title)).toEqual([
      'Base gojuon',
      'Dakuten & handakuten',
      'Combination kana (youon)',
      'Special characters',
      'Anchor verbs'
    ]);
    expect(katakana.units.map((u) => u.title)).toEqual([
      'Base 46',
      'Dakuten & handakuten',
      'Combination kana (youon)',
      'Extended katakana',
      'Loanwords'
    ]);
    // A chapter's kind is a track label, not a claim about its units.
    expect(hiragana.units.at(-1)!.kind).toBe('vocab');
    expect(hiragana.kind).toBe('kana');
  });

  it('every card has non-empty front and back fields', () => {
    for (const unit of allUnits()) {
      expect(unit.cards.length).toBeGreaterThan(0);
      for (const card of unit.cards) {
        for (const value of [...Object.values(card.front), ...Object.values(card.back)]) {
          expect(String(value).trim()).not.toBe('');
        }
      }
    }
  });

  it('has no duplicate card fronts across the whole curriculum', () => {
    const fronts = allUnits().flatMap((u) => u.cards.map((c) => JSON.stringify(c.front)));
    const dupes = fronts.filter((f, i) => fronts.indexOf(f) !== i);
    expect(dupes).toEqual([]);
  });
});
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `npx vitest run src/lib/server/seed/content.test.ts`
Expected: FAIL — the curriculum still has four chapters.

- [ ] **Step 4: Rewrite the curriculum**

Replace `src/lib/server/seed/index.ts` entirely:

```ts
import type { SeedChapter } from './types';
import { groupIntoChapters, type ChapterSpec } from './group';
import { hiraganaChapter } from './hiragana';
import { katakanaChapter } from './katakana';
import { kanjiUnits } from './kanji';
import { vocabUnits } from './vocab';
import { grammarUnits } from './grammar';

/**
 * Chapter composition for the kanji, vocabulary, and grammar tracks.
 *
 * Units are named, never sliced by index — see groupIntoChapters, which
 * throws if a title is unknown, claimed twice, or claimed by nobody. That
 * check is why this list can be reordered safely.
 *
 * Chapters are declared in track order (kanji, then vocab, then grammar) and
 * the two kana chapters lead the curriculum. The course map draws a track
 * heading wherever `kind` changes, so contiguity here is what stops a
 * heading from repeating. `content.test.ts` asserts it.
 *
 * Grouping is thematic, which reorders some units relative to the previous
 * curriculum ("Work & school" now precedes "Adjectives"). That is safe
 * because vocabulary buckets and N4 grammar points do not depend on each
 * other. Card order *within* a unit is untouched.
 */
const CHAPTER_SPECS: ChapterSpec[] = [
  {
    title: 'Basic Kanji',
    kind: 'kanji',
    // "Basic" is deliberate: these four sets are a foundational subset, not
    // comprehensive kanji coverage.
    unitTitles: [
      'Kanji Set 1 — Core & most useful',
      'Kanji Set 2 — Numbers, time & money',
      'Kanji Set 3 — Daily-life verbs & adjectives',
      'Kanji Set 4 — Places, directions & nature'
    ]
  },
  {
    title: 'Everyday Life',
    kind: 'vocab',
    unitTitles: [
      'Daily verbs',
      'Time expressions',
      'Food & restaurants',
      'Shopping & money',
      'Transport & directions'
    ]
  },
  {
    title: 'People, Places & Work',
    kind: 'vocab',
    unitTitles: [
      'People & relationships',
      'Health & body',
      'Home & living spaces',
      'Weather & seasons',
      'Work & school',
      'City life & entertainment'
    ]
  },
  {
    title: 'Describing & Feeling',
    kind: 'vocab',
    unitTitles: ['Adjectives', 'Feelings & emotions', 'Frequency & quantity adverbs']
  },
  {
    title: 'Toward N4',
    kind: 'vocab',
    unitTitles: [
      'N4 verbs: motion, change & giving',
      'N4 verbs: communication & thought',
      'N4 nouns: abstract & everyday concepts',
      'Particles deep dive',
      'Reading vocabulary'
    ]
  },
  {
    title: 'Linking Actions',
    kind: 'grammar',
    unitTitles: [
      'Sequence — after doing',
      'Purpose — in order to',
      'Simultaneous actions — while doing',
      'Listing actions — 〜たり〜たりする'
    ]
  },
  {
    title: 'Intention & Attempt',
    kind: 'grammar',
    unitTitles: [
      'Trying and wanting to try',
      'Change of state — become able to / stop doing',
      'Completion and regret — end up doing'
    ]
  },
  {
    title: 'Thoughts, Guessing & Conditions',
    kind: 'grammar',
    unitTitles: [
      'Reporting thoughts and hearsay — I think / was saying',
      'Speculation — might be, probably, should be',
      'Hearsay and appearance — apparently, looks like',
      'Comparison — as much as, about, to the extent that',
      'Conditionals — if',
      'Contrast — even though'
    ]
  },
  {
    title: 'Advanced Verb Forms',
    kind: 'grammar',
    unitTitles: [
      'Giving and receiving favors',
      'Causative — make/let someone do',
      'Passive voice',
      'Ability — potential form'
    ]
  }
];

export const curriculum: SeedChapter[] = [
  hiraganaChapter,
  katakanaChapter,
  ...groupIntoChapters([...kanjiUnits, ...vocabUnits, ...grammarUnits], CHAPTER_SPECS)
];

export type { SeedChapter, SeedUnit, SeedCard, ChapterKind } from './types';
```

- [ ] **Step 5: Update the schema comment**

`src/lib/server/db/schema.ts:7` — change the trailing comment on the `chapters.kind` column:

```ts
  kind: text('kind').notNull() // 'kana' | 'kanji' | 'vocab' | 'grammar' — the track heading on the course map
```

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS. If `groupIntoChapters` throws during collection, the message names the exact offending unit title — fix the typo in `CHAPTER_SPECS` and re-run.

- [ ] **Step 7: Mutation-check**

Delete `'Reading vocabulary'` from the "Toward N4" spec, re-run. Expected: the seed throws `units left out of every chapter: Reading vocabulary`, failing the content tests. Restore it.

- [ ] **Step 8: Typecheck and commit**

```bash
npm run check
git add src/lib/server/seed/ src/lib/server/db/schema.ts
git commit -m "feat: split the curriculum into eleven chapters across four tracks"
```

---

## Task 3: Track headings on the course map

**Files:**
- Modify: `src/lib/server/progress.ts` (the `ChapterProgress` type, the query, the accumulator)
- Modify: `src/lib/server/progress.test.ts`
- Modify: `src/routes/+page.svelte`

**Interfaces:**
- Consumes: the 11-chapter curriculum from Task 2.
- Produces: `ChapterProgress` gains `kind: ChapterKind`. The map is the only consumer.

- [ ] **Step 1: Write the failing test**

`src/lib/server/progress.test.ts` builds a synthetic curriculum with its own `fixture()` helper — one `kana` chapter, two units, two cards each — rather than seeding the real one. Reuse it; do not import `curriculum` here. (The real curriculum's track order is already asserted in `content.test.ts`.)

Add inside the existing `describe('chapterProgress', ...)` block:

```ts
  it('exposes each chapter kind so the map can draw track headings', () => {
    const { db, userId } = fixture();
    // A second chapter of a different kind. With only the fixture's single
    // 'kana' chapter, reading the column and hardcoding 'kana' would be
    // indistinguishable.
    const [vocabCh] = db
      .insert(chapters)
      .values({ order: 2, title: 'Ch2', kind: 'vocab' })
      .returning()
      .all();
    const [u3] = db
      .insert(units)
      .values({ chapterId: vocabCh.id, order: 1, title: 'U3', kind: 'vocab', dailyCap: 8 })
      .returning()
      .all();
    db.insert(cards)
      .values({
        unitId: u3.id,
        order: 1,
        frontJson: '{"word":"猫"}',
        backJson: '{"reading":"ねこ","meaning":"cat","example_sentence":"e"}'
      })
      .run();

    expect(chapterProgress(db, userId).map((c) => c.kind)).toEqual(['kana', 'vocab']);
  });
```

`chapters`, `units`, and `cards` are already imported at the top of that file.

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/server/progress.test.ts`
Expected: FAIL — `kind` is `undefined` on every chapter.

- [ ] **Step 3: Plumb `kind` through**

In `src/lib/server/progress.ts`:

Add the import:

```ts
import type { ChapterKind } from '$lib/server/seed/types';
```

Add to the `ChapterProgress` type, after `title`:

```ts
  /** The chapter's track — drives the map's section headings. */
  kind: ChapterKind;
```

Add to the `.select({ ... })` object, after `chapterTitle`:

```ts
      chapterKind: chapters.kind,
```

And in the accumulator, change the chapter construction from:

```ts
      chapter = { id: row.chapterId, title: row.chapterTitle, total: 0, introduced: 0, units: [] };
```

to:

```ts
      chapter = {
        id: row.chapterId,
        title: row.chapterTitle,
        kind: row.chapterKind as ChapterKind,
        total: 0,
        introduced: 0,
        units: []
      };
```

`groupBy(chapters.id, units.id)` already makes `chapters.kind` functionally dependent on the grouping, so no `groupBy` change is needed.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/server/progress.test.ts`
Expected: PASS.

- [ ] **Step 5: Render the headings**

In `src/routes/+page.svelte`, add to the `<script>` block:

```ts
  const TRACK_LABELS: Record<string, string> = {
    kana: 'Alphabet',
    kanji: 'Kanji',
    vocab: 'Vocabulary',
    grammar: 'Grammar'
  };
```

Then inside the `{#each data.chapters as chapter, i (chapter.id)}` block, immediately after the two existing `{@const}` lines, add a third:

```svelte
    {@const startsTrack = chapter.kind !== data.chapters[i - 1]?.kind}
```

and immediately before the `<details ...>` element, add:

```svelte
    {#if startsTrack}
      <!--
        A track heading, drawn wherever `kind` differs from the previous
        chapter's. This relies on chapters being authored in track order, so
        each track is contiguous and gets exactly one heading; content.test.ts
        asserts that contiguity. `<h2>` here demotes the chapter titles below
        to `<h3>`, keeping the outline a real hierarchy rather than a flat run
        of same-level headings.
      -->
      <h2
        class="px-1 pt-5 pb-1 text-xs font-semibold tracking-widest text-ink-muted uppercase first:pt-0"
      >
        {TRACK_LABELS[chapter.kind] ?? chapter.kind}
      </h2>
    {/if}
```

Change the chapter title element from `<h2 class="truncate font-medium text-ink">` to `<h3 class="truncate font-medium text-ink">` (and its closing `</h2>` to `</h3>`).

Note the wrapper `<div class="space-y-3">` applies vertical rhythm between all children, so headings inherit it; `first:pt-0` stops the leading heading from adding a gap above the first chapter.

- [ ] **Step 6: Verify visually**

Run: `npm run dev`, open `/`, confirm four headings — Alphabet, Kanji, Vocabulary, Grammar — each appearing exactly once, above their chapters.

- [ ] **Step 7: Typecheck and commit**

```bash
npm run check && npm test
git add src/lib/server/progress.ts src/lib/server/progress.test.ts src/routes/+page.svelte
git commit -m "feat: group the course map into four track headings"
```

---

## Task 4: The reseed script

`seedIfEmpty` only seeds an empty `chapters` table, so the restructured curriculum needs the old one cleared first. This is destructive: `user_cards` and `review_logs` reference `cards.id`, which a reseed does not preserve, so all study progress dies with it. That is acceptable *only* because both tables are currently empty.

**Files:**
- Create: `scripts/reseed.ts`
- Modify: `package.json`, `README.md`

**Interfaces:**
- Consumes: `db` singleton, `seedIfEmpty`, and the schema tables.
- Produces: `npm run reseed`. Nothing imports this.

- [ ] **Step 1: Write the script**

Create `scripts/reseed.ts`:

```ts
/**
 * Destructive curriculum rebuild.
 *
 * `seedIfEmpty` only seeds when `chapters` is empty, so changing the
 * curriculum's shape means clearing the old one first. Because `user_cards`
 * and `review_logs` reference `cards.id` — an autoincrement key a reseed
 * does not preserve — clearing the curriculum necessarily destroys every
 * user's study progress. There is no partial version of this operation.
 *
 * `users` and `sessions` are left alone, so accounts and logins survive.
 *
 * Usage — stop the app first, so exactly one process touches app.db:
 *
 *   docker compose stop
 *   docker compose run --rm -e RESEED_CONFIRM=yes app npm run reseed
 *   docker compose start
 *
 * The app must not be running: a live page holds card ids that will not
 * exist afterwards, and its next rating would be rejected.
 *
 * The durable fix — matching seed rows on natural keys so `cards.id`
 * survives a content edit — is deliberately deferred. See the design spec's
 * "Known limitation".
 */
import { sql } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { db } from '../src/lib/server/db';
import { chapters, units, cards, userCards, reviewLogs } from '../src/lib/server/db/schema';
import { seedIfEmpty } from '../src/lib/server/seed/run';

function count(table: SQLiteTable): number {
  const [row] = db.select({ n: sql<number>`count(*)` }).from(table).all();
  return row?.n ?? 0;
}

function main() {
  const progress = count(userCards);
  const logs = count(reviewLogs);

  console.log(
    `About to destroy: ${count(chapters)} chapters, ${count(units)} units, ` +
      `${count(cards)} cards, ${progress} card-progress rows, ${logs} review logs.`
  );

  if (process.env.RESEED_CONFIRM !== 'yes') {
    console.error(
      '\nRefusing to run. This permanently destroys all study progress —\n' +
        'card scheduling state, streaks, and review history for every user.\n' +
        'Accounts and sessions are not affected.\n\n' +
        'Re-run with RESEED_CONFIRM=yes to proceed.'
    );
    process.exit(1);
  }

  // One transaction: a half-cleared curriculum would leave `seedIfEmpty`
  // seeing a non-empty `chapters` table and declining to reseed, which is
  // the one state with no obvious way out.
  db.transaction((tx) => {
    // Child-first, so foreign keys hold at every point (PRAGMA
    // foreign_keys=ON is set in connect.ts).
    tx.delete(reviewLogs).run();
    tx.delete(userCards).run();
    tx.delete(cards).run();
    tx.delete(units).run();
    tx.delete(chapters).run();
  });

  seedIfEmpty(db);

  console.log(
    `Reseeded: ${count(chapters)} chapters, ${count(units)} units, ${count(cards)} cards.`
  );
  process.exit(0);
}

main();
```

- [ ] **Step 2: Register it**

In `package.json`, add after the `set-password` line:

```json
    "reseed": "tsx scripts/reseed.ts"
```

- [ ] **Step 3: Verify the refusal path first**

Run: `npm run reseed`
Expected: prints the row counts, then refuses with exit code 1. Confirm the database is untouched:

```bash
sqlite3 'file:data/app.db?immutable=1' "select count(*) from chapters;"
```

Expected: still `4` (the old curriculum).

- [ ] **Step 4: Back up, then reseed for real**

```bash
cp data/app.db "data/app.db.bak-$(date +%Y%m%d%H%M%S)"
RESEED_CONFIRM=yes npm run reseed
```

Expected: `Reseeded: 11 chapters, 50 units, 667 cards.`

- [ ] **Step 5: Verify the result**

```bash
sqlite3 'file:data/app.db?immutable=1' \
  "select c.\"order\", c.kind, c.title, count(distinct u.id) units, count(k.id) cards
   from chapters c join units u on u.chapter_id=c.id join cards k on k.unit_id=u.id
   group by c.id order by c.\"order\";"
sqlite3 'file:data/app.db?immutable=1' "select count(*) from users;"
```

Expected: 11 chapters with unit counts `5,5,4,5,6,3,5,4,3,6,4` summing to 50 and cards summing to 667; kinds in the order `kana,kana,kanji,vocab×4,grammar×4`; and the user account still present.

- [ ] **Step 6: Document it**

In `README.md`, add a section after "Resetting a password":

```markdown
### Rebuilding the curriculum

Changing the curriculum's shape (adding cards, renaming units, regrouping
chapters) requires a full rebuild, because `seedIfEmpty` only ever seeds an
empty database.

**This destroys all study progress.** `user_cards` and `review_logs` reference
`cards.id`, an autoincrement key a reseed does not preserve — so scheduling
state, streaks, and review history for every user are lost. Accounts and
sessions survive.

Stop the app first, so exactly one process touches `app.db`:

```
docker compose stop
cp data/app.db "data/app.db.bak-$(date +%Y%m%d%H%M%S)"
docker compose run --rm -e RESEED_CONFIRM=yes app npm run reseed
docker compose start
```

Without `RESEED_CONFIRM=yes` the script prints what it *would* destroy and
exits 1, which is the safe way to check the row counts first.
```

- [ ] **Step 7: Commit**

```bash
git add scripts/reseed.ts package.json README.md
git commit -m "feat: add reseed script for rebuilding the curriculum"
```

---

## Task 5: Cross-device revalidation

Cross-device continuity already works — the queue is re-derived from SQLite on every load, so there is no client-side state to sync. Two gaps remain: no cache directives on per-user pages, and Safari on iOS restoring a backgrounded tab from bfcache without re-running `load`. The second is the real "open it on my iPad" failure.

**Files:**
- Create: `src/lib/revalidate.ts`, `src/lib/revalidate.test.ts`, `src/lib/study-state.svelte.ts`
- Modify: `src/routes/+page.server.ts`, `src/routes/study/+page.server.ts`, `src/routes/stats/+page.server.ts`, `src/routes/+layout.svelte`, `src/routes/study/+page.svelte`

**Interfaces:**
- Produces: `shouldRevalidate(input: RevalidateInput): boolean` and `type RevalidateInput = { restoredFromBfcache: boolean; wasHidden: boolean; ratingInFlight: boolean }`. Also `rating` — a shared rune object `{ inFlight: boolean }` — imported by both the layout and the study page.

- [ ] **Step 1: Write the failing test**

Create `src/lib/revalidate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { shouldRevalidate } from './revalidate';

const input = (over: Partial<Parameters<typeof shouldRevalidate>[0]> = {}) => ({
  restoredFromBfcache: false,
  wasHidden: false,
  ratingInFlight: false,
  ...over
});

describe('shouldRevalidate', () => {
  it('revalidates a tab restored from the back/forward cache', () => {
    // Safari on iOS reinstates the DOM without re-running load, so the page
    // shows whatever card was current when it was last foregrounded.
    expect(shouldRevalidate(input({ restoredFromBfcache: true }))).toBe(true);
  });

  it('revalidates a tab that was hidden and came back', () => {
    expect(shouldRevalidate(input({ wasHidden: true }))).toBe(true);
  });

  it('does nothing when the tab was never hidden', () => {
    // visibilitychange also fires for reasons that do not imply staleness.
    // Revalidating on those would refetch every load on an idle page.
    expect(shouldRevalidate(input())).toBe(false);
  });

  it('never revalidates while a rating is in flight', () => {
    // The rating's own handler calls update()/invalidateAll() when it
    // resolves. A second concurrent load would race it, and the loser's
    // result decides which card is displayed.
    expect(shouldRevalidate(input({ restoredFromBfcache: true, ratingInFlight: true }))).toBe(false);
    expect(shouldRevalidate(input({ wasHidden: true, ratingInFlight: true }))).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/revalidate.test.ts`
Expected: FAIL — cannot resolve `./revalidate`.

- [ ] **Step 3: Implement**

Create `src/lib/revalidate.ts`:

```ts
export type RevalidateInput = {
  /** The `persisted` flag from a `pageshow` event — a bfcache restore. */
  restoredFromBfcache: boolean;
  /** The document was hidden at some point since the last revalidation. */
  wasHidden: boolean;
  /** A rating POST is currently awaiting its response. */
  ratingInFlight: boolean;
};

/**
 * Whether a client-side revalidation (invalidateAll) is warranted.
 *
 * Extracted as a pure function because the two events that drive it —
 * bfcache restore and visibilitychange — cannot be exercised without a real
 * browser, and none is available in this environment. The decision is tested
 * here; the event wiring is verified by hand on the iPad.
 */
export function shouldRevalidate({
  restoredFromBfcache,
  wasHidden,
  ratingInFlight
}: RevalidateInput): boolean {
  if (ratingInFlight) return false;
  return restoredFromBfcache || wasHidden;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/revalidate.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Mutation-check**

Change `if (ratingInFlight) return false;` to `return restoredFromBfcache || wasHidden;`. Re-run. Expected: the in-flight test FAILS. Restore.

- [ ] **Step 6: Add the shared rating flag**

Create `src/lib/study-state.svelte.ts`:

```ts
/**
 * Whether a rating POST is awaiting its response.
 *
 * Lives outside the study page because the *layout* owns the revalidation
 * listeners (staleness affects every page) while the study page owns the
 * submission. A `.svelte.ts` module is the narrowest way to share one
 * reactive boolean between them without threading it through props.
 */
export const rating = $state({ inFlight: false });
```

- [ ] **Step 7: Send no-store on the three per-user routes**

In each of `src/routes/+page.server.ts`, `src/routes/study/+page.server.ts`, and `src/routes/stats/+page.server.ts`, add `setHeaders` to the destructured `load` argument and call it first. For `src/routes/+page.server.ts` the result is:

```ts
export const load: PageServerLoad = async ({ locals, setHeaders }) => {
  const userId = locals.user!.id; // hooks.server.ts guarantees a user on this route
  // Per-user content behind a session cookie: never store it. Without this
  // there is no explicit directive at all, which leaves staleness to
  // heuristics.
  setHeaders({ 'cache-control': 'no-store' });
  return {
    chapters: chapterProgress(db, userId),
    counts: queueCounts(db, userId)
  };
};
```

Apply the same two lines to the other two `load` functions, keeping their existing bodies. In `study/+page.server.ts` place the `setHeaders` call immediately after the `const now = new Date();` line, so it runs on both the item and no-item return paths.

- [ ] **Step 8: Wire the listeners**

In `src/routes/+layout.svelte`, add to the `<script>` block:

```ts
  import { invalidateAll } from '$app/navigation';
  import { shouldRevalidate } from '$lib/revalidate';
  import { rating } from '$lib/study-state.svelte';

  // Tracks whether the tab has been hidden since the last revalidation.
  // visibilitychange fires on becoming visible regardless of whether it was
  // ever hidden, so without this every fire would trigger a refetch.
  let wasHidden = false;

  $effect(() => {
    function revalidate(restoredFromBfcache: boolean) {
      if (!shouldRevalidate({ restoredFromBfcache, wasHidden, ratingInFlight: rating.inFlight })) {
        return;
      }
      wasHidden = false;
      void invalidateAll();
    }

    function onPageShow(event: PageTransitionEvent) {
      revalidate(event.persisted);
    }

    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        wasHidden = true;
        return;
      }
      revalidate(false);
    }

    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  });
```

- [ ] **Step 9: Set the flag from the study page**

In `src/routes/study/+page.svelte`, import the shared flag:

```ts
  import { rating } from '$lib/study-state.svelte';
```

and mirror the existing local `submitting` state onto it inside `handleRate` — set `rating.inFlight = true` immediately after `submitting = true`, and `rating.inFlight = false` immediately after `submitting = false`. Keep the local `submitting` as-is; it drives the button `disabled` state and must not become dependent on a module-level flag that outlives the page.

- [ ] **Step 10: Verify**

Run: `npm run dev`. In the browser devtools Network tab, load `/study` and confirm the document response carries `cache-control: no-store`. Switch to another tab and back; confirm a fresh `__data.json` request fires on return. Then run `npm test` and `npm run check`.

- [ ] **Step 11: Commit**

```bash
git add src/lib/revalidate.ts src/lib/revalidate.test.ts src/lib/study-state.svelte.ts \
  src/routes/+page.server.ts src/routes/study/+page.server.ts src/routes/stats/+page.server.ts \
  src/routes/+layout.svelte src/routes/study/+page.svelte
git commit -m "feat: revalidate restored tabs and stop caching per-user pages"
```

---

## Task 6: Motion duration helper

Svelte's JS transitions (`fly`, `Tween`) set inline styles and run their own timers — the global `prefers-reduced-motion` block in `app.css` does not touch them. Everything JS-driven routes through here.

**Files:**
- Create: `src/lib/motion.ts`, `src/lib/motion.test.ts`

**Interfaces:**
- Produces: `motionDuration(ms: number, reduced: boolean): number` and `prefersReducedMotion(): boolean`. Tasks 7 and 9 consume both.

- [ ] **Step 1: Write the failing test**

Create `src/lib/motion.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { motionDuration } from './motion';

describe('motionDuration', () => {
  it('passes the duration through when motion is welcome', () => {
    expect(motionDuration(250, false)).toBe(250);
  });

  it('collapses to zero under reduced motion', () => {
    // Zero, not "a bit shorter": the effect must vanish, while whatever it
    // was animating stays fully functional.
    expect(motionDuration(250, true)).toBe(0);
  });

  it('collapses every duration, including long ones', () => {
    expect(motionDuration(2000, true)).toBe(0);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/motion.test.ts`
Expected: FAIL — cannot resolve `./motion`.

- [ ] **Step 3: Implement**

Create `src/lib/motion.ts`:

```ts
/**
 * Duration for a JS-driven animation, honouring the reduced-motion setting.
 *
 * `app.css` already forces CSS transitions and animations to ~0 under
 * `prefers-reduced-motion: reduce`, so pure-CSS effects need nothing. Svelte's
 * JS transitions and tweens run their own timers and ignore that rule
 * entirely — they must ask here instead.
 *
 * Reduced motion means zero duration, never a disabled feature: the card
 * still flips, the number still reaches its new value, they just arrive
 * immediately.
 */
export function motionDuration(ms: number, reduced: boolean): number {
  return reduced ? 0 : ms;
}

/**
 * The viewer's reduced-motion preference. Returns false during SSR, where
 * there is no viewer to ask — components re-evaluate on the client.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
```

- [ ] **Step 4: Run tests and commit**

Run: `npx vitest run src/lib/motion.test.ts` → PASS (3 tests). Then:

```bash
npm run check
git add src/lib/motion.ts src/lib/motion.test.ts
git commit -m "feat: add motion duration helper honouring reduced-motion"
```

---

## Task 7: Card flip and answer slide

**Files:**
- Modify: `src/lib/components/Card.svelte`
- Modify: `src/routes/study/+page.svelte`

**Interfaces:**
- Consumes: `motionDuration`, `prefersReducedMotion` from Task 6. `Card`'s props are unchanged (`kind`, `front`, `back`, `revealed`).

- [ ] **Step 1: Rebuild Card as two stacked faces**

Replace the markup in `src/lib/components/Card.svelte` (the `<script>` block stays exactly as it is). The key detail is the CSS grid: both faces occupy the same cell, so the container is always as tall as the *taller* face and its height never changes mid-rotation. A naive absolutely-positioned back face would size the container to the front alone and jump the sticky rating bar under the user's thumb halfway through the flip.

```svelte
<!--
  Two faces of one card, stacked in a single grid cell so the container is
  sized to the taller of them. That is what keeps the flip from changing the
  page's height mid-rotation and shifting the rating bar under the user's
  thumb.

  Only the visible face is exposed: the turned-away one is `inert` and
  aria-hidden, so neither a screen reader nor the tab key reaches text the
  viewer cannot see. `backface-visibility` alone hides it visually but leaves
  it in the accessibility tree.

  Durations here are CSS, so app.css's prefers-reduced-motion block already
  collapses them — no JS involvement needed for the flip itself.
-->
<div class="[perspective:1200px]">
  <div
    class="grid transition-transform duration-300 ease-out [transform-style:preserve-3d]
      {revealed ? '[transform:rotateY(180deg)]' : ''}"
  >
    <div
      class="col-start-1 row-start-1 flex min-h-[16rem] flex-col items-center justify-center gap-6
        rounded-2xl border border-hairline bg-surface p-6 text-center [backface-visibility:hidden]
        [-webkit-backface-visibility:hidden] sm:min-h-[20rem] sm:p-10"
      inert={revealed}
      aria-hidden={revealed}
    >
      {#if kind === 'kana' || kind === 'kanji'}
        <div class="text-8xl leading-none text-ink sm:text-9xl">{(front as { char: string }).char}</div>
      {:else if kind === 'vocab'}
        <div class="max-w-full text-5xl leading-tight break-words text-ink sm:text-6xl">
          {(front as { word: string }).word}
        </div>
      {:else}
        <div class="max-w-md text-3xl leading-snug break-words text-ink sm:text-4xl">
          {(front as { pattern: string }).pattern}
        </div>
      {/if}
    </div>

    <div
      class="col-start-1 row-start-1 flex min-h-[16rem] flex-col items-center justify-center gap-6
        rounded-2xl border border-hairline bg-surface p-6 text-center [backface-visibility:hidden]
        [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)] sm:min-h-[20rem] sm:p-10"
      inert={!revealed}
      aria-hidden={!revealed}
    >
      <div class="max-w-md space-y-2">
        {#if kind === 'kana'}
          <p class="text-2xl font-semibold text-ink">{(back as { romaji: string }).romaji}</p>
          <p class="text-sm break-words text-ink-muted">{(back as { mnemonic: string }).mnemonic}</p>
        {:else if kind === 'kanji'}
          <p class="text-2xl font-semibold text-ink">{(back as { meaning: string }).meaning}</p>
          <p class="text-lg text-ink-muted">{(back as { reading: string }).reading}</p>
          <p class="text-sm break-words text-ink-muted">{(back as { example_word: string }).example_word}</p>
        {:else if kind === 'vocab'}
          <p class="text-lg text-ink-muted">{(back as { reading: string }).reading}</p>
          <p class="text-2xl font-semibold text-ink">{(back as { meaning: string }).meaning}</p>
          <p class="text-sm break-words text-ink-muted">
            {(back as { example_sentence: string }).example_sentence}
          </p>
        {:else}
          <p class="text-2xl font-semibold text-ink">{(back as { meaning: string }).meaning}</p>
          <p class="text-sm break-words text-ink-muted">{(back as { example: string }).example}</p>
        {/if}
      </div>
    </div>
  </div>
</div>
```

Note the front face no longer renders the answer, and the `<hr>` separator is gone — the two faces are now physically distinct, so the divider that used to separate them within one face has no role.

- [ ] **Step 2: Check the flip by hand**

Run `npm run dev`, open `/study`, press space. Expected: the card rotates and lands on the answer; the rating bar does not move vertically at any point during the rotation. Test a grammar card (short front, long back) specifically — that is the worst case for the height difference.

- [ ] **Step 3: Verify reduced motion**

In devtools, Rendering → "Emulate CSS prefers-reduced-motion: reduce". Reveal a card. Expected: the answer appears instantly, with no visible rotation, and is fully readable.

- [ ] **Step 4: Verify the turned-away face is unreachable**

With the card unrevealed, press Tab repeatedly. Expected: focus never lands inside the card. In devtools' Accessibility tree, the back face is excluded.

- [ ] **Step 5: Add the answer slide**

In `src/routes/study/+page.svelte`, add to the `<script>` block:

```ts
  import { fly } from 'svelte/transition';
  import { motionDuration, prefersReducedMotion } from '$lib/motion';

  // Read once per render rather than per transition, so both halves of a
  // swap agree even if the preference changes mid-animation.
  const slide = $derived.by(() => {
    const reduced = prefersReducedMotion();
    return { duration: motionDuration(200, reduced) };
  });
```

Replace the `<Card ... />` line with:

```svelte
  <!--
    Both the outgoing and incoming card exist at once during a swap, stacked
    in one grid cell so neither pushes the other around. The `delay` on the
    incoming card lets the outgoing one clear first.

    Strictly decorative: the rating POST fires on submit and never waits for
    this to finish.
  -->
  <div class="grid">
    {#key data.item.cardId}
      <div
        class="col-start-1 row-start-1"
        in:fly={{ x: 24, duration: slide.duration, delay: slide.duration }}
        out:fly={{ x: -24, duration: slide.duration }}
      >
        <Card kind={data.item.unitKind} front={data.item.front} back={data.item.back} {revealed} />
      </div>
    {/key}
  </div>
```

- [ ] **Step 6: Confirm rating is not blocked**

Rate several cards in quick succession, including pressing a rating key immediately as the next card slides in. Expected: every rating registers; no card is skipped or double-rated; the existing "That card already moved on" banner does not appear during normal use.

- [ ] **Step 7: Confirm reveal still resets per card**

Reveal a card, rate it, and watch the next one arrive. Expected: the next card arrives showing its *front*. This is the existing `$effect` keyed on `cardId`; the `{#key}` block must not have broken it.

- [ ] **Step 8: Test, typecheck, commit**

```bash
npm test && npm run check
git add src/lib/components/Card.svelte src/routes/study/+page.svelte
git commit -m "feat: flip the card on reveal and slide between cards"
```

---

## Task 8: Course map path animation

**Files:**
- Modify: `src/app.css`, `src/routes/+page.svelte`

**Interfaces:** None — pure CSS, no exports.

- [ ] **Step 1: Add the keyframes**

Append to `src/app.css`, before the `@media (prefers-reduced-motion: reduce)` block at the end (order matters — that block's `!important` overrides must come last):

```css
/*
 * Course-map path. The connector line between units draws downward on load,
 * and the current unit's dot breathes so the eye lands on where to resume.
 *
 * scaleY from a top origin animates the compositor's transform rather than
 * layout, so a 50-unit map does not reflow 100 connector spans.
 */
@keyframes draw-down {
  from {
    transform: scaleY(0);
  }
  to {
    transform: scaleY(1);
  }
}

@keyframes breathe {
  0%,
  100% {
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--color-accent) 20%, transparent);
  }
  50% {
    box-shadow: 0 0 0 7px color-mix(in oklab, var(--color-accent) 8%, transparent);
  }
}

.path-line {
  transform-origin: top;
  animation: draw-down 400ms ease-out both;
}

.path-dot-current {
  animation: breathe 2.6s ease-in-out infinite;
}
```

- [ ] **Step 2: Apply the classes**

In `src/routes/+page.svelte`, the two connector spans currently read:

```svelte
                <span class="absolute top-0 left-1/2 h-1/2 w-px -translate-x-1/2 {connector(topActive)}"
                ></span>
```

and

```svelte
                <span
                  class="absolute bottom-0 left-1/2 h-1/2 w-px -translate-x-1/2 {connector(bottomActive)}"
                ></span>
```

Add `path-line` to both class lists (after `-translate-x-1/2`).

The current-unit dot reads:

```svelte
                <span class="relative z-10 h-3 w-3 rounded-full bg-accent ring-4 ring-accent/20"></span>
```

Replace it with:

```svelte
                <span class="path-dot-current relative z-10 h-3 w-3 rounded-full bg-accent"></span>
```

The static `ring-4 ring-accent/20` is dropped because the `breathe` keyframes now draw that ring themselves — keeping both would double it. Under reduced motion the animation is frozen at its first keyframe, which is the same 4px ring at 20% opacity, so the static appearance is preserved exactly.

- [ ] **Step 3: Verify**

Run `npm run dev`, open `/`. Expected: connector lines draw downward on load; the current unit's dot pulses gently. Then emulate `prefers-reduced-motion: reduce` and reload — expected: lines are fully drawn immediately, the dot shows a static 4px ring, nothing moves.

- [ ] **Step 4: Commit**

```bash
npm run check
git add src/app.css src/routes/+page.svelte
git commit -m "feat: draw the course map path and pulse the current unit"
```

---

## Task 9: Button press, rolling counters, eased progress

**Files:**
- Create: `src/lib/components/RollingNumber.svelte`
- Modify: `src/lib/components/ProgressBar.svelte`, `src/routes/study/+page.svelte`, `src/routes/+page.svelte`

**Interfaces:**
- Consumes: `motionDuration`, `prefersReducedMotion` from Task 6.
- Produces: `RollingNumber` with prop `{ value: number }`.

- [ ] **Step 1: Build the rolling number**

Create `src/lib/components/RollingNumber.svelte`:

```svelte
<script lang="ts">
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { motionDuration, prefersReducedMotion } from '$lib/motion';

  let { value }: { value: number } = $props();

  const tween = new Tween(value, {
    duration: motionDuration(500, prefersReducedMotion()),
    easing: cubicOut
  });

  $effect(() => {
    tween.set(value);
  });

  // Rounded, never truncated: the tween's intermediate values are
  // fractional, but this is a count of cards and must land on exactly the
  // number the server sent. Math.round of a settled tween is that number.
  const shown = $derived(Math.round(tween.current));
</script>

<span class="tabular-nums">{shown}</span>
```

- [ ] **Step 2: Use it for the study counters**

In `src/routes/study/+page.svelte`, import it:

```ts
  import RollingNumber from '$lib/components/RollingNumber.svelte';
```

and replace the counts line:

```svelte
    <span class="shrink-0 tabular-nums">{data.counts.due} due · {data.counts.newAvailable} new</span>
```

with:

```svelte
    <span class="shrink-0 tabular-nums">
      <RollingNumber value={data.counts.due} /> due · <RollingNumber value={data.counts.newAvailable} /> new
    </span>
```

- [ ] **Step 3: Use it on the map header**

In `src/routes/+page.svelte`, import `RollingNumber` the same way and replace:

```svelte
        <span class="tabular-nums">{data.counts.due}</span> due now ·
        <span class="tabular-nums">{data.counts.newAvailable}</span> new available
```

with:

```svelte
        <RollingNumber value={data.counts.due} /> due now ·
        <RollingNumber value={data.counts.newAvailable} /> new available
```

- [ ] **Step 4: Ease the progress bar**

In `src/lib/components/ProgressBar.svelte`, change the inner bar's class from:

```svelte
  <div class="h-full rounded-full bg-accent transition-[width]" style="width: {percent}%"></div>
```

to:

```svelte
  <div
    class="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
    style="width: {percent}%"
  ></div>
```

This is a CSS transition, so `app.css` already zeroes it under reduced motion.

- [ ] **Step 5: Add the button press**

In `src/routes/study/+page.svelte`, the four rating buttons carry a long class list starting `flex flex-col items-center gap-0.5 rounded-lg py-3 font-semibold text-paper transition-opacity hover:opacity-90`. Change `transition-opacity` to `transition-[opacity,transform]` and add `active:scale-[0.97]` immediately after `hover:opacity-90`.

Apply the same two changes to the "Show answer" button, whose class list begins `w-full rounded-lg bg-ink py-3.5 text-base font-medium text-paper transition-opacity hover:opacity-90`.

- [ ] **Step 6: Verify the counters settle exactly**

Run `npm run dev`, open `/study`, and rate a card. Expected: the "due" count rolls to its new value rather than snapping, and settles on an integer matching what the map page reports. Rate several cards rapidly — expected: the count always ends on the true value, never an intermediate one.

- [ ] **Step 7: Verify reduced motion**

Emulate `prefers-reduced-motion: reduce`, reload, rate a card. Expected: counts change instantly, progress bars jump, buttons still respond to press, everything remains functional.

- [ ] **Step 8: Test, typecheck, commit**

```bash
npm test && npm run check
git add src/lib/components/RollingNumber.svelte src/lib/components/ProgressBar.svelte \
  src/routes/study/+page.svelte src/routes/+page.svelte
git commit -m "feat: roll the counters, ease the progress bars, press the buttons"
```

---

## Task 10: Full verification and deploy

**Files:** None modified — this task only verifies.

- [ ] **Step 1: Full suite**

Run: `npm test`
Expected: all tests pass. Count them and compare against the 113 that passed before this plan; the number should have grown by roughly 17 (6 grouping + 4 revalidate + 3 motion + ~4 content/progress).

- [ ] **Step 2: Typecheck and build**

```bash
npm run check
npm run build
```

Expected: 0 errors, build succeeds.

- [ ] **Step 3: Confirm no card content changed**

```bash
git diff main --stat -- src/lib/server/seed/
```

Expected: `index.ts`, `types.ts`, `group.ts`, `content.test.ts`, and structural-only changes in `grammar.ts`. `hiragana.ts`, `katakana.ts`, `kanji.ts`, and `vocab.ts` must show **zero** changes. If any of them changed, a card was edited — investigate before deploying.

- [ ] **Step 4: Deploy and reseed**

Follow the README's deploy sequence, then run the reseed against the deployed database with the app stopped (Task 4, Step 6). Back up `app.db` first.

- [ ] **Step 5: Verify end to end in the browser**

- `/` shows four track headings, eleven chapters, correct unit counts.
- `/study` serves a card, flips on reveal, slides on rating, counters roll.
- `/stats` loads without error and its per-chapter breakdown lists eleven chapters.
- Rate three cards on one device, open the app on a second device: it resumes at card four.
- On the iPad, leave the tab backgrounded, rate a card elsewhere, then return to the iPad tab: it updates to the current card.

- [ ] **Step 6: Report what could not be verified**

The bfcache restore path and the Safari-specific rendering of the flip have no automated coverage in this environment — no browser is available. Say so plainly in the final report rather than implying they were tested.

---

## Notes for the implementer

**The queue is entirely server-derived.** There is no client-side card queue to keep in sync; `nextQueueItem` recomputes from SQLite on every load. If a change appears to require syncing card state to the client, that is a sign the change is wrong.

**`seedIfEmpty` is not idempotent in the useful sense.** It seeds only an empty database. Running the app against a database holding the *old* curriculum silently keeps the old curriculum — no error, no warning. If the map still shows four chapters after Task 2, the reseed has not run.

**SQLite is in `DELETE` journal mode deliberately.** WAL's shared-memory index does not work across processes on a macOS Docker bind mount, and the app previously lost writes to an unlinked WAL because of it. Do not change `journal_mode`. To inspect the database while the app runs, use `sqlite3 'file:data/app.db?immutable=1'`, which takes no locks.

**Form actions return HTTP 200 on validation failure.** A 200 from a POST to `?/rate` does not mean the rating was recorded. Check the response body or the database.
