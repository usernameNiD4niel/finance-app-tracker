import { create } from 'zustand';
import { getSetting, setSetting } from '../db/queries';

interface SettingsState {
  currency: string;
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
  isOnboardingDone: boolean;
  pinHash: string | null;
  isPremium: boolean;
  isLoaded: boolean;
  setCurrency: (currency: string) => Promise<void>;
  setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
  setPrimaryColor: (color: string) => Promise<void>;
  setPin: (pinHash: string) => Promise<void>;
  setPremium: (val: boolean) => Promise<void>;
  setOnboardingDone: () => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  currency: 'USD',
  theme: 'system',
  primaryColor: '#6366f1',
  isOnboardingDone: false,
  pinHash: null,
  isPremium: false,
  isLoaded: false,

  loadSettings: async () => {
    const [currency, theme, onboarding, pin, primaryColor, premium] = await Promise.all([
      getSetting('currency'),
      getSetting('theme'),
      getSetting('onboarding_done'),
      getSetting('pin_hash'),
      getSetting('primary_color'),
      getSetting('is_premium'),
    ]);
    set({
      currency: currency ?? 'USD',
      theme: (theme as 'light' | 'dark' | 'system') ?? 'system',
      primaryColor: primaryColor ?? '#6366f1',
      isOnboardingDone: onboarding === 'true',
      pinHash: pin,
      isPremium: premium === 'true',
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

  setPremium: async (val) => {
    await setSetting('is_premium', val ? 'true' : 'false');
    set({ isPremium: val });
  },

  setOnboardingDone: async () => {
    await setSetting('onboarding_done', 'true');
    set({ isOnboardingDone: true });
  },
}));
