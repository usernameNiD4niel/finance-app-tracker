import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { lightTheme, darkTheme } from '../theme';
import { useSettingsStore } from '../store/settingsStore';
import { runMigrations, seedCategories } from '../db/migrations';
import { ActivityIndicator, View } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { theme, loadSettings, isLoaded } = useSettingsStore();

  useEffect(() => {
    runMigrations();
    seedCategories();
    loadSettings();
  }, []);

  const resolvedTheme =
    theme === 'system'
      ? colorScheme === 'dark' ? darkTheme : lightTheme
      : theme === 'dark' ? darkTheme : lightTheme;

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator color="#6366f1" size="large" />
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
          <Stack.Screen name="modals/salary" options={modalScreenOptions} />
          <Stack.Screen name="modals/budget-targets" options={modalScreenOptions} />
          <Stack.Screen name="modals/categories" options={modalScreenOptions} />
          <Stack.Screen name="modals/export" options={modalScreenOptions} />
          <Stack.Screen name="modals/change-pin" options={modalScreenOptions} />
          <Stack.Screen name="modals/currency-picker" options={modalScreenOptions} />
          <Stack.Screen name="modals/notifications" options={modalScreenOptions} />
        </Stack>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
