import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { buildTheme } from '../theme';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { runMigrations, seedCategories, seedMoneySources } from '../db/migrations';
import { processDueRecurringTransactions } from '../services/recurring';
import { configureGoogleSignIn } from '../services/firebaseAuth';
import { useNetworkSync } from '../hooks/useNetworkSync';
import { ActivityIndicator, View } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { theme, primaryColor, loadSettings, isLoaded } = useSettingsStore();
  const { initAuthListener, isAuthLoading } = useAuthStore();

  // Triggers background sync on reconnect when signed in
  useNetworkSync();

  useEffect(() => {
    // Configure Google Sign-In once at startup
    configureGoogleSignIn();

    // Initialize local DB and settings
    (async () => {
      try {
        runMigrations();
        await loadSettings();
        const uid = useSettingsStore.getState().firebaseUid ?? null;
        seedCategories(uid);
        seedMoneySources(uid);
        await processDueRecurringTransactions();
      } catch (e) {
        console.error('[startup] init failed:', e);
      }
    })();

    // Start Firebase auth state listener — resolves isAuthLoading to false
    const unsubscribe = initAuthListener();
    return unsubscribe;
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
          <Stack.Screen name="modals/cloud-auth" options={modalScreenOptions} />
          <Stack.Screen name="modals/recurring" options={modalScreenOptions} />
        </Stack>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
