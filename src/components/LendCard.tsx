import React from 'react';
import { StyleSheet, Alert, View, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { formatCurrency } from '../utils/currency';
import { formatShortDate } from '../utils/date';
import { ListRowCard } from './ui/ListRowCard';
import type { AppTheme } from '../theme';

interface Props {
  id: number;
  amount: number;
  borrowerName: string;
  note: string | null;
  lendDate: string;
  expectedPayDate: string;
  isPaid: boolean | number;
  paidDate: string | null;
  hasInterest: boolean | number;
  interestType: string | null;
  interestValue: number | null;
  sourceName: string | null;
  sourceIcon: string | null;
  sourceColor: string | null;
  currency: string;
  onPress?: (id: number) => void;
  onMarkPaid?: (id: number) => void;
  onDelete?: (id: number) => void;
  onEdit?: (id: number) => void;
  index?: number;
  highlighted?: boolean;
}

function getDaysUntilDate(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function computeTotalRepayment(amount: number, hasInterest: boolean, interestType: string | null, interestValue: number | null): number {
  if (!hasInterest || !interestValue) return amount;
  if (interestType === 'fixed') return amount + interestValue;
  if (interestType === 'percentage') return amount + (amount * interestValue / 100);
  return amount;
}

export const LendCard = React.memo(function LendCard({
  id, amount, borrowerName, note, lendDate, expectedPayDate,
  isPaid: rawIsPaid, paidDate, hasInterest: rawHasInterest, interestType, interestValue,
  sourceName, sourceIcon, sourceColor,
  currency, onPress, onMarkPaid, onDelete, onEdit, index = 0, highlighted = false,
}: Props) {
  const theme = useTheme<AppTheme>();
  // Coerce SQLite 0/1 to boolean
  const isPaid = !!rawIsPaid;
  const hasInterest = !!rawHasInterest;
  const daysUntil = getDaysUntilDate(expectedPayDate);
  const isOverdue = !isPaid && daysUntil < 0;
  const isSoon = !isPaid && daysUntil >= 0 && daysUntil <= 3;
  const totalRepayment = computeTotalRepayment(amount, hasInterest, interestType, interestValue);

  const handleLongPress = () => {
    const options: { text: string; onPress?: () => void; style?: 'destructive' | 'cancel' }[] = [];
    if (!isPaid && onMarkPaid) {
      options.push({ text: 'Mark as Paid', onPress: () => onMarkPaid(id) });
    }
    if (onEdit) {
      options.push({ text: 'Edit', onPress: () => onEdit(id) });
    }
    if (onDelete) {
      options.push({ text: 'Delete', style: 'destructive', onPress: () => onDelete(id) });
    }
    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert('Lend Options', `${borrowerName} - ${formatCurrency(amount, currency)}`, options);
  };

  const statusColor = isPaid
    ? theme.custom.income
    : isOverdue
      ? theme.custom.expense
      : isSoon
        ? theme.custom.warning
        : theme.colors.onSurfaceVariant;

  const statusText = isPaid
    ? `Paid ${paidDate ? formatShortDate(paidDate) : ''}`
    : isOverdue
      ? `Overdue by ${Math.abs(daysUntil)}d`
      : daysUntil === 0
        ? 'Due today'
        : `Due in ${daysUntil}d`;

  return (
    <ListRowCard
      onPress={onPress ? () => onPress(id) : undefined}
      onLongPress={handleLongPress}
      index={index}
      style={[styles.card, highlighted && { borderWidth: 2, borderColor: theme.colors.primary }]}
    >
      <View style={[styles.iconContainer, { backgroundColor: (sourceColor ?? theme.colors.primary) + '22' }]}>
        <MaterialCommunityIcons
          name={(sourceIcon ?? 'hand-coin') as any}
          size={22}
          color={sourceColor ?? theme.colors.primary}
        />
      </View>
      <View style={styles.details}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }} numberOfLines={1}>
          {borrowerName}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
          {sourceName ? `${sourceName} · ` : ''}{formatShortDate(lendDate)}
        </Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
            <Text variant="labelSmall" style={{ color: statusColor, fontWeight: '600' }}>
              {statusText}
            </Text>
          </View>
          {hasInterest && interestValue != null && (
            <View style={[styles.statusBadge, { backgroundColor: theme.colors.primary + '18' }]}>
              <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                {interestType === 'percentage' ? `+${interestValue}%` : `+${formatCurrency(interestValue, currency)}`}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.rightCol}>
        <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: '800' }}>
          {formatCurrency(totalRepayment, currency)}
        </Text>
        {hasInterest && totalRepayment !== amount && (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textDecorationLine: 'line-through' }}>
            {formatCurrency(amount, currency)}
          </Text>
        )}
        {!isPaid && onMarkPaid && (
          <TouchableOpacity
            style={[styles.collectBtn, { backgroundColor: theme.colors.primary + '18' }]}
            onPress={() => onMarkPaid(id)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="cash-check" size={14} color={theme.colors.primary} />
            <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '700', marginLeft: 3 }}>
              Collect
            </Text>
          </TouchableOpacity>
        )}
        {isPaid && (
          <View style={[styles.paidBadge, { backgroundColor: theme.custom.income + '18' }]}>
            <MaterialCommunityIcons name="check-circle" size={12} color={theme.custom.income} />
            <Text variant="labelSmall" style={{ color: theme.custom.income, fontWeight: '700', marginLeft: 2 }}>
              Returned
            </Text>
          </View>
        )}
      </View>
    </ListRowCard>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginVertical: 4,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  details: {
    flex: 1,
    marginRight: 8,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  collectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
