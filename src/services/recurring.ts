import { getDueRecurringTransactions, updateRecurringTransaction, adjustSourceBalance } from '../db/queries';
import { useSettingsStore } from '../store/settingsStore';
import type { RecurringTransaction } from '../db/schema';

function calculateNextRunDate(frequency: string, dayOfMonth: number | null, fromDate: Date): string {
  const d = new Date(fromDate);

  if (frequency === 'daily') {
    d.setDate(d.getDate() + 1);
  } else if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else if (frequency === 'start_of_month') {
    d.setMonth(d.getMonth() + 1, 1);
  } else if (frequency === 'end_of_month') {
    d.setMonth(d.getMonth() + 2, 0); // last day of next month
  } else if (frequency === 'specific_day') {
    const day = dayOfMonth ?? 1;
    d.setMonth(d.getMonth() + 1, day);
    // Clamp to last day of that month
    const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    if (day > maxDay) d.setDate(maxDay);
  }

  return d.toISOString().split('T')[0];
}

export function buildInitialNextRunDate(frequency: string, dayOfMonth: number | null): string {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  if (frequency === 'daily') {
    return todayStr;
  } else if (frequency === 'weekly') {
    return todayStr;
  } else if (frequency === 'start_of_month') {
    // Next 1st of month (if today is not already 1st, go to next month's 1st)
    const next = new Date(today);
    if (today.getDate() === 1) {
      return todayStr;
    }
    next.setMonth(next.getMonth() + 1, 1);
    return next.toISOString().split('T')[0];
  } else if (frequency === 'end_of_month') {
    // Last day of this month
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    if (today >= lastDay) {
      // Already past, go to end of next month
      const next = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      return next.toISOString().split('T')[0];
    }
    return lastDay.toISOString().split('T')[0];
  } else if (frequency === 'specific_day') {
    const day = dayOfMonth ?? 1;
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), day);
    const maxDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const clampedDay = Math.min(day, maxDay);
    const target = new Date(today.getFullYear(), today.getMonth(), clampedDay);
    if (target >= today) {
      return target.toISOString().split('T')[0];
    }
    // Next month
    const nextMonth = today.getMonth() + 1;
    const nextYear = today.getFullYear() + (nextMonth > 11 ? 1 : 0);
    const clampedNextDay = Math.min(day, new Date(nextYear, (nextMonth % 12) + 1, 0).getDate());
    return new Date(nextYear, nextMonth % 12, clampedNextDay).toISOString().split('T')[0];
  }

  return todayStr;
}

export async function processDueRecurringTransactions(): Promise<void> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const userId = useSettingsStore.getState().firebaseUid ?? null;
  const due = await getDueRecurringTransactions(todayStr, userId);
  if (due.length === 0) return;

  for (const rt of due) {
    // Apply all missed occurrences from nextRunDate up to today
    let runDate = new Date(rt.nextRunDate);
    while (runDate.toISOString().split('T')[0] <= todayStr) {
      const delta = rt.type === 'deposit' ? rt.amount : -rt.amount;
      await adjustSourceBalance(rt.sourceId, delta);
      const nextDate = calculateNextRunDate(rt.frequency, rt.dayOfMonth, runDate);
      runDate = new Date(nextDate);
    }

    const lastRun = todayStr;
    const nextRun = runDate.toISOString().split('T')[0];
    await updateRecurringTransaction(rt.id, { lastRunDate: lastRun, nextRunDate: nextRun });
  }
}
