import { create } from 'zustand';
import { getSetting, setSetting } from '../db/queries';

interface SettingsState {
  currency: string;
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
  isOnboardingDone: boolean;
  pinHash: string | null;
  isLoaded: boolean;
  setCurrency: (currency: string) => Promise<void>;
  setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
  setPrimaryColor: (color: string) => Promise<void>;
  setPin: (pinHash: string) => Promise<void>;
  setOnboardingDone: () => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  currency: 'USD',
  theme: 'system',
  primaryColor: '#6366f1',
  isOnboardingDone: false,
  pinHash: null,
  isLoaded: false,

  loadSettings: async () => {
    const [currency, theme, onboarding, pin, primaryColor] = await Promise.all([
      getSetting('currency'),
      getSetting('theme'),
      getSetting('onboarding_done'),
      getSetting('pin_hash'),
      getSetting('primary_color'),
    ]);
    set({
      currency: currency ?? 'USD',
      theme: (theme as 'light' | 'dark' | 'system') ?? 'system',
      primaryColor: primaryColor ?? '#6366f1',
      isOnboardingDone: onboarding === 'true',
      pinHash: pin,
      isLoaded: true,
    });
  },

  setCurrency: async (currency) => {
    await setSetting('currency', currency);
    set({ currency });
  },

  setTheme: async (theme) => {
    set({ theme });
    await setSetting('theme', theme);
  },

  setPrimaryColor: async (color) => {
    set({ primaryColor: color });
    await setSetting('primary_color', color);
  },

  setPin: async (pinHash) => {
    await setSetting('pin_hash', pinHash);
    set({ pinHash });
  },

  setOnboardingDone: async () => {
    await setSetting('onboarding_done', 'true');
    set({ isOnboardingDone: true });
  },
}));
