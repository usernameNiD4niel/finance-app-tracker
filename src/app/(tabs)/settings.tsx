import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Switch, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TopHeader } from '../../components/ui/TopHeader';
import { MutedLabel } from '../../components/ui/MutedLabel';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { runSync } from '../../services/syncEngine';
import { refreshAllStores } from '../../store';
import { neuListItem } from '../../theme/neumorphism';
import type { AppTheme } from '../../theme';
import { PRIMARY_COLORS } from '../../theme';

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
          boxShadow: neuListItem(theme) as any,
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
  const { currency, theme: currentTheme, setTheme, primaryColor, setPrimaryColor, setCloudSyncEnabled, setLastSyncedAt } = useSettingsStore();
  const { isAuthenticated, user, safeSignOut } = useAuthStore();

  const isDark = currentTheme === 'dark';
  const [showColors, setShowColors] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);

  async function handleSyncNow() {
    if (!user) return;
    setSyncing(true);
    try {
      const result = await runSync(user.uid);
      if (result.pulled > 0) await refreshAllStores();
      await setLastSyncedAt(new Date().toISOString());
      Alert.alert('Sync complete', `Pushed ${result.pushed}, pulled ${result.pulled} changes.`);
    } catch (e) {
      Alert.alert('Sync failed', 'Could not sync. Check your connection and try again.');
    } finally {
      setSyncing(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign out of cloud?', 'Your data will be synced to the cloud before signing out. If you are offline, you can still sign out — unsynced data will be kept locally.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive', onPress: async () => {
          if (!user) return;
          setSyncing(true);
          try {
            const result = await safeSignOut(user.uid);
            await setCloudSyncEnabled(false);
            if (result.wasOnline) {
              Alert.alert('Signed Out', 'Data synced successfully. You have been signed out.');
            } else {
              Alert.alert(
                'Signed Out Offline',
                result.pendingCount > 0
                  ? `You have ${result.pendingCount} pending change${result.pendingCount === 1 ? '' : 's'} that will sync next time you log in on this device.`
                  : 'You have been signed out. All data was already synced.'
              );
            }
          } catch (e: any) {
            Alert.alert('Sign Out Failed', 'Could not complete sign out. Please try again.');
          } finally {
            setSyncing(false);
          }
        }
      },
    ]);
  }

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
        <SettingRow
          icon="palette"
          iconColor={theme.colors.primary}
          label="Accent Color"
          onPress={() => setShowColors(!showColors)}
          right={
            <View style={[styles.colorPreview, { backgroundColor: primaryColor }]} />
          }
        />
        {showColors && (
          <View style={styles.colorRow}>
            {PRIMARY_COLORS.map((c) => {
              const color = isDark ? c.dark : c.light;
              const isSelected = c.light === primaryColor || c.dark === primaryColor;
              return (
                <TouchableOpacity
                  key={c.name}
                  onPress={() => setPrimaryColor(c.light)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: color },
                    isSelected && { borderWidth: 2.5, borderColor: theme.colors.onSurface },
                  ]}
                />
              );
            })}
          </View>
        )}

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

        {/* Cloud Sync */}
        <MutedLabel uppercase style={styles.sectionTitle}>Cloud Sync</MutedLabel>
        {isAuthenticated && user ? (
          <>
            <SettingRow
              icon="account-circle-outline"
              iconColor={theme.colors.primary}
              label="Signed in as"
              value={user.email?.split('@')[0] ?? 'Account'}
            />
            <SettingRow
              icon={syncing ? 'loading' : 'sync'}
              iconColor={theme.colors.secondary}
              label={syncing ? 'Syncing…' : 'Sync Now'}
              onPress={syncing ? undefined : handleSyncNow}
            />
            <SettingRow
              icon="logout"
              iconColor={theme.colors.error}
              label="Sign Out of Cloud"
              onPress={handleSignOut}
            />
          </>
        ) : (
          <SettingRow
            icon="cloud-upload-outline"
            iconColor={theme.colors.primary}
            label="Connect Cloud Account"
            value="Off"
            onPress={() => router.push('/modals/cloud-auth')}
          />
        )}

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
    marginBottom: 6,
    borderRadius: 16,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPreview: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 6,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});
