import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PINPad } from '../../components/PINPad';
import { useSettingsStore } from '../../store/settingsStore';
import { hashPin } from '../../services/auth';
import { CURRENCIES } from '../../utils/currency';
import type { AppTheme } from '../../theme';

type Step = 'welcome' | 'currency' | 'pin' | 'confirm-pin';

export default function OnboardingScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { setCurrency, setPin, setOnboardingDone } = useSettingsStore();

  const [step, setStep] = useState<Step>('welcome');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [pinEntry, setPinEntry] = useState('');

  const handlePinFirst = async (pin: string) => {
    setPinEntry(pin);
    setStep('confirm-pin');
  };

  const handlePinConfirm = async (pin: string) => {
    if (pin !== pinEntry) {
      Alert.alert('PIN Mismatch', 'PINs do not match. Please try again.');
      setStep('pin');
      return;
    }
    const hash = await hashPin(pin);
    await setPin(hash);
    await setCurrency(selectedCurrency);
    await setOnboardingDone();
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {step === 'welcome' && (
        <View style={styles.center}>
          <View style={[styles.logoWrap, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons name="wallet" size={64} color={theme.colors.primary} />
          </View>
          <Text variant="displaySmall" style={[styles.title, { color: theme.colors.onSurface }]}>
            Finance Tracker
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 12 }}>
            Track your expenses, manage bills, and stay on budget — all offline, all private.
          </Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.colors.primary }]}
            onPress={() => setStep('currency')}
          >
            <Text variant="labelLarge" style={{ color: '#fff' }}>Get Started</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'currency' && (
        <View style={styles.content}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
            Pick Your Currency
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 20 }}>
            This will be used throughout the app.
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {CURRENCIES.map((c) => {
              const isSelected = c.code === selectedCurrency;
              return (
                <TouchableOpacity
                  key={c.code}
                  style={[
                    styles.currencyItem,
                    {
                      backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surface,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
                    },
                  ]}
                  onPress={() => setSelectedCurrency(c.code)}
                >
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                    {c.symbol} {c.code}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {c.name}
                  </Text>
                  {isSelected && (
                    <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.colors.primary }]}
            onPress={() => setStep('pin')}
          >
            <Text variant="labelLarge" style={{ color: '#fff' }}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'pin' && (
        <PINPad
          title="Create Your PIN"
          subtitle="Set a 6-digit PIN to secure your data"
          onComplete={handlePinFirst}
          maxLength={6}
        />
      )}

      {step === 'confirm-pin' && (
        <PINPad
          title="Confirm Your PIN"
          subtitle="Enter the same PIN again to confirm"
          onComplete={handlePinConfirm}
          maxLength={6}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 64,
  },
  logoWrap: {
    width: 120,
    height: 120,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
  },
  btn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 8,
    gap: 12,
  },
});
