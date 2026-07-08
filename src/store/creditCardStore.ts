import { create } from 'zustand';
import {
  getCreditCards, createCreditCard, updateCreditCard, deleteCreditCard,
} from '../db/queries';
import type { CreditCard, NewCreditCard } from '../db/schema';

interface CreditCardState {
  cards: CreditCard[];
  isLoading: boolean;
  loadCards: () => Promise<void>;
  addCard: (data: NewCreditCard) => Promise<void>;
  editCard: (id: number, data: Partial<NewCreditCard>) => Promise<void>;
  removeCard: (id: number) => Promise<void>;
}

export const useCreditCardStore = create<CreditCardState>((set, get) => ({
  cards: [],
  isLoading: false,

  loadCards: async () => {
    set({ isLoading: true });
    const data = await getCreditCards();
    set({ cards: data, isLoading: false });
  },

  addCard: async (data) => {
    await createCreditCard(data);
    await get().loadCards();
  },

  editCard: async (id, data) => {
    await updateCreditCard(id, data);
    await get().loadCards();
  },

  removeCard: async (id) => {
    await deleteCreditCard(id);
    await get().loadCards();
  },
}));
