import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PINPad } from '../../components/PINPad';
import { GlassBackground } from '../../components/ui/GlassBackground';
import { useSettingsStore } from '../../store/settingsStore';
import { hashPin, verifyPin } from '../../services/auth';
import type { AppTheme } from '../../theme';

type Step = 'verify' | 'new-pin' | 'confirm-pin';

export default function ChangePINScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { pinHash, setPin } = useSettingsStore();
  const [step, setStep] = useState<Step>('verify');
  const [newPinEntry, setNewPinEntry] = useState('');

  const handleVerify = async (pin: string) => {
    if (!pinHash) { setStep('new-pin'); return; }
    const valid = await verifyPin(pin, pinHash);
    if (valid) {
      setStep('new-pin');
    } else {
      Alert.alert('Incorrect PIN', 'Please try again.');
    }
  };

  const handleNew = (pin: string) => {
    setNewPinEntry(pin);
    setStep('confirm-pin');
  };

  const handleConfirm = async (pin: string) => {
    if (pin !== newPinEntry) {
      Alert.alert('PIN Mismatch', 'PINs do not match. Please try again.');
      setStep('new-pin');
      return;
    }
    const hash = await hashPin(pin);
    await setPin(hash);
    Alert.alert('Success', 'Your PIN has been updated.', [{ text: 'OK', onPress: () => router.back() }]);
  };

  const titles: Record<Step, { title: string; subtitle: string }> = {
    'verify': { title: 'Current PIN', subtitle: 'Enter your current PIN to continue' },
    'new-pin': { title: 'New PIN', subtitle: 'Enter a new 6-digit PIN' },
    'confirm-pin': { title: 'Confirm PIN', subtitle: 'Enter the same PIN again' },
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.custom.bgGradientEnd }]}>
      <GlassBackground />
      <View style={[styles.header, { backgroundColor: theme.custom.glassBg, borderBottomWidth: 0.5, borderBottomColor: theme.custom.glassBorder, paddingTop: 16 + insets.top }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>Change PIN</Text>
        <View style={{ width: 24 }} />
      </View>
      <PINPad
        title={titles[step].title}
        subtitle={titles[step].subtitle}
        onComplete={step === 'verify' ? handleVerify : step === 'new-pin' ? handleNew : handleConfirm}
        maxLength={6}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
  },
});
