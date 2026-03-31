import { create } from 'zustand';
import {
  getLends, getActiveLends, createLend, updateLend, deleteLend,
  markLendPaid, getTotalActiveLendAmount, adjustSourceBalance,
} from '../db/queries';
import type { NewLend } from '../db/schema';
import { triggerAutoSync } from '../services/autoSync';
import { useAuthStore } from './authStore';

export type LendWithSource = Awaited<ReturnType<typeof getLends>>[number];

interface LendState {
  lends: LendWithSource[];
  activeLends: LendWithSource[];
  activeLendTotal: number;
  isLoading: boolean;
  loadLends: () => Promise<void>;
  loadActiveLends: () => Promise<void>;
  addLend: (data: NewLend) => Promise<void>;
  editLend: (id: number, data: Partial<NewLend>) => Promise<void>;
  removeLend: (id: number) => Promise<void>;
  markPaid: (id: number) => Promise<void>;
  refreshTotal: () => Promise<void>;
}

export const useLendStore = create<LendState>((set, get) => ({
  lends: [],
  activeLends: [],
  activeLendTotal: 0,
  isLoading: false,

  loadLends: async () => {
    set({ isLoading: true });
    const userId = useAuthStore.getState().user?.uid ?? null;
    const [all, active, total] = await Promise.all([
      getLends(userId),
      getActiveLends(userId),
      getTotalActiveLendAmount(userId),
    ]);
    set({ lends: all, activeLends: active, activeLendTotal: total, isLoading: false });
  },

  loadActiveLends: async () => {
    const userId = useAuthStore.getState().user?.uid ?? null;
    const [active, total] = await Promise.all([
      getActiveLends(userId),
      getTotalActiveLendAmount(userId),
    ]);
    set({ activeLends: active, activeLendTotal: total });
  },

  addLend: async (data) => {
    const userId = useAuthStore.getState().user?.uid ?? null;
    await createLend(data, userId);
    await adjustSourceBalance(data.sourceId, -data.amount);
    await get().loadLends();
    triggerAutoSync();
  },

  editLend: async (id, data) => {
    const old = get().lends.find(l => l.id === id);
    const wasPaid = !!old?.isPaid;
    // Restore old source balance
    if (old && !wasPaid) {
      await adjustSourceBalance(old.sourceId, old.amount);
    }
    await updateLend(id, data);
    // Deduct from new source
    const newSourceId = data.sourceId ?? old?.sourceId;
    const newAmount = data.amount ?? old?.amount;
    if (newSourceId && newAmount && !wasPaid) {
      await adjustSourceBalance(newSourceId, -newAmount);
    }
    await get().loadLends();
    triggerAutoSync();
  },

  removeLend: async (id) => {
    const old = get().lends.find(l => l.id === id);
    // Restore source balance if unpaid
    if (old && !old.isPaid) {
      await adjustSourceBalance(old.sourceId, old.amount);
    }
    await deleteLend(id);
    await get().loadLends();
    triggerAutoSync();
  },

  markPaid: async (id) => {
    const lend = get().lends.find(l => l.id === id) ?? get().activeLends.find(l => l.id === id);
    if (!lend) return;
    await markLendPaid(id);
    // Return money to original wallet (principal + interest)
    let returnAmount = lend.amount;
    if (lend.hasInterest && lend.interestValue) {
      if (lend.interestType === 'fixed') {
        returnAmount += lend.interestValue;
      } else if (lend.interestType === 'percentage') {
        returnAmount += lend.amount * (lend.interestValue / 100);
      }
    }
    await adjustSourceBalance(lend.sourceId, returnAmount);
    await get().loadLends();
    triggerAutoSync();
  },

  refreshTotal: async () => {
    const userId = useAuthStore.getState().user?.uid ?? null;
    const total = await getTotalActiveLendAmount(userId);
    set({ activeLendTotal: total });
  },
}));
