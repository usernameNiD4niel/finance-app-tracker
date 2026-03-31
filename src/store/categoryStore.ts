import { create } from 'zustand';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../db/queries';
import type { Category, NewCategory } from '../db/schema';
import { triggerAutoSync } from '../services/autoSync';
import { useAuthStore } from './authStore';

interface CategoryState {
  categories: Category[];
  isLoading: boolean;
  loadCategories: () => Promise<void>;
  addCategory: (data: NewCategory) => Promise<void>;
  editCategory: (id: number, data: Partial<NewCategory>) => Promise<void>;
  removeCategory: (id: number) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  isLoading: false,

  loadCategories: async () => {
    set({ isLoading: true });
    const userId = useAuthStore.getState().user?.uid ?? null;
    const data = await getCategories(userId);
    set({ categories: data, isLoading: false });
  },

  addCategory: async (data) => {
    const userId = useAuthStore.getState().user?.uid ?? null;
    await createCategory(data, userId);
    await get().loadCategories();
    triggerAutoSync();
  },

  editCategory: async (id, data) => {
    await updateCategory(id, data);
    await get().loadCategories();
    triggerAutoSync();
  },

  removeCategory: async (id) => {
    await deleteCategory(id);
    await get().loadCategories();
    triggerAutoSync();
  },
}));
