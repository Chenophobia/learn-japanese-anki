# Curriculum naming scheme & app icon

Date: 2026-08-02

## Problem

Unit titles accumulated in three separate authoring passes and never converged
on one scheme. The visible symptoms:

- The Hiragana and Katakana chapters teach parallel material under
  non-parallel names: `Base gojuon` vs `Base 46`, `Special characters` vs
  `Extended katakana`, `Anchor verbs` vs `Loanwords`.
- The kanji units carry positional numbering (`Kanji Set 1 — …`) that also
  repeats their own chapter's name.
- Vocabulary uses colons (`N4 verbs: motion, change & giving`) where grammar
  uses em dashes, and repeats `N4` inside the chapter `Toward N4`.
- Grammar mixes `Topic — gloss` with bare titles (`Passive voice`), and one
  title is raw Japanese (`Listing actions — 〜たり〜たりする`).
- `&` and `and` are used interchangeably.

Separately, the site still ships SvelteKit's default Svelte-logo favicon, so
bookmarks and iPad homescreen shortcuts have no identity.

## Naming rules

1. **Chapters** are Title Case noun phrases. **Units** are sentence case.
2. No positional numbering — no `Set 1`, no `Week 14`. Ordering is already
   carried by `order` columns and by the on-screen sequence.
3. A unit never repeats its chapter's or track's name.
4. Where a unit needs a plain-English gloss, the separator is ` — ` (spaced
   em dash). Never a colon.
5. `&`, never `and`.
6. Titles are English. No CJK characters.
7. Parallel chapters get parallel unit names.

Rule 2 is the one the user asked for directly; the rest fall out of making
the whole set self-consistent rather than fixing one symptom.

## Renames

23 of 50 units change. No chapter titles change — all eleven already satisfy
rule 1.

### Hiragana / Katakana

Brought into lockstep. The fourth and fifth units teach genuinely different
material in each chapter, so they get parallel *forms* rather than identical
names.

| Hiragana (before → after)                    | Katakana (before → after)                     |
| -------------------------------------------- | --------------------------------------------- |
| `Base gojuon` → **Base 46**                   | `Base 46` → *unchanged*                        |
| `Dakuten & handakuten` → *unchanged*          | `Dakuten & handakuten` → *unchanged*           |
| `Combination kana (youon)` → **Combination kana** | `Combination kana (youon)` → **Combination kana** |
| `Special characters` → **Special marks**      | `Extended katakana` → **Extended sounds**      |
| `Anchor verbs` → **First verbs**              | `Loanwords` → **First loanwords**              |

`gojuon` and `(youon)` are dropped: the first names a concept `46` already
states, and the second is glossed by the English word next to it. `dakuten`
stays — it has no English equivalent and is the term every other resource
uses.

### Basic Kanji

Rules 2 and 3 remove the prefix entirely.

| Before                                     | After                            |
| ------------------------------------------ | -------------------------------- |
| `Kanji Set 1 — Core & most useful`         | **Core & most useful**           |
| `Kanji Set 2 — Numbers, time & money`      | **Numbers, time & money**        |
| `Kanji Set 3 — Daily-life verbs & adjectives` | **Daily-life verbs & adjectives** |
| `Kanji Set 4 — Places, directions & nature`   | **Places, directions & nature**   |

### Toward N4

| Before                                   | After                                |
| ---------------------------------------- | ------------------------------------ |
| `N4 verbs: motion, change & giving`      | **Verbs — motion, change & giving**  |
| `N4 verbs: communication & thought`      | **Verbs — communication & thought**  |
| `N4 nouns: abstract & everyday concepts` | **Nouns — abstract & everyday**      |
| `Particles deep dive`                    | **Particles**                        |

`Reading vocabulary` is unchanged.

### Grammar

Every grammar unit becomes `Topic — gloss`.

| Before                                                  | After                                            |
| ------------------------------------------------------- | ------------------------------------------------ |
| `Listing actions — 〜たり〜たりする`                     | **Listing actions — doing this & that**          |
| `Trying and wanting to try`                             | **Trying — try doing & want to try**             |
| `Completion and regret — end up doing`                  | **Completion — end up doing**                    |
| `Reporting thoughts and hearsay — I think / was saying` | **Reported thoughts — I think / they said**      |
| `Hearsay and appearance — apparently, looks like`       | **Hearsay & appearance — apparently, looks like** |
| `Comparison — as much as, about, to the extent that`    | **Comparison — as much as, to the extent that**  |
| `Giving and receiving favors`                           | **Favors — giving & receiving**                  |
| `Passive voice`                                         | **Passive — it was done to me**                  |

