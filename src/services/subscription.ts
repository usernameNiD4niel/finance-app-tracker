import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from './firebase';
import { useSettingsStore } from '../store/settingsStore';

/**
 * Called on app startup after auth resolves.
 * Reads Firestore to verify premium status — prevents client-side SQLite bypass.
 */
export async function verifyPremiumStatus(uid: string): Promise<void> {
  try {
    const ref = doc(firestore, 'users', uid, 'profile', 'subscription');
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const { isPremium, subscriptionStatus, stripeCustomerId } = snap.data();
    const store = useSettingsStore.getState();
    await store.setPremium(!!isPremium);
    if (subscriptionStatus) await store.setSubscriptionStatus(subscriptionStatus);
    if (stripeCustomerId) await store.setStripeCustomerId(stripeCustomerId);
  } catch (e) {
    // Non-fatal — offline or Firestore unavailable, fall back to local SQLite value
    console.warn('[verifyPremiumStatus] Could not verify from Firestore:', e);
  }
}

/**
 * Called immediately after successful payment to write premium status to Firestore.
 */
export async function activatePremiumInFirestore(
  uid: string,
  stripeCustomerId: string,
  subscriptionId: string
): Promise<void> {
  const ref = doc(firestore, 'users', uid, 'profile', 'subscription');
  await setDoc(
    ref,
    { isPremium: true, subscriptionStatus: 'active', stripeCustomerId, subscriptionId },
    { merge: true }
  );
}
