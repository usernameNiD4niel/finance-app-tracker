import { create } from 'zustand';

interface TabState {
  prevIndex: number;
  currentIndex: number;
  setTab: (index: number) => void;
}

export const useTabStore = create<TabState>((set) => ({
  prevIndex: 0,
  currentIndex: 0,
  setTab: (index) =>
    set((state) => ({
      prevIndex: state.currentIndex,
      currentIndex: index,
    })),
}));
