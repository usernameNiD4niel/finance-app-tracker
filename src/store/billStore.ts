import { create } from 'zustand';
import { getBills, createBill, updateBill, deleteBill } from '../db/queries';
import type { NewBill } from '../db/schema';

export type BillWithCategory = Awaited<ReturnType<typeof getBills>>[number];

interface BillState {
  bills: BillWithCategory[];
  isLoading: boolean;
  loadBills: () => Promise<void>;
  addBill: (data: NewBill) => Promise<BillWithCategory | undefined>;
  editBill: (id: number, data: Partial<NewBill>) => Promise<void>;
  removeBill: (id: number) => Promise<void>;
}

export const useBillStore = create<BillState>((set, get) => ({
  bills: [],
  isLoading: false,

  loadBills: async () => {
    set({ isLoading: true });
    const data = await getBills();
    set({ bills: data, isLoading: false });
  },

  addBill: async (data) => {
    const bill = await createBill(data);
    await get().loadBills();
    return get().bills.find(b => b.id === bill?.id);
  },

  editBill: async (id, data) => {
    await updateBill(id, data);
    await get().loadBills();
  },

  removeBill: async (id) => {
    await deleteBill(id);
    await get().loadBills();
  },
}));
