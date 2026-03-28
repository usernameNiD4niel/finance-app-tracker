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
  cloudSyncEnabled: boolean;
  firebaseUid: string | null;
  lastSyncedAt: string | null;
  setCurrency: (currency: string) => Promise<void>;
  setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
  setPrimaryColor: (color: string) => Promise<void>;
  setPin: (pinHash: string) => Promise<void>;
  setPremium: (val: boolean) => Promise<void>;
  setOnboardingDone: () => Promise<void>;
  setCloudSyncEnabled: (enabled: boolean) => Promise<void>;
  setFirebaseUid: (uid: string | null) => Promise<void>;
  setLastSyncedAt: (timestamp: string) => Promise<void>;
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
  cloudSyncEnabled: false,
  firebaseUid: null,
  lastSyncedAt: null,

  loadSettings: async () => {
    const [currency, theme, onboarding, pin, primaryColor, premium, cloudSync, firebaseUid, lastSyncedAt] = await Promise.all([
      getSetting('currency'),
      getSetting('theme'),
      getSetting('onboarding_done'),
      getSetting('pin_hash'),
      getSetting('primary_color'),
      getSetting('is_premium'),
      getSetting('cloud_sync_enabled'),
      getSetting('firebase_uid'),
      getSetting('last_synced_at'),
    ]);
    set({
      currency: currency ?? 'USD',
      theme: (theme as 'light' | 'dark' | 'system') ?? 'system',
      primaryColor: primaryColor ?? '#6366f1',
      isOnboardingDone: onboarding === 'true',
      pinHash: pin,
      isPremium: premium === 'true',
      isLoaded: true,
      cloudSyncEnabled: cloudSync === 'true',
      firebaseUid: firebaseUid ?? null,
      lastSyncedAt: lastSyncedAt ?? null,
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

  setCloudSyncEnabled: async (enabled) => {
    await setSetting('cloud_sync_enabled', enabled ? 'true' : 'false');
    set({ cloudSyncEnabled: enabled });
  },

  setFirebaseUid: async (uid) => {
    if (uid) {
      await setSetting('firebase_uid', uid);
    }
    set({ firebaseUid: uid });
  },

  setLastSyncedAt: async (timestamp) => {
    await setSetting('last_synced_at', timestamp);
    set({ lastSyncedAt: timestamp });
  },
}));
