import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/currency';
import type { AppTheme } from '../theme';

interface Props {
  balance: number;
  salary: number;
  spent: number;
  billsDue: number;
  currency: string;
  period: 'first' | 'fifteenth';
}

export function BalanceCard({ balance, salary, spent, billsDue, currency, period }: Props) {
  const theme = useTheme<AppTheme>();
  const isPositive = balance >= 0;

  return (
    <View style={[styles.card, { backgroundColor: theme.custom.cardBg }]}>
      <View style={styles.header}>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {period === 'first' ? '1st – 14th' : '15th – End of Month'}
        </Text>
        <View style={[styles.badge, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text variant="labelSmall" style={{ color: theme.colors.primary }}>Current Period</Text>
        </View>
      </View>

      <Text variant="displaySmall" style={[styles.balance, { color: isPositive ? theme.custom.income : theme.custom.expense }]}>
        {formatCurrency(balance, currency)}
      </Text>

      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
        Available Balance
      </Text>

      <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

      <View style={styles.row}>
        <BalanceStat
          icon="arrow-down-circle"
          label="Salary"
          value={formatCurrency(salary, currency)}
          color={theme.custom.income}
          theme={theme}
        />
        <BalanceStat
          icon="arrow-up-circle"
          label="Spent"
          value={formatCurrency(spent, currency)}
          color={theme.custom.expense}
          theme={theme}
        />
        <BalanceStat
          icon="calendar-clock"
          label="Bills Due"
          value={formatCurrency(billsDue, currency)}
          color={theme.colors.secondary}
          theme={theme}
        />
      </View>
    </View>
  );
}

function BalanceStat({
  icon, label, value, color, theme,
}: {
  icon: string; label: string; value: string; color: string; theme: AppTheme;
}) {
  return (
    <View style={styles.stat}>
      <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
        {label}
      </Text>
      <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  balance: {
    fontWeight: '800',
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: 12,
    opacity: 0.3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    gap: 2,
  },
});
