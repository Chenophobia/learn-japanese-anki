# Curriculum restructure, cross-device continuity, and motion — design

Date: 2026-08-01
Status: approved (design), pending implementation plan

Three independent changes to the flashcard app:

1. Break the 23-unit "Kanji & Vocabulary" chapter into smaller chapters, grouped
   under track headings on the course map.
2. Close the two real gaps in cross-device continuity.
3. Add motion to the study loop and the course map.

They share no code. Each can land and be verified separately.

---

## 1. Curriculum restructure

### Problem

The curriculum has four chapters of wildly uneven size:

| Chapter | Units | Cards |
| --- | --- | --- |
| Hiragana | 5 | 119 |
| Katakana | 5 | 137 |
| Kanji & Vocabulary | 23 | 373 |
| Grammar & Reading | 17 | 38 |

"Kanji & Vocabulary" mixes two different kinds of study material and presents 23
units as one undifferentiated list. "Grammar & Reading" is 17 units of ~2 cards
each — short, but still a wall of rows.

### Target structure

Eleven chapters across four tracks. Unit titles, card content, `dailyCap`
values, and card order within each unit are all unchanged; only the grouping
of units into chapters changes.

| Track | Chapter | Units | Source units |
| --- | --- | --- | --- |
| Alphabet | Hiragana | 5 | unchanged |
| Alphabet | Katakana | 5 | unchanged |
| Kanji | Basic Kanji | 4 | Kanji Sets 1–4 |
| Vocabulary | Everyday Life | 5 | Daily verbs, Time expressions, Food & restaurants, Shopping & money, Transport & directions |
| Vocabulary | People, Places & Work | 6 | People & relationships, Health & body, Home & living spaces, Weather & seasons, Work & school, City life & entertainment |
| Vocabulary | Describing & Feeling | 3 | Adjectives, Feelings & emotions, Frequency & quantity adverbs |
| Vocabulary | Toward N4 | 5 | N4 verbs (motion/change/giving), N4 verbs (communication/thought), N4 nouns, Particles deep dive, Reading vocabulary |
| Grammar | Linking Actions | 4 | Sequence, Purpose, Simultaneous actions, Listing actions |
| Grammar | Intention & Attempt | 3 | Trying and wanting to try, Change of state, Completion and regret |
| Grammar | Thoughts, Guessing & Conditions | 6 | Reporting thoughts, Speculation, Hearsay and appearance, Comparison, Conditionals, Contrast |
| Grammar | Advanced Verb Forms | 4 | Giving and receiving favors, Causative, Passive voice, Ability (potential form) |

"Basic Kanji" is named deliberately: those four sets are a foundational subset,
not comprehensive kanji coverage.

Note that the Hiragana and Katakana chapters each contain one `vocab` unit
("Anchor verbs", "Loanwords"). A chapter's track is a grouping label; it does
not constrain the `kind` of the units inside it.

### Resequencing

Grouping by theme reorders units relative to today's curriculum. Two examples:
"Work & school" and "City life & entertainment" move ahead of "Adjectives";
"Listing actions" moves from last among grammar units to fourth.

This is acceptable because vocabulary buckets and N4 grammar points are
independent of each other — neither is a dependency chain where a later unit
requires an earlier one. Card order *within* a unit is untouched.

### Track headings

`chapters.kind` currently holds `'kana' | 'kanji_vocab' | 'grammar'` and is read
nowhere in the application — only the seed types and a schema comment reference
it. Widen it to `'kana' | 'kanji' | 'vocab' | 'grammar'` and let the course map
derive its track headings from it. No schema migration: the column is already
`text`, and the database will be rebuilt from the seed anyway.

The map renders a heading each time `chapter.kind` changes from the previous
chapter. Because the curriculum is authored in track order, that produces
exactly four headings without needing a separate grouping structure.

Heading labels: `kana` → "Alphabet", `kanji` → "Kanji", `vocab` → "Vocabulary",
`grammar` → "Grammar".

The existing `01`, `02` chapter numbers on the map continue numbering across the
whole curriculum rather than restarting per track, so a chapter's number stays a
stable reference regardless of how tracks are grouped.

### Deployment: wipe and reseed

`seedIfEmpty` only seeds when the `chapters` table is empty, so a restructured
curriculum requires clearing the old one first.

`user_cards` and `review_logs` reference `cards.id`, an autoincrement key that a
reseed does not preserve. Wiping therefore destroys all study progress. This is
acceptable **only because both tables are currently empty** — verified at design
time: 0 `user_cards`, 0 `review_logs`, 1 user, 667 cards.

Add `scripts/reseed.ts`, run as `npm run reseed`:

1. Refuse to run unless `RESEED_CONFIRM=yes` is set in the environment.
2. Report the row counts it is about to destroy.
3. In one transaction, delete `review_logs`, `user_cards`, `cards`, `units`,
   `chapters` — in that order, so foreign keys stay satisfied — then reseed
   from `curriculum`.
4. Leave `users` and `sessions` untouched, so the account survives.

The app must be stopped while this runs. The database uses `journal_mode =
DELETE` specifically so an operator script and the app cannot corrupt each
other, but a reseed mid-session would still leave a live page holding card ids
that no longer exist.

**Known limitation, accepted:** any *future* curriculum edit — adding a card,
renaming a unit, regrouping a chapter — will face this same wipe, and by then
there will be real progress to lose. The durable fix is to match seed rows on
natural keys (chapter/unit slugs, and card front content, which
`content.test.ts` already proves is unique across all 667 cards) so `cards.id`
survives an edit. That work is deliberately deferred, not forgotten.

