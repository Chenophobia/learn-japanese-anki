import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
  currentUnitId,
  nextDueTime,
  nextQueueItem,
  queueCounts,
  recordReview
} from '$lib/server/queue';
import { previewRatings } from '$lib/server/scheduler';
import { parseCardFaces } from '$lib/cards';
import { utcDayStart } from '$lib/server/utc-day';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
  const userId = locals.user!.id; // hooks.server.ts guarantees a user on this route
  const now = new Date();
  // Per-user content behind a session cookie: never store it. Placed here so
  // it runs on both the item and no-item return paths below. Without this
  // there is no explicit directive at all, which leaves staleness to
  // heuristics.
  setHeaders({ 'cache-control': 'no-store' });
  const item = nextQueueItem(db, userId, now);
  const counts = queueCounts(db, userId, now);

  if (!item) {
    // nextQueueItem returns null for three different reasons, and the page
    // must read correctly for all of them:
    //  1. every unit in the curriculum has been introduced (nothing left to
    //     teach, ever) — currentUnitId is null only in this case.
    //  2. the daily cap on new cards is reached for today, but cards already
    //     introduced (e.g. minutes ago, on their short FSRS learning steps)
    //     will come due again later today.
    //  3. genuinely nothing more until tomorrow.
    // This extra query only runs once the queue is already empty, so it
    // never touches the common "a card IS available" path.
    const curriculumFinished = currentUnitId(db, userId) === null;
    let laterToday: string | null = null;
    if (!curriculumFinished) {
      const next = nextDueTime(db, userId, now);
      if (next && next < utcDayStart(now, 1)) {
        laterToday = next.toISOString();
      }
    }
    return { item: null, counts, curriculumFinished, laterToday };
  }

  const { front, back } = parseCardFaces(item.frontJson, item.backJson);
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
    const userId = locals.user!.id;
    const form = await request.formData();
    const cardId = Number(form.get('cardId'));
    const rating = Number(form.get('rating'));

    if (!Number.isInteger(cardId) || ![1, 2, 3, 4].includes(rating)) {
      return fail(400, { error: 'Invalid review.' });
    }

    const now = new Date();

    // The posted cardId must match the card the server would serve right
    // now. Without this check, a stale form (a second tab, a slow submit
    // after the queue moved on) would silently rate the wrong card. Rather
    // than crash or trust the client, we recompute the expected card and
    // reject a mismatch — the client's use:enhance handler still refreshes
    // load data afterwards, so the user lands back on their real current
    // card instead of losing their place.
    const expected = nextQueueItem(db, userId, now);
    if (!expected || expected.cardId !== cardId) {
      return fail(409, { error: 'That card already moved on — showing your current card.' });
    }

    recordReview(db, userId, cardId, rating, now);
    return { ok: true };
  }
};