`Reported thoughts` and `Hearsay & appearance` stay distinct on purpose: the
first teaches 〜と思う / 〜と言っていた (your own thoughts, quoting someone),
the second 〜らしい / 〜そうだ (secondhand information, and how things look).
The old names both said "hearsay" and blurred that line.

The remaining 27 units already conform and are untouched.

## Applying the rename without destroying progress

`npm run reseed` is the existing mechanism for changing curriculum shape, and
it necessarily destroys every user's FSRS scheduling state, streaks, and
review history — `cards.id` is an autoincrement key a reseed cannot preserve.
For a pure rename that cost is unacceptable: no card content changes, so no
card row needs to be replaced.

Instead, `syncCurriculumTitles(db)` runs on startup in `db/index.ts`,
immediately after `seedIfEmpty`:

- Matches chapters by `order` and units by `(chapterId, order)`, then
  `UPDATE`s **only** the `title` column.
- Verifies first that the database's chapter count, unit counts, and `order`
  values match the curriculum's exactly. On any mismatch it logs a warning
  and makes no writes, because order-matching would then rename the wrong
  rows. `reseed` remains the escape hatch for genuine shape changes.
- Is idempotent — a second boot writes nothing.

This makes the curriculum file the single source of truth for titles, and
makes deployment zero-touch: merge, CD deploys, titles are correct on the
next boot with all progress intact.

Note this covers renames only. Reordering or adding units still requires
`reseed`, and the shape check is what makes that failure loud rather than
silent.

## Icon

A white あ centred on a rounded square in the app's existing indigo accent
(`#2c5282`, "aizome"). It reads as *Japanese* at a glance and stays legible
at 16px, which the denser 学 and a card-stack outline do not.

Shipped as PNG only, no SVG favicon. The mark is a real Hiragino glyph
rendered at build time rather than hand-drawn bezier curves or an SVG
`<text>` element: `<text>` would render as tofu on any device without a
Japanese font, and a raster cannot. Nothing about the font travels into the
repo beyond the rendered pixels.

- `static/apple-touch-icon.png` — 180×180, opaque, square-cornered. iOS
  applies its own superellipse mask and renders any transparency it finds as
  black, so a pre-rounded icon is double-masked.
- `static/favicon-32.png`, `-192`, `-512` — rounded corners, genuinely
  transparent outside the curve.
- `static/site.webmanifest` — name, theme colour, and the 192/512 icons, so
  an installed shortcut has a proper label.
- `scripts/make-icons.sh` — regenerates all four from one inline SVG, so the
  mark is reproducible rather than a one-off artifact.
- `app.html` gains the corresponding `<link>` tags, plus
  `apple-mobile-web-app-title` and a `theme-color` driven by the existing
  theme cookie, so a standalone launch's status bar matches the page.

The `<link href>`s are root-absolute rather than `%sveltekit.assets%`. That
placeholder expands to a relative `.` (`kit.paths.relative` defaults to true),
so on `/study` it resolved to `/study/apple-touch-icon.png` — a 404. iOS reads
the touch icon from whichever page is open when you add to the homescreen, so
the relative form silently degraded the shortcut to a screenshot. The same
flaw affected the old `favicon.svg`. No `kit.paths.base` is configured, so the
app is always served from root.

The current `static/favicon.svg` (SvelteKit's Svelte logo) is deleted.

## Testing

- `seed/naming.test.ts` — new. Enforces the rules in §"Naming rules"
  mechanically across all 50 units and 11 chapters: no `Set \d`, no colons,
  no ` and `, no CJK, units in sentence case. This is what stops the scheme
  drifting again on the next authoring pass.
- `seed/content.test.ts` — its explicit hiragana/katakana title lists are
  updated to the new names.
- `db/schema.test.ts` — its `Base gojuon` fixture is updated.
- `seed/sync-titles.test.ts` — new. Covers: renames are applied; user
  progress rows survive a sync; a shape mismatch is a no-op; a second sync
  writes nothing.

## Out of scope

`docs/curriculum-plan.md` and the two files under `docs/superpowers/plans/`
keep their old titles. They are records of past work, not live content.
