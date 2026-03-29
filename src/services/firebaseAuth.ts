import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as authSignOut,
  GoogleAuthProvider,
  signInWithCredential,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User,
} from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from './firebase';

const WEB_CLIENT_ID = '278595331130-3t3lou13s2cjt7rm4128a735jful4il5.apps.googleusercontent.com';

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function registerWithEmail(email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

// Called from the cloud-auth modal after expo-auth-session returns a Google ID token.
export async function signInWithGoogleIdToken(idToken: string): Promise<User> {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  return result.user;
}

export async function signOut(): Promise<void> {
  await authSignOut(auth);
}

export function onAuthStateChanged(callback: (user: User | null) => void): () => void {
  return firebaseOnAuthStateChanged(auth, callback);
}

export function configureGoogleSignIn(): void {
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
}
