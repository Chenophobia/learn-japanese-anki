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
