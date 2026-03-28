import { db, sqlite } from './client';
import { eq, desc, gte, lte, and, sql, isNull } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import {
  categories, expenses, bills, recurringTransactions, transfers, targets, categoryTargets, settings, moneySources, lends,
  type NewCategory, type NewExpense, type NewBill,
  type NewRecurringTransaction, type RecurringTransaction,
  type NewTarget, type NewCategoryTarget, type NewMoneySource, type NewLend,
} from './schema';

// ─── Settings ──────────────────────────────────────────────────────────────
export async function getSetting(key: string): Promise<string | null> {
  const row = await db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({
    target: settings.key,
    set: { value },
  });
}

// ─── Categories ────────────────────────────────────────────────────────────
export async function getCategories() {
  return db.select().from(categories).where(isNull(categories.deletedAt)).orderBy(categories.name).all();
}

export async function createCategory(data: NewCategory) {
  const now = new Date().toISOString();
  return db.insert(categories).values({
    ...data,
    syncId: randomUUID(),
    updatedAt: now,
    syncStatus: 'pending',
  }).returning().get();
}

export async function updateCategory(id: number, data: Partial<NewCategory>) {
  const now = new Date().toISOString();
  return db.update(categories).set({
    ...data,
    updatedAt: now,
    syncStatus: 'pending',
  }).where(eq(categories.id, id)).returning().get();
}

export async function deleteCategory(id: number) {
  const now = new Date().toISOString();
  await db.update(categories).set({ deletedAt: now, updatedAt: now, syncStatus: 'pending' }).where(eq(categories.id, id));
}

// ─── Expenses ──────────────────────────────────────────────────────────────
export async function getExpenses(filters?: { startDate?: string; endDate?: string; categoryId?: number }) {
  const conditions = [isNull(expenses.deletedAt)];
  if (filters?.startDate) conditions.push(gte(expenses.date, filters.startDate));
  if (filters?.endDate) conditions.push(lte(expenses.date, filters.endDate));
  if (filters?.categoryId) conditions.push(eq(expenses.categoryId, filters.categoryId));

  return db
    .select({
      id: expenses.id,
      amount: expenses.amount,
      categoryId: expenses.categoryId,
      sourceId: expenses.sourceId,
      note: expenses.note,
      date: expenses.date,
      createdAt: expenses.createdAt,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      sourceName: moneySources.name,
      sourceIcon: moneySources.icon,
      sourceColor: moneySources.color,
    })
    .from(expenses)
    .leftJoin(categories, eq(expenses.categoryId, categories.id))
    .leftJoin(moneySources, eq(expenses.sourceId, moneySources.id))
    .where(and(...conditions))
    .orderBy(desc(expenses.date), desc(expenses.createdAt))
    .all();
}

export async function createExpense(data: NewExpense) {
  const now = new Date().toISOString();
  return db.insert(expenses).values({
    ...data,
    syncId: randomUUID(),
    updatedAt: now,
    syncStatus: 'pending',
  }).returning().get();
}

export async function updateExpense(id: number, data: Partial<NewExpense>) {
  const now = new Date().toISOString();
  return db.update(expenses).set({
    ...data,
    updatedAt: now,
    syncStatus: 'pending',
  }).where(eq(expenses.id, id)).returning().get();
}

export async function deleteExpense(id: number) {
  const now = new Date().toISOString();
  await db.update(expenses).set({ deletedAt: now, updatedAt: now, syncStatus: 'pending' }).where(eq(expenses.id, id));
}

export async function getExpenseTotalByCategory(startDate: string, endDate: string) {
  return db
    .select({
      categoryId: expenses.categoryId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      total: sql<number>`SUM(${expenses.amount})`,
    })
    .from(expenses)
    .leftJoin(categories, eq(expenses.categoryId, categories.id))
    .where(and(isNull(expenses.deletedAt), gte(expenses.date, startDate), lte(expenses.date, endDate)))
    .groupBy(expenses.categoryId)
    .all();
}

export async function getExpenseTotal(
  startDate: string, endDate: string
): Promise<{ total: number; count: number }> {
  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
      count: sql<number>`COUNT(${expenses.id})`,
    })
    .from(expenses)
    .where(and(isNull(expenses.deletedAt), gte(expenses.date, startDate), lte(expenses.date, endDate)))
    .get();
  return { total: result?.total ?? 0, count: result?.count ?? 0 };
}

