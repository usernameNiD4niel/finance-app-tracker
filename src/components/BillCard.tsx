import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Switch, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/currency';
import { getDaysUntilDue } from '../utils/date';
import type { AppTheme } from '../theme';

interface Props {
  id: number;
  name: string;
  amount: number;
  dueDay: number;
  isActive: boolean;
  frequency: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  currency: string;
  onToggle: (id: number, active: boolean) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
}

export function BillCard({
  id, name, amount, dueDay, isActive, frequency,
  categoryIcon, categoryColor, currency,
  onToggle, onDelete, onEdit,
}: Props) {
  const theme = useTheme<AppTheme>();
  const daysLeft = getDaysUntilDue(dueDay);
  const isDueSoon = daysLeft <= 3;

  const handleLongPress = () => {
    Alert.alert('Bill Options', name, [
      { text: 'Edit', onPress: () => onEdit(id) },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const badgeColor = isDueSoon
    ? theme.custom.expense
    : daysLeft <= 7
    ? theme.custom.warning
    : theme.colors.primary;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.custom.cardBg }]}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: (categoryColor ?? theme.colors.primary) + '22' }]}>
        <MaterialCommunityIcons
          name={(categoryIcon ?? 'receipt') as any}
          size={22}
          color={categoryColor ?? theme.colors.primary}
        />
      </View>
      <View style={styles.details}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.meta}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textTransform: 'capitalize' }}>
            {frequency}
          </Text>
          <View style={[styles.badge, { backgroundColor: badgeColor + '22' }]}>
            <Text variant="labelSmall" style={{ color: badgeColor }}>
              {daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.right}>
        <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          {formatCurrency(amount, currency)}
        </Text>
        <Switch
          value={isActive}
          onValueChange={(val) => onToggle(id, val)}
          color={theme.colors.primary}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
});
