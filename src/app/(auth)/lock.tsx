import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { PINPad } from '../../components/PINPad';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { isBiometricAvailable, authenticateWithBiometrics, verifyPin } from '../../services/auth';
import { PremiumModal } from '../../components/PremiumModal';
import { neuCardLg, neuButton } from '../../theme/neumorphism';
import type { AppTheme } from '../../theme';

export default function LockScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { pinHash, setPremium } = useSettingsStore();
  const { isAuthenticated } = useAuthStore();
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

  const unlock = () => setShowPremium(true);

  async function navigateAfterUnlock() {
    const state = await NetInfo.fetch();
    const isOnline = state.isConnected === true && state.isInternetReachable !== false;

    if (isOnline && !isAuthenticated) {
      // Online but not signed in → force cloud auth before entering app
      router.replace('/modals/cloud-auth' as any);
    } else {
      router.replace('/(tabs)');
    }
  }

  const handlePremiumSubscribe = async () => {
    await setPremium(true);
    setShowPremium(false);
    await navigateAfterUnlock();
  };

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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <View style={[styles.logoWrap, { backgroundColor: theme.custom.cardBg, boxShadow: neuCardLg(theme) as any }]}>
          <MaterialCommunityIcons name="lock" size={40} color={theme.colors.primary} />
        </View>
        <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginTop: 16 }}>
          Finance Tracker
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
          style={[styles.biometricBtn, { backgroundColor: theme.custom.cardBg, boxShadow: neuButton(theme) as any }]}
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
        onSubscribe={handlePremiumSubscribe}
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
