# Design: multi-user Japanese flashcard web app

Status: approved (brainstorming session, 2026-07-31)

> **Superseded (2026-08-01):** the open self-signup described below was
> removed after launch. The app went live on a public domain
> (`<app-hostname>`) and open registration invited bot accounts; the
> operator now creates accounts directly (see README.md's "Creating users").
> The rest of this document is left as-is as a historical record of the
> original design.

## Goal

A self-hosted, Docker-deployable spaced-repetition flashcard app for the N4 curriculum documented in `docs/curriculum-plan.md`, using the FSRS-6 scheduling algorithm documented in `docs/fsrs-algorithm.md`. Multiple independent users can log in, each tracking their own progress through the same shared course content. Deployed at `<app-hostname>` behind the user's existing host nginx, following the same conventions as the sibling project `sibling-app` (single Docker container, bind-mounted SQLite, host nginx terminates TLS).

Explicitly in scope: login/signup with a "remember this device" option, a chapter/progression map page, a flashcard review page, and a KPI/metrics page, with a light/dark theme toggle throughout.

Explicitly out of scope for v1: audio/TTS, kanji stroke-order animations, per-user configurable pacing (daily new-card caps are fixed per the roadmap), e2e test suite, multi-device "conflict" handling (not needed — state lives centrally in one SQLite file, so every device reads/writes the same source of truth).

## Stack

- **SvelteKit** + TypeScript, `adapter-node` (server-rendered, minimal client JS)
- **Tailwind CSS** for styling
- **SQLite** via **Drizzle ORM**, single file, bind-mounted from the host (same durability pattern as sibling-app)
- **`ts-fsrs`** (npm package) for all scheduling math — used server-side only, per the recommendation in `docs/fsrs-algorithm.md` §8
- **Hand-rolled auth**: no auth library. Password hashing via `bcrypt` (or `@node-rs/argon2`), sessions via a DB-backed `sessions` table + a signed `httpOnly` cookie holding the session id. SvelteKit's most common auth library (Lucia) is sunset and its own docs now recommend rolling your own, so a small auth module avoids an abandoned dependency.
- **Docker**: multi-stage build (deps → build → run), `docker-compose.yml` publishing to a `127.0.0.1:<port>` (suggest **3001**, since sibling-app already occupies 3000 on this host), bind-mounting `./data` for the SQLite file. Host nginx (outside Docker, already running on this machine) reverse-proxies `<app-hostname>` to that port, mirroring the nginx block already documented in sibling-app's README.

## Data model

Two categories of tables: **static content** (seeded once from `docs/curriculum-plan.md`, shared read-only by all users) and **per-user state**.

### Static content

```sql
chapters (
  id       INTEGER PRIMARY KEY,
  "order"  INTEGER NOT NULL,          -- 1..4, display/unlock order
  title    TEXT NOT NULL,             -- "Hiragana", "Katakana", "Kanji & Vocabulary", "Grammar & Reading"
  kind     TEXT NOT NULL              -- 'kana' | 'kanji_vocab' | 'grammar'
)

units (
  id          INTEGER PRIMARY KEY,
  chapter_id  INTEGER NOT NULL REFERENCES chapters(id),
  "order"     INTEGER NOT NULL,       -- order within chapter AND globally sortable via (chapter.order, unit.order)
  title       TEXT NOT NULL,          -- e.g. "Week 15 — Food & restaurants"
  kind        TEXT NOT NULL,          -- 'kana' | 'kanji' | 'vocab' | 'grammar'  (drives card rendering + daily cap)
  daily_cap   INTEGER NOT NULL        -- fixed new-cards/day for this unit, from docs/curriculum-plan.md pacing table
)

cards (
  id         INTEGER PRIMARY KEY,
  unit_id    INTEGER NOT NULL REFERENCES units(id),
  "order"    INTEGER NOT NULL,        -- introduction order within the unit
  front_json TEXT NOT NULL,           -- JSON, shape depends on units.kind (see below)
  back_json  TEXT NOT NULL
)
```

`front_json`/`back_json` shapes by `unit.kind`:
| kind | front | back |
|---|---|---|
| `kana` | `{char}` | `{romaji, mnemonic}` |
| `kanji` | `{char}` | `{meaning, reading, example_word}` |
| `vocab` | `{word}` | `{reading, meaning, example_sentence}` |
| `grammar` | `{pattern}` | `{meaning, example}` |

One `cards` table for all kinds (not four separate tables) — keeps queries and the daily-queue logic uniform; the UI switches rendering based on `unit.kind`.

**Resolving the kana pacing mismatch**: the source material describes hiragana/katakana pacing as "manually identify which characters you don't know instantly, only add those" — a self-diagnostic step, not a fixed daily count. That doesn't fit a fixed-cap sequential auto-queue (and building an interactive "do you know this instantly?" diagnostic quiz is out of scope for v1). Resolution: **Chapters 1–2 introduce every kana card** (no manual gap-selection step) via the same fixed `daily_cap` mechanism as every other chapter — a user who already knows a character will simply rate it "Easy" on first sight, and FSRS's own stability math pushes it to a long interval immediately, which achieves the same practical outcome ("don't waste time re-drilling what you already know") without needing separate diagnostic UI. Suggested `daily_cap` for kana units: ~15/day (roughly one row of characters), close to the source's "~10 characters/week" pace once dakuten/combination variants are folded in.

### Auth

```sql
users (
  id             INTEGER PRIMARY KEY,
  username       TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  created_at     TEXT NOT NULL         -- ISO timestamp
)

sessions (
  id          TEXT PRIMARY KEY,        -- random token, also the cookie value
  user_id     INTEGER NOT NULL REFERENCES users(id),
  expires_at  TEXT NOT NULL,           -- ISO timestamp
  remember    INTEGER NOT NULL,        -- 0/1 — whether "remember this device" was checked
  created_at  TEXT NOT NULL
)
```

Session cookie: `httpOnly`, `secure`, `sameSite=lax`. `remember=0` → `expires_at` ≈ now + 1 day. `remember=1` → `expires_at` ≈ now + 1 year. Expired sessions are deleted lazily on lookup failure.

### Per-user progress

```sql
user_cards (
  user_id     INTEGER NOT NULL REFERENCES users(id),
  card_id     INTEGER NOT NULL REFERENCES cards(id),
  state       INTEGER NOT NULL,        -- FSRS State enum (New/Learning/Review/Relearning)
  stability   REAL NOT NULL,
  difficulty  REAL NOT NULL,
  due         TEXT NOT NULL,           -- ISO timestamp
  scheduled_days INTEGER NOT NULL,
  learning_steps INTEGER NOT NULL,
  reps        INTEGER NOT NULL,
  lapses      INTEGER NOT NULL,
  last_review TEXT,                    -- ISO timestamp, nullable until first review
  PRIMARY KEY (user_id, card_id)
)

review_logs (
  id            INTEGER PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  card_id       INTEGER NOT NULL REFERENCES cards(id),
  rating        INTEGER NOT NULL,      -- FSRS Rating enum
  reviewed_at   TEXT NOT NULL,
  state         INTEGER NOT NULL,      -- state AT the moment of this review
  stability     REAL NOT NULL,
  difficulty    REAL NOT NULL,
  scheduled_days INTEGER NOT NULL
)
```

A card with no `user_cards` row for a given user means it hasn't been introduced to them yet — that absence is the "locked/not-yet-seen" state; no separate boolean flag is needed. `review_logs` is append-only and is the sole source for the stats page and streaks — no separate stats/aggregate tables.

## FSRS scheduling integration

All scheduling logic lives server-side, wrapping `ts-fsrs` exactly as specified in `docs/fsrs-algorithm.md`:

- `createEmptyCard()` when a `user_cards` row doesn't exist yet and a card is being introduced for the first time.
- `scheduler.repeat(card, now)` returns all four rating outcomes; the study page requests this to render the four button previews (predicted interval per rating), then persists only the chosen outcome's `card` back to `user_cards` plus a new `review_logs` row.
- Default parameters (the `w` array, `request_retention = 0.9`, etc.) as documented in `docs/fsrs-algorithm.md` §5 — no per-user personalization in v1.

## Daily queue algorithm

This is what ties the sequential curriculum to FSRS:

1. **Current unit** for a user = the first unit, in global order `(chapter.order, unit.order)`, that has at least one card with no `user_cards` row for that user. Units before it are fully introduced (individual cards may still be due for review); units after it are locked (no UI access, no cards pulled from them).
2. **Today's new cards** = up to `current_unit.daily_cap` cards from the current unit only, in `cards.order`, that don't yet have a `user_cards` row for this user.
3. **Today's reviews** = every `user_cards` row for this user, across *any* already-introduced unit (any chapter), where `due <= now`. Unbounded — reviews are never capped, matching the source material's "reviews always take priority, never skip" rule.
4. **Session queue** = reviews first, then new cards (reviews-before-new, per the source's explicit rule #1). Once both are empty for the day, the study page shows a "done for now" state.
5. **Unit completion** = all cards in a unit have a `user_cards` row (i.e. all "introduced"), regardless of what state they're currently in. This is intentionally simpler than gating on "graduated to Review state" — it matches the roadmap's own "N new cards/day" language directly, and reviews for a freshly-introduced card continue to surface normally afterward regardless of which unit is current.

## Pages

- **`/login`** — username + password + "remember me on this device" checkbox.
- **`/signup`** — username + password, open self-signup (no invite/approval step), logs the new user in immediately. **Superseded:** removed post-launch; see the note at the top of this document.
- **`/` (chapter map, default landing page after login)** — lists the 4 chapters, each expandable to its units. Each unit shows `introduced / total` card count and a lighter sub-count of cards that have reached Review state (matured). Current unit is visually highlighted; locked units are dimmed and not clickable through to card content.
- **`/study`** — the flashcard screen: show front → reveal → four rating buttons with previewed resulting interval on each (from `scheduler.repeat()`'s four outcomes) → next card. Pulls from the daily queue (§ above). Ends in a "done for now" state when the queue empties.
- **`/stats`** — KPI/metrics page, computed from `review_logs` + `user_cards`:
  - total cards learned overall + broken down per chapter/unit
  - current daily streak (consecutive days with ≥1 review in `review_logs`)
  - retention rate (% of Review-state reviews rated non-Again)
  - mature vs. young card counts (mature = `state = Review AND stability >= 21` days, matching Anki's convention)
  - a calendar heatmap of review activity (GitHub-contributions style)
  - cards due today / tomorrow
- **Global**: persistent light/dark toggle (cookie-backed so SSR renders the right theme with no flash) and simple nav between the three pages, visible once authenticated.

## Deployment

```
Dockerfile         # multi-stage: deps → build (SvelteKit adapter-node) → run (node build/index.js)
docker-compose.yml
  services.app:
    build: .
    container_name: learn-japanese
    ports: ["127.0.0.1:3001:3001"]
    volumes: ["./data:/app/data"]     # SQLite file
    env_file: .env
    restart: unless-stopped
```

`.env` holds the session-cookie signing secret and the SQLite file path. Host nginx config for `<app-hostname>` mirrors the sample already documented in sibling-app's README: `proxy_pass http://127.0.0.1:3001;` plus `X-Forwarded-Proto` header.

**Seed data**: the full curriculum content from `docs/curriculum-plan.md` is transcribed once into a TypeScript/JSON seed file (not parsed from markdown at runtime) and loaded into `chapters`/`units`/`cards` via a Drizzle migration that runs on first boot if those tables are empty.

## Testing

- Vitest unit tests for: daily-queue logic (current-unit detection, new-card capping, due-review filtering), the FSRS integration wrapper, and auth (password hashing, session expiry/remember-me duration logic).
- No e2e suite planned for v1 — manual verification of the three pages + auth flow before shipping, consistent with keeping v1 scope tight.

## Open items carried into implementation planning

None — all forks were resolved during brainstorming (nginx setup, stack choice, signup model, pacing model, unlock model all confirmed above).
