import React from 'react';
import { StyleSheet, Alert, View, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/currency';
import { ListRowCard } from './ui/ListRowCard';
import type { AppTheme } from '../theme';

const TYPE_LABELS: Record<string, string> = {
  bank: 'Bank',
  e_wallet: 'E-Wallet',
  cash: 'Cash',
  custom: 'Other',
};

interface Props {
  id: number;
  name: string;
  type: string;
  icon: string;
  color: string;
  balance: number;
  isCustom: boolean;
  isActive: boolean;
  currency: string;
  onDeposit: (id: number) => void;
  onWithdraw: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  index?: number;
}

export function SourceCard({
  id, name, type, icon, color, balance, isCustom, isActive,
  currency, onDeposit, onWithdraw, onEdit, onDelete, index = 0,
}: Props) {
  const theme = useTheme<AppTheme>();

  const handleLongPress = () => {
    Alert.alert(name, TYPE_LABELS[type] ?? type, [
      { text: 'Edit', onPress: () => onEdit(id) },
      { text: isCustom ? 'Delete' : 'Deactivate', style: 'destructive', onPress: () => onDelete(id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (!isActive) return null;

  return (
    <ListRowCard onLongPress={handleLongPress} index={index} style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: color + '22' }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color={color} />
      </View>
      <View style={styles.details}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }} numberOfLines={1}>
          {name}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {TYPE_LABELS[type] ?? type}
        </Text>
      </View>
      <Text
        variant="titleSmall"
        style={{
          color: balance >= 0 ? theme.custom.income : theme.custom.expense,
          fontWeight: '800',
          marginRight: 10,
        }}
      >
        {formatCurrency(balance, currency)}
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.custom.income + '1a' }]}
          onPress={() => onDeposit(id)}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons name="plus" size={18} color={theme.custom.income} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.custom.expense + '1a' }]}
          onPress={() => onWithdraw(id)}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons name="minus" size={18} color={theme.custom.expense} />
        </TouchableOpacity>
      </View>
    </ListRowCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
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
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
