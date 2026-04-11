import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PINPad } from '../../components/PINPad';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { isBiometricAvailable, authenticateWithBiometrics, verifyPin } from '../../services/auth';
import { GlassBackground } from '../../components/ui/GlassBackground';
import { PremiumModal } from '../../components/PremiumModal';
import { glassShadow } from '../../theme/glass';
import type { AppTheme } from '../../theme';

export default function LockScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { pinHash, isPremium } = useSettingsStore();
  const { isAuthenticated, user } = useAuthStore();
  const [bioAvailable, setBioAvailable] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showPremium, setShowPremium] = useState(false);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const available = await isBiometricAvailable();
    setBioAvailable(available);
    if (available) tryBiometric();
  };

  const tryBiometric = async () => {
    const success = await authenticateWithBiometrics();
    if (success) unlock();
  };

  const unlock = () => {
    if (isPremium) {
      navigateAfterUnlock();
    } else {
      setShowPremium(true);
    }
  };

  async function navigateAfterUnlock() {
    if (!isAuthenticated) {
      // Not signed in → force cloud auth before entering app (required for data safety)
      router.replace({ pathname: '/modals/cloud-auth', params: { gate: '1' } } as any);
    } else {
      router.replace('/(tabs)');
    }
  }

  const handlePremiumDismiss = async () => {
    setShowPremium(false);
    await navigateAfterUnlock();
  };

  const handlePin = async (pin: string) => {
    if (!pinHash) { unlock(); return; }
    const valid = await verifyPin(pin, pinHash);
    if (valid) {
      unlock();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      Alert.alert('Incorrect PIN', `Wrong PIN. ${3 - newAttempts} attempt(s) remaining.`);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.custom.bgGradientEnd, overflow: 'hidden' }]}>
      <GlassBackground />
      <View style={styles.header}>
        <View style={[styles.logoWrap, { backgroundColor: theme.custom.glassBg, borderWidth: 1, borderColor: theme.custom.glassBorder, boxShadow: glassShadow(theme, 'md') as any }]}>
          <MaterialCommunityIcons name="lock" size={40} color={theme.colors.primary} />
        </View>
        <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginTop: 16 }}>
          Ledgerist
        </Text>
      </View>

      <PINPad
        title="Enter Your PIN"
        subtitle="Unlock to continue"
        onComplete={handlePin}
        maxLength={6}
      />

      {bioAvailable && (
        <TouchableOpacity
          style={[styles.biometricBtn, { backgroundColor: theme.custom.glassBg, borderWidth: 1, borderColor: theme.custom.glassBorder, boxShadow: glassShadow(theme, 'sm') as any }]}
          onPress={tryBiometric}
        >
          <MaterialCommunityIcons name="fingerprint" size={28} color={theme.colors.primary} />
          <Text variant="labelMedium" style={{ color: theme.colors.primary, marginLeft: 8 }}>
            Use Biometrics
          </Text>
        </TouchableOpacity>
      )}

      <PremiumModal
        visible={showPremium}
        userId={user?.uid ?? ''}
        userEmail={user?.email ?? ''}
        onSubscribeSuccess={async () => { setShowPremium(false); await navigateAfterUnlock(); }}
        onDismiss={handlePremiumDismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    marginHorizontal: 40,
    marginBottom: 32,
  },
});
