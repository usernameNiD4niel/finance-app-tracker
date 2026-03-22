import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Switch, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TopHeader } from '../../components/ui/TopHeader';
import { MutedLabel } from '../../components/ui/MutedLabel';
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
      style={[
        styles.row,
        {
          backgroundColor: theme.custom.cardBg,
          borderColor: theme.custom.cardBorder,
        },
      ]}
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

  const handleThemeToggle = async (val: boolean) => {
    await setTheme(val ? 'dark' : 'light');
  };

  return (
    <ScreenContainer>
      <TopHeader title="Settings" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Appearance */}
        <MutedLabel uppercase style={styles.sectionTitle}>Appearance</MutedLabel>
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

        {/* Financial */}
        <MutedLabel uppercase style={styles.sectionTitle}>Financial</MutedLabel>
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
        <MutedLabel uppercase style={styles.sectionTitle}>Data</MutedLabel>
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
        <MutedLabel uppercase style={styles.sectionTitle}>Security</MutedLabel>
        <SettingRow
          icon="lock-reset"
          iconColor={theme.custom.warning}
          label="Change PIN"
          onPress={() => router.push('/modals/change-pin')}
        />

        {/* About */}
        <MutedLabel uppercase style={styles.sectionTitle}>About</MutedLabel>
        <SettingRow
          icon="information-outline"
          iconColor={theme.colors.onSurfaceVariant}
          label="Version"
          value="1.0.0"
        />

        <View style={{ height: 120 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 2,
    borderRadius: 16,
    borderWidth: 1,
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
