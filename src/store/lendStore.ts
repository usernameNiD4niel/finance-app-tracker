import { create } from 'zustand';
import {
  getLends, getActiveLends, createLend, updateLend, deleteLend,
  markLendPaid, getTotalActiveLendAmount, adjustSourceBalance,
  deleteNotificationLogsByLendId,
} from '../db/queries';
import type { NewLend } from '../db/schema';
import { cancelNotification } from '../services/notifications';

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
    const [all, active, total] = await Promise.all([
      getLends(),
      getActiveLends(),
      getTotalActiveLendAmount(),
    ]);
    set({ lends: all, activeLends: active, activeLendTotal: total, isLoading: false });
  },

  loadActiveLends: async () => {
    const [active, total] = await Promise.all([
      getActiveLends(),
      getTotalActiveLendAmount(),
    ]);
    set({ activeLends: active, activeLendTotal: total });
  },

  addLend: async (data) => {
    await createLend(data);
    await adjustSourceBalance(data.sourceId, -data.amount);
    await get().loadLends();
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
  },

  removeLend: async (id) => {
    const old = get().lends.find(l => l.id === id);
    if (old?.notificationId) await cancelNotification(old.notificationId);
    await deleteNotificationLogsByLendId(id);
    // Restore source balance if unpaid
    if (old && !old.isPaid) {
      await adjustSourceBalance(old.sourceId, old.amount);
    }
    await deleteLend(id);
    await get().loadLends();
  },

  markPaid: async (id) => {
    const lend = get().lends.find(l => l.id === id) ?? get().activeLends.find(l => l.id === id);
    if (lend?.notificationId) await cancelNotification(lend.notificationId);
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
  },

  refreshTotal: async () => {
    const total = await getTotalActiveLendAmount();
    set({ activeLendTotal: total });
  },
}));
