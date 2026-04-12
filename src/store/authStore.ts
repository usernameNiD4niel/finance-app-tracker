import { create } from 'zustand';
import type { User } from 'firebase/auth';
import {
  signInWithEmail as emailSignIn,
  registerWithEmail as emailRegister,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from '../services/firebaseAuth';
import NetInfo from '@react-native-community/netinfo';
import { runSync } from '../services/syncEngine';
import { clearUserData, countPendingChanges } from '../db/client';
import { useSettingsStore } from './settingsStore';

interface SignOutResult {
  wasOnline: boolean;
  pendingCount: number;
}

interface AuthState {
  user: User | null;
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  // Sets up the Firebase auth state listener. Returns the unsubscribe function.
  // Call this once in the root layout on mount.
  initAuthListener: () => () => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  // Safe sign-out: syncs if online, always signs out.
  // Returns { wasOnline, pendingCount } so UI can warn about unsynced data.
  safeSignOut: (uid: string) => Promise<SignOutResult>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthLoading: true,
  isAuthenticated: false,

  initAuthListener: () => {
    const unsubscribe = onAuthStateChanged((user) => {
      set({ user, isAuthenticated: !!user, isAuthLoading: false });
    });
    return unsubscribe;
  },

  signInWithEmail: async (email, password) => {
    const user = await emailSignIn(email, password);
    set({ user, isAuthenticated: true });
  },

  registerWithEmail: async (email, password) => {
    const user = await emailRegister(email, password);
    set({ user, isAuthenticated: true });
  },

  signOut: async () => {
    await firebaseSignOut();
    const settings = useSettingsStore.getState();
    await settings.setPremium(false);
    await settings.setLsCustomerId('');
    await settings.setSubscriptionStatus('');
    set({ user: null, isAuthenticated: false });
  },

  safeSignOut: async (uid: string) => {
    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected === true;

    let pendingCount = 0;
    let syncSucceeded = false;

    if (isOnline) {
      // Online: attempt full pull-then-push sync before logout
      try {
        await runSync(uid);
        syncSucceeded = true;
      } catch (e) {
        // Sync failed — count pending so UI can warn, but still sign out
        console.warn('[safeSignOut] Sync failed, proceeding with sign out:', e);
        pendingCount = countPendingChanges(uid);
      }
    } else {
      // Offline: count unsynced changes so UI can warn
      pendingCount = countPendingChanges(uid);
    }

    // Always proceed with sign out
    await firebaseSignOut();
    const settings = useSettingsStore.getState();
    await settings.setPremium(false);
    await settings.setLsCustomerId('');
    await settings.setSubscriptionStatus('');
    set({ user: null, isAuthenticated: false });

    // Only clean up local data if sync succeeded (data is safe in Firestore)
    if (syncSucceeded) {
      try {
        clearUserData(uid);
      } catch (e) {
        console.warn('[safeSignOut] Cleanup failed (non-critical):', e);
      }
    }

    return { wasOnline: isOnline, pendingCount };
  },
}));
