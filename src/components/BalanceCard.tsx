import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency } from '../utils/currency';
import { neuHero } from '../theme/neumorphism';
import type { AppTheme } from '../theme';

interface Props {
  balance: number;
  walletBalance: number;
  spent: number;
  billsDue: number;
  currency: string;
}

export const BalanceCard = React.memo(function BalanceCard({ balance, walletBalance, spent, billsDue, currency }: Props) {
  const theme = useTheme<AppTheme>();
  const isDark = theme.dark;
  const accent = theme.custom.onAccentSurface;
  const accentMuted = theme.custom.onAccentSurfaceMuted;

  const today = new Date();
  const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const heroShadow = useMemo(() => neuHero(theme), [theme]);
  const gradientColors = useMemo<[string, string]>(
    () => isDark ? ['#2e3148', '#252839'] : [theme.colors.primary, theme.colors.primaryContainer],
    [isDark, theme.colors.primary, theme.colors.primaryContainer],
  );

  return (
    <View
      style={[
        styles.card,
        {
          boxShadow: heroShadow as any,
        },
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Gradient blobs */}
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobBlue]} />
      <View style={[styles.blob, styles.blobIndigo]} />
      {/* Subtle shine stripe */}
      <View style={styles.shineStripe} />

      {/* Month header */}
      <View style={styles.header}>
        <View style={styles.periodRow}>
          <MaterialCommunityIcons name="calendar-range" size={13} color={accentMuted} />
          <Text style={[styles.periodLabel, { color: accentMuted }]}>{monthName}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={[styles.badgeText, { color: accent }]}>This Month</Text>
        </View>
      </View>

      {/* Balance label */}
      <Text style={[styles.balanceLabel, { color: accentMuted }]}>Total Balance</Text>

      <Text style={[styles.balanceAmount, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
        {formatCurrency(balance, currency)}
      </Text>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Stats row */}
      <View style={styles.statsRow}>
        <BalanceStat
          icon="wallet-outline"
          label="Wallets"
          value={formatCurrency(walletBalance, currency)}
          accentMuted={accentMuted}
          accent={accent}
        />
        <View style={styles.statSeparator} />
        <BalanceStat
          icon="arrow-up-circle-outline"
          label="Spent"
          value={formatCurrency(spent, currency)}
          accentMuted={accentMuted}
          accent={accent}
        />
        <View style={styles.statSeparator} />
        <BalanceStat
          icon="calendar-clock-outline"
          label="Bills Due"
          value={formatCurrency(billsDue, currency)}
          accentMuted={accentMuted}
          accent={accent}
        />
      </View>
    </View>
  );
});

const BalanceStat = React.memo(function BalanceStat({ icon, label, value, accentMuted, accent }: { icon: string; label: string; value: string; accentMuted: string; accent: string }) {
  return (
    <View style={styles.stat}>
      <MaterialCommunityIcons name={icon as any} size={17} color={accentMuted} />
      <Text style={[styles.statLabel, { color: accentMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    padding: 22,
    marginHorizontal: 16,
    marginTop: 16,
    overflow: 'hidden',
  },
  // Gradient blobs
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobViolet: {
    width: 220,
    height: 220,
    backgroundColor: '#6d28d9',
    opacity: 0.45,
    top: -70,
    right: -50,
  },
  blobBlue: {
    width: 170,
    height: 170,
    backgroundColor: '#1d4ed8',
    opacity: 0.35,
    top: -10,
    right: 40,
  },
  blobIndigo: {
    width: 140,
    height: 100,
    backgroundColor: '#4f46e5',
    opacity: 0.35,
    bottom: -20,
    left: -10,
  },
  shineStripe: {
    position: 'absolute',
    width: 200,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: 55,
    left: -20,
    transform: [{ rotate: '-15deg' }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  periodLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  balanceLabel: {
    fontSize: 12,
    marginTop: 18,
    fontWeight: '400',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontSize: 44,
    fontWeight: '800',
    marginTop: 5,
    letterSpacing: -1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 18,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statSeparator: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  stat: {
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    marginTop: 3,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
});
