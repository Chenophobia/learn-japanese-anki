import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { currentUnitId, nextQueueItem, queueCounts, recordReview } from '$lib/server/queue';
import { previewRatings } from '$lib/server/scheduler';
import { parseCardFaces } from '$lib/cards';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const userId = locals.user!.id; // hooks.server.ts guarantees a user on this route
  const now = new Date();
  const item = nextQueueItem(db, userId, now);
  const counts = queueCounts(db, userId, now);

  if (!item) {
    // nextQueueItem returns null for two different reasons: the daily cap on
    // new cards is reached for today (more content exists, come back
    // tomorrow) or every unit in the curriculum has been introduced (nothing
    // left to teach, ever). currentUnitId distinguishes them: it is null only
    // once every card has been introduced to this user.
    const curriculumFinished = currentUnitId(db, userId) === null;
    return { item: null, counts, curriculumFinished };
  }

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
