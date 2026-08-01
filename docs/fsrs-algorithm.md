# FSRS implementation notes

Grounded directly in the canonical reference implementation ([`open-spaced-repetition/ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs), FSRS-6) — not paraphrased docs. This is the exact algorithm Anki itself ships. Formulas below are copied from the library's source (`algorithm.ts`, `default.ts`, `constant.ts`, `help.ts`, `strategies/learning_steps.ts`), so they're implementation-accurate, not textbook-approximate.

## 1. Mental model

Every card carries two numbers: **Stability (S)** — days for recall probability to decay from 100% to 90% — and **Difficulty (D)** — bounded [1,10], how hard it is to *grow* stability on a good review. Recall probability at any moment (**Retrievability, R**) is derived from S and elapsed time. There is no per-card "ease factor" — S and D are updated by formula on every review, and the four rating buttons (Again/Hard/Good/Easy) feed into those formulas differently. A single tunable knob, **desired retention** (default 90%), converts a card's stability into a concrete next-review interval.

## 2. Data shape

```ts
enum State { New = 0, Learning = 1, Review = 2, Relearning = 3 }
enum Rating { Manual = 0, Again = 1, Hard = 2, Good = 3, Easy = 4 }

interface Card {
  due: Date
  stability: number
  difficulty: number
  scheduled_days: number   // interval just assigned
  learning_steps: number   // index into learning_steps/relearning_steps
  reps: number
  lapses: number
  state: State
  last_review?: Date
}

interface ReviewLog {
  rating: Rating
  state: State            // state the card was in AT the moment of this review
  due: Date
  stability: number
  difficulty: number
  scheduled_days: number
  learning_steps: number
  review: Date             // when this review happened
}
```

Keep the full `ReviewLog` history per card — you need it later if you ever want to personalize parameters (§9), and it's the only audit trail for "why is this card scheduled here."

## 3. The four ratings

Same semantics as Anki: **Again** = didn't recall it; **Hard/Good/Easy** = recalled it, differentiated only by effort. There's no "correct but hard" vs "correct but easy" scoring beyond that — the formulas below are what actually differentiate them.

## 4. Core formulas

**Retrievability / forgetting curve** — probability of recall after `t` elapsed days at stability `S`:

```
decay  = -w20
factor = e^(ln(0.9) / decay)  - 1        // chosen so R(S,S) = 0.9 exactly
R(t,S) = (1 + factor * t / S) ^ decay
```

**Initial stability** (first-ever review of a card, indexed straight by rating):

```
S0(Again) = max(w0, 0.1)
S0(Hard)  = max(w1, 0.1)
S0(Good)  = max(w2, 0.1)
S0(Easy)  = max(w3, 0.1)
```

**Initial difficulty** (first-ever review), `G` = rating as 1..4 (Again..Easy):

```
D0(G) = w4 - e^((G-1) * w5) + 1
D0    = clamp(D0(G), 1, 10)
```

**Stability update after a successful review (Hard/Good/Easy), not same-day:**

```
hard_penalty = w15 if rating == Hard else 1
easy_bonus   = w16 if rating == Easy else 1

S' = S * ( 1 + e^w8 * (11 - D) * S^(-w9) * (e^(w10*(1-R)) - 1) * hard_penalty * easy_bonus )
S' = clamp(S', 0.001, 36500)
```

Note the `(1-R)` term: the lower the retrievability was at review time (i.e. the closer the card was to being forgotten), the bigger the stability gain. Reviewing something right before you'd have forgotten it is worth more than reviewing something you never came close to forgetting.

**Stability update after a lapse (Again), not same-day:**

```
S'_fail = w11 * D^(-w12) * ((S+1)^w13 - 1) * e^(w14*(1-R))
S'_fail = clamp(S'_fail, 0.001, 36500)

// floor derived from short-term memory effects (only nonzero if short-term steps enabled)
S'_min  = S / e^(w17 * w18)
S'      = clamp(S'_min, 0.001, S'_fail)
```

**Stability update for a same-day repeat** (any review that happens on the same calendar day as the previous one — this is what actually governs the entire Learning/Relearning step phase, not just cram sessions):

```
sinc = S^(-w19) * e^(w17 * (G - 3 + w18))
if rating >= Hard: sinc = max(sinc, 1.0)     // Hard/Good/Easy same-day never shrinks stability
S' = clamp(S * sinc, 0.001, 36500)
```

**Difficulty update** (every review, all ratings):

```
delta_d        = -w6 * (G - 3)
linear_damping = delta_d * (10 - D) / 9
next_D         = D + linear_damping

