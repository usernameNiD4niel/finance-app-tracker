import { create } from 'zustand';
import {
  getBorrows, getActiveBorrows, createBorrow, updateBorrow, deleteBorrow,
  markBorrowPaid, getTotalActiveBorrowAmount, adjustSourceBalance, getMoneySources,
  deleteNotificationLogsByBorrowId,
} from '../db/queries';
import type { NewBorrow } from '../db/schema';
import { cancelNotification } from '../services/notifications';

export type BorrowWithSource = Awaited<ReturnType<typeof getBorrows>>[number];

// Principal plus any agreed interest — what actually leaves the repayment wallet.
function computeRepayment(borrow: {
  amount: number; hasInterest: boolean | number; interestType: string | null; interestValue: number | null;
}): number {
  let total = borrow.amount;
  if (borrow.hasInterest && borrow.interestValue) {
    if (borrow.interestType === 'fixed') total += borrow.interestValue;
    else if (borrow.interestType === 'percentage') total += borrow.amount * (borrow.interestValue / 100);
  }
  return total;
}

interface BorrowState {
  borrows: BorrowWithSource[];
  activeBorrows: BorrowWithSource[];
  activeBorrowTotal: number;
  isLoading: boolean;
  loadBorrows: () => Promise<void>;
  loadActiveBorrows: () => Promise<void>;
  addBorrow: (data: NewBorrow) => Promise<void>;
  editBorrow: (id: number, data: Partial<NewBorrow>) => Promise<void>;
  removeBorrow: (id: number) => Promise<void>;
  markPaid: (id: number) => Promise<{ ok: boolean; message?: string }>;
  refreshTotal: () => Promise<void>;
}

export const useBorrowStore = create<BorrowState>((set, get) => ({
  borrows: [],
  activeBorrows: [],
  activeBorrowTotal: 0,
  isLoading: false,

  loadBorrows: async () => {
    set({ isLoading: true });
    const [all, active, total] = await Promise.all([
      getBorrows(),
      getActiveBorrows(),
      getTotalActiveBorrowAmount(),
    ]);
    set({ borrows: all, activeBorrows: active, activeBorrowTotal: total, isLoading: false });
  },

  loadActiveBorrows: async () => {
    const [active, total] = await Promise.all([
      getActiveBorrows(),
      getTotalActiveBorrowAmount(),
    ]);
    set({ activeBorrows: active, activeBorrowTotal: total });
  },

  addBorrow: async (data) => {
    await createBorrow(data);
    // Borrowed money lands in the receiving wallet.
    await adjustSourceBalance(data.receivingSourceId, data.amount);
    await get().loadBorrows();
  },

  editBorrow: async (id, data) => {
    const old = get().borrows.find(b => b.id === id);
    const wasPaid = !!old?.isPaid;
    // Reverse the original deposit into the old receiving wallet.
    if (old && !wasPaid) {
      await adjustSourceBalance(old.receivingSourceId, -old.amount);
    }
    await updateBorrow(id, data);
    // Re-deposit into the (possibly new) receiving wallet.
    const newReceivingId = data.receivingSourceId ?? old?.receivingSourceId;
    const newAmount = data.amount ?? old?.amount;
    if (newReceivingId && newAmount && !wasPaid) {
      await adjustSourceBalance(newReceivingId, newAmount);
    }
    await get().loadBorrows();
  },

  removeBorrow: async (id) => {
    const old = get().borrows.find(b => b.id === id);
    if (old?.notificationId) await cancelNotification(old.notificationId);
    await deleteNotificationLogsByBorrowId(id);
    // Reverse the deposit if the debt was still outstanding.
    if (old && !old.isPaid) {
      await adjustSourceBalance(old.receivingSourceId, -old.amount);
    }
    await deleteBorrow(id);
    await get().loadBorrows();
  },

  markPaid: async (id) => {
    const borrow = get().borrows.find(b => b.id === id) ?? get().activeBorrows.find(b => b.id === id);
    if (!borrow) return { ok: false, message: 'Borrow not found.' };

    const repayment = computeRepayment(borrow);
    // The repayment leaves the repayment wallet — block if it can't cover it.
    const sources = await getMoneySources();
    const wallet = sources.find(s => s.id === borrow.repaymentSourceId);
    if (!wallet) return { ok: false, message: 'Repayment wallet not found.' };
    if (wallet.balance < repayment) {
      return {
        ok: false,
        message: `${wallet.name} only has ${wallet.balance.toFixed(2)} but the repayment is ${repayment.toFixed(2)}.`,
      };
    }

    if (borrow.notificationId) await cancelNotification(borrow.notificationId);
    await markBorrowPaid(id);
    await adjustSourceBalance(borrow.repaymentSourceId, -repayment);
    await get().loadBorrows();
    return { ok: true };
  },

  refreshTotal: async () => {
    const total = await getTotalActiveBorrowAmount();
    set({ activeBorrowTotal: total });
  },
}));
