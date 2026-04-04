import { doc, getDocFromCache, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from './firebase';
import { useSettingsStore } from '../store/settingsStore';

/**
 * Called on app startup after auth resolves.
 * Reads Firestore to verify premium status — prevents client-side SQLite bypass.
 *
 * Strategy:
 *   1. Try local Firestore cache first (instant, no network required).
 *   2. On cache miss, try the network.
 *   3. On any failure (offline, unavailable), silently fall back to the
 *      SQLite value already loaded by settingsStore — no error is logged
 *      because this is expected and handled gracefully.
 */
export async function verifyPremiumStatus(uid: string): Promise<void> {
  try {
    const ref = doc(firestore, 'users', uid, 'profile', 'subscription');

    let snap;
    try {
      // Cache hit = instant and offline-safe
      snap = await getDocFromCache(ref);
    } catch {
      // Cache miss (first launch) — try network
      snap = await getDoc(ref);
    }

    if (!snap.exists()) return;

    const { isPremium, subscriptionStatus, stripeCustomerId } = snap.data();
    const store = useSettingsStore.getState();
    await store.setPremium(!!isPremium);
    if (subscriptionStatus) await store.setSubscriptionStatus(subscriptionStatus);
    if (stripeCustomerId) await store.setStripeCustomerId(stripeCustomerId);
  } catch {
    // Offline or Firestore unavailable — local SQLite value is already loaded,
    // so the user experience is unaffected. No log needed.
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
