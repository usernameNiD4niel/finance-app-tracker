import { create } from 'zustand';
import {
  getMoneySources, getActiveMoneySources, createMoneySource,
  updateMoneySource, deleteMoneySource, adjustSourceBalance, getTotalSourceBalance,
} from '../db/queries';
import type { MoneySource, NewMoneySource } from '../db/schema';

interface SourceState {
  sources: MoneySource[];
  totalBalance: number;
  isLoading: boolean;
  loadSources: () => Promise<void>;
  addSource: (data: NewMoneySource) => Promise<void>;
  editSource: (id: number, data: Partial<NewMoneySource>) => Promise<void>;
  removeSource: (id: number) => Promise<void>;
  deposit: (id: number, amount: number) => Promise<void>;
  withdraw: (id: number, amount: number) => Promise<void>;
  refreshTotalBalance: () => Promise<void>;
}

export const useSourceStore = create<SourceState>((set, get) => ({
  sources: [],
  totalBalance: 0,
  isLoading: false,

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
}));
