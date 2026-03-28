import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { runSync } from '../services/syncEngine';
import { refreshAllStores } from '../store';

/**
 * Mounts a network state listener that triggers a sync whenever:
 *  - The device transitions from offline → online, AND
 *  - The user is authenticated with Firebase.
 *
 * Also runs an initial sync check on mount if both conditions are met.
 * Mount this once in the root layout (_layout.tsx).
 */
export function useNetworkSync() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const isOnlineRef = useRef(false);
  const isSyncingRef = useRef(false);

  async function triggerSync(uid: string) {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    try {
      const result = await runSync(uid);
      if (result.pulled > 0) {
        // Refresh in-memory stores only if remote data actually changed locally
        await refreshAllStores();
      }
      if (result.error) {
        console.warn('[sync] Sync completed with error:', result.error);
      }
    } catch (e) {
      console.warn('[sync] Sync failed:', e);
    } finally {
      isSyncingRef.current = false;
    }
  }

  // Track previous auth state to detect transitions
  const wasAuthenticatedRef = useRef(isAuthenticated);

  useEffect(() => {
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    // Check current network state on mount
    NetInfo.fetch().then((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      isOnlineRef.current = online;
      if (online && isAuthenticated && user) {
        triggerSync(user.uid);
      }
    });

    // Listen for network transitions
    const unsubscribe = NetInfo.addEventListener((state) => {
      const wasOffline = !isOnlineRef.current;
      const isNowOnline = state.isConnected === true && state.isInternetReachable !== false;
      isOnlineRef.current = isNowOnline;

      if (wasOffline && isNowOnline) {
        const { isAuthenticated: authed, user: currentUser } = useAuthStore.getState();
        if (authed && currentUser) {
          // Online + authenticated → sync
          triggerSync(currentUser.uid);
        } else {
          // Online + not authenticated → prompt to sign in
          Alert.alert(
            'Sign in to sync',
            'You\'re back online. Sign in to back up and sync your data.',
            [
              { text: 'Later', style: 'cancel' },
              { text: 'Sign In', onPress: () => router.push('/modals/cloud-auth') },
            ]
          );
        }
      }
    });

    return unsubscribe;
  }, [isAuthenticated, user?.uid]);
}
