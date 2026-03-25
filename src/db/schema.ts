import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
});

export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: real('amount').notNull(),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  sourceId: integer('source_id'),
  note: text('note'),
  date: text('date').notNull(),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
});

export const bills = sqliteTable('bills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  sourceId: integer('source_id'),
  frequency: text('frequency', { enum: ['daily', 'weekly', 'monthly'] }).notNull().default('monthly'),
  dueDay: integer('due_day').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  notifyDaysBefore: integer('notify_days_before').notNull().default(1),
  notificationId: text('notification_id'),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
});

export const moneySources = sqliteTable('money_sources', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: ['bank', 'e_wallet', 'cash', 'custom'] }).notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  balance: real('balance').notNull().default(0),
  isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
});

export const salary = sqliteTable('salary', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: real('amount').notNull(),
  period: text('period', { enum: ['first', 'fifteenth'] }).notNull(),
  effectiveDate: text('effective_date').notNull(),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
});

export const targets = sqliteTable('targets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  month: text('month').notNull(), // YYYY-MM
  overallLimit: real('overall_limit'),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
});

export const categoryTargets = sqliteTable('category_targets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  targetId: integer('target_id').notNull().references(() => targets.id),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  limitAmount: real('limit_amount').notNull(),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;
export type Salary = typeof salary.$inferSelect;
export type NewSalary = typeof salary.$inferInsert;
export type Target = typeof targets.$inferSelect;
export type NewTarget = typeof targets.$inferInsert;
export type CategoryTarget = typeof categoryTargets.$inferSelect;
export type NewCategoryTarget = typeof categoryTargets.$inferInsert;
export type MoneySource = typeof moneySources.$inferSelect;
export type NewMoneySource = typeof moneySources.$inferInsert;
