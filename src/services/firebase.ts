import { initializeApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Config values are injected via app.config.ts → extra (reads from .env).
// Firebase security is enforced by Firestore Security Rules.
const extra = Constants.expoConfig?.extra ?? {};
const firebaseConfig = {
  apiKey: extra.firebaseApiKey,
  authDomain: extra.firebaseAuthDomain,
  projectId: extra.firebaseProjectId,
  storageBucket: extra.firebaseStorageBucket,
  messagingSenderId: extra.firebaseMessagingSenderId,
  appId: extra.firebaseAppId,
};

const app = initializeApp(firebaseConfig);

// initializeAuth with AsyncStorage persistence keeps the user logged in across app restarts.
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const firestore = getFirestore(app);
