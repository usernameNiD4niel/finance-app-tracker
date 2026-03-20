import { create } from 'zustand';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../db/queries';
import type { Category, NewCategory } from '../db/schema';

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
    const data = await getCategories();
    set({ categories: data, isLoading: false });
  },

  addCategory: async (data) => {
    await createCategory(data);
    await get().loadCategories();
  },

  editCategory: async (id, data) => {
    await updateCategory(id, data);
    await get().loadCategories();
  },

  removeCategory: async (id) => {
    await deleteCategory(id);
    await get().loadCategories();
  },
}));
