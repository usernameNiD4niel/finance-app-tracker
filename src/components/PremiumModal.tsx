import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { neuCardLg, neuButton, neuCard } from '../theme/neumorphism';
import type { AppTheme } from '../theme';

interface Props {
  visible: boolean;
  onSubscribe: () => void;
  onDismiss: () => void;
}

const FEATURES = [
  {
    icon: 'trophy-outline' as const,
    title: 'Budget Rank-Up',
    desc: 'Hit your category budget and earn ranks',
  },
  {
    icon: 'chart-line' as const,
    title: 'Graph Reports',
    desc: 'Visual expense analysis on your stats page',
  },
  {
    icon: 'palette-outline' as const,
    title: 'Multiple Themes',
    desc: 'Unlock extra themes and primary colors',
  },
  {
    icon: 'hand-coin' as const,
    title: 'Lend Tracking',
    desc: 'Track money lent to others and get paid back',
  },
];

export function PremiumModal({ visible, onSubscribe, onDismiss }: Props) {
  const theme = useTheme<AppTheme>();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.custom.cardBg,
            },
          ]}
        >
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: theme.colors.primary + '18',
                boxShadow: neuCard(theme) as any,
              },
            ]}
          >
            <MaterialCommunityIcons name="crown" size={44} color={theme.colors.primary} />
          </View>

          <Text variant="headlineSmall" style={[styles.heading, { color: theme.colors.onSurface }]}>
            Go Premium
          </Text>

          <View style={styles.priceRow}>
            <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: '800' }}>
              $5
            </Text>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
              /month
            </Text>
          </View>

          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View
                key={f.icon}
                style={[
                  styles.featureRow,
                  {
                    backgroundColor: theme.colors.background,
                    boxShadow: neuCard(theme) as any,
                  },
                ]}
              >
                <View style={[styles.featureIcon, { backgroundColor: theme.colors.primary + '18' }]}>
                  <MaterialCommunityIcons name={f.icon} size={20} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>
                    {f.title}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {f.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.subscribeBtn,
              {
                backgroundColor: theme.colors.primary,
                boxShadow: neuButton(theme) as any,
              },
            ]}
            onPress={onSubscribe}
            activeOpacity={0.8}
          >
            <Text variant="labelLarge" style={{ color: theme.custom.buttonText, fontWeight: '700' }}>
              Subscribe Now
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={onDismiss} activeOpacity={0.7}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Maybe Later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heading: {
    fontWeight: '800',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  features: {
    width: '100%',
    gap: 10,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeBtn: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipBtn: {
    marginTop: 14,
    paddingVertical: 8,
  },
});
