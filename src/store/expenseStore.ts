import { create } from 'zustand';
import {
  getExpenses, createExpense, updateExpense, deleteExpense, getExpenseTotalByCategory,
} from '../db/queries';
import type { Expense, NewExpense } from '../db/schema';

export type ExpenseWithCategory = Awaited<ReturnType<typeof getExpenses>>[number];
export type CategoryTotal = Awaited<ReturnType<typeof getExpenseTotalByCategory>>[number];

interface ExpenseState {
  expenses: ExpenseWithCategory[];
  categoryTotals: CategoryTotal[];
  isLoading: boolean;
  filters: { startDate?: string; endDate?: string; categoryId?: number };
  setFilters: (filters: { startDate?: string; endDate?: string; categoryId?: number }) => void;
  loadExpenses: (filters?: { startDate?: string; endDate?: string; categoryId?: number }) => Promise<void>;
  loadCategoryTotals: (startDate: string, endDate: string) => Promise<void>;
  addExpense: (data: NewExpense) => Promise<void>;
  editExpense: (id: number, data: Partial<NewExpense>) => Promise<void>;
  removeExpense: (id: number) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  categoryTotals: [],
  isLoading: false,
  filters: {},

  setFilters: (filters) => set({ filters }),

  loadExpenses: async (filters) => {
    set({ isLoading: true });
    const f = filters ?? get().filters;
    const data = await getExpenses(f);
    set({ expenses: data, isLoading: false });
  },

  loadCategoryTotals: async (startDate, endDate) => {
    const data = await getExpenseTotalByCategory(startDate, endDate);
    set({ categoryTotals: data });
  },

  addExpense: async (data) => {
    await createExpense(data);
    await get().loadExpenses();
  },

  editExpense: async (id, data) => {
    await updateExpense(id, data);
    await get().loadExpenses();
  },

  removeExpense: async (id) => {
    await deleteExpense(id);
    await get().loadExpenses();
  },
}));