### Files

- `src/lib/server/seed/types.ts` — widen `SeedChapter['kind']`.
- `src/lib/server/seed/index.ts` — replaces the single `kanjiVocabChapter` with
  the eleven-chapter curriculum. Chapter composition lives here; unit
  definitions stay in their existing per-topic files.
- `src/lib/server/seed/kanji.ts`, `vocab.ts`, `grammar.ts` — export their units
  grouped for the new chapters, or export flat arrays that `index.ts` slices by
  name. Prefer named exports per chapter over index arithmetic, so a
  renumbering cannot silently reassign a unit.
- `src/lib/server/seed/content.test.ts` — currently asserts the old
  four-chapter shape; rewrite against the new structure.
- `src/routes/+page.svelte` — track headings.
- `src/lib/server/db/schema.ts` — update the `kind` comment.
- `scripts/reseed.ts`, `package.json` — the reseed script.
- `README.md` — document `npm run reseed` and its destructiveness.

### Tests

- Every unit from the old curriculum appears exactly once in the new one, keyed
  by title. This is the guard against a regrouping that silently drops or
  duplicates a unit.
- Total card count is unchanged (667).
- Chapters are authored in track order, so each track's chapters are contiguous
  and the map's "heading on kind change" rule yields exactly four headings.
- Existing content invariants (unique card fronts, non-empty faces, per-unit
  card counts and caps) continue to hold.

---

## 2. Cross-device continuity

### What already works

There is no client-side queue. Every rating POSTs to the server and commits to
SQLite inside a transaction; `nextQueueItem` re-derives the next card from
database state on every page load. Rating three cards on one device and opening
another therefore already resumes at card four. No work is needed for the
common case.

### The two real gaps

**No cache directives.** `/`, `/study`, and `/stats` send no `cache-control`
header, so nothing explicitly forbids a stale render of per-user content.

**Restored tabs never revalidate.** Safari on iOS restores a backgrounded tab
from the back/forward cache, which reinstates the DOM without re-running
`load`. A tab left open on the iPad shows whatever card was current when it was
last foregrounded — the actual failure mode behind "open it on my iPad".

### Design

Server: call `setHeaders({ 'cache-control': 'no-store' })` in the `load` of
`/`, `/study`, and `/stats`. All three are per-user and cheap to recompute.

Client: in `+layout.svelte`, call `invalidateAll()` on

- `pageshow` when `event.persisted` is true (a bfcache restore), and
- `visibilitychange` when `document.visibilityState` becomes `visible`.

`invalidateAll()` re-runs every `load` and updates `data` in place, so a stale
card is replaced without a visible navigation.

Guard against redundant work: skip the call when the document has been visible
continuously, and do not fire while a rating is mid-flight — a revalidation
racing the POST's own `invalidateAll` would produce two overlapping loads.

### Tests

The bfcache path cannot be exercised without a real browser, and none is
available in this environment. Test what is testable and be explicit about what
is not:

- The revalidation decision is a pure function — given (was hidden, is
  submitting) return whether to revalidate — tested directly.
- `no-store` on each of the three routes, asserted through the load functions.

The Safari restore behaviour itself is verified by hand on the iPad.

---

## 3. Motion

Three effects, chosen by the user. A fourth (streak/milestone celebration) was
explicitly not chosen and is out of scope.

Every effect sits behind `prefers-reduced-motion: reduce`, which collapses
durations to zero while leaving the feature present — reduced motion must not
mean reduced function.

### Card flip

The answer currently appears instantly. Replace with a Y-axis rotation (~250ms)
showing front and back faces of one card.

The hazard is height: front and back render at different heights, so a naive
flip jumps the layout mid-rotation and shifts the rating bar under the user's
thumb. The container is sized to the taller of the two faces before the
rotation starts, so its height never changes during the flip.

Both faces are in the DOM once flipped. The back face must not be reachable by
screen readers or keyboard while it is turned away.

### Answer slide

Rating a card slides it out and the next one in, via `{#key data.item.cardId}`
with in/out transitions.

Strictly decorative. The rating POST fires on submit and is never gated on the
animation completing. The existing double-submit guard and the 409
stale-card path must behave exactly as they do today; a transition in flight
must not swallow or delay a rating.

### Map path

On the course map, the connector line draws downward through completed units on
load, and the current unit's dot pulses slowly.

The line is already a pair of absolutely positioned 1px spans per unit
(`+page.svelte`). Animating `scaleY` from a top origin gives the draw without
touching layout.

### Button and progress feedback

- Rating buttons depress on press.
- Due/new counters roll to their new value rather than snapping.
- Progress bars ease to their new width.

The counter roll animates between two server-rendered numbers; it must always
settle on the value the server sent, never on an interpolated one.

### Tests

Animation is verified by eye. What gets automated is the logic underneath:

- The reduced-motion preference resolves to zero duration.
- Reveal state still resets when the card id changes (existing behaviour, now
  with a flip in between).
- Rating remains possible while a transition is running.

---

## Out of scope

- Streak and milestone celebrations.
- Natural-key curriculum sync (see §1, "Known limitation").
- Any change to FSRS scheduling, the daily cap, or unit ordering *within* a
  chapter.
- The deferred study-page rating validation test, previously postponed by the
  user.
