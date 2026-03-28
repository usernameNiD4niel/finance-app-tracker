import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Call once at app startup (in _layout.tsx).
// webClientId is read automatically from google-services.json after expo prebuild.
// If Google Sign-In fails with "developer error", you need to:
//   1. Enable Google Sign-In in Firebase Console → Authentication → Sign-in method
//   2. Add your SHA-1 debug fingerprint in Firebase Console → Project Settings → Android app
//   3. Re-download google-services.json and replace the one in the project root
export function configureGoogleSignIn() {
  GoogleSignin.configure();
}

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken;
  if (!idToken) throw new Error('Google Sign-In failed: no ID token received');
  const credential = auth.GoogleAuthProvider.credential(idToken);
  const result = await auth().signInWithCredential(credential);
  return result.user;
}

export async function signInWithEmail(email: string, password: string) {
  const result = await auth().signInWithEmailAndPassword(email, password);
  return result.user;
}

export async function registerWithEmail(email: string, password: string) {
  const result = await auth().createUserWithEmailAndPassword(email, password);
  return result.user;
}

export async function signOut() {
  if (await GoogleSignin.isSignedIn()) {
    await GoogleSignin.signOut();
  }
  await auth().signOut();
}

export function onAuthStateChanged(callback: (user: auth.User | null) => void) {
  return auth().onAuthStateChanged(callback);
}
