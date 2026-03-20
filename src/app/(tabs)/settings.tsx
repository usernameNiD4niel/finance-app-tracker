import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Switch, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettingsStore } from '../../store/settingsStore';
import type { AppTheme } from '../../theme';

interface SettingRowProps {
  icon: string;
  iconColor: string;
  label: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}

function SettingRow({ icon, iconColor, label, value, onPress, right }: SettingRowProps) {
  const theme = useTheme<AppTheme>();
  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.custom.cardBg }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconColor + '22' }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
      </View>
      <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, flex: 1 }}>
        {label}
      </Text>
      {value && (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginRight: 8 }}>
          {value}
        </Text>
      )}
      {right}
      {onPress && !right && (
        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { currency, theme: currentTheme, setTheme } = useSettingsStore();

  const isDark = currentTheme === 'dark';
  const isSystem = currentTheme === 'system';

  const handleThemeToggle = async (val: boolean) => {
    await setTheme(val ? 'dark' : 'light');
  };

  const handleSystemTheme = async () => {
    await setTheme('system');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '800' }}>
          Settings
        </Text>
      </View>

      {/* Appearance */}
      <Text variant="labelLarge" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
        APPEARANCE
      </Text>
      <SettingRow
        icon="theme-light-dark"
        iconColor={theme.colors.primary}
        label="Dark Mode"
        right={
          <Switch
            value={isDark}
            onValueChange={handleThemeToggle}
            color={theme.colors.primary}
          />
        }
      />
      <SettingRow
        icon="cellphone"
        iconColor={theme.colors.secondary}
        label="Use System Theme"
        right={
          <Switch
            value={isSystem}
            onValueChange={handleSystemTheme}
            color={theme.colors.primary}
          />
        }
      />

      {/* Financial */}
      <Text variant="labelLarge" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
        FINANCIAL
      </Text>
      <SettingRow
        icon="currency-usd"
        iconColor={theme.custom.success}
        label="Currency"
        value={currency}
        onPress={() => router.push('/modals/currency-picker')}
      />
      <SettingRow
        icon="cash-clock"
        iconColor={theme.custom.income}
        label="Salary Settings"
        onPress={() => router.push('/modals/salary')}
      />
      <SettingRow
        icon="target"
        iconColor={theme.colors.tertiary}
        label="Budget Targets"
        onPress={() => router.push('/modals/budget-targets')}
      />

      {/* Data */}
      <Text variant="labelLarge" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
        DATA
      </Text>
      <SettingRow
        icon="tag-multiple"
        iconColor={theme.colors.secondary}
        label="Categories"
        onPress={() => router.push('/modals/categories')}
      />
      <SettingRow
        icon="export"
        iconColor={theme.colors.primary}
        label="Export Data"
        onPress={() => router.push('/modals/export')}
      />

      {/* Security */}
      <Text variant="labelLarge" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
        SECURITY
      </Text>
      <SettingRow
        icon="lock-reset"
        iconColor={theme.custom.warning}
        label="Change PIN"
        onPress={() => router.push('/modals/change-pin')}
      />

      {/* About */}
      <Text variant="labelLarge" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
        ABOUT
      </Text>
      <SettingRow
        icon="information-outline"
        iconColor={theme.colors.onSurfaceVariant}
        label="Version"
        value="1.0.0"
      />

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
  },
  sectionTitle: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 2,
    borderRadius: 12,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
