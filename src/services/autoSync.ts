import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../store/authStore';
import { pushPending } from './syncEngine';

/**
 * Fire-and-forget push: if the user is authenticated and online, push all
 * pending local changes to Firestore. Call this after any SQLite mutation.
 * Does not block — errors are swallowed with a warning.
 */
export function triggerAutoSync(): void {
  const { isAuthenticated, user } = useAuthStore.getState();
  if (!isAuthenticated || !user) return;

  const uid = user.uid;
  NetInfo.fetch().then(state => {
    const online = state.isConnected === true && state.isInternetReachable !== false;
    if (online) {
      pushPending(uid).catch(e => console.warn('[autoSync] push failed:', e?.message ?? e));
    }
  });
}
