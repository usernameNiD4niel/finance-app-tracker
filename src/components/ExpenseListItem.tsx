import React from 'react';
import { StyleSheet, Alert, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/currency';
import { formatShortDate } from '../utils/date';
import { ListRowCard } from './ui/ListRowCard';
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
  index?: number;
}

export const ExpenseListItem = React.memo(function ExpenseListItem({
  id, amount, note, date,
  categoryName, categoryIcon, categoryColor,
  currency, onDelete, onEdit, index = 0,
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
    <ListRowCard
      onLongPress={handleLongPress}
      index={index}
      style={styles.card}
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
      <Text variant="titleSmall" style={{ color: theme.custom.expense, fontWeight: '800' }}>
        -{formatCurrency(amount, currency)}
      </Text>
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
});