export async function getDailyExpenseTotals(startDate: string, endDate: string) {
  return db
    .select({
      date: expenses.date,
      total: sql<number>`SUM(${expenses.amount})`,
    })
    .from(expenses)
    .where(and(isNull(expenses.deletedAt), gte(expenses.date, startDate), lte(expenses.date, endDate)))
    .groupBy(expenses.date)
    .orderBy(expenses.date)
    .all();
}

// ─── Bills ──────────────────────────────────────────────────────────────────
export async function getBills() {
  return db
    .select({
      id: bills.id,
      name: bills.name,
      amount: bills.amount,
      categoryId: bills.categoryId,
      sourceId: bills.sourceId,
      frequency: bills.frequency,
      dueDay: bills.dueDay,
      isActive: bills.isActive,
      notifyDaysBefore: bills.notifyDaysBefore,
      notificationId: bills.notificationId,
      createdAt: bills.createdAt,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      sourceName: moneySources.name,
      sourceIcon: moneySources.icon,
      sourceColor: moneySources.color,
    })
    .from(bills)
    .leftJoin(categories, eq(bills.categoryId, categories.id))
    .leftJoin(moneySources, eq(bills.sourceId, moneySources.id))
    .where(isNull(bills.deletedAt))
    .orderBy(bills.dueDay)
    .all();
}

export async function createBill(data: NewBill) {
  const now = new Date().toISOString();
  return db.insert(bills).values({
    ...data,
    syncId: randomUUID(),
    updatedAt: now,
    syncStatus: 'pending',
  }).returning().get();
}

export async function updateBill(id: number, data: Partial<NewBill>) {
  const now = new Date().toISOString();
  return db.update(bills).set({
    ...data,
    updatedAt: now,
    syncStatus: 'pending',
  }).where(eq(bills.id, id)).returning().get();
}

export async function deleteBill(id: number) {
  const now = new Date().toISOString();
  await db.update(bills).set({ deletedAt: now, updatedAt: now, syncStatus: 'pending' }).where(eq(bills.id, id));
}

// ─── Transfers ───────────────────────────────────────────────────────────────
export async function executeTransfer(
  fromSourceId: number,
  toSourceId: number,
  amount: number,
  fee: number,
  note: string | null,
  transferDate: string,
) {
  await adjustSourceBalance(fromSourceId, -(amount + fee));
  await adjustSourceBalance(toSourceId, amount);
  const now = new Date().toISOString();
  return db.insert(transfers).values({
    fromSourceId,
    toSourceId,
    amount,
    fee,
    note,
    transferDate,
    createdAt: now,
    syncId: randomUUID(),
    updatedAt: now,
    syncStatus: 'pending',
  }).returning().get();
}

export async function getTransfers(sourceId?: number) {
  const rows = await db
    .select({
      id: transfers.id,
      fromSourceId: transfers.fromSourceId,
      toSourceId: transfers.toSourceId,
      amount: transfers.amount,
      fee: transfers.fee,
      note: transfers.note,
      transferDate: transfers.transferDate,
      createdAt: transfers.createdAt,
      fromSourceName: sql<string>`fs.name`,
      fromSourceIcon: sql<string>`fs.icon`,
      fromSourceColor: sql<string>`fs.color`,
      toSourceName: sql<string>`ts.name`,
      toSourceIcon: sql<string>`ts.icon`,
      toSourceColor: sql<string>`ts.color`,
    })
    .from(transfers)
    .leftJoin(sql`money_sources fs`, sql`${transfers.fromSourceId} = fs.id`)
    .leftJoin(sql`money_sources ts`, sql`${transfers.toSourceId} = ts.id`)
    .where(isNull(transfers.deletedAt))
    .orderBy(desc(transfers.transferDate), desc(transfers.createdAt))
    .all();
  return rows;
}

