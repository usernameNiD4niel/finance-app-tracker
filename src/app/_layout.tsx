import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import { buildTheme } from '../theme';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { runMigrations, seedCategories, seedMoneySources } from '../db/migrations';
import { processDueRecurringTransactions } from '../services/recurring';
import { verifyPremiumStatus } from '../services/subscription';
import { useNetworkSync } from '../hooks/useNetworkSync';
import { ActivityIndicator, View } from 'react-native';
import { getBills, getActiveLends } from '../db/queries';
import {
  requestNotificationPermissions,
  syncNotificationLogs,
  rescheduleAllBillNotifications,
  initNotificationListeners,
} from '../services/notifications';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { theme, primaryColor, loadSettings, isLoaded } = useSettingsStore();
  const { initAuthListener, isAuthLoading, user } = useAuthStore();
  const router = useRouter();

  // Verify premium status from Firestore whenever the user changes (sign-in/startup)
  useEffect(() => {
    if (user?.uid) {
      verifyPremiumStatus(user.uid).catch(() => {});
    }
  }, [user?.uid]);

  // Triggers background sync on reconnect when signed in
  useNetworkSync();

  useEffect(() => {
    // Initialize local DB and settings
    (async () => {
      try {
        runMigrations();
        await loadSettings();
        const uid = useSettingsStore.getState().firebaseUid ?? null;
        seedCategories(uid);
        seedMoneySources(uid);
        await processDueRecurringTransactions();

        // Notification setup
        await requestNotificationPermissions();
        const currency = useSettingsStore.getState().currency;
        const [billsList, lendsList] = await Promise.all([getBills(uid), getActiveLends(uid)]);
        await syncNotificationLogs(billsList, lendsList, currency, uid);
        await rescheduleAllBillNotifications(billsList, currency);
      } catch (e) {
        console.error('[startup] init failed:', e);
      }
    })();

    // Notification tap — navigate to the relevant screen
    const cleanupListeners = initNotificationListeners(({ billId, lendId }) => {
      if (billId != null) {
        router.push('/(tabs)/bills' as any);
      } else if (lendId != null) {
        router.push('/(tabs)/' as any);
      } else {
        router.push('/modals/notifications' as any);
      }
    });

    // Start Firebase auth state listener — resolves isAuthLoading to false
    const unsubscribe = initAuthListener();
    return () => {
      unsubscribe();
      cleanupListeners();
    };
  }, []);

  const isDark =
    theme === 'system'
      ? colorScheme === 'dark'
      : theme === 'dark';

  const resolvedTheme = buildTheme(primaryColor, isDark);

  if (!isLoaded || isAuthLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2a2d3a' }}>
        <ActivityIndicator color="#818cf8" size="large" />
      </View>
    );
  }

  const modalScreenOptions = {
    presentation: 'modal' as const,
    headerShown: false,
    animation: 'none' as const,
    contentStyle: { backgroundColor: resolvedTheme.colors.background },
  };

  const stripeKey = Constants.expoConfig?.extra?.stripePublishableKey ?? '';

  return (
    <StripeProvider publishableKey={stripeKey}>
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: resolvedTheme.colors.background }}>
      <StatusBar style={resolvedTheme.dark ? 'light' : 'dark'} />
      <PaperProvider theme={resolvedTheme}>
        <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: resolvedTheme.colors.background } }}>
          <Stack.Screen name="index" options={{ animation: 'none' }} />
          <Stack.Screen name="(auth)" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
          <Stack.Screen name="modals/add-expense" options={modalScreenOptions} />
          <Stack.Screen name="modals/add-bill" options={modalScreenOptions} />
          <Stack.Screen name="modals/budget-targets" options={modalScreenOptions} />
          <Stack.Screen name="modals/categories" options={modalScreenOptions} />
          <Stack.Screen name="modals/export" options={modalScreenOptions} />
          <Stack.Screen name="modals/change-pin" options={modalScreenOptions} />
          <Stack.Screen name="modals/currency-picker" options={modalScreenOptions} />
          <Stack.Screen name="modals/notifications" options={modalScreenOptions} />
          <Stack.Screen name="modals/add-lend" options={modalScreenOptions} />
          <Stack.Screen name="modals/lends" options={modalScreenOptions} />
          <Stack.Screen name="modals/cloud-auth" options={modalScreenOptions} />
          <Stack.Screen name="modals/recurring" options={modalScreenOptions} />
        </Stack>
      </PaperProvider>
    </GestureHandlerRootView>
    </StripeProvider>
  );
}
