import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, FAB, useTheme } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BillCard } from '../../components/BillCard';
import { useBillStore } from '../../store/billStore';
import { useSettingsStore } from '../../store/settingsStore';
import { cancelNotification } from '../../services/notifications';
import { formatCurrency } from '../../utils/currency';
import type { AppTheme } from '../../theme';

export default function BillsScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { currency } = useSettingsStore();
  const { bills, loadBills, editBill, removeBill } = useBillStore();

  useFocusEffect(useCallback(() => { loadBills(); }, []));

  const activeBills = bills.filter(b => b.isActive);
  const monthlyTotal = activeBills.reduce((sum, b) => sum + b.amount, 0);

  const handleToggle = async (id: number, active: boolean) => {
    await editBill(id, { isActive: active });
  };

  const handleDelete = async (id: number) => {
    const bill = bills.find(b => b.id === id);
    if (bill?.notificationId) await cancelNotification(bill.notificationId);
    await removeBill(id);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '800' }}>
          Bills
        </Text>
        <View style={styles.headerRight}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Monthly</Text>
          <Text variant="titleMedium" style={{ color: theme.custom.expense, fontWeight: '700' }}>
            {formatCurrency(monthlyTotal, currency)}
          </Text>
        </View>
      </View>

      <FlatList
        data={bills}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <BillCard
            id={item.id}
            name={item.name}
            amount={item.amount}
            dueDay={item.dueDay}
            isActive={item.isActive}
            frequency={item.frequency}
            categoryIcon={item.categoryIcon ?? null}
            categoryColor={item.categoryColor ?? null}
            currency={currency}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onEdit={(id) => router.push({ pathname: '/modals/add-bill', params: { id } })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name={'receipt' as any} size={60} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
              No bills yet
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              Tap + to add a recurring bill
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#fff"
        onPress={() => router.push('/modals/add-bill')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    elevation: 2,
  },
  headerRight: { alignItems: 'flex-end' },
  empty: { alignItems: 'center', paddingTop: 80 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    borderRadius: 18,
  },
});
