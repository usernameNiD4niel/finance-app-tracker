import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { neuButton, neuInset } from '../theme/neumorphism';
import type { AppTheme } from '../theme';

interface Props {
  onComplete: (pin: string) => void;
  title?: string;
  subtitle?: string;
  maxLength?: number;
}

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

export function PINPad({ onComplete, title = 'Enter PIN', subtitle, maxLength = 6 }: Props) {
  const theme = useTheme<AppTheme>();
  const [pin, setPin] = useState('');

  const handleKey = (key: string) => {
    if (key === 'del') {
      setPin(p => p.slice(0, -1));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    if (key === '') return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPin = pin + key;
    setPin(newPin);

    if (newPin.length === maxLength) {
      setTimeout(() => {
        onComplete(newPin);
        setPin('');
      }, 150);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, textAlign: 'center', fontWeight: '700' }}>
        {title}
      </Text>
      {subtitle && (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
          {subtitle}
        </Text>
      )}

      <View style={styles.dots}>
        {Array.from({ length: maxLength }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < pin.length
                ? {
                    backgroundColor: theme.colors.primary,
                    boxShadow: [
                      { offsetX: 0, offsetY: 0, blurRadius: 8, spreadDistance: 1, color: theme.colors.primary + '66' },
                    ] as any,
                  }
                : {
                    backgroundColor: theme.custom.trackBg,
                    boxShadow: neuInset(theme) as any,
                  },
            ]}
          />
        ))}
      </View>

      <View style={styles.keypad}>
        {KEYS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((key, ki) => (
              <TouchableOpacity
                key={ki}
                style={[
                  styles.key,
                  {
                    backgroundColor: key === '' ? 'transparent' : theme.custom.cardBg,
                    boxShadow: key === '' ? undefined : (neuButton(theme) as any),
                  },
                ]}
                onPress={() => handleKey(key)}
                disabled={key === ''}
                activeOpacity={0.6}
              >
                {key === 'del' ? (
                  <MaterialCommunityIcons
                    name="backspace-outline"
                    size={24}
                    color={theme.colors.onSurface}
                  />
                ) : (
                  <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                    {key}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
    marginBottom: 40,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  keypad: {
    gap: 12,
    width: '100%',
    maxWidth: 280,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  key: {
    flex: 1,
    aspectRatio: 1.4,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
