import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useGuestWarningStore } from '../store/guestWarningStore';

/**
 * Call this hook in any data-adding screen.
 * Shows the guest warning once per session (or never if permanently dismissed)
 * when the user is not signed in.
 */
export function useGuestWarning() {
  const user = useAuthStore((s) => s.user);
  const guestWarningDismissed = useSettingsStore((s) => s.guestWarningDismissed);
  const { sessionDismissed, show } = useGuestWarningStore();

  useEffect(() => {
    if (user) return;                   // logged in — no warning
    if (guestWarningDismissed) return;  // permanently dismissed
    if (sessionDismissed) return;       // already dismissed this session
    show();
  }, []);
}
