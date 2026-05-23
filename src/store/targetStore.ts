import { create } from 'zustand';
import {
  getTargetForMonth, upsertTarget, getCategoryTargetsForMonth,
  upsertCategoryTarget, deleteCategoryTarget,
} from '../db/queries';
import type { Target } from '../db/schema';

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
    const [target, catTargets] = await Promise.all([
      getTargetForMonth(month),
      getCategoryTargetsForMonth(month),
    ]);
    set({ currentTarget: target ?? null, categoryTargets: catTargets, isLoading: false });
  },

  setOverallTarget: async (month, limit) => {
    await upsertTarget(month, limit);
    await get().loadTargets(month);
  },

  setCategoryTarget: async (month, categoryId, limit) => {
    await upsertCategoryTarget(month, categoryId, limit);
    await get().loadTargets(month);
  },

  removeCategoryTarget: async (id, month) => {
    await deleteCategoryTarget(id);
    await get().loadTargets(month);
  },
}));
