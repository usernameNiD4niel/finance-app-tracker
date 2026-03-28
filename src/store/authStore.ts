import { create } from 'zustand';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import {
  signInWithGoogle as googleSignIn,
  signInWithEmail as emailSignIn,
  registerWithEmail as emailRegister,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from '../services/firebaseAuth';

interface AuthState {
  user: FirebaseAuthTypes.User | null;
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  // Sets up the Firebase auth state listener. Returns the unsubscribe function.
  // Call this once in the root layout on mount.
  initAuthListener: () => () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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

  signInWithGoogle: async () => {
    const user = await googleSignIn();
    set({ user, isAuthenticated: true });
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
    set({ user: null, isAuthenticated: false });
  },
}));
