import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGuestWarningStore } from '../store/guestWarningStore';
import { useSettingsStore } from '../store/settingsStore';
import { neuCard, neuButton } from '../theme/neumorphism';
import type { AppTheme } from '../theme';

export function GuestWarningModal() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { isVisible, dismissForSession, hide } = useGuestWarningStore();
  const { setGuestWarningDismissed } = useSettingsStore();

  if (!isVisible) return null;

  const handleSignIn = () => {
    hide();
    router.push('/modals/cloud-auth' as any);
  };

  const handleMaybeLater = () => {
    dismissForSession();
  };

  const handleDontShowAgain = async () => {
    await setGuestWarningDismissed(true);
    hide();
  };

  return (
    <Portal>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.custom.cardBg, boxShadow: neuCard(theme) as any }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + '18' }]}>
            <MaterialCommunityIcons name="cloud-alert" size={36} color={theme.colors.primary} />
          </View>

          <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
            Your data isn't saved
          </Text>

          <Text variant="bodyMedium" style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
            You're not signed in. Data stored on this device may be lost if you uninstall the app or switch devices. Sign in to keep your records safe.
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.colors.primary, boxShadow: neuButton(theme) as any }]}
            onPress={handleSignIn}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="login" size={18} color={theme.custom.buttonText} />
            <Text variant="labelLarge" style={{ color: theme.custom.buttonText, fontWeight: '700', marginLeft: 8 }}>
              Sign In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={handleMaybeLater} activeOpacity={0.7}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Maybe Later
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dimBtn} onPress={handleDontShowAgain} activeOpacity={0.7}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant + '99' }}>
              Don't show again
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    marginTop: 14,
    paddingVertical: 8,
  },
  dimBtn: {
    marginTop: 6,
    paddingVertical: 6,
  },
});
