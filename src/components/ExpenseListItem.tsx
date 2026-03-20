import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/currency';
import { formatShortDate } from '../utils/date';
import type { AppTheme } from '../theme';

interface Props {
  id: number;
  amount: number;
  note: string | null;
  date: string;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  currency: string;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
}

export function ExpenseListItem({
  id, amount, note, date,
  categoryName, categoryIcon, categoryColor,
  currency, onDelete, onEdit,
}: Props) {
  const theme = useTheme<AppTheme>();

  const handleLongPress = () => {
    Alert.alert(
      'Expense Options',
      note || categoryName || 'Expense',
      [
        { text: 'Edit', onPress: () => onEdit(id) },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(id) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.custom.cardBg }]}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: (categoryColor ?? theme.colors.primary) + '22' }]}>
        <MaterialCommunityIcons
          name={(categoryIcon ?? 'cash') as any}
          size={22}
          color={categoryColor ?? theme.colors.primary}
        />
      </View>
      <View style={styles.details}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
          {note || categoryName || 'Expense'}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {categoryName} · {formatShortDate(date)}
        </Text>
      </View>
      <Text variant="titleSmall" style={{ color: theme.custom.expense, fontWeight: '700' }}>
        -{formatCurrency(amount, currency)}
      </Text>
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
    marginRight: 8,
  },
});
