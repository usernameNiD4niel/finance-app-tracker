import { format } from 'date-fns';
import { useExpenseStore } from './expenseStore';
import { useBillStore } from './billStore';
import { useCategoryStore } from './categoryStore';
import { useSourceStore } from './sourceStore';
import { useLendStore } from './lendStore';
import { useTargetStore } from './targetStore';

// Called after a sync completes to refresh all in-memory store state from SQLite.
export async function refreshAllStores(): Promise<void> {
  const currentMonth = format(new Date(), 'yyyy-MM');
  await Promise.all([
    useExpenseStore.getState().loadExpenses(),
    useBillStore.getState().loadBills(),
    useCategoryStore.getState().loadCategories(),
    useSourceStore.getState().loadSources(),
    useLendStore.getState().loadLends(),
    useTargetStore.getState().loadTargets(currentMonth),
  ]);
}
