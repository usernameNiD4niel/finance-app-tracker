import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { buildTheme } from '../theme';
import { useSettingsStore } from '../store/settingsStore';
import { runMigrations, seedCategories, seedMoneySources } from '../db/migrations';
import { processDueRecurringTransactions } from '../services/recurring';
import { ActivityIndicator, View } from 'react-native';
import { getBills, getActiveLends, getActiveBorrows } from '../db/queries';
import {
  requestNotificationPermissions,
  syncNotificationLogs,
  rescheduleAllBillNotifications,
  initNotificationListeners,
  getInitialNotificationTap,
  buildNotificationRoute,
  setPendingNotificationTap,
  isAppUnlocked,
} from '../services/notifications';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { theme, primaryColor, loadSettings, isLoaded } = useSettingsStore();
  const router = useRouter();

  useEffect(() => {
    // Initialize local DB and settings
    (async () => {
      try {
        // Capture a notification that cold-started the app before anything else,
        // so the lock screen can route to it once the user authenticates.
        const initialTap = await getInitialNotificationTap();
        if (initialTap) setPendingNotificationTap(initialTap);

        runMigrations();
        await loadSettings();
        seedCategories();
        seedMoneySources();
        await processDueRecurringTransactions();

        // Notification setup
        await requestNotificationPermissions();
        const currency = useSettingsStore.getState().currency;
        const [billsList, lendsList, borrowsList] = await Promise.all([
          getBills(), getActiveLends(), getActiveBorrows(),
        ]);
        await syncNotificationLogs(billsList, lendsList, currency, borrowsList);
        await rescheduleAllBillNotifications(billsList, currency);
      } catch (e) {
        console.error('[startup] init failed:', e);
      }
    })();

    // Notification tap — open the item that triggered it. While the app is
    // still locked, stash it; lock.tsx applies it after unlocking.
    const cleanupListeners = initNotificationListeners((data) => {
      if (isAppUnlocked()) {
        router.navigate(buildNotificationRoute(data) as any);
      } else {
        setPendingNotificationTap(data);
      }
    });

    return () => {
      cleanupListeners();
    };
  }, []);

  const isDark =
    theme === 'system'
      ? colorScheme === 'dark'
      : theme === 'dark';

  const resolvedTheme = buildTheme(primaryColor, isDark);

  if (!isLoaded) {
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

  return (
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
          <Stack.Screen name="modals/add-borrow" options={modalScreenOptions} />
          <Stack.Screen name="modals/borrows" options={modalScreenOptions} />
          <Stack.Screen name="modals/recurring" options={modalScreenOptions} />
        </Stack>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
