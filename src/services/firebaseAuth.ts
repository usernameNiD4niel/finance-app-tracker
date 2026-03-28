import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as authSignOut,
  GoogleAuthProvider,
  signInWithCredential,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

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

// No-op: Google Sign-In configuration is handled via expo-auth-session in the UI component.
export function configureGoogleSignIn(): void {}
