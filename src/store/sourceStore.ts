import { create } from 'zustand';
import {
  getMoneySources, getActiveMoneySources, createMoneySource,
  updateMoneySource, deleteMoneySource, adjustSourceBalance, getTotalSourceBalance,
  getRecurringTransactions, createRecurringTransaction, deleteRecurringTransaction,
  executeTransfer,
} from '../db/queries';
import type { MoneySource, NewMoneySource, RecurringTransaction, NewRecurringTransaction } from '../db/schema';

interface SourceState {
  sources: MoneySource[];
  totalBalance: number;
  isLoading: boolean;
  recurringMap: Record<number, RecurringTransaction[]>;
  allRecurring: RecurringTransaction[];
  loadSources: () => Promise<void>;
  addSource: (data: NewMoneySource) => Promise<void>;
  editSource: (id: number, data: Partial<NewMoneySource>) => Promise<void>;
  removeSource: (id: number) => Promise<void>;
  deposit: (id: number, amount: number) => Promise<void>;
  withdraw: (id: number, amount: number) => Promise<void>;
  refreshTotalBalance: () => Promise<void>;
  loadRecurring: (sourceId: number) => Promise<void>;
  loadAllRecurring: () => Promise<void>;
  addRecurring: (data: NewRecurringTransaction) => Promise<void>;
  removeRecurring: (id: number, sourceId: number) => Promise<void>;
  transfer: (fromId: number, toId: number, amount: number, fee: number, note: string | null, date: string) => Promise<void>;
}

export const useSourceStore = create<SourceState>((set, get) => ({
  sources: [],
  totalBalance: 0,
  isLoading: false,
  recurringMap: {},
  allRecurring: [],

  loadSources: async () => {
    set({ isLoading: true });
    const [data, total] = await Promise.all([
      getMoneySources(),
      getTotalSourceBalance(),
    ]);
    set({ sources: data, totalBalance: total, isLoading: false });
  },

  addSource: async (data) => {
    await createMoneySource(data);
    await get().loadSources();
  },

  editSource: async (id, data) => {
    await updateMoneySource(id, data);
    await get().loadSources();
  },

  removeSource: async (id) => {
    await deleteMoneySource(id);
    await get().loadSources();
  },

  deposit: async (id, amount) => {
    await adjustSourceBalance(id, amount);
    await get().loadSources();
  },

  withdraw: async (id, amount) => {
    await adjustSourceBalance(id, -amount);
    await get().loadSources();
  },

  refreshTotalBalance: async () => {
    const total = await getTotalSourceBalance();
    set({ totalBalance: total });
  },

  loadRecurring: async (sourceId) => {
    const rows = await getRecurringTransactions(sourceId);
    set(state => ({ recurringMap: { ...state.recurringMap, [sourceId]: rows } }));
  },

  loadAllRecurring: async () => {
    const rows = await getRecurringTransactions(undefined);
    set({ allRecurring: rows });
  },

  addRecurring: async (data) => {
    await createRecurringTransaction(data);
    await get().loadRecurring(data.sourceId);
    await get().loadAllRecurring();
  },

  removeRecurring: async (id, sourceId) => {
    await deleteRecurringTransaction(id);
    await get().loadRecurring(sourceId);
    await get().loadAllRecurring();
  },

  transfer: async (fromId, toId, amount, fee, note, date) => {
    await executeTransfer(fromId, toId, amount, fee, note, date);
    await get().loadSources();
  },
}));