// ─── Recurring Transactions ──────────────────────────────────────────────────
export async function getRecurringTransactions(sourceId?: number): Promise<RecurringTransaction[]> {
  if (sourceId !== undefined) {
    return db
      .select()
      .from(recurringTransactions)
      .where(and(eq(recurringTransactions.sourceId, sourceId), eq(recurringTransactions.isActive, true), isNull(recurringTransactions.deletedAt)))
      .orderBy(recurringTransactions.createdAt)
      .all();
  }
  return db
    .select()
    .from(recurringTransactions)
    .where(and(eq(recurringTransactions.isActive, true), isNull(recurringTransactions.deletedAt)))
    .orderBy(recurringTransactions.nextRunDate)
    .all();
}

export async function getDueRecurringTransactions(today: string): Promise<RecurringTransaction[]> {
  return db
    .select()
    .from(recurringTransactions)
    .where(and(eq(recurringTransactions.isActive, true), isNull(recurringTransactions.deletedAt), lte(recurringTransactions.nextRunDate, today)))
    .all();
}

export async function createRecurringTransaction(data: NewRecurringTransaction) {
  const now = new Date().toISOString();
  return db.insert(recurringTransactions).values({
    ...data,
    syncId: randomUUID(),
    updatedAt: now,
    syncStatus: 'pending',
  }).returning().get();
}

export async function updateRecurringTransaction(id: number, data: Partial<NewRecurringTransaction>) {
  const now = new Date().toISOString();
  return db.update(recurringTransactions).set({
    ...data,
    updatedAt: now,
    syncStatus: 'pending',
  }).where(eq(recurringTransactions.id, id)).returning().get();
}

export async function deleteRecurringTransaction(id: number) {
  const now = new Date().toISOString();
  return db.update(recurringTransactions).set({
    isActive: false,
    deletedAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  }).where(eq(recurringTransactions.id, id)).returning().get();
}

// ─── Targets ────────────────────────────────────────────────────────────────
export async function getTargetForMonth(month: string) {
  return db.select().from(targets).where(and(eq(targets.month, month), isNull(targets.deletedAt))).get();
}

export async function upsertTarget(month: string, overallLimit: number | null) {
  const now = new Date().toISOString();
  const existing = await getTargetForMonth(month);
  if (existing) {
    return db.update(targets).set({ overallLimit, updatedAt: now, syncStatus: 'pending' }).where(eq(targets.id, existing.id)).returning().get();
  }
  return db.insert(targets).values({ month, overallLimit, syncId: randomUUID(), updatedAt: now, syncStatus: 'pending' }).returning().get();
}

export async function getCategoryTargetsForMonth(month: string) {
  const target = await getTargetForMonth(month);
  if (!target) return [];

  return db
    .select({
      id: categoryTargets.id,
      targetId: categoryTargets.targetId,
      categoryId: categoryTargets.categoryId,
      limitAmount: categoryTargets.limitAmount,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
    })
    .from(categoryTargets)
    .leftJoin(categories, eq(categoryTargets.categoryId, categories.id))
    .where(and(eq(categoryTargets.targetId, target.id), isNull(categoryTargets.deletedAt)))
    .all();
}

export async function upsertCategoryTarget(month: string, categoryId: number, limitAmount: number) {
  const now = new Date().toISOString();
  let target = await getTargetForMonth(month);
  if (!target) {
    target = (await db.insert(targets).values({ month, overallLimit: null, syncId: randomUUID(), updatedAt: now, syncStatus: 'pending' }).returning().get()) ?? null;
  }

  const existing = await db
    .select()
    .from(categoryTargets)
    .where(and(eq(categoryTargets.targetId, target!.id), eq(categoryTargets.categoryId, categoryId), isNull(categoryTargets.deletedAt)))
    .get();

  if (existing) {
    return db
      .update(categoryTargets)
      .set({ limitAmount, updatedAt: now, syncStatus: 'pending' })
      .where(eq(categoryTargets.id, existing.id))
      .returning()
      .get();
  }
  return db.insert(categoryTargets).values({
    targetId: target!.id,
    categoryId,
    limitAmount,
    syncId: randomUUID(),
    updatedAt: now,
    syncStatus: 'pending',
  }).returning().get();
}

export async function deleteCategoryTarget(id: number) {
  const now = new Date().toISOString();
  await db.update(categoryTargets).set({ deletedAt: now, updatedAt: now, syncStatus: 'pending' }).where(eq(categoryTargets.id, id));
}

// ─── Money Sources ────────────────────────────────────────────────────────
export async function getMoneySources() {
  return db.select().from(moneySources).where(isNull(moneySources.deletedAt)).orderBy(moneySources.name).all();
}

