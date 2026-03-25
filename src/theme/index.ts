import { MD3DarkTheme, MD3LightTheme, adaptNavigationTheme } from 'react-native-paper';
import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationLightTheme } from '@react-navigation/native';

const customColors = {
  primary: '#6366f1',       // indigo-500
  primaryContainer: '#4338ca',
  secondary: '#7c3aed',     // violet-700
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
    background: '#e3e6ec',
    surface: '#e3e6ec',
    surfaceVariant: '#dcdfe6',
    onSurface: '#1e2030',
    onSurfaceVariant: '#5b6178',
    outline: '#c5c9d4',
  },
  custom: {
    ...customColors,
    income: '#22c55e',
    expense: '#ef4444',
    cardBg: '#e3e6ec',
    tabBarBg: '#e3e6ec',
    glowPrimary: '#6366f1',
    glowSecondary: '#7c3aed',
    cardBorder: 'transparent',
    surfaceElevated: '#eaecf2',
    mutedText: '#8890a4',
    shadowDark: '#c8ccd4',
    shadowLight: '#ffffff',
    trackBg: '#d6d9e0',
    overlayBg: 'rgba(0,0,0,0.55)',
    buttonText: '#ffffff',
    onAccentSurface: 'rgba(255,255,255,0.9)',
    onAccentSurfaceMuted: 'rgba(255,255,255,0.55)',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#818cf8',
    primaryContainer: '#3730a3',
    secondary: '#7c3aed',
    tertiary: customColors.tertiary,
    error: customColors.error,
    background: '#2a2d3a',
    surface: '#2a2d3a',
    surfaceVariant: '#2f3244',
    onSurface: '#e8eaf0',
    onSurfaceVariant: '#9298b0',
    outline: '#3a3e50',
  },
  custom: {
    ...customColors,
    primary: '#818cf8',
    income: '#4ade80',
    expense: '#f87171',
    warning: '#fbbf24',
    cardBg: '#2a2d3a',
    tabBarBg: '#2a2d3a',
    glowPrimary: '#818cf8',
    glowSecondary: '#7c3aed',
    cardBorder: 'transparent',
    surfaceElevated: '#303342',
    mutedText: '#636b84',
    shadowDark: '#222530',
    shadowLight: '#363a4a',
    trackBg: '#232632',
    overlayBg: 'rgba(0,0,0,0.65)',
    buttonText: '#ffffff',
    onAccentSurface: 'rgba(255,255,255,0.9)',
    onAccentSurfaceMuted: 'rgba(255,255,255,0.55)',
  },
};

export const PRIMARY_COLORS = [
  { name: 'Indigo', light: '#6366f1', dark: '#818cf8' },
  { name: 'Pink', light: '#ec4899', dark: '#f472b6' },
  { name: 'Rose', light: '#f43f5e', dark: '#fb7185' },
  { name: 'Orange', light: '#f97316', dark: '#fb923c' },
  { name: 'Amber', light: '#f59e0b', dark: '#fbbf24' },
  { name: 'Emerald', light: '#10b981', dark: '#34d399' },
  { name: 'Cyan', light: '#06b6d4', dark: '#22d3ee' },
  { name: 'Blue', light: '#3b82f6', dark: '#60a5fa' },
] as const;

export function buildTheme(primaryColor: string, isDark: boolean): AppTheme {
  const base = isDark ? darkTheme : lightTheme;
  const entry = PRIMARY_COLORS.find(
    (c) => c.light === primaryColor || c.dark === primaryColor,
  );
  const resolved = entry
    ? isDark ? entry.dark : entry.light
    : primaryColor;

  return {
    ...base,
    colors: {
      ...base.colors,
      primary: resolved,
    },
    custom: {
      ...base.custom,
      primary: resolved,
      glowPrimary: resolved,
    },
  };
}

const { LightTheme: navLight, DarkTheme: navDark } = adaptNavigationTheme({
  reactNavigationLight: NavigationLightTheme,
  reactNavigationDark: NavigationDarkTheme,
  materialLight: lightTheme,
  materialDark: darkTheme,
});

export const navigationLightTheme = navLight;
export const navigationDarkTheme = navDark;

export type AppTheme = typeof lightTheme;
