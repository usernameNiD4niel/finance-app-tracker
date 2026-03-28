import { create } from 'zustand';
import type { User } from 'firebase/auth';
import {
  signInWithEmail as emailSignIn,
  registerWithEmail as emailRegister,
  signInWithGoogleIdToken,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from '../services/firebaseAuth';

interface AuthState {
  user: User | null;
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  // Sets up the Firebase auth state listener. Returns the unsubscribe function.
  // Call this once in the root layout on mount.
  initAuthListener: () => () => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  // Called after expo-auth-session returns a Google ID token from the UI.
  handleGoogleIdToken: (idToken: string) => Promise<void>;
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

  signInWithEmail: async (email, password) => {
    const user = await emailSignIn(email, password);
    set({ user, isAuthenticated: true });
  },

  registerWithEmail: async (email, password) => {
    const user = await emailRegister(email, password);
    set({ user, isAuthenticated: true });
  },

  handleGoogleIdToken: async (idToken) => {
    const user = await signInWithGoogleIdToken(idToken);
    set({ user, isAuthenticated: true });
  },

  signOut: async () => {
    await firebaseSignOut();
    set({ user: null, isAuthenticated: false });
  },
}));
