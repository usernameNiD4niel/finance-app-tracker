import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  syncId: text('sync_id').unique(),
  updatedAt: text('updated_at'),
  deletedAt: text('deleted_at'),
  syncStatus: text('sync_status', { enum: ['synced', 'pending', 'conflict'] }).notNull().default('pending'),
  userId: text('user_id'),
});

export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: real('amount').notNull(),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  sourceId: integer('source_id'),
  note: text('note'),
  date: text('date').notNull(),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  syncId: text('sync_id').unique(),
  updatedAt: text('updated_at'),
  deletedAt: text('deleted_at'),
  syncStatus: text('sync_status', { enum: ['synced', 'pending', 'conflict'] }).notNull().default('pending'),
  userId: text('user_id'),
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
  chargeTime: text('charge_time').notNull().default('20:00'),
  lastChargedDate: text('last_charged_date'),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  syncId: text('sync_id').unique(),
  updatedAt: text('updated_at'),
  deletedAt: text('deleted_at'),
  syncStatus: text('sync_status', { enum: ['synced', 'pending', 'conflict'] }).notNull().default('pending'),
  userId: text('user_id'),
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
  syncId: text('sync_id').unique(),
  updatedAt: text('updated_at'),
  deletedAt: text('deleted_at'),
  syncStatus: text('sync_status', { enum: ['synced', 'pending', 'conflict'] }).notNull().default('pending'),
  userId: text('user_id'),
});

export const recurringTransactions = sqliteTable('recurring_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceId: integer('source_id').notNull(),
  type: text('type', { enum: ['deposit', 'withdraw'] }).notNull(),
  amount: real('amount').notNull(),
  frequency: text('frequency', { enum: ['daily', 'weekly', 'start_of_month', 'end_of_month', 'specific_day'] }).notNull(),
  dayOfMonth: integer('day_of_month'),
  nextRunDate: text('next_run_date').notNull(),
  lastRunDate: text('last_run_date'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  note: text('note'),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  syncId: text('sync_id').unique(),
  updatedAt: text('updated_at'),
  deletedAt: text('deleted_at'),
  syncStatus: text('sync_status', { enum: ['synced', 'pending', 'conflict'] }).notNull().default('pending'),
  userId: text('user_id'),
});

export const targets = sqliteTable('targets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  month: text('month').notNull(), // YYYY-MM
  overallLimit: real('overall_limit'),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  syncId: text('sync_id').unique(),
  updatedAt: text('updated_at'),
  deletedAt: text('deleted_at'),
  syncStatus: text('sync_status', { enum: ['synced', 'pending', 'conflict'] }).notNull().default('pending'),
  userId: text('user_id'),
});

export const categoryTargets = sqliteTable('category_targets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  targetId: integer('target_id').notNull().references(() => targets.id),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  limitAmount: real('limit_amount').notNull(),
  syncId: text('sync_id').unique(),
  updatedAt: text('updated_at'),
  deletedAt: text('deleted_at'),
  syncStatus: text('sync_status', { enum: ['synced', 'pending', 'conflict'] }).notNull().default('pending'),
  userId: text('user_id'),
});

export const lends = sqliteTable('lends', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: real('amount').notNull(),
  sourceId: integer('source_id').notNull(),
  borrowerName: text('borrower_name').notNull(),
  note: text('note'),
  lendDate: text('lend_date').notNull(),
  expectedPayDate: text('expected_pay_date').notNull(),
  isPaid: integer('is_paid', { mode: 'boolean' }).notNull().default(false),
  paidDate: text('paid_date'),
  hasInterest: integer('has_interest', { mode: 'boolean' }).notNull().default(false),
  interestType: text('interest_type'), // 'fixed' or 'percentage'
  interestValue: real('interest_value'), // exact amount or percentage
  notificationId: text('notification_id'),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  syncId: text('sync_id').unique(),
  updatedAt: text('updated_at'),
  deletedAt: text('deleted_at'),
  syncStatus: text('sync_status', { enum: ['synced', 'pending', 'conflict'] }).notNull().default('pending'),
  userId: text('user_id'),
});

export const transfers = sqliteTable('transfers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fromSourceId: integer('from_source_id').notNull(),
  toSourceId: integer('to_source_id').notNull(),
  amount: real('amount').notNull(),
  fee: real('fee').notNull().default(0),
  note: text('note'),
  transferDate: text('transfer_date').notNull(),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  syncId: text('sync_id').unique(),
  updatedAt: text('updated_at'),
  deletedAt: text('deleted_at'),
  syncStatus: text('sync_status', { enum: ['synced', 'pending', 'conflict'] }).notNull().default('pending'),
  userId: text('user_id'),
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
export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
export type NewRecurringTransaction = typeof recurringTransactions.$inferInsert;
export type Target = typeof targets.$inferSelect;
export type NewTarget = typeof targets.$inferInsert;
export type CategoryTarget = typeof categoryTargets.$inferSelect;
export type NewCategoryTarget = typeof categoryTargets.$inferInsert;
export type MoneySource = typeof moneySources.$inferSelect;
export type NewMoneySource = typeof moneySources.$inferInsert;
export type Lend = typeof lends.$inferSelect;
export type NewLend = typeof lends.$inferInsert;
export type Transfer = typeof transfers.$inferSelect;
export type NewTransfer = typeof transfers.$inferInsert;

export const notificationLog = sqliteTable('notification_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id'),
  billId: integer('bill_id'),
  lendId: integer('lend_id'),
  title: text('title').notNull(),
  body: text('body').notNull(),
  scheduledFor: text('scheduled_for').notNull(),
  readAt: text('read_at'),
  createdAt: text('created_at').notNull(),
});
export type NotificationLog = typeof notificationLog.$inferSelect;
