import { create } from 'zustand';

interface GuestWarningState {
  isVisible: boolean;
  sessionDismissed: boolean;
  show: () => void;
  dismissForSession: () => void;
  hide: () => void;
}

export const useGuestWarningStore = create<GuestWarningState>((set) => ({
  isVisible: false,
  sessionDismissed: false,

  show: () => set({ isVisible: true }),

  dismissForSession: () => set({ isVisible: false, sessionDismissed: true }),

  hide: () => set({ isVisible: false }),
}));
