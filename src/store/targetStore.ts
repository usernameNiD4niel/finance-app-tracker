import { create } from 'zustand';
import {
  getTargetForMonth, upsertTarget, getCategoryTargetsForMonth,
  upsertCategoryTarget, deleteCategoryTarget,
} from '../db/queries';
import type { Target } from '../db/schema';
import { triggerAutoSync } from '../services/autoSync';
import { useAuthStore } from './authStore';

type CategoryTargetRow = Awaited<ReturnType<typeof getCategoryTargetsForMonth>>[number];

interface TargetState {
  currentTarget: Target | null;
  categoryTargets: CategoryTargetRow[];
  isLoading: boolean;
  loadTargets: (month: string) => Promise<void>;
  setOverallTarget: (month: string, limit: number | null) => Promise<void>;
  setCategoryTarget: (month: string, categoryId: number, limit: number) => Promise<void>;
  removeCategoryTarget: (id: number, month: string) => Promise<void>;
}

export const useTargetStore = create<TargetState>((set, get) => ({
  currentTarget: null,
  categoryTargets: [],
  isLoading: false,

  loadTargets: async (month) => {
    set({ isLoading: true });
    const userId = useAuthStore.getState().user?.uid ?? null;
    const [target, catTargets] = await Promise.all([
      getTargetForMonth(month, userId),
      getCategoryTargetsForMonth(month, userId),
    ]);
    set({ currentTarget: target ?? null, categoryTargets: catTargets, isLoading: false });
  },

  setOverallTarget: async (month, limit) => {
    const userId = useAuthStore.getState().user?.uid ?? null;
    await upsertTarget(month, limit, userId);
    await get().loadTargets(month);
    triggerAutoSync();
  },

  setCategoryTarget: async (month, categoryId, limit) => {
    const userId = useAuthStore.getState().user?.uid ?? null;
    await upsertCategoryTarget(month, categoryId, limit, userId);
    await get().loadTargets(month);
    triggerAutoSync();
  },

  removeCategoryTarget: async (id, month) => {
    await deleteCategoryTarget(id);
    await get().loadTargets(month);
    triggerAutoSync();
  },
}));
