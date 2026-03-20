import { Redirect } from 'expo-router';
import { useSettingsStore } from '../store/settingsStore';

export default function Index() {
  const { isOnboardingDone, pinHash } = useSettingsStore();

  if (!isOnboardingDone) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(auth)/lock" />;
}
