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
