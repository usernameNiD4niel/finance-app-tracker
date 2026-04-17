import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, FAB, useTheme } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TopHeader } from '../../components/ui/TopHeader';
import { BillCard } from '../../components/BillCard';
import { useBillStore } from '../../store/billStore';
import { useSettingsStore } from '../../store/settingsStore';
import { cancelNotification } from '../../services/notifications';
import { formatCurrency } from '../../utils/currency';
import { neuButton } from '../../theme/neumorphism';
import type { BillWithCategory } from '../../store/billStore';
import type { AppTheme } from '../../theme';

export default function BillsScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currency } = useSettingsStore();
  const { bills, loadBills, editBill, removeBill } = useBillStore();

  useFocusEffect(useCallback(() => { loadBills(); }, []));

  const monthlyTotal = useMemo(
    () => bills.filter(b => b.isActive).reduce((sum, b) => sum + b.amount, 0),
    [bills],
  );

  const handleToggle = useCallback((id: number, active: boolean) => {
    if (!active) {
      Alert.alert(
        'Disable Bill',
        'Are you sure? You will no longer be notified about this bill and it will be excluded from your totals.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              const bill = bills.find(b => b.id === id);
              if (bill?.notificationId) await cancelNotification(bill.notificationId);
              await editBill(id, { isActive: false, notificationId: null });
            },
          },
        ],
      );
    } else {
      editBill(id, { isActive: true });
    }
  }, [bills, editBill]);

  const handleDelete = useCallback(async (id: number) => {
    const bill = bills.find(b => b.id === id);
    if (bill?.notificationId) await cancelNotification(bill.notificationId);
    await removeBill(id);
  }, [bills, removeBill]);

  const handleEdit = useCallback((id: number) => {
    router.push({ pathname: '/modals/add-bill', params: { id } });
  }, [router]);

  const renderItem = useCallback(({ item, index }: { item: BillWithCategory; index: number }) => (
    <BillCard
      id={item.id}
      name={item.name}
      amount={item.amount}
      dueDay={item.dueDay}
      chargeTime={item.chargeTime}
      isActive={item.isActive}
      frequency={item.frequency}
      categoryIcon={item.categoryIcon ?? null}
      categoryColor={item.categoryColor ?? null}
      currency={currency}
      onToggle={handleToggle}
      onDelete={handleDelete}
      onEdit={handleEdit}
      index={index}
    />
  ), [currency, handleToggle, handleDelete, handleEdit]);

  return (
    <ScreenContainer>
      <TopHeader
        title="Bills"
        rightElement={
          <View style={styles.headerRight}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Monthly</Text>
            <Text style={{ color: theme.custom.expense, fontWeight: '700', fontSize: 16 }}>
              {formatCurrency(monthlyTotal, currency)}
            </Text>
          </View>
        }
      />

      <FlatList
        data={bills}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
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
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 150 }}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="plus"
        style={[
          styles.fab,
          {
            bottom: insets.bottom + 90,
            backgroundColor: theme.colors.primary,
            boxShadow: neuButton(theme) as any,
          },
        ]}
        color={theme.custom.buttonText}
        onPress={() => router.push('/modals/add-bill')}
      />
    </ScreenContainer>
  );
}

// Stable reference — defined outside component so it never changes
function keyExtractor(item: BillWithCategory) {
  return String(item.id);
}

const styles = StyleSheet.create({
  headerRight: { alignItems: 'flex-end' },
  empty: { alignItems: 'center', paddingTop: 80 },
  fab: {
    position: 'absolute',
    right: 20,
    borderRadius: 20,
  },
});