export async function getActiveMoneySources() {
  return db.select().from(moneySources).where(and(eq(moneySources.isActive, true), isNull(moneySources.deletedAt))).orderBy(moneySources.name).all();
}

export async function createMoneySource(data: NewMoneySource) {
  const now = new Date().toISOString();
  return db.insert(moneySources).values({
    ...data,
    syncId: randomUUID(),
    updatedAt: now,
    syncStatus: 'pending',
  }).returning().get();
}

export async function updateMoneySource(id: number, data: Partial<NewMoneySource>) {
  const now = new Date().toISOString();
  return db.update(moneySources).set({
    ...data,
    updatedAt: now,
    syncStatus: 'pending',
  }).where(eq(moneySources.id, id)).returning().get();
}

export async function deleteMoneySource(id: number) {
  const now = new Date().toISOString();
  return db.update(moneySources).set({
    isActive: false,
    deletedAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  }).where(eq(moneySources.id, id)).returning().get();
}

export async function adjustSourceBalance(id: number, delta: number) {
  const now = new Date().toISOString();
  sqlite.runSync(
    'UPDATE money_sources SET balance = balance + ?, updated_at = ?, sync_status = ? WHERE id = ?',
    [delta, now, 'pending', id]
  );
}

export async function getTotalSourceBalance(): Promise<number> {
  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(${moneySources.balance}), 0)` })
    .from(moneySources)
    .where(and(eq(moneySources.isActive, true), isNull(moneySources.deletedAt)))
    .get();
  return result?.total ?? 0;
}

// ─── Lends ──────────────────────────────────────────────────────────────────
const lendSelectColumns = {
  id: lends.id,
  amount: lends.amount,
  sourceId: lends.sourceId,
  borrowerName: lends.borrowerName,
  note: lends.note,
  lendDate: lends.lendDate,
  expectedPayDate: lends.expectedPayDate,
  isPaid: lends.isPaid,
  paidDate: lends.paidDate,
  hasInterest: lends.hasInterest,
  interestType: lends.interestType,
  interestValue: lends.interestValue,
  createdAt: lends.createdAt,
  sourceName: moneySources.name,
  sourceIcon: moneySources.icon,
  sourceColor: moneySources.color,
};

export async function getLends() {
  return db
    .select(lendSelectColumns)
    .from(lends)
    .leftJoin(moneySources, eq(lends.sourceId, moneySources.id))
    .where(isNull(lends.deletedAt))
    .orderBy(desc(lends.lendDate), desc(lends.createdAt))
    .all();
}

export async function getActiveLends() {
  return db
    .select(lendSelectColumns)
    .from(lends)
    .leftJoin(moneySources, eq(lends.sourceId, moneySources.id))
    .where(and(eq(lends.isPaid, false), isNull(lends.deletedAt)))
    .orderBy(desc(lends.lendDate), desc(lends.createdAt))
    .all();
}

export async function createLend(data: NewLend) {
  const now = new Date().toISOString();
  return db.insert(lends).values({
    ...data,
    syncId: randomUUID(),
    updatedAt: now,
    syncStatus: 'pending',
  }).returning().get();
}

export async function updateLend(id: number, data: Partial<NewLend>) {
  const now = new Date().toISOString();
  return db.update(lends).set({
    ...data,
    updatedAt: now,
    syncStatus: 'pending',
  }).where(eq(lends.id, id)).returning().get();
}

export async function deleteLend(id: number) {
  const now = new Date().toISOString();
  await db.update(lends).set({ deletedAt: now, updatedAt: now, syncStatus: 'pending' }).where(eq(lends.id, id));
}

export async function markLendPaid(id: number) {
  const now = new Date().toISOString();
  const today = now.split('T')[0];
  return db
    .update(lends)
    .set({ isPaid: true, paidDate: today, updatedAt: now, syncStatus: 'pending' })
    .where(eq(lends.id, id))
    .returning()
    .get();
}

export async function getTotalActiveLendAmount(): Promise<number> {
  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(${lends.amount}), 0)` })
    .from(lends)
    .where(and(eq(lends.isPaid, false), isNull(lends.deletedAt)))
    .get();
  return result?.total ?? 0;
}