D' = w7 * D0(Easy) + (1 - w7) * next_D      // mean reversion toward "if this had been rated Easy first try"
D' = clamp(D', 1, 10)
```

The mean-reversion term is the direct structural fix for Anki's classic "ease hell": difficulty is pulled back toward a baseline every review instead of being able to ratchet in one direction forever.

**Interval from desired retention:**

```
interval_modifier(desired_retention) = (desired_retention ^ (1/decay) - 1) / factor
next_interval(S) = clamp(round(S * interval_modifier), 1, maximum_interval)
```

At the default 90% desired retention, this reduces to `next_interval ≈ S` (the interval equals stability), which is the cleanest possible mental model if you want to sanity-check your implementation.

**Fuzz** (only applied if enabled, and only if the computed interval ≥ 2.5 days):

```
FUZZ_RANGES = [ {2.5–7d: ±15%}, {7–20d: ±10%}, {20d+: ±5%} ]   // widening band, applied cumulatively
min_ivl = max(2, round(interval - delta))
max_ivl = min(round(interval + delta), maximum_interval)
result  = random_int_in[min_ivl, max_ivl]
```

where `delta` accumulates contributions from each fuzz-range band the interval passes through. Practical effect: short intervals get proportionally more randomization, long intervals get less. If `interval` would otherwise not exceed `elapsed_days`, the floor is raised so the card can't come due in the past.

## 5. Default parameters

```
w = [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001,
     1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014,
     1.8729, 0.5425, 0.0912, 0.0658, 0.1542]

request_retention  = 0.9        // desired retention
maximum_interval    = 36500      // cap, days
enable_fuzz         = false      // ts-fsrs default; Anki itself defaults this on
enable_short_term   = true       // same-day/short-term stability formula active
learning_steps      = ['1m', '10m']
relearning_steps    = ['10m']
```

These are trained on ~700M real Anki reviews and are a completely reasonable starting point — you do **not** need per-user training data before launching (see §9).

## 6. Scheduling flow (state machine)

- **New card, any rating** → `S = S0(rating)`, `D = D0(rating)` (init formulas above, ignoring elapsed time entirely).
- **Learning/Relearning card, any rating** → stability update via the *same-day* formula (§4) since you're always still within the same calendar day during steps; state stays Learning/Relearning until steps are exhausted, then graduates to Review with an FSRS-computed interval.
  - Step timing (from the reference `BasicLearningStepsStrategy`): **Again** always jumps to the first step's delay. **Hard** = midpoint between step 1 and step 2 delays (or 1.5× step 1 if there's only one step) — it does *not* have its own trained delay, it's interpolated. **Good** advances to the next step's delay, or graduates immediately if there is no next step. **Easy always graduates immediately**, regardless of which step you're on, using the FSRS-computed interval rather than a fixed "easy interval" constant.
- **Review card (already graduated), rating = Again** → lapse: `lapses += 1`, stability via the forgetting formula, state → Relearning, re-enters relearning steps.
- **Review card, rating = Hard/Good/Easy** → stability via the successful-recall formula using the card's retrievability *at the moment of review* (computed from elapsed days since last review), interval computed from desired retention, state stays Review.
- **Ordering guarantee worth keeping in your UI**: the reference implementation explicitly clamps so that `hard_interval ≤ good_interval` and `good_interval < easy_interval` (each button's preview interval is forced to be monotonically ≥ the one to its left, adding a minimum +1 day where needed) — so your four preview labels never show something confusing like Hard giving a longer gap than Good.

## 7. What FSRS does *not* give you — build these yourself

FSRS only answers "given this card's history, what's the next interval." It has no opinion on:

- **New cards/day pacing** — a simple per-deck daily counter is enough for a simplified app; you don't need Anki's full gather-order/subdeck-limit hierarchy unless you want it.
- **Session assembly** — pull (a) due Learning/Relearning cards, (b) due Review cards, (c) new cards up to the daily cap, in that priority order, and interleave for the session.
- **Burying/suspending** — optional; a single `suspended: boolean` and `buried_until: Date | null` column covers the simplified case.
- **Leeches** — a lapse counter threshold you check yourself (Anki's default is 8 lapses → tag or suspend); trivial to implement as `if (card.lapses >= 8) flagAsLeech(card)`.

## 8. Recommended implementation approach

**Don't hand-roll the math above in production — depend on the reference library.** The formulas are precise enough to get subtly wrong (the same-day vs. forget-stability branching in particular), and `ts-fsrs` is MIT-licensed, actively maintained by the same org that runs Anki's FSRS research, works isomorphically in Node and the browser, and has zero dependencies.

```ts
import { fsrs, generatorParameters, Rating, createEmptyCard } from 'ts-fsrs'

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }))

// new card
let card = createEmptyCard(new Date())

// on review: get all four possible outcomes with their resulting card state + interval
const outcomes = scheduler.repeat(card, new Date())
// outcomes[Rating.Again].card.due, outcomes[Rating.Good].card.scheduled_days, etc.
// — this is exactly what you render on the four buttons before the user presses one

// after the user picks a rating:
const { card: nextCard, log } = outcomes[Rating.Good]
// persist nextCard as the card's new row, append log to review_logs
```

Equivalent packages exist for Python (`py-fsrs`) and Rust (`rs-fsrs`) if your scheduling logic ever needs to live server-side in one of those instead.

## 9. Personalizing parameters (later, optional)

The default `w` array works fine from day one. Once a user has a few hundred reviews logged, you *can* run the official optimizer (`fsrs-rs` or the Python `fsrs-optimizer`) against their `ReviewLog` history to fit a personalized `w` — this is what actually makes FSRS adapt to an individual's memory, but it's a batch job you can bolt on well after the core review loop works, not a launch requirement.
