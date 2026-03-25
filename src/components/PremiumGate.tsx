import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RoundedCard } from './ui/RoundedCard';
import { neuButton } from '../theme/neumorphism';
import type { AppTheme } from '../theme';

interface Props {
  isPremium: boolean;
  onUpgrade: () => void;
  children: React.ReactNode;
}

const PLACEHOLDER_HEIGHTS = [0.5, 0.8, 0.35, 0.95, 0.6, 0.75, 0.45];

export function PremiumGate({ isPremium, onUpgrade, children }: Props) {
  const theme = useTheme<AppTheme>();

  if (isPremium) return <>{children}</>;

  return (
    <RoundedCard>
      <View style={styles.previewWrap}>
        {/* Placeholder bars */}
        <View style={styles.barsRow}>
          {PLACEHOLDER_HEIGHTS.map((h, i) => (
            <View key={i} style={styles.barCol}>
              <View
                style={[
                  styles.bar,
                  {
                    height: h * 100,
                    backgroundColor: theme.custom.trackBg,
                    opacity: 0.4,
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Overlay */}
        <View style={[styles.overlay, { backgroundColor: theme.custom.cardBg + 'dd' }]}>
          <View style={[styles.lockIcon, { backgroundColor: theme.colors.primary + '18' }]}>
            <MaterialCommunityIcons name="lock" size={28} color={theme.colors.primary} />
          </View>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginTop: 12 }}>
            Premium Feature
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' }}>
            Unlock detailed graph reports
          </Text>
          <TouchableOpacity
            style={[styles.upgradeBtn, { backgroundColor: theme.colors.primary, boxShadow: neuButton(theme) as any }]}
            onPress={onUpgrade}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="crown" size={16} color={theme.custom.buttonText} />
            <Text variant="labelLarge" style={{ color: theme.custom.buttonText, fontWeight: '700', marginLeft: 6 }}>
              Go Premium
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </RoundedCard>
  );
}

const styles = StyleSheet.create({
  previewWrap: {
    minHeight: 200,
    position: 'relative',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 120,
    paddingHorizontal: 8,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 14,
  },
});
