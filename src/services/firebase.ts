import { initializeApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Config values come from google-services.json / Firebase Console project settings.
// These are public identifiers — Firebase security is enforced by Firestore Security Rules.
const firebaseConfig = {
  apiKey: 'AIzaSyBg77kcgz3WwSjENjFIhkx1bBTdxz2rm2w',
  authDomain: 'financial-app-c328f.firebaseapp.com',
  projectId: 'financial-app-c328f',
  storageBucket: 'financial-app-c328f.firebasestorage.app',
  messagingSenderId: '278595331130',
  appId: '1:278595331130:android:7715bab3d82c4d39e8c103',
};

const app = initializeApp(firebaseConfig);

// initializeAuth with AsyncStorage persistence keeps the user logged in across app restarts.
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const firestore = getFirestore(app);
