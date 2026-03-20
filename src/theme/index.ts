import { MD3DarkTheme, MD3LightTheme, adaptNavigationTheme } from 'react-native-paper';
import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationLightTheme } from '@react-navigation/native';

const customColors = {
  primary: '#6366f1',       // indigo-500
  primaryContainer: '#4338ca',
  secondary: '#8b5cf6',     // violet-500
  tertiary: '#06b6d4',      // cyan-500
  error: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: customColors.primary,
    primaryContainer: '#e0e7ff',
    secondary: customColors.secondary,
    tertiary: customColors.tertiary,
    error: customColors.error,
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceVariant: '#f1f5f9',
    onSurface: '#0f172a',
    onSurfaceVariant: '#475569',
    outline: '#cbd5e1',
  },
  custom: {
    ...customColors,
    income: '#22c55e',
    expense: '#ef4444',
    cardBg: '#ffffff',
    tabBarBg: '#ffffff',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: customColors.primary,
    primaryContainer: '#3730a3',
    secondary: customColors.secondary,
    tertiary: customColors.tertiary,
    error: customColors.error,
    background: '#0f172a',
    surface: '#1e293b',
    surfaceVariant: '#334155',
    onSurface: '#f8fafc',
    onSurfaceVariant: '#94a3b8',
    outline: '#475569',
  },
  custom: {
    ...customColors,
    income: '#4ade80',
    expense: '#f87171',
    cardBg: '#1e293b',
    tabBarBg: '#1e293b',
  },
};

const { LightTheme: navLight, DarkTheme: navDark } = adaptNavigationTheme({
  reactNavigationLight: NavigationLightTheme,
  reactNavigationDark: NavigationDarkTheme,
  materialLight: lightTheme,
  materialDark: darkTheme,
});

export const navigationLightTheme = navLight;
export const navigationDarkTheme = navDark;

export type AppTheme = typeof lightTheme;
