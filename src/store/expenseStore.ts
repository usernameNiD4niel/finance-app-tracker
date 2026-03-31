import { create } from 'zustand';
import {
  getExpenses, createExpense, updateExpense, deleteExpense, getExpenseTotalByCategory,
  getDailyExpenseTotals, adjustSourceBalance,
} from '../db/queries';
import type { Expense, NewExpense } from '../db/schema';
import { triggerAutoSync } from '../services/autoSync';
import { useAuthStore } from './authStore';

export type ExpenseWithCategory = Awaited<ReturnType<typeof getExpenses>>[number];
export type CategoryTotal = Awaited<ReturnType<typeof getExpenseTotalByCategory>>[number];
export type DailyTotal = { date: string; total: number };

interface ExpenseState {
  expenses: ExpenseWithCategory[];
  categoryTotals: CategoryTotal[];
  dailyTotals: DailyTotal[];
  isLoading: boolean;
  filters: { startDate?: string; endDate?: string; categoryId?: number };
  setFilters: (filters: { startDate?: string; endDate?: string; categoryId?: number }) => void;
  loadExpenses: (filters?: { startDate?: string; endDate?: string; categoryId?: number }) => Promise<void>;
  loadCategoryTotals: (startDate: string, endDate: string) => Promise<void>;
  loadDailyTotals: (startDate: string, endDate: string) => Promise<void>;
  addExpense: (data: NewExpense) => Promise<void>;
  editExpense: (id: number, data: Partial<NewExpense>) => Promise<void>;
  removeExpense: (id: number) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  categoryTotals: [],
  dailyTotals: [],
  isLoading: false,
  filters: {},

  setFilters: (filters) => set({ filters }),

  loadExpenses: async (filters) => {
    set({ isLoading: true });
    const userId = useAuthStore.getState().user?.uid ?? null;
    const f = filters ?? get().filters;
    const data = await getExpenses(f, userId);
    set({ expenses: data, isLoading: false });
  },

  loadCategoryTotals: async (startDate, endDate) => {
    const userId = useAuthStore.getState().user?.uid ?? null;
    const data = await getExpenseTotalByCategory(startDate, endDate, userId);
    set({ categoryTotals: data });
  },

  loadDailyTotals: async (startDate, endDate) => {
    const userId = useAuthStore.getState().user?.uid ?? null;
    const data = await getDailyExpenseTotals(startDate, endDate, userId);
    set({ dailyTotals: data });
  },

  addExpense: async (data) => {
    const userId = useAuthStore.getState().user?.uid ?? null;
    await createExpense(data, userId);
    if (data.sourceId) {
      await adjustSourceBalance(data.sourceId, -data.amount);
    }
    await get().loadExpenses();
    triggerAutoSync();
  },

  editExpense: async (id, data) => {
    const old = get().expenses.find(e => e.id === id);
    // Restore old source balance
    if (old?.sourceId) {
      await adjustSourceBalance(old.sourceId, old.amount);
    }
    await updateExpense(id, data);
    // Deduct from new source
    const newSourceId = data.sourceId !== undefined ? data.sourceId : old?.sourceId;
    const newAmount = data.amount ?? old?.amount;
    if (newSourceId && newAmount) {
      await adjustSourceBalance(newSourceId, -newAmount);
    }
    await get().loadExpenses();
    triggerAutoSync();
  },

  removeExpense: async (id) => {
    const old = get().expenses.find(e => e.id === id);
    if (old?.sourceId) {
      await adjustSourceBalance(old.sourceId, old.amount);
    }
    await deleteExpense(id);
    await get().loadExpenses();
    triggerAutoSync();
  },
}));
